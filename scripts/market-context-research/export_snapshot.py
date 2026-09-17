#!/usr/bin/env python3
"""Export a private, read-only Market Context pilot input snapshot.

Usage:
  python3 scripts/market-context-research/export_snapshot.py \
    --database PATH --raw-directory PATH --dates YYYY-MM-DD[,YYYY-MM-DD] --out PATH

Schema market-context-pilot-input:v1 contains market-only day evidence. Bulk
dates use every symbol_days row with max_gain_pct >= 50, regardless of instrument
type, and scan the matching raw minute CSV gzip exactly once for those symbols.
Selected-recovery dates use the current context_days publication and all its
candidate rows and candles. Bars use epoch-millisecond *start* timestamps.
No source database, cache, provider, or raw archive is written.
"""

from __future__ import annotations

import argparse
import csv
from datetime import date as Date, datetime, timezone
import gzip
import hashlib
import io
import json
import math
import os
from pathlib import Path
import sqlite3
import sys
import time
from urllib.parse import quote
from zoneinfo import ZoneInfo


SCHEMA_VERSION = "market-context-pilot-input:v1"
REQUIRED_RAW_COLUMNS = {"ticker", "window_start", "open", "high", "low", "close", "volume"}
MARKET_TZ = ZoneInfo("America/New_York")


def parse_dates(value: str) -> list[str]:
    parts = [part.strip() for part in value.split(",")]
    if not parts or len(parts) > 20 or any(not part for part in parts):
        raise ValueError("--dates needs 1 to 20 comma-separated YYYY-MM-DD dates")
    if len(set(parts)) != len(parts):
        raise ValueError("--dates contains a duplicate date")
    for part in parts:
        try:
            if Date.fromisoformat(part).isoformat() != part:
                raise ValueError
        except ValueError as exc:
            raise ValueError(f"Invalid --dates value: {part!r}") from exc
    return parts


def row_dict(row: sqlite3.Row) -> dict:
    return dict(row)


def table_exists(db: sqlite3.Connection, name: str) -> bool:
    return db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (name,)).fetchone() is not None


def canonical_bytes(value: object) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False).encode("utf-8")


def fingerprint(value: object) -> str:
    return hashlib.sha256(canonical_bytes(value)).hexdigest()


def session_rows(db: sqlite3.Connection, table: str, key: str, key_value: str,
                 symbols: dict, *, reject_orphans: bool = False) -> None:
    rows = db.execute(f"SELECT * FROM {table} WHERE {key}=? ORDER BY symbol COLLATE BINARY, session", (key_value,))
    for row in rows:
        symbol = row["symbol"]
        if symbol in symbols:
            symbols[symbol]["sessionStats"].append(row_dict(row))
        elif reject_orphans:
            raise ValueError(f"Orphan {table} row for {symbol!r}")


def number_or_null(value: str | None) -> float | None:
    if value is None or value.strip() == "":
        return None
    try:
        number = float(value)
    except ValueError:
        return None
    return number if math.isfinite(number) else None


def exact_ns_to_ms(value: str | None, source: Path, line: int) -> int:
    if value is None or not value.isascii() or not value.isdecimal():
        raise ValueError(f"Invalid selected window_start in {source} at CSV line {line}")
    nanoseconds = int(value)
    if nanoseconds % 1_000_000:
        raise ValueError(f"Selected window_start loses sub-millisecond precision in {source} at CSV line {line}")
    milliseconds = nanoseconds // 1_000_000
    if milliseconds < 0 or milliseconds > 8_640_000_000_000_000:
        raise ValueError(f"Selected window_start is out of epoch-ms range in {source} at CSV line {line}")
    return milliseconds


class CountedSource:
    """Hash compressed bytes during the single gzip/CSV stream."""

    def __init__(self, source: io.BufferedReader):
        self.source = source
        self.digest = hashlib.sha256()
        self.bytes_read = 0

    def read(self, size: int = -1) -> bytes:
        chunk = self.source.read(size)
        self.digest.update(chunk)
        self.bytes_read += len(chunk)
        return chunk


def bulk_day(db: sqlite3.Connection, archive: dict, raw_directory: Path, day: str) -> dict:
    started = time.perf_counter()
    selected = db.execute(
        "SELECT * FROM symbol_days WHERE session_date=? AND max_gain_pct>=50 "
        "ORDER BY symbol COLLATE BINARY", (day,)
    ).fetchall()
    symbols = {row["symbol"]: {"symbol": row["symbol"], "candidate": row_dict(row),
                               "bars": [], "sessionStats": []} for row in selected}
    if len(symbols) != len(selected):
        raise ValueError(f"Duplicate exact symbol in symbol_days on {day}")
    session_rows(db, "session_stats", "session_date", day, symbols)

    relative = Path(day[:4], day[5:7], f"{day}.csv.gz")
    raw_file = raw_directory / relative
    if not raw_file.is_file():
        raise FileNotFoundError(f"Bulk raw minute file is missing for {day}: {raw_file}")
    raw_size = raw_file.stat().st_size
    selected_rows = 0
    invalid_selected_numeric_rows = 0
    scanned_rows = 0
    with raw_file.open("rb") as compressed:
        counted = CountedSource(compressed)
        with gzip.GzipFile(fileobj=counted, mode="rb") as inflated:
            with io.TextIOWrapper(inflated, encoding="utf-8-sig", newline="") as text:
                reader = csv.DictReader(text)
                if reader.fieldnames is None or not REQUIRED_RAW_COLUMNS.issubset(reader.fieldnames):
                    missing = REQUIRED_RAW_COLUMNS - set(reader.fieldnames or [])
                    raise ValueError(f"Raw minute CSV for {day} lacks columns: {sorted(missing)}")
                for line, record in enumerate(reader, start=2):
                    scanned_rows += 1
                    symbol = (record.get("ticker") or "").strip()
                    if symbol not in symbols:
                        continue
                    timestamp = exact_ns_to_ms(record.get("window_start"), raw_file, line)
                    if datetime.fromtimestamp(timestamp // 1000, MARKET_TZ).date().isoformat() != day:
                        raise ValueError(f"Selected raw minute has an ET date other than {day} at CSV line {line}")
                    bar = {"timestamp": timestamp}
                    for output_key, source_key in (("open", "open"), ("high", "high"),
                                                   ("low", "low"), ("close", "close"),
                                                   ("volume", "volume")):
                        bar[output_key] = number_or_null(record.get(source_key))
                    if any(bar[key] is None for key in ("open", "high", "low", "close", "volume")):
                        invalid_selected_numeric_rows += 1
                    symbols[symbol]["bars"].append(bar)
                    selected_rows += 1
        raw_sha256 = counted.digest.hexdigest()
        bytes_read = counted.bytes_read
    if bytes_read != raw_size:
        raise ValueError(f"Compressed raw file for {day} was not fully read")
    if archive["source_bytes"] != raw_size or archive["source_sha256"] != raw_sha256:
        raise ValueError(f"Bulk raw file for {day} differs from archive_dates source evidence")

    for item in symbols.values():
        item["bars"].sort(key=lambda bar: bar["timestamp"])
    ordered_symbols = list(symbols.values())
    coverage = {
        "discovery": {
            "scope": "bulk-minute-archive",
            "completeness": "unknown",
            "limitations": ["This export does not independently certify market-wide discovery or source uptime."],
        },
        "candidateMinutes": {
            "scope": "raw minute rows for archived >=50% candidates",
            "completeness": "source-file-verified; per-symbol gaps unaudited",
        },
    }
    source_basis = {"archiveDate": archive, "coverage": coverage, "symbols": ordered_symbols,
                    "rawSha256": raw_sha256}
    return {
        "date": day, "stratum": "bulk-minute", "coverage": coverage,
        "sourceFingerprint": fingerprint(source_basis),
        "sourceArtifactVersion": archive["transform_version"],
        "archiveDate": archive,
        "symbols": ordered_symbols,
        "sourceRead": {
            "elapsedSeconds": round(time.perf_counter() - started, 6),
            "compressedBytesRead": bytes_read,
            "compressedBytesOnDisk": raw_size,
            "rawSha256": raw_sha256,
            "rawRelativePath": relative.as_posix(),
            "csvRowsScanned": scanned_rows,
            "selectedRows": selected_rows,
            "selectedRowsWithNullNumeric": invalid_selected_numeric_rows,
            "selectedSymbolsWithNoBars": sum(not item["bars"] for item in ordered_symbols),
        },
    }


def selected_day(db: sqlite3.Connection, publication: sqlite3.Row, day: str) -> dict:
    started = time.perf_counter()
    publication_id = publication["publication_id"]
    artifact = json.loads(publication["artifact_json"])
    if not isinstance(artifact, dict) or not isinstance(artifact.get("sourceCoverage"), dict):
        raise ValueError(f"Current candidate publication lacks sourceCoverage on {day}")
    selected = db.execute(
        "SELECT * FROM context_symbol_days WHERE publication_id=? ORDER BY symbol COLLATE BINARY",
        (publication_id,),
    ).fetchall()
    symbols = {row["symbol"]: {"symbol": row["symbol"], "candidate": row_dict(row),
                               "bars": [], "sessionStats": []} for row in selected}
    if len(symbols) != len(selected):
        raise ValueError(f"Duplicate exact symbol in current candidate publication on {day}")
    session_rows(db, "context_session_stats", "publication_id", publication_id,
                 symbols, reject_orphans=True)
    candle_count = 0
    for row in db.execute(
        "SELECT symbol,t,o,h,l,c,vol FROM context_candles WHERE publication_id=? "
        "ORDER BY symbol COLLATE BINARY,t", (publication_id,)
    ):
        symbol = row["symbol"]
        if symbol not in symbols:
            raise ValueError(f"Orphan context candle in current publication on {day}")
        symbols[symbol]["bars"].append({
            "timestamp": row["t"] * 1000,
            "open": row["o"], "high": row["h"], "low": row["l"],
            "close": row["c"], "volume": row["vol"],
        })
        candle_count += 1
    ordered_symbols = list(symbols.values())
    publication_metadata = {key: publication[key] for key in publication.keys() if key != "artifact_json"}
    source_basis = {"publication": publication_metadata, "artifact": artifact, "symbols": ordered_symbols}
    return {
        "date": day, "stratum": "selected-recovery",
        "coverage": artifact["sourceCoverage"],
        "state": publication["state"],
        "publicationId": publication_id,
        "sourceFingerprint": fingerprint(source_basis),
        "sourceArtifactVersion": artifact.get("schemaVersion"),
        "sourceCalculationVersion": artifact.get("calculationVersion"),
        "symbols": ordered_symbols,
        "sourceRead": {
            "elapsedSeconds": round(time.perf_counter() - started, 6),
            "compressedBytesRead": 0,
            "candidateRows": len(ordered_symbols),
            "candleRows": candle_count,
            "selectedSymbolsWithNoBars": sum(not item["bars"] for item in ordered_symbols),
        },
    }


def export(args: argparse.Namespace) -> None:
    dates = parse_dates(args.dates)
    database = Path(args.database).expanduser().resolve(strict=True)
    raw_directory = Path(args.raw_directory).expanduser().resolve()
    output = Path(args.out).expanduser().resolve()
    if not database.is_file():
        raise ValueError("--database is not a regular file")
    if output == database or output == raw_directory or raw_directory in output.parents:
        raise ValueError("--out must not be a source database or inside the raw directory")
    if output.exists():
        raise FileExistsError(f"Refusing to overwrite existing output: {output}")

    uri = "file:" + quote(str(database), safe="/") + "?mode=ro"
    db = sqlite3.connect(uri, uri=True)
    db.row_factory = sqlite3.Row
    try:
        db.execute("PRAGMA query_only=ON")
        db.execute("BEGIN")
        required = ("archive_dates", "symbol_days", "session_stats")
        missing = [name for name in required if not table_exists(db, name)]
        if missing:
            raise ValueError(f"Market archive is missing tables: {', '.join(missing)}")
        candidate_tables = ("context_days", "context_publications", "context_symbol_days",
                            "context_session_stats", "context_candles")
        has_candidate_tables = all(table_exists(db, name) for name in candidate_tables)

        # Write privately to a new temporary file, then link exclusively to the
        # requested path only after every date succeeds. Source files are never opened for writing.
        output.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        temporary = output.parent / f".{output.name}.{os.getpid()}.{time.time_ns()}.tmp"
        descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        try:
            with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
                header = {
                    "schemaVersion": SCHEMA_VERSION,
                    "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                    "provenance": {
                        "databasePath": str(database),
                        "rawDirectory": str(raw_directory),
                        "selection": "explicit dates; all source candidates; no PnL",
                        "requestedDates": dates,
                        "barTimestampSemantics": "epoch-ms start, end exclusive at start+60000",
                        "databaseAccess": "SQLite URI mode=ro, query_only=ON",
                    },
                }
                stream.write("{")
                for key, value in header.items():
                    stream.write(json.dumps(key) + ":")
                    json.dump(value, stream, allow_nan=False)
                    stream.write(",")
                stream.write('"days":[')
                for index, day in enumerate(dates):
                    archive_row = db.execute(
                        "SELECT * FROM archive_dates WHERE session_date=?", (day,)
                    ).fetchone()
                    if archive_row is not None:
                        snapshot_day = bulk_day(db, row_dict(archive_row), raw_directory, day)
                    else:
                        publication = None
                        if has_candidate_tables:
                            publication = db.execute(
                                "SELECT d.publication_id,d.state,d.published_at,p.generated_at,p.artifact_json "
                                "FROM context_days d JOIN context_publications p "
                                "ON p.publication_id=d.publication_id AND p.session_date=d.session_date "
                                "WHERE d.session_date=?", (day,),
                            ).fetchone()
                        if publication is None:
                            raise ValueError(f"No bulk archive or current candidate publication for {day}")
                        snapshot_day = selected_day(db, publication, day)
                    if index:
                        stream.write(",")
                    json.dump(snapshot_day, stream, separators=(",", ":"), allow_nan=False)
                stream.write("]}\n")
                stream.flush()
                os.fsync(stream.fileno())
            os.link(temporary, output)
        finally:
            temporary.unlink(missing_ok=True)
        db.rollback()
    finally:
        db.close()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--database", required=True, help="Read-only shared market SQLite file")
    parser.add_argument("--raw-directory", required=True, help="Root containing YYYY/MM/YYYY-MM-DD.csv.gz")
    parser.add_argument("--dates", required=True, help="1–20 distinct comma-separated YYYY-MM-DD dates")
    parser.add_argument("--out", required=True, help="New private JSON snapshot path (refuses overwrite)")
    args = parser.parse_args()
    try:
        export(args)
    except (OSError, sqlite3.Error, ValueError, json.JSONDecodeError) as exc:
        print(f"snapshot export failed: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

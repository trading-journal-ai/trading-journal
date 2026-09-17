"""Synthetic, market-only contract tests for the read-only snapshot exporter."""

from __future__ import annotations

import csv
from datetime import datetime, timezone
import gzip
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile
import unittest


SCRIPT = Path(__file__).with_name("export_snapshot.py")
BULK_DATE = "2026-09-15"
RECOVERY_DATE = "2026-09-16"
START_SECONDS = int(datetime(2026, 9, 15, 13, 30, tzinfo=timezone.utc).timestamp())


class ExportSnapshotTests(unittest.TestCase):
    def setUp(self) -> None:
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.database = self.root / "market.sqlite"
        self.raw = self.root / "raw"
        self.raw.mkdir()
        raw_day = self.raw / "2026" / "09"
        raw_day.mkdir(parents=True)
        self.raw_file = raw_day / f"{BULK_DATE}.csv.gz"
        with gzip.open(self.raw_file, "wt", newline="") as stream:
            writer = csv.writer(stream)
            writer.writerow(["ticker", "volume", "open", "close", "high", "low", "window_start", "transactions"])
            writer.writerow(["BULK", 100, 10, 11, 11, 10, START_SECONDS * 1_000_000_000, 4])
            writer.writerow(["SMALL", 20, 1, 1, 1, 1, START_SECONDS * 1_000_000_000, 2])
        self.raw_sha = hashlib.sha256(self.raw_file.read_bytes()).hexdigest()

        connection = sqlite3.connect(self.database)
        connection.executescript("""
            CREATE TABLE archive_dates(session_date TEXT, source_bytes INTEGER,
              source_sha256 TEXT, transform_version TEXT);
            CREATE TABLE symbol_days(session_date TEXT, symbol TEXT, max_gain_pct REAL,
              instrument_type TEXT, previous_regular_close REAL, previous_close_date TEXT,
              split_event INTEGER);
            CREATE TABLE session_stats(session_date TEXT, symbol TEXT, session TEXT, volume REAL);
            CREATE TABLE context_days(session_date TEXT, publication_id TEXT, state TEXT,
              published_at TEXT);
            CREATE TABLE context_publications(publication_id TEXT, session_date TEXT,
              generated_at TEXT, artifact_json TEXT);
            CREATE TABLE context_symbol_days(publication_id TEXT, session_date TEXT,
              symbol TEXT, max_gain_pct REAL, evaluation_state TEXT,
              instrument_type TEXT, previous_regular_close REAL, previous_close_date TEXT,
              split_event INTEGER);
            CREATE TABLE context_session_stats(publication_id TEXT, symbol TEXT,
              session TEXT, volume REAL);
            CREATE TABLE context_candles(publication_id TEXT, symbol TEXT, t INTEGER,
              o REAL, h REAL, l REAL, c REAL, vol REAL);
        """)
        connection.execute("INSERT INTO archive_dates VALUES (?,?,?,?)",
                           (BULK_DATE, self.raw_file.stat().st_size, self.raw_sha, "archive-v1"))
        connection.executemany("INSERT INTO symbol_days VALUES (?,?,?,?,?,?,?)", [
            (BULK_DATE, "BULK", 55, "CS", 6, "2026-09-14", 0),
            (BULK_DATE, "SMALL", 10, "CS", 1, "2026-09-14", 0),
        ])
        connection.execute("INSERT INTO session_stats VALUES (?,?,?,?)",
                           (BULK_DATE, "BULK", "regular", 100))
        coverage = {"discovery": {"completeness": "partial", "scope": "bounded-union"}}
        artifact = json.dumps({"schemaVersion": "market-context-acquisition:v1",
                               "calculationVersion": "core-equity-v2", "sourceCoverage": coverage})
        connection.executemany("INSERT INTO context_publications VALUES (?,?,?,?)", [
            ("old-pub", RECOVERY_DATE, "earlier", artifact),
            ("current-pub", RECOVERY_DATE, "later", artifact),
        ])
        connection.execute("INSERT INTO context_days VALUES (?,?,?,?)",
                           (RECOVERY_DATE, "current-pub", "partial", "later"))
        connection.executemany("INSERT INTO context_symbol_days VALUES (?,?,?,?,?,?,?,?,?)", [
            ("old-pub", RECOVERY_DATE, "OLD", 60, "validated", "CS", 5, BULK_DATE, 0),
            ("current-pub", RECOVERY_DATE, "REC", 60, "validated", "CS", 5, BULK_DATE, 0),
        ])
        connection.execute("INSERT INTO context_session_stats VALUES (?,?,?,?)",
                           ("current-pub", "REC", "regular", 50))
        connection.execute("INSERT INTO context_candles VALUES (?,?,?,?,?,?,?,?)",
                           ("current-pub", "REC", START_SECONDS + 86_400, 2, 3, 2, 3, 50))
        connection.commit()
        connection.close()

    def run_export(self, dates: str, output: Path | None = None) -> tuple[subprocess.CompletedProcess, Path]:
        output = output or self.root / "snapshot.json"
        result = subprocess.run([
            sys.executable, str(SCRIPT), "--database", str(self.database),
            "--raw-directory", str(self.raw), "--dates", dates, "--out", str(output),
        ], text=True, capture_output=True, check=False)
        return result, output

    def test_bulk_and_current_publication_preserve_units_coverage_and_private_source(self) -> None:
        database_hash_before = hashlib.sha256(self.database.read_bytes()).hexdigest()
        raw_hash_before = hashlib.sha256(self.raw_file.read_bytes()).hexdigest()
        source_names_before = {path.name for path in self.root.iterdir()}
        result, output = self.run_export(f"{BULK_DATE},{RECOVERY_DATE}")
        self.assertEqual(result.returncode, 0, result.stderr)
        snapshot = json.loads(output.read_text())
        self.assertEqual(snapshot["schemaVersion"], "market-context-pilot-input:v1")
        bulk, recovery = snapshot["days"]
        self.assertEqual([bulk["stratum"], recovery["stratum"]],
                         ["bulk-minute", "selected-recovery"])
        self.assertEqual([entry["symbol"] for entry in bulk["symbols"]], ["BULK"])
        self.assertEqual(bulk["symbols"][0]["bars"][0]["timestamp"], START_SECONDS * 1000)
        self.assertEqual(bulk["coverage"]["discovery"]["completeness"], "unknown")
        self.assertEqual(bulk["sourceRead"]["compressedBytesRead"], self.raw_file.stat().st_size)
        self.assertEqual([entry["symbol"] for entry in recovery["symbols"]], ["REC"])
        self.assertEqual(recovery["symbols"][0]["bars"][0]["timestamp"],
                         (START_SECONDS + 86_400) * 1000)
        self.assertEqual(recovery["coverage"]["discovery"]["completeness"], "partial")
        self.assertEqual(recovery["publicationId"], "current-pub")
        self.assertEqual(os.stat(output).st_mode & 0o777, 0o600)
        self.assertEqual(hashlib.sha256(self.database.read_bytes()).hexdigest(), database_hash_before)
        self.assertEqual(hashlib.sha256(self.raw_file.read_bytes()).hexdigest(), raw_hash_before)
        self.assertEqual({path.name for path in self.root.iterdir()} - source_names_before,
                         {"snapshot.json"})

    def test_output_refuses_overwrite_and_source_paths(self) -> None:
        first, output = self.run_export(BULK_DATE)
        self.assertEqual(first.returncode, 0, first.stderr)
        original = output.read_bytes()
        again, _ = self.run_export(BULK_DATE)
        self.assertNotEqual(again.returncode, 0)
        self.assertEqual(output.read_bytes(), original)
        source_target, _ = self.run_export(BULK_DATE, self.database)
        self.assertNotEqual(source_target.returncode, 0)
        raw_target, _ = self.run_export(BULK_DATE, self.raw / "accidental.json")
        self.assertNotEqual(raw_target.returncode, 0)
        self.assertFalse((self.raw / "accidental.json").exists())

    def test_missing_day_and_duplicate_dates_fail_without_output(self) -> None:
        result, output = self.run_export("2026-09-17")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("No bulk archive or current candidate publication", result.stderr)
        self.assertFalse(output.exists())
        duplicate, _ = self.run_export(f"{BULK_DATE},{BULK_DATE}")
        self.assertNotEqual(duplicate.returncode, 0)
        self.assertIn("duplicate date", duplicate.stderr)
        self.assertFalse(output.exists())

    def test_missing_or_changed_raw_source_fails_without_snapshot(self) -> None:
        self.raw_file.unlink()
        missing, output = self.run_export(BULK_DATE)
        self.assertNotEqual(missing.returncode, 0)
        self.assertIn("Bulk raw minute file is missing", missing.stderr)
        self.assertFalse(output.exists())
        with gzip.open(self.raw_file, "wt", newline="") as stream:
            writer = csv.writer(stream)
            writer.writerow(["ticker", "volume", "open", "close", "high", "low", "window_start"])
        changed, _ = self.run_export(BULK_DATE)
        self.assertNotEqual(changed.returncode, 0)
        self.assertIn("differs from archive_dates", changed.stderr)
        self.assertFalse(output.exists())


if __name__ == "__main__":
    unittest.main()

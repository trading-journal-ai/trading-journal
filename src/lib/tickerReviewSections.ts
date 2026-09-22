export type TickerReviewSectionTrade = {
  number: number;
  entryTime?: string | null;
};

export type SavedReviewSection =
  | { kind: "overall"; body: string }
  | { kind: "trade"; tradeNumber: number; time: string | null; body: string }
  | { kind: "moment"; time: string; body: string };

export function savedReviewSections(
  note: string,
  trades: TickerReviewSectionTrade[],
): SavedReviewSection[] {
  const tradeByNumber = new Map(trades.map((trade) => [trade.number, trade]));
  const sections: SavedReviewSection[] = [];
  let current: SavedReviewSection = { kind: "overall", body: "" };

  for (const line of note.split(/\r?\n/)) {
    const anchor = line.match(/^@(?:trade)?(\d+)(?![\d:])(?:\s*·\s*@?(\d{1,2}:\d{2}))?\s*(.*)$/i);
    if (anchor) {
      if (current.body.trim() || current.kind !== "overall") sections.push(current);
      const tradeNumber = Number(anchor[1]);
      const trade = tradeByNumber.get(tradeNumber);
      current = {
        kind: "trade",
        tradeNumber,
        time: anchor[2] ?? trade?.entryTime ?? null,
        body: anchor[3],
      };
      continue;
    }

    const momentAnchor = line.match(/^@(\d{1,2}:\d{2})\s*(.*)$/);
    if (momentAnchor) {
      if (current.body.trim() || current.kind !== "overall") sections.push(current);
      current = {
        kind: "moment",
        time: momentAnchor[1],
        body: momentAnchor[2],
      };
      continue;
    }

    current.body = current.body ? `${current.body}\n${line}` : line;
  }

  if (current.body.trim() || current.kind !== "overall") sections.push(current);
  return sections;
}

export function serializeReviewSections(sections: SavedReviewSection[]) {
  return sections
    .map((section) => {
      const body = section.body;
      if (section.kind === "overall") return body;
      if (section.kind === "trade") {
        const time = section.time ? ` · @${section.time}` : "";
        return `@trade${section.tradeNumber}${time}${body ? `\n${body}` : ""}`;
      }
      return `@${section.time}${body ? `\n${body}` : ""}`;
    })
    .filter(Boolean)
    // A single newline is enough to place the next section anchor at the start
    // of a line. Extra separator lines would be parsed back into the preceding
    // body and grow on every edit.
    .join("\n");
}

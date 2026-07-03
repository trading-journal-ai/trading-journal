const DEMO_NOTE_PREFIX = "trading-journal.demo.v1";

export function demoRecapNoteKey(scope: string, scopeKey: string) {
  return `${DEMO_NOTE_PREFIX}.recap.${scope}.${scopeKey}`;
}

export function demoTickerNoteKey(scopeKey: string) {
  return `${DEMO_NOTE_PREFIX}.ticker.${scopeKey}`;
}

export function demoTradeNoteKey(tradeId: number, noteId?: number) {
  return noteId == null
    ? `${DEMO_NOTE_PREFIX}.trade.${tradeId}.draft`
    : `${DEMO_NOTE_PREFIX}.trade.${tradeId}.note.${noteId}`;
}

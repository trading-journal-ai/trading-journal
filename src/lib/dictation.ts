const NUMBER_WORDS: Record<string, string> = {
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
  ten: "10",
};

const SPOKEN_TRADE_MENTION = /(?:\bat\b|@)[,.]?\s*trade\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/gi;

/**
 * Speech engines transcribe the spoken word "at", never the "@" symbol, so a
 * dictated "at trade two" arrives as prose instead of the @trade2 mention the
 * review workspace understands. Rewrite spoken trade mentions into mention
 * syntax. Times ("at 10:58") are left alone — "at" is usually a real
 * preposition there and rewriting would corrupt ordinary sentences.
 */
export function normalizeSpokenMentions(text: string): string {
  return text.replace(SPOKEN_TRADE_MENTION, (_match, num: string) => {
    const digits = NUMBER_WORDS[num.toLowerCase()] ?? num;
    return `@trade${digits}`;
  });
}

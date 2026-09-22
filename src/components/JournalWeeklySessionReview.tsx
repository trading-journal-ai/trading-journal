import Link from "next/link";
import { recapMoney, recapWeekday, type WeeklyRecap } from "@/lib/weeklyRecap";

const linkClass = "rounded-sm text-[var(--accent)] underline decoration-[var(--accent)]/40 underline-offset-4 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]";

export default function JournalWeeklySessionReview({ review, returnTo }: {
  review: NonNullable<WeeklyRecap["sessionReview"]>;
  returnTo: string;
}) {
  const hasNote = review.note != null && Object.values(review.note).some((value) => value.trim().length > 0);
  const dayHref = `/journal?${new URLSearchParams({ date: review.date, scope: "day", view: "coach", returnTo })}#day-reflection`;
  const reasons: string[] = [];
  if (review.reasons.includes("only_red_session")) {
    reasons.push(`The only red session among ${review.importedSessions} imported sessions (${recapMoney(review.closingPnl)}).`);
  }
  if (review.reasons.includes("largest_loss") && review.largestLoss) {
    const loss = review.largestLoss;
    reasons.push(loss.dates.length > 1
      ? `${loss.symbol} had the largest loss across this week’s recorded trade activity (${recapMoney(loss.weekPnl)}); ${recapMoney(loss.pnl)} was realized on this day.`
      : `${loss.symbol} had the week’s largest recorded trade loss (${recapMoney(loss.pnl)}).`);
  }
  if (review.reasons.includes("green_to_red") && review.curve) {
    reasons.push(`Recorded P&L went from ${recapMoney(review.curve.peakPnl)} to a ${recapMoney(review.curve.closingPnl)} finish.`);
  }
  return (
    <section aria-label="Session to revisit" className="mt-6 border-t border-[var(--hairline)] pt-5">
      <h4 className="text-[16px] font-semibold leading-6 text-[var(--foreground)]">Revisit {recapWeekday(review.date)}</h4>
      <p className="mt-2 max-w-[75ch] text-[14px] leading-6 text-[var(--body)]">{reasons.join(" ")}</p>
      <Link href={dayHref} className={`${linkClass} mt-3 inline-block text-[14px] font-medium leading-6`}>{hasNote ? "Continue review" : "Review day"}</Link>
    </section>
  );
}

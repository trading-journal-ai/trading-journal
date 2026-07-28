"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

export type ArchiveSidebarWeek = {
  key: string;
  label: string;
  rangeLabel: string;
  href: string;
  active: boolean;
  sectionId?: string;
};

export type ArchiveSidebarMonth = {
  key: string;
  label: string;
  href: string;
  active: boolean;
  weeks: ArchiveSidebarWeek[];
};

type ArchiveSidebarProps = {
  ariaLabel: string;
  topLinks?: {
    key: string;
    label: string;
    href: string;
    active?: boolean;
  }[];
  months: ArchiveSidebarMonth[];
  years?: {
    key: string;
    label: string;
    href: string;
  }[];
  offsetClassName?: string;
  enableWeekScrollSpy?: boolean;
};

export default function ArchiveSidebar({
  ariaLabel,
  topLinks = [],
  months,
  years = [],
  offsetClassName = "md:pt-56",
  enableWeekScrollSpy = false,
}: ArchiveSidebarProps) {
  const spyWeeks = useMemo(
    () =>
      months
        .flatMap((month) => month.weeks)
        .filter((week) => week.sectionId),
    [months],
  );
  const [activeWeekKey, setActiveWeekKey] = useState<string | null>(null);
  const activeWeekRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enableWeekScrollSpy || spyWeeks.length === 0) {
      return;
    }

    const sections = spyWeeks
      .map((week) => (week.sectionId ? { week, element: document.getElementById(week.sectionId) } : null))
      .filter((entry): entry is { week: ArchiveSidebarWeek; element: HTMLElement } => Boolean(entry?.element));

    if (sections.length === 0) return;

    const updateActiveWeek = () => {
      const anchorY = window.innerHeight * 0.28;
      let current = sections[0];

      for (const entry of sections) {
        if (entry.element.getBoundingClientRect().top > anchorY) break;
        current = entry;
      }

      if (activeWeekRef.current === current.week.key) return;
      activeWeekRef.current = current.week.key;
      setActiveWeekKey(current.week.key);
      const sectionId = current.week.sectionId;
      if (sectionId) {
        window.history.replaceState(
          window.history.state,
          "",
          `${window.location.pathname}${window.location.search}#${sectionId}`,
        );
      }
    };

    let frame: number | null = window.requestAnimationFrame(() => {
      frame = null;
      updateActiveWeek();
    });
    const scheduleUpdate = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        updateActiveWeek();
      });
    };

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [enableWeekScrollSpy, spyWeeks]);

  return (
    <aside className={`hidden md:block md:sticky md:top-24 md:self-start ${offsetClassName}`}>
      <nav
        aria-label={ariaLabel}
        className="space-y-4 text-[14px] leading-[2.1] text-[var(--muted)]"
      >
        {topLinks.length > 0 ? (
          <div className="space-y-2 pb-2">
            {topLinks.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className="block font-semibold text-[var(--accent)] transition-colors hover:text-[var(--accent-strong)]"
              >
                {link.label}
              </Link>
            ))}
          </div>
        ) : null}
        {months.map((month) => {
          const activeSidebarWeekKey = activeWeekKey ?? month.weeks.find((item) => item.active)?.key;

          return (
            <div key={month.key}>
              <Link
                href={month.href}
                className={`block ${
                  month.active
                    ? "text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--faint)]"
                    : "text-[14px] hover:text-[var(--foreground)]"
                }`}
              >
                {month.label}
              </Link>
              {month.active && month.weeks.length > 0 ? (
                <div className="mt-3 space-y-2 pl-3">
                  {month.weeks.map((week) => {
                    const weekActive = enableWeekScrollSpy
                      ? activeSidebarWeekKey === week.key
                      : week.active;
                    return (
                      <Link
                        key={week.key}
                        href={week.href}
                        aria-label={`${week.label}, ${month.label} ${week.rangeLabel}`}
                        aria-current={weekActive ? "location" : undefined}
                        className={`flex items-center gap-2.5 text-[14px] ${
                          weekActive
                            ? "font-semibold text-[var(--foreground)]"
                            : "pl-[15px] hover:text-[var(--foreground)]"
                        }`}
                      >
                        {weekActive ? (
                          <span
                            aria-hidden="true"
                            className="h-4 w-[3px] rounded-sm bg-[var(--accent)]"
                          />
                        ) : null}
                        {week.label}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
        {years.map((year) => (
          <Link
            key={year.key}
            href={year.href}
            className="block hover:text-[var(--foreground)]"
          >
            {year.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

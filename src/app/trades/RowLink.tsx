"use client";

import { useRouter } from "next/navigation";

export function RowLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <tr
      className={className}
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("a,button,input,select,textarea")) return;
        router.push(href);
      }}
    >
      {children}
    </tr>
  );
}

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

type ButtonVariant = "action" | "primary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const VARIANT_STYLE: Record<ButtonVariant, CSSProperties> = {
  // Strong action fill (Save / Done).
  action: { background: "var(--action)", color: "var(--action-foreground)" },
  // Accent-filled primary.
  primary: { background: "var(--accent)", color: "var(--background)" },
  // Outline / secondary.
  ghost: { border: "1px solid var(--border)", color: "var(--body)" },
};

/**
 * Button. `ghost` for secondary actions (Prev/Next/Clear), `action` for the
 * strong dark Save/Done, `primary` for accent-filled primary. See DESIGN_SYSTEM.md.
 */
export default function Button({ variant = "ghost", children, className = "", ...rest }: ButtonProps) {
  return (
    <button
      className={`h-10 rounded-[6px] px-4 text-[14px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:opacity-50 ${className}`}
      style={VARIANT_STYLE[variant]}
      {...rest}
    >
      {children}
    </button>
  );
}

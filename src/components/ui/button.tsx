// Butoane: un singur stil principal (accent), restul discrete. Vezi .claude/skills/ux.
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color-mix(in_srgb,var(--accent)_30%,transparent)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]",
        outline: "border border-[var(--line)] bg-white text-[var(--ink)] hover:bg-[#f5f5f7]",
        secondary: "bg-[#e8e8ed] text-[var(--ink)] hover:bg-[#dcdce1]",
        ghost: "text-[var(--accent)] hover:bg-[var(--accent-soft)]",
        destructive: "bg-[var(--red)] text-white hover:opacity-90",
        link: "text-[var(--accent)] underline-offset-4 hover:underline",
      },
      size: { sm: "h-8 px-4", md: "h-9 px-5", lg: "h-11 px-6 text-[15px]", icon: "size-9" },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

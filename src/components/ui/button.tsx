// Butoane în stil shadcn/ui (variante cu class-variance-authority). Vezi .claude/skills/ux.
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:pointer-events-none disabled:opacity-60 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[var(--accent)] text-white shadow-sm hover:bg-[var(--accent-hover)]",
        outline: "border border-slate-300 bg-white text-slate-800 shadow-xs hover:bg-slate-50",
        secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
        ghost: "text-slate-700 hover:bg-slate-100",
        destructive: "bg-red-700 text-white shadow-sm hover:bg-red-800",
        link: "text-[var(--accent)] underline-offset-4 hover:underline",
      },
      size: { sm: "h-8 px-3", md: "h-9 px-4", lg: "h-10 px-5 text-base", icon: "size-9" },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

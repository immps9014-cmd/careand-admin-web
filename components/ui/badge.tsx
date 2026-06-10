import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold transition-colors",
  {
    variants: {
      variant: {
        outline: "border border-warm-300 text-warm-700 bg-transparent",
        solid: "bg-warm-800 text-white",
        brand: "bg-brand-500 text-white",
        warn: "bg-warn-bg text-warn",
        danger: "bg-danger-bg text-danger",
        info: "bg-info-bg text-info",
        success: "bg-brand-50 text-brand-700",
        ai: "bg-gradient-to-br from-brand-500 to-brand-600 text-white",
      },
    },
    defaultVariants: {
      variant: "outline",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

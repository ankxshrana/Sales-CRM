import React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default: "bg-slate-100 text-slate-800",
        primary: "bg-indigo-100 text-indigo-800 border border-indigo-200",
        success: "bg-emerald-100 text-emerald-800 border border-emerald-200",
        warning: "bg-amber-100 text-amber-800 border border-amber-200",
        danger: "bg-rose-100 text-rose-800 border border-rose-200",
        outline: "border border-slate-300 text-slate-700",
        NEW: "bg-sky-100 text-sky-800 border border-sky-200",
        QUALIFIED: "bg-indigo-100 text-indigo-800 border border-indigo-200",
        PROPOSAL: "bg-violet-100 text-violet-800 border border-violet-200",
        NEGOTIATION: "bg-amber-100 text-amber-800 border border-amber-200",
        WON: "bg-emerald-100 text-emerald-800 border border-emerald-200",
        LOST: "bg-rose-100 text-rose-800 border border-rose-200",
        MANAGER: "bg-purple-100 text-purple-800 font-bold border border-purple-200",
        REP: "bg-blue-100 text-blue-800 border border-blue-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export const Badge = ({ className, variant, children, ...props }) => {
  return (
    <div className={cn(badgeVariants({ variant: variant || "default" }), className)} {...props}>
      {children}
    </div>
  );
};

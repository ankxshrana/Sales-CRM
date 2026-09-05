import React from "react";
import { cn } from "../../lib/utils";
import { AlertCircle, CheckCircle2, Info, XCircle } from "lucide-react";

export const Alert = ({ type = "info", title, message, className }) => {
  const styles = {
    info: "bg-blue-50 border-blue-200 text-blue-800",
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    error: "bg-rose-50 border-rose-200 text-rose-800",
  };

  const icons = {
    info: <Info className="h-5 w-5 text-blue-500 shrink-0" />,
    success: <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />,
    warning: <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />,
    error: <XCircle className="h-5 w-5 text-rose-500 shrink-0" />,
  };

  return (
    <div className={cn("flex gap-3 rounded-lg border p-4 text-sm leading-relaxed", styles[type], className)}>
      {icons[type]}
      <div className="flex-1">
        {title && <h5 className="font-semibold">{title}</h5>}
        {message && <div className="text-xs opacity-90 mt-0.5">{message}</div>}
      </div>
    </div>
  );
};

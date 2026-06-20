"use client";
import { RunModeBadge } from "./shell";

export function MobileFrame({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-navy px-4 py-8">
      <div className="mb-4 flex items-center gap-3">
        <RunModeBadge />
        <span className="text-xs text-ivory/60">Client companion · {title}</span>
      </div>
      <div className="relative w-full max-w-[400px] overflow-hidden rounded-[2.2rem] border-[10px] border-navy-900 bg-ivory shadow-lift">
        <div className="absolute left-1/2 top-0 z-10 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-navy-900" />
        <div className="max-h-[760px] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

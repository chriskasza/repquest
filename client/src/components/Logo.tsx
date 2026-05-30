import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)} data-testid="logo-repquest">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-primary" aria-hidden>
        <path
          d="M3 9v6M21 9v6M6 8v8M18 8v8M6 12h12"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-lg font-bold tracking-tight">
        Rep<span className="text-primary">Quest</span>
      </span>
    </div>
  );
}

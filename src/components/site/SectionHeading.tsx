import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  action,
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-8 flex flex-wrap items-end justify-between gap-4", className)}>
      <div>
        <p className="label-stamp text-xs text-rust">{eyebrow}</p>
        <h2 className="mt-2 text-3xl font-semibold text-foreground sm:text-4xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string }) {
  return (
    <section className="border-b border-border/70">
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-12 sm:px-6">
        <p className="label-stamp text-xs text-rust">{eyebrow}</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold text-foreground sm:text-5xl">{title}</h1>
        {intro && <p className="mt-4 max-w-2xl text-base text-muted-foreground">{intro}</p>}
      </div>
    </section>
  );
}

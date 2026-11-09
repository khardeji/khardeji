import { Link } from "@tanstack/react-router";
import { Cog } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ tone = "dark", className }: { tone?: "dark" | "light"; className?: string }) {
  return (
    <Link to="/" className={cn("group flex items-center gap-2.5", className)} aria-label="Khardeji — accueil">
      <span className="relative grid size-10 place-items-center rounded-full bg-rust text-rust-foreground shadow-sm ring-2 ring-brass/60">
        <Cog className="size-6 transition-transform duration-700 group-hover:rotate-90" strokeWidth={1.6} />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display text-[1.45rem] font-semibold tracking-tight",
            tone === "light" ? "text-on-dark" : "text-foreground",
          )}
        >
          Khardeji
        </span>
        <span className={cn("label-stamp text-[0.62rem]", tone === "light" ? "text-brass" : "text-rust")}>
          خردجي · Scrap Market
        </span>
      </span>
    </Link>
  );
}

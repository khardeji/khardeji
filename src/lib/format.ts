export function formatDT(value: number): string {
  const hasDecimals = Math.round(value) !== value;
  return (
    new Intl.NumberFormat("fr-TN", {
      minimumFractionDigits: hasDecimals ? 1 : 0,
      maximumFractionDigits: 3,
    }).format(value) + " DT"
  );
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-TN", { maximumFractionDigits: 3 }).format(value);
}

export function formatDateFr(iso: string): string {
  return new Intl.DateTimeFormat("fr-TN", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(iso),
  );
}

export function formatRemaining(ms: number): string {
  if (ms <= 0) return "Clôturée";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (d > 0) return `${d}j ${pad(h)}h ${pad(m)}m`;
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

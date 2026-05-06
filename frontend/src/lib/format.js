export const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2
});

export const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2
});

export const number = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2
});

export function formatMoney(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
  return money.format(Number(value));
}

export function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
  return number.format(Number(value));
}

export function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
  return `${number.format(Number(value))}%`;
}

export function formatDate(value) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

export function shortDate(value) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit"
  }).format(new Date(value));
}

export function csvEscape(value) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}


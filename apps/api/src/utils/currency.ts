interface CurrencyConfig {
  currency: string;
  symbol: string;
  gstLabel: string;
  gstRate: number;
}

const COUNTRY_CURRENCY_MAP: Record<string, CurrencyConfig> = {
  IN: { currency: "INR", symbol: "₹", gstLabel: "GST", gstRate: 18 },
  US: { currency: "USD", symbol: "$", gstLabel: "Tax", gstRate: 0 },
  GB: { currency: "GBP", symbol: "£", gstLabel: "VAT", gstRate: 20 },
  AU: { currency: "AUD", symbol: "A$", gstLabel: "GST", gstRate: 10 },
  SG: { currency: "SGD", symbol: "S$", gstLabel: "GST", gstRate: 9 },
  AE: { currency: "AED", symbol: "AED", gstLabel: "VAT", gstRate: 5 },
  DEFAULT: { currency: "INR", symbol: "₹", gstLabel: "GST", gstRate: 18 }
};

const LOCATION_HINTS: Array<{ pattern: RegExp; code: keyof typeof COUNTRY_CURRENCY_MAP }> = [
  { pattern: /\b(india|in|karnataka|bengaluru|bangalore)\b/i, code: "IN" },
  { pattern: /\b(united states|usa|us)\b/i, code: "US" },
  { pattern: /\b(united kingdom|uk|england|great britain)\b/i, code: "GB" },
  { pattern: /\b(australia|au)\b/i, code: "AU" },
  { pattern: /\b(singapore|sg)\b/i, code: "SG" },
  { pattern: /\b(uae|dubai|abu dhabi|united arab emirates|ae)\b/i, code: "AE" }
];

function byLocationHint(clientLocation?: string): CurrencyConfig | null {
  if (!clientLocation) return null;

  for (const hint of LOCATION_HINTS) {
    if (hint.pattern.test(clientLocation)) {
      return COUNTRY_CURRENCY_MAP[hint.code];
    }
  }

  return null;
}

function countryFromEmail(clientEmail: string): CurrencyConfig | null {
  const domain = clientEmail.split("@")[1]?.toLowerCase() ?? "";
  if (domain.endsWith(".in")) return COUNTRY_CURRENCY_MAP.IN;
  if (domain.endsWith(".us")) return COUNTRY_CURRENCY_MAP.US;
  if (domain.endsWith(".uk")) return COUNTRY_CURRENCY_MAP.GB;
  if (domain.endsWith(".au")) return COUNTRY_CURRENCY_MAP.AU;
  if (domain.endsWith(".sg")) return COUNTRY_CURRENCY_MAP.SG;
  if (domain.endsWith(".ae")) return COUNTRY_CURRENCY_MAP.AE;
  return null;
}

async function geolocateCurrency(): Promise<CurrencyConfig | null> {
  try {
    const response = await fetch("https://ipapi.co/json/", {
      signal: AbortSignal.timeout(3000),
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { country_code?: string };
    const code = (data.country_code ?? "").toUpperCase();
    if (!code) return null;

    return COUNTRY_CURRENCY_MAP[code] ?? null;
  } catch {
    return null;
  }
}

export async function detectCurrency(clientEmail: string, clientLocation?: string): Promise<CurrencyConfig> {
  return (
    byLocationHint(clientLocation) ??
    countryFromEmail(clientEmail) ??
    (await geolocateCurrency()) ??
    COUNTRY_CURRENCY_MAP.DEFAULT
  );
}

export function formatCurrency(amount: number, symbol: string, currency: string): string {
  if (currency === "INR") {
    return `${symbol}${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  }

  return `${symbol}${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export { COUNTRY_CURRENCY_MAP };

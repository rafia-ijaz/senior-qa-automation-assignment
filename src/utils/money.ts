export type Money = {
  currencySymbol: string;
  cents: number;
};

export function parseMoney(text: string): Money {
  // DemoWebShop displays prices like "$1,234.56" (USD)
  const trimmed = text.trim();
  const currencySymbol = trimmed[0];
  const normalized = trimmed
    .replace(/[^0-9.,-]/g, '')
    .replace(/,/g, '');

  const value = Number.parseFloat(normalized);
  if (Number.isNaN(value)) {
    throw new Error(`Could not parse money from: "${text}"`);
  }

  return { currencySymbol, cents: Math.round(value * 100) };
}

export function formatMoney({ currencySymbol, cents }: Money): string {
  const abs = Math.abs(cents);
  const dollars = (abs / 100).toFixed(2);
  const sign = cents < 0 ? '-' : '';
  return `${sign}${currencySymbol}${dollars}`;
}

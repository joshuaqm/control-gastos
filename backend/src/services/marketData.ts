import { logger } from '../utils/logger';

const TIMEOUT_MS = 10000;
const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36';

// CoinGecko IDs for common crypto tickers (fallback: lowercase ticker)
const COINGECKO_IDS: Record<string, string> = {
  btc: 'bitcoin',
  eth: 'ethereum',
  usdt: 'tether',
  usdc: 'usd-coin',
  bnb: 'binancecoin',
  xrp: 'ripple',
  ada: 'cardano',
  doge: 'dogecoin',
  sol: 'solana',
  dot: 'polkadot',
  matic: 'matic-network',
  ltc: 'litecoin',
  avax: 'avalanche-2',
  link: 'chainlink',
  shib: 'shiba-inu',
  trx: 'tron',
  uni: 'uniswap',
  atom: 'cosmos',
  eth2: 'ethereum',
};

async function fetchJson(url: string, timeout = TIMEOUT_MS): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** USD → MXN rate via free exchange API, cached for a short time. */
let cachedMxnRate: number | null = null;
let cachedMxnAt = 0;
const FX_CACHE_MS = 60 * 60 * 1000; // 1 hour

async function getUsdToMxn(): Promise<number> {
  if (cachedMxnRate !== null && Date.now() - cachedMxnAt < FX_CACHE_MS) {
    return cachedMxnRate;
  }
  const data = await fetchJson('https://open.er-api.com/v6/latest/USD') as {
    result?: string;
    rates?: Record<string, number>;
  };
  const rate = data?.rates?.MXN;
  if (typeof rate !== 'number' || !isFinite(rate)) {
    throw new Error('No se pudo obtener el tipo de cambio USD/MXN');
  }
  cachedMxnRate = rate;
  cachedMxnAt = Date.now();
  return rate;
}

/**
 * Normalize a BMV (Mexican Stock Exchange) symbol to the format Yahoo Finance
 * accepts. BMV uses "WALMEX *" and "FUNO 11"; Yahoo expects "WALMEX.MX" and
 * "FUNO11.MX". Simple tickers like "VOO" or "AAPL" are left untouched.
 */
function toYahooSymbol(ticker: string): string {
  const t = ticker.trim().toUpperCase();
  if (!t) return t;
  if (t.includes('.')) return t;
  if (!t.includes(' ') && !t.includes('*')) return t;
  const base = t.replace(/[*\s]/g, '');
  return `${base}.MX`;
}

/**
 * Fetch the latest market price (in MXN) for a symbol.
 * - crypto: CoinGecko
 * - stocks / ETFs / fixed income: Yahoo Finance + USD/MXN conversion
 */
export async function fetchMarketPrice(ticker: string, type: string): Promise<{
  price: number;
  currency: string;
  source: string;
}> {
  const t = ticker.trim().toUpperCase();

  if (type === 'crypto') {
    const id = COINGECKO_IDS[t.toLowerCase()] ?? t.toLowerCase();
    const data = await fetchJson(
      `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=mxn`
    ) as Record<string, { mxn?: number }>;
    const coin = data?.[id];
    const price = coin?.mxn;
    if (typeof price !== 'number' || !isFinite(price)) {
      throw new Error(`Sin cotización para ${ticker} en CoinGecko`);
    }
    return { price, currency: 'MXN', source: 'CoinGecko' };
  }

  const symbol = toYahooSymbol(t);
  const data = await fetchJson(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`
  ) as {
    chart?: {
      result?: { meta?: { regularMarketPrice?: number; currency?: string } }[];
    };
  };
  const meta = data?.chart?.result?.[0]?.meta;
  const usdPrice = meta?.regularMarketPrice;
  if (typeof usdPrice !== 'number' || !isFinite(usdPrice)) {
    throw new Error(`Sin cotización para ${ticker} en Yahoo Finance`);
  }

  const metaCurrency = (meta?.currency ?? 'USD').toUpperCase();
  if (metaCurrency === 'MXN') {
    return { price: usdPrice, currency: 'MXN', source: 'Yahoo Finance' };
  }

  const mxnRate = await getUsdToMxn();
  return { price: usdPrice * mxnRate, currency: 'MXN', source: 'Yahoo Finance + FX' };
}

export async function refreshInvestmentPrice(investment: {
  id: number;
  name: string;
  ticker?: string | null;
  type: string;
}): Promise<{ price: number; currency: string; source: string }> {
  const ticker = investment.ticker?.trim();
  if (!ticker) {
    throw new Error(`La inversión "${investment.name}" no tiene ticker`);
  }
  const result = await fetchMarketPrice(ticker, investment.type);
  logger.info(`Investment ${investment.id} (${ticker}): ${result.price} ${result.currency} via ${result.source}`);
  return result;
}

const toMonthKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const HISTORY_CACHE_MS = 60 * 60 * 1000; // 1 hour
const historyCache = new Map<string, { at: number; data: { month: string; price: number }[] }>();

async function fetchCryptoMonthlyHistory(ticker: string): Promise<{ month: string; price: number }[]> {
  const t = ticker.trim().toUpperCase();
  const id = COINGECKO_IDS[t.toLowerCase()] ?? t.toLowerCase();
  const data = await fetchJson(
    `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/market_chart?vs_currency=mxn&days=1095&interval=daily`
  ) as { prices?: [number, number][] };
  const prices = data?.prices;
  if (!Array.isArray(prices) || prices.length === 0) {
    throw new Error(`Sin histórico para ${ticker} en CoinGecko`);
  }
  const byMonth = new Map<string, number>();
  for (const [ts, price] of prices) {
    if (typeof price !== 'number' || !isFinite(price)) continue;
    const month = toMonthKey(new Date(ts));
    byMonth.set(month, Math.max(byMonth.get(month) ?? -Infinity, price));
  }
  return [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, price]) => ({ month, price: Math.round(price * 100) / 100 }));
}

async function fetchYahooMonthlyHistory(ticker: string): Promise<{ month: string; price: number }[]> {
  const symbol = toYahooSymbol(ticker);
  const data = await fetchJson(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1mo&range=5y`
  ) as {
    chart?: {
      result?: {
        timestamp?: number[];
        indicators?: { quote?: { high?: (number | null)[] }[] };
        meta?: { currency?: string };
      }[];
    };
  };
  const r = data?.chart?.result?.[0];
  const high = r?.indicators?.quote?.[0]?.high;
  if (!r?.timestamp || !high || high.length === 0) {
    throw new Error(`Sin histórico para ${ticker} en Yahoo Finance`);
  }
  const metaCurrency = (r.meta?.currency ?? 'USD').toUpperCase();
  let fx = 1;
  if (metaCurrency !== 'MXN') {
    fx = await getUsdToMxn();
  }
  const byMonth = new Map<string, number>();
  for (let i = 0; i < r.timestamp.length; i++) {
    const h = high[i];
    if (typeof h !== 'number' || !isFinite(h)) continue;
    const month = toMonthKey(new Date(r.timestamp[i] * 1000));
    byMonth.set(month, Math.max(byMonth.get(month) ?? -Infinity, h * fx));
  }
  return [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, price]) => ({ month, price: Math.round(price * 100) / 100 }));
}

/**
 * Fetch monthly historical prices (MXN) for a symbol, using the maximum value
 * of each month (Yahoo "high" or CoinGecko aggregated). Results are cached in
 * memory for an hour.
 */
export async function fetchMonthlyHistory(
  ticker: string,
  type: string
): Promise<{ month: string; price: number }[]> {
  const t = ticker.trim();
  const key = `${type}:${t.toUpperCase()}`;
  const cached = historyCache.get(key);
  if (cached && Date.now() - cached.at < HISTORY_CACHE_MS) {
    return cached.data;
  }
  const data = type === 'crypto'
    ? await fetchCryptoMonthlyHistory(t)
    : await fetchYahooMonthlyHistory(t);
  historyCache.set(key, { at: Date.now(), data });
  return data;
}
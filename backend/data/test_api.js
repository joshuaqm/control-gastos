const yahoo = 'https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1d';
const gecko = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd';
const nasdaq = 'https://api.nasdaq.com/api/quote/AAPL/info?assetclass=stocks';

async function tryFetch(name, url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: controller.signal });
    const body = await res.text();
    console.log(`== ${name} == status ${res.status}`);
    console.log(body.slice(0, 400));
  } catch (e) {
    console.log(`== ${name} == ERROR:`, e.message);
  } finally {
    clearTimeout(t);
  }
}

(async () => {
  await tryFetch('yahoo', yahoo);
  await tryFetch('coingecko', gecko);
  await tryFetch('nasdaq', nasdaq);
})();
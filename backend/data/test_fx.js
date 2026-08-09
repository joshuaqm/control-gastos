async function tryFetch(name, url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: controller.signal });
    const body = await res.text();
    console.log(`== ${name} == status ${res.status}`);
    console.log(body.slice(0, 300));
  } catch (e) {
    console.log(`== ${name} == ERROR:`, e.message);
  } finally {
    clearTimeout(t);
  }
}

(async () => {
  await tryFetch('exchangerate', 'https://api.exchangerate-api.com/v4/latest/USD');
  await tryFetch('er-api', 'https://open.er-api.com/v6/latest/USD');
  await tryFetch('coingecko-voo', 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=mxn,usd');
})();
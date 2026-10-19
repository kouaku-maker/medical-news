// 外部サイトの取得と、取得先URLの安全確認
async function fetchText(url) {
  const r = await fetch(url, {
    headers: { 'User-Agent': 'medical-news-app/0.3' },
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return (await r.text()).slice(0, 3000000);
}

// http/https のみ。社内・ローカルのアドレスは拒否
function isSafeUrl(u) {
  try {
    const x = new URL(u);
    if (!/^https?:$/.test(x.protocol)) return false;
    const h = x.hostname.toLowerCase();
    if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return false;
    if (h.startsWith('[')) return false;
    if (/^(0\.|10\.|127\.|169\.254\.|192\.168\.)/.test(h)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false;
    return true;
  } catch (e) { return false; }
}

module.exports = { fetchText, isSafeUrl };

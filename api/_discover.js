const { parseFeed, feedTitle } = require('./_parse');
const { fetchText, isSafeUrl } = require('./_http');

const FEED_TYPE = /type=["']application\/(rss\+xml|atom\+xml|rdf\+xml)["']/i;

// URLから使えるフィードをすべて集めて返す(そのページ専用のものを先頭に)
async function discover(inputUrl) {
  const text = await fetchText(inputUrl);
  const own = parseFeed(text);
  if (own.length) return [{ url: inputUrl, title: feedTitle(text), count: own.length }];

  const base = new URL(inputUrl);
  const dir = base.pathname.replace(/\/?$/, '/');
  const cands = [];
  const add = (href) => {
    try {
      const u = new URL(String(href).replace(/&amp;/g, '&'), inputUrl).href;
      if (isSafeUrl(u) && !cands.includes(u)) cands.push(u);
    } catch (e) { /* 無効なURLは無視 */ }
  };

  // ページ内の <link rel="alternate"> をすべて拾う
  for (const t of text.match(/<link[^>]+>/gi) || []) {
    if (/rel=["']alternate["']/i.test(t) && FEED_TYPE.test(t)) add((t.match(/href=["']([^"']+)["']/i) || [])[1]);
  }
  // WordPressの一覧ページ専用フィード(例: /external-events/ → /external-events/feed/)
  if (dir !== '/') add(dir + 'feed/');

  const specific = (u) => dir !== '/' && new URL(u).pathname.startsWith(dir);
  cands.sort((a, b) => specific(b) - specific(a));

  const checked = await Promise.allSettled(cands.slice(0, 5).map(async (u) => {
    const t = await fetchText(u);
    const n = parseFeed(t).length;
    return n ? { url: u, title: feedTitle(t), count: n } : null;
  }));
  return checked.filter((r) => r.status === 'fulfilled' && r.value).map((r) => r.value);
}

module.exports = { discover };

const { parseFeed, feedTitle } = require('./_parse');
const { fetchText, isSafeUrl } = require('./_http');

// 入力されたURLがフィードならそのまま、サイトのページならRSSのリンクを探す
async function discover(inputUrl) {
  const text = await fetchText(inputUrl);
  if (parseFeed(text).length) {
    return { url: inputUrl, title: feedTitle(text), count: parseFeed(text).length };
  }
  const tags = text.match(/<link[^>]+>/gi) || [];
  const alt = tags.find((t) =>
    /rel=["']alternate["']/i.test(t) && /type=["']application\/(rss\+xml|atom\+xml|rdf\+xml)["']/i.test(t));
  const href = alt && (alt.match(/href=["']([^"']+)["']/i) || [])[1];
  if (!href) return null;

  const url = new URL(href.replace(/&amp;/g, '&'), inputUrl).href;
  if (!isSafeUrl(url)) return null;
  const t2 = await fetchText(url);
  const n = parseFeed(t2).length;
  return n ? { url, title: feedTitle(t2), count: n } : null;
}

module.exports = { discover };

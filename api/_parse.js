const dec = (s) => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&').trim();

const tag = (b, n) => {
  const m = b.match(new RegExp(`<${n}[^>]*>([\\s\\S]*?)</${n}>`));
  return m ? dec(m[1]) : '';
};

// RSS 1.0(RDF)/ RSS 2.0 / Atom に対応
function parseFeed(xml) {
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/g) || [];
  return blocks.map((b) => {
    let link = tag(b, 'link');
    if (!link) { const m = b.match(/<link[^>]*href="([^"]+)"/); link = m ? m[1] : ''; }
    const d = tag(b, 'dc:date') || tag(b, 'pubDate') || tag(b, 'updated') || tag(b, 'published');
    const t = Date.parse(d);
    return { title: tag(b, 'title'), link, date: isNaN(t) ? null : t };
  }).filter((i) => i.title && i.link);
}

module.exports = { parseFeed };

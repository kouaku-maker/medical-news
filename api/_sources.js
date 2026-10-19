module.exports = [
  { id: 'pmda-safety', name: 'PMDA 安全対策', url: 'https://www.pmda.go.jp/rss_018.xml' },
  { id: 'jsdt', name: '日本透析医学会', url: 'https://www.jsdt.or.jp/index_rss2.xml' },

  // RSSがあるサイトは、1行足すだけ:
  // { id: 'pmda-all', name: 'PMDA すべて', url: 'https://www.pmda.go.jp/rss_015.xml' },

  // RSSがないサイトは parse を書く(HTMLから {title, link, date} の配列を返す):
  // { id: 'example', name: '○○学会', url: 'https://example.jp/news',
  //   parse: (html) => [{ title: '...', link: 'https://...', date: Date.parse('2026-10-01') }] },
];

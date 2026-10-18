const redis = require('./_redis');
const sources = require('./_sources');
const { parseFeed } = require('./_parse');

const MAX_ITEMS = 300;   // 保存する件数
const COOLDOWN = 300;    // 更新の最短間隔(秒)

async function fetchSource(s) {
  const r = await fetch(s.url, {
    headers: { 'User-Agent': 'medical-news-app/0.2' },
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const text = await r.text();
  const list = s.parse ? s.parse(text) : parseFeed(text);
  return list.map((i) => ({ ...i, source: s.id, sourceName: s.name }));
}

async function refresh() {
  const got = await redis.set('refresh:lock', 1, { nx: true, ex: COOLDOWN });
  if (!got) return { skipped: true };

  const results = await Promise.allSettled(sources.map(fetchSource));
  const map = new Map(((await redis.get('items')) || []).map((i) => [i.link, i]));
  const now = Date.now();
  let added = 0;
  const errors = [];

  results.forEach((r, idx) => {
    if (r.status === 'rejected') { errors.push(sources[idx].id); return; }
    for (const i of r.value) {
      if (!map.has(i.link)) { map.set(i.link, { ...i, date: i.date || now, added: now }); added++; }
    }
  });

  const items = [...map.values()].sort((a, b) => b.date - a.date).slice(0, MAX_ITEMS);
  await redis.set('items', items);
  await redis.set('meta', { updated: now, errors });
  return { added, errors };
}

module.exports = { refresh };

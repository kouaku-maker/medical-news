const redis = require('./_redis');
const staticSources = require('./_sources');
const { parseFeed } = require('./_parse');
const { fetchText } = require('./_http');

const MAX_ITEMS = 300;   // 保存する件数
const COOLDOWN = 300;    // 更新の最短間隔(秒)

// 固定のサイト(_sources.js)+ 画面から追加したサイト
async function getSources() {
  const custom = (await redis.get('sources:custom')) || [];
  return [...staticSources, ...custom.map((s) => ({ ...s, custom: true }))];
}

async function fetchSource(s) {
  const text = await fetchText(s.url);
  const list = s.parse ? s.parse(text) : parseFeed(text);
  return list.map((i) => ({ ...i, source: s.id, sourceName: s.name }));
}

async function refresh({ force = false } = {}) {
  if (!force) {
    const got = await redis.set('refresh:lock', 1, { nx: true, ex: COOLDOWN });
    if (!got) return { skipped: true };
  }
  const sources = await getSources();
  const results = await Promise.allSettled(sources.map(fetchSource));
  const map = new Map(((await redis.get('items')) || []).map((i) => [i.link, i]));
  const now = Date.now();
  let added = 0;
  const errors = [];

  results.forEach((r, idx) => {
    if (r.status === 'rejected') { errors.push(sources[idx].name); return; }
    for (const i of r.value) {
      if (!map.has(i.link)) { map.set(i.link, { ...i, date: i.date || now, added: now }); added++; }
    }
  });

  const items = [...map.values()].sort((a, b) => b.date - a.date).slice(0, MAX_ITEMS);
  await redis.set('items', items);
  await redis.set('meta', { updated: now, errors });
  return { added, errors };
}

async function removeSourceItems(id) {
  const items = ((await redis.get('items')) || []).filter((i) => i.source !== id);
  await redis.set('items', items);
}

module.exports = { refresh, getSources, removeSourceItems };

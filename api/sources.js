const crypto = require('crypto');
const redis = require('./_redis');
const { getSources, refresh, removeSourceItems } = require('./_refresh');
const { isSafeUrl } = require('./_http');
const { discover } = require('./_discover');
const { authed } = require('./_auth');

const MAX_CUSTOM = 20;
const strip = ({ id, name, url, custom }) => ({ id, name, url, custom: !!custom });

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') {
      return res.status(200).json({ sources: (await getSources()).map(strip) });
    }
    if (!(await authed(req, res))) return;
    const custom = (await redis.get('sources:custom')) || [];

    if (req.method === 'POST') {
      const { url, name } = req.body || {};
      if (!isSafeUrl(url)) return res.status(400).json({ error: 'URLが正しくありません(http:// か https:// から始まるもの)' });
      if (custom.length >= MAX_CUSTOM) return res.status(400).json({ error: `追加できるのは${MAX_CUSTOM}件までです` });

      let found;
      try { found = await discover(url); }
      catch (e) { return res.status(400).json({ error: 'サイトを取得できませんでした。URLを確認してください' }); }
      if (!found) return res.status(400).json({ error: 'このサイトにはRSSが見つかりませんでした' });
      if ((await getSources()).some((s) => s.url === found.url)) {
        return res.status(400).json({ error: 'すでに登録されています' });
      }

      const id = 'c' + crypto.createHash('sha1').update(found.url).digest('hex').slice(0, 8);
      const s = { id, name: String(name || found.title || found.url).trim().slice(0, 40), url: found.url };
      await redis.set('sources:custom', [...custom, s]);
      await refresh({ force: true });
      return res.status(200).json({ ok: true, source: strip({ ...s, custom: true }), count: found.count });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!custom.some((s) => s.id === id)) return res.status(404).json({ error: '見つかりません' });
      await redis.set('sources:custom', custom.filter((s) => s.id !== id));
      await removeSourceItems(id);
      return res.status(200).json({ ok: true });
    }
    res.status(405).end();
  } catch (e) { res.status(500).json({ error: '処理に失敗しました' }); }
};

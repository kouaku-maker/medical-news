const crypto = require('crypto');
const redis = require('./_redis');
const { getSources, refresh, removeSourceItems } = require('./_refresh');
const { isSafeUrl } = require('./_http');
const { discover } = require('./_discover');

const MAX_CUSTOM = 20;
const strip = ({ id, name, url, custom }) => ({ id, name, url, custom: !!custom });

// 管理パスワードの確認(追加・削除のときだけ)。失敗が続いたら一時停止
async function authed(req, res) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) { res.status(503).json({ error: '管理パスワード(ADMIN_PASSWORD)が未設定です' }); return false; }
  if (Number(await redis.get('auth:fail')) >= 10) {
    res.status(429).json({ error: '失敗が続いたため、しばらく待ってください' }); return false;
  }
  const a = Buffer.from(String(req.headers['x-admin-password'] || ''));
  const b = Buffer.from(pw);
  if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
  if ((await redis.incr('auth:fail')) === 1) await redis.expire('auth:fail', 600);
  res.status(401).json({ error: 'パスワードが違います' });
  return false;
}

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

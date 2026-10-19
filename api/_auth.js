const crypto = require('crypto');
const redis = require('./_redis');

// 管理パスワードの確認(追加・削除・お気に入りの変更のときだけ)。失敗が続いたら一時停止
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

module.exports = { authed };

const { redis } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const sub = req.body;
  if (!sub || !sub.endpoint) return res.status(400).json({ error: 'invalid' });
  await redis.hset('subs', { [sub.endpoint]: sub });
  res.status(200).json({ ok: true });
};

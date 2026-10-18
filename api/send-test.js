const { send } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const sub = req.body;
  if (!sub || !sub.endpoint) return res.status(400).json({ error: 'invalid' });
  const ok = await send(sub, {
    title: 'テスト通知',
    body: '通知は正常に届いています。',
    url: '/',
  });
  res.status(ok ? 200 : 500).json({ ok });
};

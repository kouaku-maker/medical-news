const { redis } = require('./_lib');

// 毎日1回(UTC 22:00 = 日本時間 7:00 前後)に呼ばれる
module.exports = async (req, res) => {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end();
  }
  const subs = Object.values((await redis.hgetall('subs')) || {});

  // TODO(次のステップ): PMDA・学会などの新着を取得し、
  // 前回との差分があれば send(sub, { title, body, url }) で全員に通知する

  res.status(200).json({ ok: true, subscribers: subs.length });
};

const { refresh } = require('./_refresh');

// cron(毎日1回)と、画面の「更新」ボタンの両方から呼ばれる
module.exports = async (req, res) => {
  try { res.status(200).json(await refresh()); }
  catch (e) { res.status(500).json({ error: 'failed' }); }
};

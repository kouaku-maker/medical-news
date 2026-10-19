const redis = require('./_redis');
const { getSources } = require('./_refresh');

module.exports = async (req, res) => {
  const [items, meta, sources] = await Promise.all([redis.get('items'), redis.get('meta'), getSources()]);
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    items: items || [],
    meta: meta || null,
    sources: sources.map(({ id, name }) => ({ id, name })),
  });
};

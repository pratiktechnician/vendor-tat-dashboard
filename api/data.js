/* Vercel serverless function:  GET /api/data  ->  normalised vendor-survey JSON */
const { buildPayload, etagOf } = require('../lib/datasource');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');      // always fresh – the browser polls this
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const payload = await buildPayload();
    const etag = etagOf(payload);
    res.setHeader('ETag', etag);
    if (req.headers['if-none-match'] === etag) {
      // data unchanged – only the sync time moves; tell the client cheaply
      res.setHeader('X-Generated-At', payload.generatedAt);
      res.statusCode = 304;
      return res.end();
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.statusCode = 200;
    res.end(JSON.stringify(payload));
  } catch (err) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message }));
  }
};

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    status: 'ok',
    apiKey: process.env.OPENROUTER_API_KEY
      ? `set (starts with ${process.env.OPENROUTER_API_KEY.slice(0, 8)}...)`
      : 'NOT SET ❌',
    node: process.version,
    ts: new Date().toISOString(),
  });
}

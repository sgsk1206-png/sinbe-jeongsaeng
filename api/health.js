export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const key = process.env.ANTHROPIC_API_KEY;
  res.json({
    status: 'ok',
    anthropicApiKey: key
      ? `set (starts with ${key.slice(0, 10)}...)`
      : 'NOT SET ❌',
    node: process.version,
    ts: new Date().toISOString(),
  });
}

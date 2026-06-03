// GET /api/share-get?id={shareId}
// returns: { userName, life, soulGrade, total } or { error }

async function redisGet(key) {
  const url   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Redis 환경변수 미설정 (KV_REST_API_URL / KV_REST_API_TOKEN)');

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['GET', key]),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Redis GET error: ${data.error}`);
  return data.result; // null if not found, string if found
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const shareId = req.query?.id || new URL(req.url, 'http://x').searchParams.get('id');
  if (!shareId) return res.status(400).json({ error: 'id 파라미터 필요' });

  try {
    const raw = await redisGet(`share:${shareId}`);
    if (!raw) {
      console.log(`[share-get] not found shareId=${shareId}`);
      return res.status(404).json({ error: '이미 사라진 전생입니다' });
    }
    const data = JSON.parse(raw);
    console.log(`[share-get] hit shareId=${shareId}`);
    return res.json(data);
  } catch (err) {
    console.error('[share-get] error:', err.message);
    return res.status(500).json({ error: `조회 실패: ${err.message}` });
  }
}

// POST /api/share-save
// body: { userName, life, soulGrade, total }
// returns: { shareId }

const TTL_SECONDS = 30 * 24 * 60 * 60; // 30일

function generateId() {
  // 6자리 영숫자 대문자 랜덤 ID
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function redisSet(key, value) {
  const url   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Redis 환경변수 미설정 (KV_REST_API_URL / KV_REST_API_TOKEN)');

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['SET', key, JSON.stringify(value), 'EX', TTL_SECONDS]),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Redis SET error: ${data.error}`);
  return data.result;
}

async function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch {} }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', c => { raw += c.toString(); });
    req.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = await parseBody(req);
  if (!body?.life) return res.status(400).json({ error: '전생 데이터(life)가 없습니다' });

  try {
    let shareId;
    let attempts = 0;
    // ID 충돌 가능성 극히 낮지만 방어적으로 최대 3회 시도
    do {
      shareId = generateId();
      attempts++;
    } while (attempts < 3);

    await redisSet(`share:${shareId}`, {
      userName: body.userName || '',
      life:      body.life,
      soulGrade: body.soulGrade || '',
      total:     body.total || 1,
    });

    console.log(`[share-save] saved shareId=${shareId}`);
    return res.json({ shareId });
  } catch (err) {
    console.error('[share-save] error:', err.message);
    return res.status(500).json({ error: `저장 실패: ${err.message}` });
  }
}

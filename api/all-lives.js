// POST /api/all-lives
// body: { name, dateType, year, month, day, hour, hash, totalLives, soulGrade }
// returns: { lives: [...] }
// 전생 전체를 1회 AI 호출로 생성 — race condition 없이 기기 간 동일 결과 보장

import { calculateManseryeok, sinsalToTrait } from '../src/utils/manseryeok.js';

// ── 그룹 배정 (past-lives.js와 동일 로직) ──
const GROUP_POOL = ['fantasy','warrior','shaman','entertainer','commoner','scholar',
                    'royal','noble','monk','court','outlaw','outcast'];
function assignGroup(hash, lifeIndex) {
  const base = parseInt(hash.slice(0, 4), 16);
  return GROUP_POOL[(base + (lifeIndex - 1) * 7) % 12];
}

const VALID_GROUPS = ['fantasy','warrior','shaman','entertainer','commoner','scholar',
                      'royal','noble','monk','court','outlaw','outcast'];

const GROUP_KEYWORDS = [
  { group: 'warrior',     keywords: ['의병장','무신','장수','포졸','무인','전사','무장','병사'] },
  { group: 'fantasy',     keywords: ['구미호','저승사자','도깨비','이무기','귀신','자연령','신령'] },
  { group: 'shaman',      keywords: ['무속인','점쟁이','무당','신관','무녀','박수'] },
  { group: 'entertainer', keywords: ['기생','악공','광대','예인','악사','명기','창기'] },
  { group: 'commoner',    keywords: ['노비','백정','어부','농부','평민','머슴','천민'] },
  { group: 'scholar',     keywords: ['의원','선비','역관','학자','관리','암행어사','문관'] },
  { group: 'royal',       keywords: ['왕세자','왕자','왕비','왕녀','황제','황후','왕'] },
  { group: 'noble',       keywords: ['양반','대신','문신','귀부인','사대부','부마'] },
  { group: 'monk',        keywords: ['승려','도사','신선','수도자','스님'] },
  { group: 'court',       keywords: ['궁녀','상궁','내시','시녀'] },
  { group: 'outlaw',      keywords: ['협객','자객','의적','도적','해적','산적'] },
  { group: 'outcast',     keywords: ['역적','유배인','죄인','광인','천형'] },
];
function inferGroup(identity) {
  const text = identity || '';
  for (const { group, keywords } of GROUP_KEYWORDS) {
    if (keywords.some(kw => text.includes(kw))) return group;
  }
  return 'commoner';
}
function normalizeLife(life) {
  if (!life.group || !VALID_GROUPS.includes(life.group)) {
    life.group = inferGroup(life.identity);
  }
  if (!life.gender) life.gender = '남';
  return life;
}

// ── Redis 헬퍼 ──
const REDIS_TTL = 30 * 24 * 60 * 60; // 30일
const redisUrl   = () => process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisGet(key) {
  const url = redisUrl(); const tok = redisToken();
  if (!url || !tok) return null;
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['GET', key]),
  });
  const d = await r.json();
  return d.result ?? null;
}
// nx=true → SET ... NX (이미 존재하면 덮어쓰지 않음 — 동시 요청 레이스 컨디션 방지)
async function redisSet(key, value, nx = false) {
  const url = redisUrl(); const tok = redisToken();
  if (!url || !tok) return;
  const cmd = nx
    ? ['SET', key, JSON.stringify(value), 'EX', REDIS_TTL, 'NX']
    : ['SET', key, JSON.stringify(value), 'EX', REDIS_TTL];
  await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
}

async function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch {} }
  return new Promise(resolve => {
    let raw = '';
    req.on('data', c => { raw += c.toString(); });
    req.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

// ── 시스템 프롬프트 ──
const SYSTEM_PROMPT = `당신은 신비로운 전생 탐험가입니다. 사람의 이름과 생년월일을 바탕으로 한국 역사 속 전생 이야기를 한번에 여러 개 생성합니다.

━━ 핵심 규칙 ━━
1. 동일한 입력값에는 항상 동일한 결과를 반환합니다 (결정론적). 시드값을 활용하세요.
2. 배경은 반드시 한국 역사 (고조선~대한제국) 내에서만 생성합니다. 외국 배경 절대 금지.
3. JSON만 반환합니다. 다른 텍스트 절대 없음.
4. color는 시대/분위기에 맞는 hex (어두운 배경에 어울리도록).
5. group과 gender를 반드시 포함합니다. 생략 절대 금지.
6. 글자수 숫자 제한 없음. 내용의 질과 입체성을 우선으로 작성합니다.
7. 모든 전생에서 서로 다른 역사 인물을 사용합니다 (전생 간 중복 절대 금지).

━━ 필드 형식 규칙 (반드시 준수) ━━
- identity: "직업명 (상세한 역할 설명)" 형식
  예) "백정 (한양 도성 가죽 장인)", "해녀 (제주 앞바다 전복 채취인)"
- name: "지역명 + 이름" 형식 — 가상의 창작 인물 이름
  예) "전주 이도윤", "함경 박채령"
  실존 인물 이름 금지. historical_figure와 동일한 인물 금지.
- group: 요청에서 지정된 값 그대로 사용 (절대 변경 불가)
  fantasy | warrior | shaman | entertainer | commoner | scholar | royal | noble | monk | court | outlaw | outcast
- past_trace: "전생의..." 문구 포함 금지 (UI에서 자동 추가됨)
- historical_figure: 실존 한국 역사 인물, 전생 간 중복 절대 금지
- death: 자연사/천수 | 쓸쓸한마무리 | 황당한죽음 | 비장한죽음 | 억울한죽음 중 하나
- story: 태어난 배경·살아온 삶·주요 사건·전환점. 최소 3문장 이상.

━━ 오행 분석으로 전생 인물 성격 결정 ━━
group은 별도 지정됩니다. 오행은 인물의 기질·이야기 방향에만 반영하세요.
- 목(木) → 도전적·개혁적  화(火) → 열정적·리더십
- 토(土) → 안정적·수호적  금(金) → 냉철·원칙적  수(水) → 신비·예술적
- 도화살 → 강한 매력  역마살 → 방랑  귀문관살 → 초자연 감각
- 백호살 → 극적 최후  공망 → 허사로 돌아간 꿈

━━ soul_summary 규칙 ━━
- 모든 전생의 karma(업보)를 꿰뚫는 현생 메시지. 3~4문장.
- "당신의 영혼은 ~" 형식으로 시작. 신비롭고 사주적인 톤.
- 단순 요약 금지. 영혼의 흐름·패턴·현생에서의 과제를 통찰 있게 서술.
- 예시 어조: "당신의 영혼은 수백 년에 걸쳐 고독과 헌신의 업을 쌓아왔습니다..."

━━ 반환 형식 ━━
{
  "soul_summary": "당신의 영혼은 ~ (3~4문장, 신비롭고 사주적인 톤)",
  "lives": [
    {
      "index": 1,
      "era": "시대명",
      "birth_year": <숫자 또는 null>,
      "death_year": <숫자 또는 null>,
      "identity": "직업명 (상세설명)",
      "name": "지역명 + 이름",
      "gender": "남 또는 여",
      "group": "지정된 group값",
      "story": "생애 서사 (최소 3문장)",
      "death": "최후 한 문장",
      "karma": "현생 업보 한 문장",
      "past_trace": "현생 특성 한 문장 (전생의... 금지)",
      "character_tag": "group_수식어",
      "image_file": "",
      "color": "#hex",
      "historical_figure": "실존 한국 역사 인물",
      "historical_profile": {
        "name_hanja": "한자",
        "birth_death": "생몰년",
        "title": "신분·직책 1~2문장",
        "achievement": "주요 업적 1~2문장",
        "evaluation": "역사적 평가 1~2문장",
        "reason": "닮은 이유 1~2문장"
      }
    }
  ]
}`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API 키 미설정' });

  const body = await parseBody(req);
  const { name, dateType, year, month, day, hour, hash, totalLives, soulGrade } = body;

  if (!name || !year || !month || !day || !hash || !totalLives || !soulGrade) {
    return res.status(400).json({ error: '필수 입력값 누락' });
  }

  console.log('[debug] hash:', hash, 'total:', totalLives);

  // ── 1. Redis 번들 캐시 확인 ──
  // 번들 형식: { lives: [...], soul_summary: "..." } 또는 구버전 배열 [...]
  const bundleKey = `sinbe_lives_${hash}`;
  try {
    const cached = await redisGet(bundleKey);
    console.log('[debug] bundle key:', bundleKey, 'hit:', !!cached);
    if (cached) {
      const bundle = JSON.parse(cached);
      // 신버전: { lives, soul_summary }
      if (bundle && Array.isArray(bundle.lives) && bundle.lives.length === totalLives) {
        console.log(`[all-lives] bundle HIT hash=${hash} count=${bundle.lives.length}`);
        return res.json({ lives: bundle.lives, soul_summary: bundle.soul_summary || '' });
      }
      // 구버전: 배열 직접 저장 (soul_summary 없음) → 재생성 필요
      if (Array.isArray(bundle) && bundle.length === totalLives) {
        console.log(`[all-lives] bundle HIT (legacy, no soul_summary) hash=${hash} → regenerating`);
        // 구버전은 soul_summary 없으므로 캐시 무효화 후 AI 재생성
        // 아래 AI 생성 로직으로 fall-through
      }
    }
  } catch (e) {
    console.warn('[all-lives] bundle GET failed:', e.message);
  }

  // ── 2. AI로 전체 전생 한번에 생성 ──
  // 개별 Redis 키 폴백 제거: past-lives.js가 개별 생성한 키는 soul_summary 없고
  // 생성 시점이 달라 일관성이 보장되지 않으므로 번들 캐시 MISS 시 항상 재생성
  const groups = Array.from({ length: totalLives }, (_, i) => assignGroup(hash, i + 1));

  let sajuSection = '';
  try {
    const manse = calculateManseryeok(year, month, day, hour, dateType === 'lunar');
    const { saju, ohaeng, dominant, sinsal } = manse;
    const traits = sinsalToTrait(sinsal);
    sajuSection = `\n사주 분석:\n- 사주팔자: ${saju.year}년 ${saju.month}월 ${saju.day}일 ${saju.hour}시\n- 오행: 목${ohaeng.목}% 화${ohaeng.화}% 토${ohaeng.토}% 금${ohaeng.금}% 수${ohaeng.수}%\n- 주요 오행: ${dominant}\n- 신살: ${sinsal.length > 0 ? sinsal.join(', ') : '없음'}${traits.length > 0 ? ` / ${traits.join(' / ')}` : ''}`;
  } catch {}

  const groupList = groups.map((g, i) => `- ${i + 1}번째: "${g}"`).join('\n');
  const userMessage = `이름: ${name}
생년월일: ${dateType === 'lunar' ? '음력' : '양력'} ${year}년 ${month}월 ${day}일
태어난 시: ${hour === 'unknown' ? '모름' : hour}
결정론적 시드값: ${hash}
총 전생: ${totalLives}회
영혼 등급: ${soulGrade}

각 전생의 group 배정 (절대 변경 불가):
${groupList}
${sajuSection}

위 정보로 전생 ${totalLives}개를 JSON 배열로 한번에 생성하세요.
각 전생의 역사 인물은 서로 달라야 합니다.
시드값 ${hash}을 기반으로 항상 동일한 결과를 반환하세요.`;

  console.log(`[all-lives] generating hash=${hash} totalLives=${totalLives}`);

  const MAX_ATTEMPTS = 2;
  const TOKENS = [7000, 10000];

  try {
    let lastErr = '알 수 없는 오류';

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      if (attempt > 1) console.warn(`[all-lives] retry attempt=${attempt}`);

      const openrouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://sinbe-jeongsaeng.vercel.app',
          'X-Title': 'sinbe-jeongsaeng',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'anthropic/claude-sonnet-4-5',
          max_tokens: TOKENS[attempt - 1],
          temperature: 0,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage },
          ],
        }),
      });

      const rawText = await openrouterRes.text();
      console.log(`[all-lives] attempt=${attempt} status=${openrouterRes.status}`);

      if (!openrouterRes.ok) {
        let errMsg = rawText;
        try { errMsg = JSON.parse(rawText)?.error?.message || rawText; } catch {}
        return res.status(502).json({ error: `OpenRouter 오류: ${errMsg.slice(0, 300)}` });
      }

      let result;
      try { result = JSON.parse(rawText); }
      catch (e) {
        lastErr = `응답 파싱 실패: ${e.message}`;
        if (attempt < MAX_ATTEMPTS) continue;
        return res.status(502).json({ error: lastErr });
      }

      const text = result.choices?.[0]?.message?.content;
      const finishReason = result.choices?.[0]?.finish_reason ?? 'unknown';
      console.log(`[all-lives] finish_reason=${finishReason} length=${text?.length ?? 0}`);

      if (!text) { lastErr = 'AI 응답 없음'; continue; }
      if (finishReason === 'length' && attempt < MAX_ATTEMPTS) {
        lastErr = '토큰 한도 초과'; continue;
      }

      const start = text.indexOf('{');
      const end   = text.lastIndexOf('}');
      if (start === -1 || end === -1) {
        lastErr = 'JSON 없음';
        if (attempt < MAX_ATTEMPTS) continue;
        return res.status(502).json({ error: lastErr });
      }

      let data;
      try { data = JSON.parse(text.slice(start, end + 1)); }
      catch (e) {
        lastErr = `JSON 파싱 실패: ${e.message}`;
        if (attempt < MAX_ATTEMPTS) continue;
        return res.status(502).json({ error: lastErr });
      }

      if (!Array.isArray(data.lives) || data.lives.length === 0) {
        lastErr = 'lives 배열 없음';
        if (attempt < MAX_ATTEMPTS) continue;
        return res.status(502).json({ error: lastErr });
      }

      const lives = data.lives
        .slice(0, totalLives)
        .map(l => normalizeLife(l))
        .sort((a, b) => {
          if (a.birth_year == null && b.birth_year == null) return 0;
          if (a.birth_year == null) return 1;
          if (b.birth_year == null) return -1;
          return a.birth_year - b.birth_year;
        });
      const soul_summary = typeof data.soul_summary === 'string' ? data.soul_summary.trim() : '';
      console.log(`[all-lives] success count=${lives.length} names=${lives.map(l => l.name).join(', ')}`);
      console.log(`[all-lives] soul_summary length=${soul_summary.length}`);

      // Redis 저장 — 번들({ lives, soul_summary }) + 개별 키 (비동기, 응답 블로킹 없음)
      // NX: 동시 요청 레이스 컨디션 시 최초 생성 결과만 저장 (덮어쓰기 방지)
      redisSet(bundleKey, { lives, soul_summary }, true).catch(e => console.warn('[all-lives] bundle SET failed:', e.message));
      lives.forEach((life, i) => {
        redisSet(`sinbe_life_${hash}_${i + 1}`, life).catch(() => {});
      });

      return res.json({ lives, soul_summary });
    }

    return res.status(502).json({ error: lastErr });

  } catch (err) {
    console.error('[all-lives] unexpected:', err.message);
    return res.status(500).json({ error: `서버 오류: ${err.message}` });
  }
}

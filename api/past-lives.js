import { calculateManseryeok, sinsalToTrait, ohaengToGroup } from '../src/utils/manseryeok.js';

// hash 기반 전생 횟수 결정 (App.jsx와 동일 로직)
function getTotalLives(hash) {
  const n = parseInt(hash, 16);
  if (n % 50 === 7) return 1; // ~2% 첫번째생
  return 5 + (n % 3);         // 5, 6, 또는 7
}

// API 응답에 group 누락 또는 잘못된 값일 때 identity 텍스트로 자동 매핑
const VALID_GROUPS = ['fantasy','warrior','shaman','entertainer','commoner','scholar','royal','noble','monk','court','outlaw','outcast'];

const GROUP_KEYWORDS = [
  { group: 'warrior',     keywords: ['의병장', '무신', '장수', '포졸', '무인', '전사', '무장', '병사'] },
  { group: 'fantasy',     keywords: ['구미호', '저승사자', '도깨비', '이무기', '귀신', '자연령', '신령'] },
  { group: 'shaman',      keywords: ['무속인', '점쟁이', '무당', '신관', '무녀', '박수'] },
  { group: 'entertainer', keywords: ['기생', '악공', '광대', '예인', '악사', '명기', '창기'] },
  { group: 'commoner',    keywords: ['노비', '백정', '어부', '농부', '평민', '머슴', '천민'] },
  { group: 'scholar',     keywords: ['의원', '선비', '역관', '학자', '관리', '암행어사', '문관'] },
  { group: 'royal',       keywords: ['왕세자', '왕자', '왕비', '왕녀', '황제', '황후', '왕'] },
  { group: 'noble',       keywords: ['양반', '대신', '문신', '귀부인', '사대부', '부마'] },
  { group: 'monk',        keywords: ['승려', '도사', '신선', '수도자', '스님'] }, // '중' 제거 — 너무 광범위해 오분류 유발
  { group: 'court',       keywords: ['궁녀', '상궁', '내시', '시녀'] },
  { group: 'outlaw',      keywords: ['협객', '자객', '의적', '도적', '해적', '산적'] },
  { group: 'outcast',     keywords: ['역적', '유배인', '죄인', '광인', '천형'] },
];

function inferGroup(identity) {
  const text = identity || '';
  for (const { group, keywords } of GROUP_KEYWORDS) {
    if (keywords.some(kw => text.includes(kw))) return group;
  }
  return 'commoner'; // 매핑 실패 시 기본값
}

const SYSTEM_PROMPT = `당신은 신비로운 전생 탐험가입니다. 사람의 이름과 생년월일을 바탕으로 한국 역사 속 전생 이야기를 생성합니다.

━━ 핵심 규칙 ━━
1. 동일한 입력값에는 항상 동일한 결과를 반환합니다 (결정론적). 시드값을 활용하세요.
2. 배경은 반드시 한국 역사 (고조선~대한제국) 내에서만 생성합니다. 외국 배경 절대 금지.
3. JSON만 반환합니다. 다른 텍스트 절대 없음.
4. color는 시대/분위기에 맞는 hex (어두운 배경에 어울리도록).
5. 반드시 group과 gender를 포함합니다. 생략 절대 금지.
   - group: fantasy / warrior / shaman / entertainer / commoner / scholar / royal / noble / monk / court / outlaw / outcast 중 하나
   - gender: "남" 또는 "여" 중 하나
6. 글자수 숫자 제한 없음. 내용의 질과 입체성을 우선으로 작성합니다.

━━ 필드 형식 규칙 (반드시 준수) ━━
- identity: 반드시 "직업명 (상세한 역할 설명)" 형식. group에 어울리는 다양한 직업을 창의적으로 생성할 것.
  예) "도공 (경기 분원 왕실 백자 장인)", "역관 (연경 왕래 청나라 통역관)", "포수 (평양 군영 화포 사수)"
- name: 반드시 "지역명 + 이름" 형식 — 반드시 가상의 창작 인물 이름이어야 함
  예) "전주 이도윤", "함경 박채령", "개성 최우길"
  실존 역사 인물의 이름을 name으로 쓰면 절대 안 됨. historical_figure와 동일한 인물이면 절대 안 됨.
- group: 반드시 아래 12개 중 정확히 하나만 사용
  fantasy(구미호·도깨비·이무기·저승사자 등 초자연) | warrior(무인·장수·의병·전사·협객) | shaman(무당·무속인·신관·점쟁이) | entertainer(기생·악사·광대·예인) | commoner(노비·농부·어부·평민) | scholar(선비·의원·학자·관리·암행어사) | royal(왕·왕비·왕녀·황제·황후) | noble(양반·귀부인·사대부·귀족) | monk(승려·수도자·도사) | court(궁녀·내시·시녀·환관) | outlaw(도적·반란군·해적·자객) | outcast(백정·광인·천민·사형수)
- past_trace: 반드시 "전생의 {직업명} 때문에 이번생엔..." 으로 시작하는 한 문장
- historical_figure: 반드시 실존 한국 역사 인물 (현대인 및 외국인 제외)
  · name(전생 창작 인물)과 완전히 다른 별개의 실존 인물이어야 함 — 절대 동일 인물 금지
  · 이미 사용된 역사 인물과 중복 절대 금지 — 요청에 "이미 사용된 역사 인물" 목록이 제공되면 반드시 그 외 다른 인물을 선택
- story: 태어난 배경, 살아온 삶, 주요 사건, 전환점을 담은 입체적인 서사. 최소 3문장 이상 작성.

━━ 오행 분석으로 전생 캐릭터 결정 (생년월일 기반) ━━
괄호 안은 반드시 사용해야 할 group 값입니다.
- 목(木) 강함 → 구미호(fantasy) / 자연령(fantasy) / 선비(scholar)
- 화(火) 강함 → 무속인(shaman) / 용사(warrior) / 불도깨비(fantasy)
- 수(水) 강함 → 이무기(fantasy) / 기생(entertainer) / 뱃사람(commoner)
- 금(金) 강함 → 무인(warrior) / 저승사자(fantasy) / 암행어사(scholar)
- 토(土) 강함 → 선비(scholar) / 귀부인(noble) / 농부(commoner)
- 도화살 → 기생(entertainer) / 구미호(fantasy)
- 역마살 → 암행어사(scholar) / 저승사자(fantasy)
- 귀문관살 → 무속인(shaman) / 도깨비(fantasy)

━━ 영혼 등급 기준 (total 값 기반) ━━
- total == 1: "첫번째생"
- total 2~3: "어린영혼"
- total 4~5: "오래된영혼"
- total 6~7: "고대영혼"

━━ 반환 형식 ━━
{
  "life": {
    "index": <요청받은 순서 번호 (1부터 시작)>,
    "era": "시대명 (예: 조선 중기, 고려 후기, 삼국시대 신라)",
    "birth_year": <숫자 또는 null — 불명이면 null>,
    "death_year": <숫자 또는 null — 불명이면 null>,
    "identity": "직업명 (상세설명)",
    "name": "지역명 + 이름",
    "gender": "남 또는 여 — 반드시 포함",
    "group": "fantasy/warrior/shaman/entertainer/commoner/scholar/royal/noble/monk/court/outlaw/outcast 중 하나 — 반드시 포함",
    "story": "태어난 배경, 살아온 삶, 주요 사건, 전환점을 담은 입체적인 생애 서사. 최소 3문장 이상.",
    "death": "최후를 극적으로 한 문장으로",
    "karma": "이 전생이 현생에 남긴 업보를 한 문장으로",
    "past_trace": "반드시 '전생의 {직업명} 때문에 이번생엔...' 으로 시작하는 한 문장",
    "character_tag": "group_수식어 (예: royal_왕녀, outlaw_해적, commoner_어부, outcast_죄인)",
    "image_file": "",
    "color": "#hex",
    "historical_figure": "실존 한국 역사 인물 이름",
    "historical_profile": {
      "name_hanja": "한자 표기",
      "birth_death": "생몰년",
      "title": "신분·직책을 1~2문장으로 충실하게",
      "achievement": "주요 업적을 1~2문장으로 충실하게",
      "evaluation": "역사적 평가를 1~2문장으로 충실하게",
      "reason": "전생 인물과 닮은 이유를 1~2문장으로 충실하게"
    }
  }
}`;

async function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch {}
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk.toString(); });
    req.on('end', () => {
      try { resolve(JSON.parse(raw)); }
      catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('[env] OPENROUTER_API_KEY is not set');
    return res.status(500).json({ error: 'API 키가 설정되지 않았습니다. Vercel 환경변수를 확인하세요.' });
  }

  const body = await parseBody(req);
  const { name, dateType, year, month, day, hour, hash, lifeIndex, totalLives, soulGrade, usedFigures } = body;

  if (!name || !year || !month || !day || !hash || lifeIndex === undefined || !totalLives || !soulGrade) {
    console.error('[validation] missing fields:', { name, year, month, day, hash, lifeIndex, totalLives, soulGrade });
    return res.status(400).json({ error: '필수 입력값이 누락됐습니다.' });
  }

  const seedKey = `${hash}_${lifeIndex}`;
  const usedFiguresList = Array.isArray(usedFigures) && usedFigures.length > 0
    ? `\n이미 사용된 역사 인물 (절대 중복 금지): ${usedFigures.join(', ')}`
    : '';

  // 사주팔자·오행·신살 계산
  let sajuSection = '';
  try {
    const isLunar = dateType === 'lunar';
    const manse = calculateManseryeok(year, month, day, hour, isLunar);
    const { saju, ohaeng, dominant, sinsal } = manse;
    const traits = sinsalToTrait(sinsal);
    const suggestedGroups = ohaengToGroup(dominant); // 오행 기반 group 추천값
    sajuSection = `
이 사람의 사주 분석:
- 사주팔자: ${saju.year}년 ${saju.month}월 ${saju.day}일 ${saju.hour}시
- 오행 비율: 목${ohaeng.목}% 화${ohaeng.화}% 토${ohaeng.토}% 금${ohaeng.금}% 수${ohaeng.수}%
- 가장 강한 오행: ${dominant} → 이 전생의 group 값으로 반드시 "${suggestedGroups.join('" 또는 "')}" 중 하나를 사용할 것
- 신살: ${sinsal.length > 0 ? sinsal.join(', ') : '없음'}${traits.length > 0 ? `\n- 신살 특성: ${traits.join(' / ')}` : ''}
- 이 사주 특성을 반드시 전생 설정에 반영할 것:
  - 오행 기반 추천 group을 사용하되, 신살이 강하면 신살 group으로 대체 가능
  - 신살 특성 → 전생 성격/최후에 반영`;
    console.log(`[manse] dominant=${dominant} suggestedGroups=${suggestedGroups.join(',')} sinsal=${sinsal.join(',')} saju=${saju.year}/${saju.month}/${saju.day}/${saju.hour}`);
  } catch (e) {
    console.warn('[manse] calculation failed:', e.message);
  }

  const userMessage = `이름: ${name}
생년월일: ${dateType === 'lunar' ? '음력' : '양력'} ${year}년 ${month}월 ${day}일
태어난 시: ${hour === 'unknown' ? '모름' : hour}
결정론적 시드값: ${seedKey}
총 전생 횟수: ${totalLives}회 중 ${lifeIndex}번째 전생
영혼 등급: ${soulGrade}${usedFiguresList}${sajuSection}

위 정보로 ${lifeIndex}번째 전생 1개를 JSON으로 생성하세요. 시드값 ${seedKey}을 기반으로 항상 동일한 결과를 반환하세요.`;

  console.log(`[request] name=${name} hash=${hash} lifeIndex=${lifeIndex}/${totalLives} usedFigures=${JSON.stringify(usedFigures || [])}`);

  // 에러 위치 주변 컨텍스트 추출 (파싱 실패 디버깅용)
  function parseErrContext(str, errMsg) {
    const m = errMsg.match(/position (\d+)/);
    if (!m) return str.slice(0, 200);
    const pos = parseInt(m[1]);
    return `...${str.slice(Math.max(0, pos - 60), pos + 80)}...`;
  }

  // OpenRouter 호출 (maxTokens 가변)
  async function callOpenRouter(maxTokens) {
    return fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://sinbe-jeongsaeng.vercel.app',
        'X-Title': 'sinbe-jeongsaeng',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4-5',
        max_tokens: maxTokens,
        temperature: 0,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
      }),
    });
  }

  // 파싱된 life 객체 보정 (group/gender 자동 보완)
  function normalizeLife(life) {
    if (!life.group || !VALID_GROUPS.includes(life.group)) {
      const inferred = inferGroup(life.identity);
      console.log(`[inferGroup] "${life.identity}" → ${inferred} (was: "${life.group}")`);
      life.group = inferred;
    }
    if (!life.gender) {
      life.gender = '남';
      console.log(`[inferGender] gender missing for "${life.name}", defaulting to 남`);
    }
    return life;
  }

  // 시도별 max_tokens: 1회차 2000, 재시도(2회차) 2800
  const MAX_ATTEMPTS = 2;
  const TOKENS_PER_ATTEMPT = [2000, 2800];

  try {
    let lastErr = '알 수 없는 오류';

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const maxTokens = TOKENS_PER_ATTEMPT[attempt - 1];
      if (attempt > 1) console.warn(`[retry] attempt=${attempt} maxTokens=${maxTokens}`);

      // ── 1. OpenRouter 호출 ──
      const openrouterRes = await callOpenRouter(maxTokens);
      const rawText = await openrouterRes.text();
      console.log(`[openrouter] attempt=${attempt} status=${openrouterRes.status}`);

      if (!openrouterRes.ok) {
        // HTTP 오류는 재시도해도 소용없음 → 즉시 반환
        let errMsg = rawText;
        try { errMsg = JSON.parse(rawText)?.error?.message || rawText; } catch {}
        console.error(`[openrouter] HTTP error ${openrouterRes.status}:`, rawText.slice(0, 400));
        return res.status(502).json({ error: `OpenRouter 오류 (${openrouterRes.status}): ${errMsg.slice(0, 300)}` });
      }

      // ── 2. OpenRouter 래퍼 JSON 파싱 ──
      let result;
      try {
        result = JSON.parse(rawText);
      } catch (e) {
        console.error('[openrouter] wrapper parse failed:', e.message, rawText.slice(0, 300));
        return res.status(502).json({ error: `OpenRouter 응답 파싱 실패: ${rawText.slice(0, 200)}` });
      }

      // ── 3. 콘텐츠 추출 + finish_reason 확인 ──
      const text = result.choices?.[0]?.message?.content;
      const finishReason = result.choices?.[0]?.finish_reason ?? 'unknown';
      console.log(`[content] attempt=${attempt} finish_reason=${finishReason} length=${text?.length ?? 0}`);
      console.log(`[content] full:`, text); // 전체 출력 — position 540 주변 확인용

      if (!text) {
        lastErr = 'AI 응답이 비어있습니다.';
        console.error('[content] empty. result:', JSON.stringify(result).slice(0, 300));
        continue; // 재시도
      }

      if (finishReason === 'length') {
        console.warn(`[content] TRUNCATED at max_tokens=${maxTokens} — will retry with more tokens`);
        lastErr = `응답이 토큰 한도(${maxTokens})에서 잘렸습니다.`;
        // 마지막 시도가 아니면 재시도
        if (attempt < MAX_ATTEMPTS) continue;
      }

      // ── 4. AI 응답 내부 JSON 추출 ──
      const start = text.indexOf('{');
      const end   = text.lastIndexOf('}');
      if (start === -1 || end === -1 || end < start) {
        lastErr = `AI 응답에서 JSON을 찾지 못했습니다.`;
        console.error('[parse] no JSON braces. text:', text.slice(0, 400));
        if (attempt < MAX_ATTEMPTS) continue;
        return res.status(502).json({ error: lastErr });
      }
      const jsonStr = text.slice(start, end + 1);
      console.log(`[parse] jsonStr length=${jsonStr.length} first400:`, jsonStr.slice(0, 400));

      // ── 5. 내부 JSON 파싱 ──
      let data;
      try {
        data = JSON.parse(jsonStr);
      } catch (parseErr) {
        lastErr = `응답 JSON 파싱 실패: ${parseErr.message}`;
        console.error(`[parse] FAILED attempt=${attempt}:`, parseErr.message);
        console.error('[parse] error context:', parseErrContext(jsonStr, parseErr.message));
        console.error('[parse] jsonStr full:', jsonStr); // 전체 출력
        if (attempt < MAX_ATTEMPTS) {
          console.warn(`[retry] parse failed (finish_reason=${finishReason}), retrying with maxTokens=${TOKENS_PER_ATTEMPT[attempt]}`);
          continue;
        }
        return res.status(502).json({ error: lastErr });
      }

      // ── 6. life 필드 검증 + 보정 ──
      if (!data.life) {
        lastErr = 'AI 응답에 life 필드가 없습니다.';
        console.error('[parse] data.life missing. data:', JSON.stringify(data).slice(0, 300));
        if (attempt < MAX_ATTEMPTS) continue;
        return res.status(502).json({ error: lastErr });
      }

      const life = normalizeLife(data.life);
      console.log(`[success] attempt=${attempt} lifeIndex=${lifeIndex} name=${life.name} group=${life.group} gender=${life.gender}`);
      return res.json({ life });
    }

    // 모든 재시도 소진
    return res.status(502).json({ error: lastErr });

  } catch (err) {
    console.error('[unexpected]', err.message);
    return res.status(500).json({ error: `서버 오류: ${err.message}` });
  }
}

// hash 기반 전생 횟수 결정 (App.jsx와 동일 로직)
function getTotalLives(hash) {
  const n = parseInt(hash, 16);
  if (n % 50 === 7) return 1; // ~2% 첫번째생
  return 5 + (n % 3);         // 5, 6, 또는 7
}

const SYSTEM_PROMPT = `당신은 신비로운 전생 탐험가입니다. 사람의 이름과 생년월일을 바탕으로 전생 이야기를 생성합니다.

중요 규칙:
1. 반드시 동일한 입력값에는 동일한 결과를 반환해야 합니다 (결정론적). 시드값을 활용하세요.
2. 전생 시대/지역 다양하게: 고려, 조선, 당나라, 에도시대, 고대 이집트, 중세 유럽, 오스만 제국, 마야 문명 등.
3. 이야기는 구체적이고 감성적으로. 인물의 감정과 삶의 무게가 느껴지도록.
4. color는 시대/분위기에 맞는 hex (어두운 배경용, 너무 밝지 않게).
5. JSON만 반환. 다른 텍스트 절대 없음.
6. 글자수 엄수: story 200자 내외, death/karma/past_trace 각 30자 내외, historical_profile 각 필드 50자 내외.

영혼 등급 기준 (total 기반):
- total == 1: "첫번째생"
- total 2~3: "어린영혼"
- total 4~5: "오래된영혼"
- total 6~7: "고대영혼"

오행 분석으로 전생 캐릭터 결정 (생년월일 기반):
- 목(木) 강함 → 구미호 / 자연령 / 호랑이
- 화(火) 강함 → 무속인 / 용사 / 불도깨비
- 수(水) 강함 → 이무기 / 기생 / 뱃사람
- 금(金) 강함 → 무인 / 저승사자 / 암행어사
- 토(土) 강함 → 선비 / 귀부인 / 농부
- 도화살 → 기생 / 구미호
- 역마살 → 암행어사 / 저승사자
- 귀문관살 → 무속인 / 도깨비

역사 인물 선정: 반드시 실존 인물만. 현대인(20세기 이후 출생) 제외. 전생 삶의 궤적과 닮은 인물 선정.

반환 형식:
{
  "total": <숫자>,
  "soul_grade": "<등급>",
  "lives": [
    {
      "era": "시대명",
      "year": "연도 (예: 1347년, 기원전 210년)",
      "birth_year": <숫자 또는 null — 신화적 존재나 불명이면 null>,
      "death_year": <숫자 또는 null — 위와 동일>,
      "identity": "직업명 (상세설명) 형식 (예: '구미호 (서촌 떡집 심부름꾼 위장)', '기생 (한양 최고 명기)')",
      "name": "지역명 + 이름 형식 (예: '서촌 연이', '개경 최도원', '한양 월매')",
      "story": "생애 서사 (200자 내외, 구체적이고 감성적으로)",
      "death": "최후 (30자 내외, 담담하게)",
      "karma": "현생 업보 연결 (30자 내외)",
      "past_trace": "전생의 {직업명} 때문에 이번생엔... {특징} 형식 (30자 내외)",
      "color": "#hex",
      "group": "아래 중 반드시 하나: fantasy(구미호·도깨비·이무기·저승사자 등 초자연) / warrior(무인·장수·전사·협객) / shaman(무당·무속인·신관·점쟁이) / entertainer(기생·악사·광대·예인) / commoner(노비·농부·어부·평민) / scholar(선비·의원·학자·관리·암행어사) / royal(왕·왕비·왕녀·황제·황후) / noble(양반·귀부인·사대부·귀족) / monk(승려·수도자·도사) / court(궁녀·내시·시녀·환관) / outlaw(도적·반란군·해적·자객) / outcast(백정·광인·천민·사형수)",
      "gender": "남 또는 여",
      "historical_figure": "실존 역사 인물 이름",
      "historical_reason": "닮은 이유 (50자 내외, 구체적으로)",
      "historical_profile": {
        "name_hanja": "한자 표기 (예: 李舜臣)",
        "birth_death": "생몰년 (예: 생몰 1545~1598년)",
        "title": "신분·직책 (50자 내외)",
        "achievement": "주요 업적 (50자 내외)",
        "evaluation": "역사적 평가 (50자 내외)",
        "reason": "닮은 이유 (50자 내외, 구체적으로)"
      }
    }
  ]
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
  const { name, dateType, year, month, day, hour, hash } = body;

  if (!name || !year || !month || !day || !hash) {
    console.error('[validation] missing fields:', { name, year, month, day, hash });
    return res.status(400).json({ error: '필수 입력값이 누락됐습니다.' });
  }

  // hash 기반으로 전생 횟수 결정 (클라이언트와 동일 로직)
  const totalLives = getTotalLives(hash);

  const userMessage = `이름: ${name}
생년월일: ${dateType === 'lunar' ? '음력' : '양력'} ${year}년 ${month}월 ${day}일
태어난 시: ${hour === 'unknown' ? '모름' : hour}
결정론적 시드값: ${hash}
총 전생 횟수: ${totalLives}회

위 정보로 정확히 ${totalLives}개의 전생을 JSON으로 생성하세요. 시드값 ${hash}을 기반으로 항상 동일한 결과를 반환하세요.`;

  console.log(`[request] name=${name} hash=${hash} totalLives=${totalLives}`);

  try {
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
        max_tokens: 2500,
        temperature: 0,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
      }),
    });

    const rawText = await openrouterRes.text();
    console.log(`[openrouter] status=${openrouterRes.status}`);
    console.log(`[openrouter] rawText(first 800):`, rawText.slice(0, 800));

    if (!openrouterRes.ok) {
      console.error(`[openrouter] HTTP error ${openrouterRes.status}:`, rawText.slice(0, 400));
      let errMsg = rawText;
      try {
        const errJson = JSON.parse(rawText);
        errMsg = errJson.error?.message || errJson.message || rawText;
      } catch {}
      return res.status(502).json({ error: `OpenRouter 오류 (${openrouterRes.status}): ${errMsg.slice(0, 300)}` });
    }

    let result;
    try {
      result = JSON.parse(rawText);
    } catch (parseErr) {
      console.error('[openrouter] wrapper JSON parse failed:', parseErr.message);
      console.error('[openrouter] rawText was:', rawText.slice(0, 500));
      return res.status(502).json({ error: `OpenRouter 응답 파싱 실패: ${rawText.slice(0, 200)}` });
    }

    const text = result.choices?.[0]?.message?.content;
    if (!text) {
      console.error('[openrouter] empty content. result:', JSON.stringify(result).slice(0, 300));
      return res.status(502).json({ error: 'AI 응답이 비어있습니다.' });
    }

    console.log(`[content] first 500:`, text.slice(0, 500));

    // 첫 번째 { 부터 마지막 } 까지 추출 (JSON 잘림 대비)
    const start = text.indexOf('{');
    const end   = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end < start) {
      console.error('[parse] no JSON braces found:', text.slice(0, 300));
      return res.status(502).json({ error: `AI 응답에서 JSON을 찾지 못했습니다: ${text.slice(0, 200)}` });
    }
    const jsonStr = text.slice(start, end + 1);
    console.log(`[parse] extracted JSON(first 400):`, jsonStr.slice(0, 400));

    let data;
    try {
      data = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error('[parse] JSON.parse failed:', parseErr.message);
      console.error('[parse] jsonStr was:', jsonStr.slice(0, 500));
      return res.status(502).json({ error: `응답 JSON 파싱 실패: ${parseErr.message}` });
    }

    console.log(`[success] soul_grade=${data.soul_grade} total=${data.total} lives=${data.lives?.length}`);
    data.lives?.forEach((l, i) => {
      console.log(`[debug] life[${i}] name=${l.name} group=${l.group} gender=${l.gender}`);
    });
    return res.json(data);

  } catch (err) {
    console.error('[unexpected]', err.message);
    return res.status(500).json({ error: `서버 오류: ${err.message}` });
  }
}

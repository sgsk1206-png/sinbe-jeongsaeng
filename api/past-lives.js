const SYSTEM_PROMPT = `당신은 신비로운 전생 탐험가입니다. 사람의 이름과 생년월일을 바탕으로 전생 이야기를 생성합니다.

중요 규칙:
1. 반드시 동일한 입력값에는 동일한 결과를 반환해야 합니다 (결정론적). 해시값을 시드로 활용하세요.
2. 전생의 시대와 지역은 다양하게: 고려, 조선, 당나라, 에도시대, 고대 이집트, 중세 유럽, 오스만 제국, 마야 문명, 무굴 제국 등.
3. 이야기는 구체적이고 감성적으로. 인물의 감정과 삶의 무게가 느껴지도록.
4. 각 전생 색상(color)은 시대/분위기에 맞는 hex 코드 (너무 밝지 않게, 어두운 배경에 어울리도록).
5. JSON만 반환. 다른 텍스트 절대 없음.

영혼 등급 기준 (total 기반으로 soul_grade 결정):
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

역사 인물 선정 규칙:
- 반드시 실존 인물만. 현대인(20세기 이후 출생) 제외.
- 전생의 신분·성격·삶의 궤적과 닮은 인물 선정.
- historical_reason은 공감 가는 한 줄로, 구체적으로.

반환 형식:
{
  "total": <숫자>,
  "soul_grade": "<등급>",
  "lives": [
    {
      "era": "시대명",
      "year": "연도 (예: 1347년, 기원전 210년)",
      "identity": "신분/직업",
      "name": "전생 이름",
      "story": "생애 서사 (2~3문장, 구체적이고 감성적으로)",
      "death": "최후 (1문장, 담담하게)",
      "karma": "현생 업보 연결 (1문장, 현재 삶에 미치는 영향)",
      "color": "#hex",
      "character_tag": "캐릭터유형_수식어 (예: 무속인_중견, 기생_조선, 무인_노련)",
      "historical_figure": "실존 역사 인물 이름",
      "historical_reason": "닮은 이유 한 줄 (구체적으로)",
      "historical_tag": "인물유형_시대 (예: 기생_조선, 장군_고려, 철학자_고대그리스)"
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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[env] ANTHROPIC_API_KEY is not set');
    return res.status(500).json({ error: 'API 키가 설정되지 않았습니다. Vercel 환경변수를 확인하세요.' });
  }

  const body = await parseBody(req);
  const { name, dateType, year, month, day, hour, hash, totalLives } = body;

  if (!name || !year || !month || !day || !hash || !totalLives) {
    console.error('[validation] missing fields:', { name, year, month, day, hash, totalLives });
    return res.status(400).json({ error: '필수 입력값이 누락됐습니다.' });
  }

  const userMessage = `이름: ${name}
생년월일: ${dateType === 'lunar' ? '음력' : '양력'} ${year}년 ${month}월 ${day}일
태어난 시: ${hour === 'unknown' ? '모름' : hour}
결정론적 시드값: ${hash}
총 전생 횟수: ${totalLives}회

위 정보로 정확히 ${totalLives}개의 전생을 JSON으로 생성하세요. 시드값 ${hash}을 기반으로 항상 동일한 결과를 반환하세요.`;

  console.log(`[request] name=${name} hash=${hash} totalLives=${totalLives}`);

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    const rawText = await anthropicRes.text();

    if (!anthropicRes.ok) {
      console.error(`[anthropic] HTTP ${anthropicRes.status}:`, rawText.slice(0, 500));
      // JSON 오류 응답 파싱 시도, 실패하면 텍스트 그대로 반환
      let errMsg = rawText;
      try {
        const errJson = JSON.parse(rawText);
        errMsg = errJson.error?.message || errJson.message || rawText;
      } catch {}
      return res.status(502).json({ error: `Anthropic 오류 (${anthropicRes.status}): ${errMsg.slice(0, 300)}` });
    }

    let result;
    try {
      result = JSON.parse(rawText);
    } catch {
      console.error('[anthropic] response parse failed:', rawText.slice(0, 500));
      return res.status(502).json({ error: 'Anthropic 응답 파싱 실패' });
    }

    const text = result.content?.[0]?.text;
    if (!text) {
      console.error('[anthropic] empty content:', JSON.stringify(result).slice(0, 300));
      return res.status(502).json({ error: 'AI 응답이 비어있습니다.' });
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[parse] no JSON in response:', text.slice(0, 300));
      return res.status(502).json({ error: 'AI 응답에서 JSON을 찾지 못했습니다.' });
    }

    const data = JSON.parse(jsonMatch[0]);
    console.log(`[success] soul_grade=${data.soul_grade} total=${data.total}`);
    return res.json(data);

  } catch (err) {
    console.error('[unexpected]', err.message);
    return res.status(500).json({ error: `서버 오류: ${err.message}` });
  }
}

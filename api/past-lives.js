// ── 테스트용 축소 프롬프트 (타임아웃 방지) ──
const SYSTEM_PROMPT = `당신은 전생 탐험가입니다. 이름과 생년월일로 전생 이야기를 생성합니다.

규칙:
1. JSON만 반환. 다른 텍스트 절대 없음.
2. 글자수 제한 반드시 준수.
3. color는 어두운 배경에 어울리는 hex 코드.

영혼 등급 (total 기반):
- 1: "첫번째생" / 2~3: "어린영혼" / 4~5: "오래된영혼" / 6~7: "고대영혼"

오행으로 캐릭터 결정:
- 목→구미호/호랑이 / 화→무속인/불도깨비 / 수→이무기/기생
- 금→무인/저승사자 / 토→선비/귀부인

역사 인물: 실존 인물만, 현대인 제외.

반환 형식 (글자수 엄수):
{
  "total": <숫자>,
  "soul_grade": "<등급>",
  "lives": [
    {
      "era": "시대명",
      "year": "연도",
      "birth_year": <숫자 또는 null>,
      "death_year": <숫자 또는 null>,
      "identity": "신분/직업",
      "name": "전생 이름",
      "story": "생애 서사 (100자 이내)",
      "death": "최후 (20자 이내)",
      "karma": "현생 업보 (20자 이내)",
      "past_trace": "현생에 남은 흔적 (20자 이내)",
      "color": "#hex",
      "character_tag": "캐릭터유형_시대",
      "historical_figure": "실존 역사 인물 이름",
      "historical_reason": "닮은 이유 (30자 이내)",
      "historical_tag": "인물유형_시대",
      "historical_profile": {
        "name_hanja": "한자 표기",
        "birth_death": "생몰년 (30자 이내)",
        "title": "신분·직책 (30자 이내)",
        "achievement": "주요 업적 (30자 이내)",
        "evaluation": "역사적 평가 (30자 이내)",
        "reason": "닮은 이유 (30자 이내)"
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
  const { name, dateType, year, month, day, hour, hash, totalLives } = body;

  if (!name || !year || !month || !day || !hash || !totalLives) {
    console.error('[validation] missing fields:', { name, year, month, day, hash, totalLives });
    return res.status(400).json({ error: '필수 입력값이 누락됐습니다.' });
  }

  const TEST_TOTAL = 3; // 테스트용 고정값

  const userMessage = `이름: ${name}
생년월일: ${dateType === 'lunar' ? '음력' : '양력'} ${year}년 ${month}월 ${day}일
태어난 시: ${hour === 'unknown' ? '모름' : hour}
결정론적 시드값: ${hash}
총 전생 횟수: ${TEST_TOTAL}회

위 정보로 정확히 ${TEST_TOTAL}개의 전생을 JSON으로 생성하세요.`;

  console.log(`[request] name=${name} hash=${hash} totalLives=${totalLives}`);

  try {
    const anthropicRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://sinbe-jeongsaeng.vercel.app',
        'X-Title': 'sinbe-jeongsaeng',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4-5',
        max_tokens: 600,
        temperature: 0,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
      }),
    });

    const rawText = await anthropicRes.text();

    // ── 디버그: OpenRouter 원문 응답 전체 출력 ──
    console.log(`[openrouter] status=${anthropicRes.status}`);
    console.log(`[openrouter] rawText(first 1000):`, rawText.slice(0, 1000));

    if (!anthropicRes.ok) {
      console.error(`[openrouter] HTTP error ${anthropicRes.status}:`, rawText.slice(0, 800));
      let errMsg = rawText;
      try {
        const errJson = JSON.parse(rawText);
        errMsg = errJson.error?.message || errJson.message || rawText;
      } catch {}
      return res.status(502).json({ error: `OpenRouter 오류 (${anthropicRes.status}): ${errMsg.slice(0, 300)}` });
    }

    let result;
    try {
      result = JSON.parse(rawText);
    } catch (parseErr) {
      console.error('[openrouter] wrapper JSON parse failed:', parseErr.message);
      console.error('[openrouter] rawText was:', rawText.slice(0, 800));
      return res.status(502).json({ error: `OpenRouter 응답이 JSON이 아닙니다: ${rawText.slice(0, 200)}` });
    }

    const text = result.choices?.[0]?.message?.content;
    if (!text) {
      console.error('[openrouter] empty content. result:', JSON.stringify(result).slice(0, 500));
      return res.status(502).json({ error: 'AI 응답이 비어있습니다.' });
    }

    console.log(`[openrouter] content(first 500):`, text.slice(0, 500));

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[parse] no JSON found in content:', text.slice(0, 500));
      return res.status(502).json({ error: `AI 응답에서 JSON을 찾지 못했습니다. 응답: ${text.slice(0, 200)}` });
    }

    let data;
    try {
      data = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error('[parse] JSON.parse failed:', parseErr.message);
      console.error('[parse] matched string was:', jsonMatch[0].slice(0, 500));
      return res.status(502).json({ error: `AI 응답 JSON 파싱 실패: ${parseErr.message}` });
    }

    console.log(`[success] soul_grade=${data.soul_grade} total=${data.total}`);
    return res.json(data);

  } catch (err) {
    console.error('[unexpected]', err.message);
    return res.status(500).json({ error: `서버 오류: ${err.message}` });
  }
}

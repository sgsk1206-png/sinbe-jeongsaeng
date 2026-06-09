import { useState, useEffect } from 'react';
import StarBackground from './components/StarBackground';
import InputScreen from './components/InputScreen';
import ResultScreen from './components/ResultScreen';
import CTAScreen from './components/CTAScreen';
import ShareScreen from './components/ShareScreen';
import { decodeShareData } from './utils/share.js';
import { MOCK_PAST_LIVES } from './mockData.js';

// VITE_MOCK_MODE=true → 목업 데이터 사용 (API 호출 없음)
const IS_MOCK = import.meta.env.VITE_MOCK_MODE === 'true';

// 전생별 개별 캐싱 (sinbe_life_{hash}_{index})
const CACHE_PREFIX = 'sinbe_life_';

function hashInput(name, dateType, year, month, day, hour) {
  const str = `${name}|${dateType}|${year}|${month}|${day}|${hour}`;
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

// hash 기반 전생 횟수 결정 (api/past-lives.js와 동일 로직) — 최소 2, 최대 5회
function getTotalLives(hash) {
  const n = parseInt(hash, 16);
  return 2 + (n % 4); // 2~5
}

function getSoulGrade(total) {
  if (total <= 2) return '어린영혼';
  if (total === 3) return '오래된영혼';
  return '고대영혼'; // 4~5
}

// 전생 개수(total)만큼 styleIndex 배열 생성
// 첫 번째: localStorage의 마지막 스타일과 다른 값, 이후: 이전 전생과 다른 값
// 예) total=5 → [2, 0, 1, 2, 0]
function buildStyleIndexes(total) {
  const styleIndexes = [];
  for (let i = 0; i < total; i++) {
    const prev = i === 0
      ? parseInt(localStorage.getItem('sinbe_last_style') ?? '-1', 10)
      : styleIndexes[i - 1];
    const options = [0, 1, 2].filter(n => n !== prev);
    styleIndexes.push(options[Math.floor(Math.random() * options.length)]);
  }
  localStorage.setItem('sinbe_last_style', String(styleIndexes[styleIndexes.length - 1]));
  return styleIndexes;
}

function getCachedLife(hash, index) {
  try { return JSON.parse(localStorage.getItem(`${CACHE_PREFIX}${hash}_${index}`)); }
  catch { return null; }
}

function setCachedLife(hash, index, life) {
  try { localStorage.setItem(`${CACHE_PREFIX}${hash}_${index}`, JSON.stringify(life)); } catch {}
}

// 전생 전체를 /api/all-lives 에서 한번에 가져옴
// 반환: { lives: [...], soul_summary: "..." }
async function fetchAllLives({ name, dateType, year, month, day, hour, hash, totalLives, soulGrade }) {
  const res = await fetch('/api/all-lives', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, dateType, year, month, day, hour, hash, totalLives, soulGrade }),
  });
  const raw = await res.text();
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch { throw new Error(`서버 응답 오류: ${raw.slice(0, 100)}`); }
  if (!res.ok || parsed.error) throw new Error(parsed.error || `서버 오류 (${res.status})`);
  return { lives: parsed.lives, soul_summary: parsed.soul_summary || '' };
}

const SUMMARY_PREFIX = 'sinbe_summary_';

export default function App() {
  // ── Kakao SDK 초기화 ──
  useEffect(() => {
    const key = import.meta.env.VITE_KAKAO_JS_KEY;
    if (key && window.Kakao && !window.Kakao.isInitialized()) {
      window.Kakao.init(key);
      console.log('[kakao] initialized');
    }
  }, []);

  // ── 공유 URL 감지 (초기 1회만 평가) ──
  // 방식 A: /share/{shareId} → Redis 조회
  // 방식 B: ?data={base64}  → 직접 디코딩 (하위 호환)
  const [shareRouteId] = useState(() => {
    const m = window.location.pathname.match(/^\/share\/([A-Z0-9]{4,10})$/);
    return m ? m[1] : null;
  });
  const [shareData] = useState(() => {
    const encoded = new URLSearchParams(window.location.search).get('data');
    return encoded ? decodeShareData(encoded) : null;
  });
  const [showShare, setShowShare] = useState(() => {
    const hasSharePath = /^\/share\/[A-Z0-9]{4,10}$/.test(window.location.pathname);
    const hasDataParam = !!new URLSearchParams(window.location.search).get('data');
    return hasSharePath || hasDataParam;
  });

  const [screen, setScreen] = useState('input');
  const [pastLives, setPastLives] = useState(null);
  const [currentLife, setCurrentLife] = useState(0);
  const [userName, setUserName] = useState('');
  const [error, setError] = useState(null);

  // 공유 페이지 → 메인으로 이동
  const handleShareStart = () => {
    window.history.replaceState({}, '', window.location.pathname);
    setShowShare(false);
  };

  const handleSubmit = async (formData) => {
    const { name, dateType, year, month, day, hour } = formData;
    setUserName(name);
    setError(null);

    const hash = hashInput(name, dateType, year, month, day, hour);
    const totalLives = getTotalLives(hash);
    const soulGrade = getSoulGrade(totalLives);

    setScreen('loading');

    try {
      let lives;

      let soul_summary = '';

      if (IS_MOCK) {
        await new Promise(r => setTimeout(r, 800));
        lives = MOCK_PAST_LIVES.lives.slice(0, totalLives);
      } else {
        // localStorage에 전생 전부 캐시돼 있고 soul_summary도 저장돼 있으면 API 호출 없이 사용
        // soul_summary 키가 없으면(null) 이전 버전 캐시이므로 API 호출로 soul_summary 확보
        const allCached = Array.from({ length: totalLives }, (_, i) => getCachedLife(hash, i + 1));
        const cachedSummary = localStorage.getItem(`${SUMMARY_PREFIX}${hash}`);
        if (allCached.every(Boolean) && cachedSummary !== null && cachedSummary !== '') {
          console.log('[handleSubmit] all lives from localStorage cache');
          lives = allCached;
          soul_summary = cachedSummary;
        } else {
          // /api/all-lives: Redis 번들 캐시 → 개별 키 → AI 생성 순으로 처리
          const result = await fetchAllLives({ name, dateType, year, month, day, hour, hash, totalLives, soulGrade });
          lives = result.lives;
          soul_summary = result.soul_summary;
          // localStorage에 각각 저장
          lives.forEach((life, i) => setCachedLife(hash, i + 1, life));
          try { localStorage.setItem(`${SUMMARY_PREFIX}${hash}`, soul_summary); } catch {}
        }
      }

      const styleIndexes = buildStyleIndexes(totalLives);
      console.log(`[style] styleIndexes=${JSON.stringify(styleIndexes)}`);
      setPastLives({ total: totalLives, soul_grade: soulGrade, lives, styleIndexes, soul_summary });
      setCurrentLife(0);
      setScreen('result');
    } catch (err) {
      setError(err.message);
      setScreen('input');
    }
  };

  // 모든 전생이 이미 로드된 상태 — 단순 인덱스 이동
  const handleNext = () => {
    window.scrollTo(0, 0);
    const next = currentLife + 1;
    if (next >= pastLives.total) setScreen('cta');
    else setCurrentLife(next);
  };

  const handlePrev = () => {
    window.scrollTo(0, 0);
    if (currentLife > 0) setCurrentLife(currentLife - 1);
  };

  const handleReset = () => {
    setScreen('input');
    setPastLives(null);
    setCurrentLife(0);
    setError(null);
  };

  // 공유 URL로 접근한 경우 ShareScreen만 표시
  if (showShare && (shareRouteId || shareData)) {
    return (
      <div className="app">
        <StarBackground />
        <div className="container">
          <ShareScreen
            shareId={shareRouteId}       // /share/{id} 방식
            shareData={shareData}         // ?data= base64 방식 (하위 호환)
            onStart={handleShareStart}
          />
        </div>
        <div className="branding">신비의거울</div>
      </div>
    );
  }

  return (
    <div className="app">
      <StarBackground />
      <div className="container">
        {screen === 'input' && <InputScreen onSubmit={handleSubmit} error={error} />}
        {screen === 'loading' && (
          <div className="loading-screen">
            <div className="loading-orb" />
            <p className="loading-text">전생을 탐험하는 중...</p>
            <p className="loading-sub">시간의 강을 거슬러 올라가고 있습니다</p>
          </div>
        )}
        {screen === 'result' && pastLives && (
          <ResultScreen
            userName={userName}
            data={pastLives}
            currentIndex={currentLife}
            onNext={handleNext}
            onPrev={handlePrev}
            isLoadingNext={false}
          />
        )}
        {screen === 'cta' && <CTAScreen userName={userName} soulSummary={pastLives?.soul_summary} onReset={handleReset} />}
      </div>
      <div className="branding">신비의거울</div>

    </div>
  );
}

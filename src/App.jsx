import { useState, useRef, useEffect } from 'react';
import StarBackground from './components/StarBackground';
import InputScreen from './components/InputScreen';
import ResultScreen from './components/ResultScreen';
import CTAScreen from './components/CTAScreen';
import ShareScreen from './components/ShareScreen';
import { decodeShareData } from './utils/share.js';
import { MOCK_PAST_LIVES } from './mockData.js';

// VITE_MOCK_MODE=true → 목업 데이터 사용 (API 호출 없음)
const IS_MOCK = import.meta.env.VITE_MOCK_MODE === 'true';

// 다음 전생 로딩 오버레이 — 별자리 위치/크기/딜레이 (고정값)
const OVERLAY_STARS = [
  { x:'5%',  y:'9%',  s:2, d:0,    c:'#ffffff' },
  { x:'17%', y:'5%',  s:3, d:0.6,  c:'#d4aaff' },
  { x:'30%', y:'14%', s:2, d:1.2,  c:'#ffffff' },
  { x:'45%', y:'6%',  s:4, d:0.3,  c:'#ffd700' },
  { x:'60%', y:'11%', s:2, d:1.5,  c:'#d4aaff' },
  { x:'74%', y:'7%',  s:3, d:0.8,  c:'#ffffff' },
  { x:'89%', y:'13%', s:2, d:0.1,  c:'#ffd700' },
  { x:'3%',  y:'36%', s:3, d:1.4,  c:'#ffffff' },
  { x:'94%', y:'30%', s:2, d:0.7,  c:'#d4aaff' },
  { x:'97%', y:'60%', s:3, d:1.9,  c:'#ffffff' },
  { x:'9%',  y:'63%', s:2, d:1.1,  c:'#ffd700' },
  { x:'21%', y:'80%', s:3, d:0.4,  c:'#ffffff' },
  { x:'38%', y:'87%', s:2, d:1.7,  c:'#d4aaff' },
  { x:'53%', y:'91%', s:4, d:0.9,  c:'#ffffff' },
  { x:'68%', y:'84%', s:2, d:0.2,  c:'#ffd700' },
  { x:'85%', y:'76%', s:3, d:1.3,  c:'#ffffff' },
  { x:'47%', y:'95%', s:2, d:0.5,  c:'#d4aaff' },
  { x:'13%', y:'50%', s:2, d:1.6,  c:'#ffffff' },
  { x:'63%', y:'44%', s:2, d:1.0,  c:'#d4aaff' },
  { x:'34%', y:'57%', s:3, d:0.7,  c:'#ffd700' },
];

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

function getCachedLife(hash, index) {
  try { return JSON.parse(localStorage.getItem(`${CACHE_PREFIX}${hash}_${index}`)); }
  catch { return null; }
}

function setCachedLife(hash, index, life) {
  try { localStorage.setItem(`${CACHE_PREFIX}${hash}_${index}`, JSON.stringify(life)); } catch {}
}

async function fetchLife({ name, dateType, year, month, day, hour, hash, lifeIndex, totalLives, soulGrade, usedFigures }) {
  const res = await fetch('/api/past-lives', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, dateType, year, month, day, hour, hash, lifeIndex, totalLives, soulGrade, usedFigures }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || `서버 오류 (${res.status})`);
  return data.life;
}

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
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [requestParams, setRequestParams] = useState(null);
  // prefetchedLife: null | { index: number(0-based), life: object }
  const [prefetchedLife, setPrefetchedLife] = useState(null);
  // 현재 목표 프리페치 인덱스 — race condition 방지용
  const prefetchTargetRef = useRef(null);

  // 공유 페이지 → 메인으로 이동
  const handleShareStart = () => {
    window.history.replaceState({}, '', window.location.pathname);
    setShowShare(false);
  };

  // ── 백그라운드 프리페치 ──
  // loadedCount: 현재 로드된 전생 수 (0-based 다음 로드 인덱스와 동일)
  // UI 블로킹 없음. 오류는 조용히 무시 (handleNext에서 재시도).
  async function triggerPrefetch(loadedCount, livesSnapshot, params) {
    if (!params || IS_MOCK) return;
    const nextLoadIndex = loadedCount;               // 0-based, 다음에 로드할 전생 번호
    if (nextLoadIndex >= params.totalLives) return;  // 더 로드할 전생 없음
    if (livesSnapshot.length > nextLoadIndex) return; // 이미 로드됨

    const lifeIndex = nextLoadIndex + 1; // API는 1-based
    prefetchTargetRef.current = nextLoadIndex;

    // 캐시 확인
    const cached = getCachedLife(params.hash, lifeIndex);
    if (cached) {
      if (prefetchTargetRef.current === nextLoadIndex) {
        setPrefetchedLife({ loadIndex: nextLoadIndex, life: cached });
        console.log(`[prefetch] cache hit loadIndex=${nextLoadIndex}`);
      }
      return;
    }

    // usedFigures: 현재까지 로드된 전생들의 historical_figure
    const usedFigures = livesSnapshot
      .filter(Boolean)
      .map(l => l.historical_figure)
      .filter(Boolean);

    console.log(`[prefetch] start loadIndex=${nextLoadIndex} lifeIndex=${lifeIndex}`);
    try {
      const life = await fetchLife({ ...params, lifeIndex, usedFigures });
      setCachedLife(params.hash, lifeIndex, life);
      if (prefetchTargetRef.current === nextLoadIndex) {
        setPrefetchedLife({ loadIndex: nextLoadIndex, life });
        console.log(`[prefetch] done loadIndex=${nextLoadIndex} name=${life.name}`);
      } else {
        console.log(`[prefetch] stale result discarded loadIndex=${nextLoadIndex}`);
      }
    } catch (e) {
      console.warn(`[prefetch] failed loadIndex=${nextLoadIndex}:`, e.message);
    }
  }

  const handleSubmit = async (formData) => {
    const { name, dateType, year, month, day, hour } = formData;
    setUserName(name);
    setError(null);

    const hash = hashInput(name, dateType, year, month, day, hour);
    const totalLives = getTotalLives(hash);
    const soulGrade = getSoulGrade(totalLives);
    const params = { name, dateType, year, month, day, hour, hash, totalLives, soulGrade };

    setRequestParams(params);
    setPrefetchedLife(null);
    prefetchTargetRef.current = null;
    setScreen('loading');

    try {
      let life0;

      if (IS_MOCK) {
        await new Promise(r => setTimeout(r, 800));
        life0 = MOCK_PAST_LIVES.lives[0];
      } else {
        const cached = getCachedLife(hash, 1);
        if (cached) {
          life0 = cached;
        } else {
          life0 = await fetchLife({ ...params, lifeIndex: 1 });
          setCachedLife(hash, 1, life0);
        }
      }

      const lives = [life0];
      // styleIndex: 탐험 시작 시 1회 결정, pastLives에 포함시켜 세션 내 완전 고정
      // (별도 state로 관리 시 React 배치 타이밍 문제로 편향 발생 → 이 방식으로 해결)
      const styleIndex = Math.floor(Math.random() * 3);
      setPastLives({ total: totalLives, soul_grade: soulGrade, lives, styleIndex });
      setCurrentLife(0);
      setScreen('result');

      // 첫 전생 표시 즉시 다음 전생 프리페치 시작 (loadedCount=1)
      triggerPrefetch(1, lives, params);
    } catch (err) {
      setError(err.message);
      setScreen('input');
    }
  };

  const handleNext = async (fromIndex) => {
    window.scrollTo(0, 0);
    const from = fromIndex !== undefined ? fromIndex : currentLife;
    const nextDisplayIndex = from + 1; // 발견 순서 기준 다음 위치
    const loadedCount = pastLives.lives.length; // 현재 로드된 전생 수

    // ① 다음 위치가 이미 로드돼 있으면 바로 이동
    if (nextDisplayIndex < loadedCount) {
      setCurrentLife(nextDisplayIndex);
      setPrefetchedLife(null);
      triggerPrefetch(loadedCount, pastLives.lives, requestParams);
      return;
    }

    // ② 모든 전생을 다 봤으면 CTA로
    if (loadedCount >= pastLives.total) {
      setScreen('cta');
      return;
    }

    // ③ 프리페치 완료된 데이터가 있으면 즉시 사용 (로딩 오버레이 없음)
    if (prefetchedLife && prefetchedLife.loadIndex === loadedCount) {
      const nextLife = prefetchedLife.life;
      const newLives = [...pastLives.lives, nextLife]; // 발견 순서 그대로 append
      setPrefetchedLife(null);
      setPastLives(prev => ({ ...prev, lives: newLives }));
      setCurrentLife(nextDisplayIndex);
      triggerPrefetch(loadedCount + 1, newLives, requestParams);
      return;
    }

    // ④ 프리페치 없으면 API 로딩
    setIsLoadingNext(true);
    try {
      let nextLife;

      if (IS_MOCK) {
        await new Promise(r => setTimeout(r, 800));
        nextLife = MOCK_PAST_LIVES.lives[loadedCount] || MOCK_PAST_LIVES.lives[0];
      } else {
        const lifeIndex = loadedCount + 1; // API는 1-based
        const cached = getCachedLife(requestParams.hash, lifeIndex);
        if (cached) {
          nextLife = cached;
        } else {
          const usedFigures = pastLives.lives
            .map(l => l.historical_figure)
            .filter(Boolean);
          nextLife = await fetchLife({ ...requestParams, lifeIndex, usedFigures });
          setCachedLife(requestParams.hash, lifeIndex, nextLife);
        }
      }

      const newLives = [...pastLives.lives, nextLife]; // 발견 순서 그대로 append
      setPastLives(prev => ({ ...prev, lives: newLives }));
      setCurrentLife(nextDisplayIndex);
      triggerPrefetch(loadedCount + 1, newLives, requestParams);
    } catch (err) {
      setError(err.message);
      alert(`전생 불러오기 실패: ${err.message}\n잠시 후 다시 시도해 주세요.`);
    } finally {
      setIsLoadingNext(false);
    }
  };

  const handlePrev = (fromIndex) => {
    window.scrollTo(0, 0);
    const cur = fromIndex !== undefined ? fromIndex : currentLife;
    if (cur > 0) setCurrentLife(cur - 1);
  };

  const handleReset = () => {
    setScreen('input');
    setPastLives(null);
    setCurrentLife(0);
    setError(null);
    setIsLoadingNext(false);
    setRequestParams(null);
    setPrefetchedLife(null);
    prefetchTargetRef.current = null;
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
            isLoadingNext={isLoadingNext}
          />
        )}
        {screen === 'cta' && <CTAScreen userName={userName} onReset={handleReset} />}
      </div>
      <div className="branding">신비의거울</div>

      {/* ── 다음 전생 로딩 오버레이 ── */}
      {isLoadingNext && (
        <div className="life-loading-overlay">
          <div className="life-loading-stars" aria-hidden="true">
            {OVERLAY_STARS.map((st, i) => (
              <div
                key={i}
                className="life-loading-star"
                style={{
                  left: st.x,
                  top: st.y,
                  width: st.s,
                  height: st.s,
                  background: st.c,
                  boxShadow: `0 0 ${st.s * 2}px ${st.c}`,
                  animationDelay: `${st.d}s`,
                }}
              />
            ))}
          </div>
          <div className="life-loading-center">
            <div className="life-loading-orb-wrap">
              <div className="life-loading-orbit life-loading-orbit-1" />
              <div className="life-loading-orbit life-loading-orbit-2" />
              <div className="loading-orb" />
            </div>
            <p className="life-loading-text">전생의 기억을 불러오는 중...</p>
            <p className="loading-sub">시간의 강을 거슬러 올라가고 있습니다</p>
          </div>
        </div>
      )}
    </div>
  );
}

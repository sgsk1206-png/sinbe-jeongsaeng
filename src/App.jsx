import { useState } from 'react';
import StarBackground from './components/StarBackground';
import InputScreen from './components/InputScreen';
import ResultScreen from './components/ResultScreen';
import CTAScreen from './components/CTAScreen';
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

// hash 기반 전생 횟수 결정 (api/past-lives.js와 동일 로직)
function getTotalLives(hash) {
  const n = parseInt(hash, 16);
  if (n % 50 === 7) return 1;
  return 5 + (n % 3); // 5, 6, 또는 7
}

function getSoulGrade(total) {
  if (total === 1) return '첫번째생';
  if (total <= 3)  return '어린영혼';
  if (total <= 5)  return '오래된영혼';
  return '고대영혼';
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
  const [screen, setScreen] = useState('input');
  const [pastLives, setPastLives] = useState(null);
  const [currentLife, setCurrentLife] = useState(0);
  const [userName, setUserName] = useState('');
  const [error, setError] = useState(null);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [requestParams, setRequestParams] = useState(null);

  const handleSubmit = async (formData) => {
    const { name, dateType, year, month, day, hour } = formData;
    setUserName(name);
    setError(null);

    const hash = hashInput(name, dateType, year, month, day, hour);
    const totalLives = getTotalLives(hash);
    const soulGrade = getSoulGrade(totalLives);
    const params = { name, dateType, year, month, day, hour, hash, totalLives, soulGrade };

    setRequestParams(params);
    setScreen('loading');

    try {
      let life0;

      if (IS_MOCK) {
        await new Promise(r => setTimeout(r, 800));
        life0 = MOCK_PAST_LIVES.lives[0];
      } else {
        // 캐시 확인 먼저
        const cached = getCachedLife(hash, 1);
        if (cached) {
          life0 = cached;
        } else {
          life0 = await fetchLife({ ...params, lifeIndex: 1 });
          setCachedLife(hash, 1, life0);
        }
      }

      setPastLives({ total: totalLives, soul_grade: soulGrade, lives: [life0] });
      setCurrentLife(0);
      setScreen('result');
    } catch (err) {
      setError(err.message);
      setScreen('input');
    }
  };

  const handleNext = async () => {
    window.scrollTo(0, 0);
    const nextIndex = currentLife + 1; // 0-based

    if (nextIndex >= pastLives.total) {
      setScreen('cta');
      return;
    }

    // 이미 로드된 전생이면 바로 이동
    if (pastLives.lives[nextIndex]) {
      setCurrentLife(nextIndex);
      return;
    }

    // 아직 없으면 API 호출
    setIsLoadingNext(true);
    try {
      let nextLife;

      if (IS_MOCK) {
        await new Promise(r => setTimeout(r, 800));
        nextLife = MOCK_PAST_LIVES.lives[nextIndex] || MOCK_PAST_LIVES.lives[0];
      } else {
        const lifeIndex = nextIndex + 1; // API는 1-based
        const cached = getCachedLife(requestParams.hash, lifeIndex);
        if (cached) {
          nextLife = cached;
        } else {
          // 이미 로드된 전생들의 historical_figure 목록 수집 (중복 방지용)
          const usedFigures = pastLives.lives
            .filter(Boolean)
            .map(l => l.historical_figure)
            .filter(Boolean);
          nextLife = await fetchLife({ ...requestParams, lifeIndex, usedFigures });
          setCachedLife(requestParams.hash, lifeIndex, nextLife);
        }
      }

      setPastLives(prev => {
        const newLives = [...prev.lives];
        newLives[nextIndex] = nextLife;
        return { ...prev, lives: newLives };
      });
      setCurrentLife(nextIndex);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoadingNext(false);
    }
  };

  const handlePrev = () => {
    window.scrollTo(0, 0);
    if (currentLife > 0) setCurrentLife(i => i - 1);
  };

  const handleReset = () => {
    setScreen('input');
    setPastLives(null);
    setCurrentLife(0);
    setError(null);
    setIsLoadingNext(false);
    setRequestParams(null);
  };

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
          {/* 별 파티클 */}
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

          {/* 중앙 콘텐츠 */}
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

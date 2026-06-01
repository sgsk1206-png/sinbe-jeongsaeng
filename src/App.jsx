import { useState } from 'react';
import StarBackground from './components/StarBackground';
import InputScreen from './components/InputScreen';
import ResultScreen from './components/ResultScreen';
import CTAScreen from './components/CTAScreen';
import { MOCK_PAST_LIVES } from './mockData.js';

// VITE_MOCK_MODE=true → 목업 데이터 사용 (API 호출 없음)
const IS_MOCK = import.meta.env.VITE_MOCK_MODE === 'true';

// 전생 1개씩 캐싱 (키: sinbe_life_{hash}_{index})
const CACHE_PREFIX = 'sinbe_life_';

function hashInput(name, dateType, year, month, day, hour) {
  const str = `${name}|${dateType}|${year}|${month}|${day}|${hour}`;
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function getTotalLives(hash) {
  const n = parseInt(hash, 16);
  if (n % 50 === 7) return 1; // ~2% 첫번째생
  return 5 + (n % 3);         // 5, 6, 7
}

function getSoulGrade(total) {
  if (total === 1) return '첫번째생';
  if (total <= 3) return '어린영혼';
  if (total <= 5) return '오래된영혼';
  return '고대영혼';
}

function getCachedLife(hash, index) {
  try { return JSON.parse(localStorage.getItem(`${CACHE_PREFIX}${hash}_${index}`)); }
  catch { return null; }
}

function setCachedLife(hash, index, life) {
  try { localStorage.setItem(`${CACHE_PREFIX}${hash}_${index}`, JSON.stringify(life)); } catch {}
}

export default function App() {
  const [screen, setScreen] = useState('input');
  const [pastLives, setPastLives] = useState(null);   // { total, soul_grade, lives: [...] }
  const [currentLife, setCurrentLife] = useState(0);
  const [userName, setUserName] = useState('');
  const [error, setError] = useState(null);
  const [requestParams, setRequestParams] = useState(null); // 지연 로딩에 필요한 파라미터
  const [isLoadingNext, setIsLoadingNext] = useState(false);

  // 전생 1개 API 호출
  const fetchLife = async (params, lifeIndex) => {
    const res = await fetch('/api/past-lives', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, lifeIndex }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || `서버 오류 (${res.status})`);
    return data.life;
  };

  const handleSubmit = async (formData) => {
    const { name, dateType, year, month, day, hour } = formData;
    setUserName(name);
    setError(null);

    const hash = hashInput(name, dateType, year, month, day, hour);
    const total = getTotalLives(hash);
    const soul_grade = getSoulGrade(total);
    const params = { name, dateType, year, month, day, hour, hash, totalLives: total, soulGrade: soul_grade };

    if (IS_MOCK) {
      // 목업 모드: 전체 데이터 즉시 반환
      await new Promise(r => setTimeout(r, 800));
      setPastLives(MOCK_PAST_LIVES);
      setCurrentLife(0);
      setRequestParams(params);
      setScreen('result');
      return;
    }

    // 캐시 확인 (첫 번째 전생)
    const cached0 = getCachedLife(hash, 0);
    if (cached0) {
      setPastLives({ total, soul_grade, lives: [cached0] });
      setCurrentLife(0);
      setRequestParams(params);
      setScreen('result');
      return;
    }

    setScreen('loading');

    try {
      const life0 = await fetchLife(params, 0);
      setCachedLife(hash, 0, life0);
      setPastLives({ total, soul_grade, lives: [life0] });
      setCurrentLife(0);
      setRequestParams(params);
      setScreen('result');
    } catch (err) {
      setError(err.message);
      setScreen('input');
    }
  };

  const handleNext = async () => {
    const nextIndex = currentLife + 1;

    // 마지막 전생 → 마무리 화면
    if (nextIndex >= pastLives.total) {
      setScreen('cta');
      return;
    }

    // 이미 로드된 전생 → 바로 이동
    if (pastLives.lives[nextIndex]) {
      setCurrentLife(nextIndex);
      return;
    }

    // 다음 전생 로드
    setIsLoadingNext(true);
    try {
      const cached = getCachedLife(requestParams.hash, nextIndex);
      const life = cached || await fetchLife(requestParams, nextIndex);
      if (!cached) setCachedLife(requestParams.hash, nextIndex, life);

      setPastLives(prev => {
        const lives = [...prev.lives];
        lives[nextIndex] = life;
        return { ...prev, lives };
      });
      setCurrentLife(nextIndex);
    } catch (err) {
      console.error('[handleNext] fetch failed:', err.message);
      setError(`다음 전생 로드 실패: ${err.message}`);
    } finally {
      setIsLoadingNext(false);
    }
  };

  const handlePrev = () => {
    if (currentLife > 0) setCurrentLife(i => i - 1);
  };

  const handleReset = () => {
    setScreen('input');
    setPastLives(null);
    setCurrentLife(0);
    setError(null);
    setRequestParams(null);
    setIsLoadingNext(false);
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
    </div>
  );
}

import { useState } from 'react';
import StarBackground from './components/StarBackground';
import InputScreen from './components/InputScreen';
import ResultScreen from './components/ResultScreen';
import CTAScreen from './components/CTAScreen';
import { MOCK_PAST_LIVES } from './mockData.js';

// VITE_MOCK_MODE=true → 목업 데이터 사용 (API 호출 없음)
const IS_MOCK = import.meta.env.VITE_MOCK_MODE === 'true';

// 전체 결과를 하나의 키로 캐싱 (sinbe_pastlife_{hash})
const CACHE_PREFIX = 'sinbe_pastlife_';

function hashInput(name, dateType, year, month, day, hour) {
  const str = `${name}|${dateType}|${year}|${month}|${day}|${hour}`;
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export default function App() {
  const [screen, setScreen] = useState('input');
  const [pastLives, setPastLives] = useState(null);
  const [currentLife, setCurrentLife] = useState(0);
  const [userName, setUserName] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (formData) => {
    const { name, dateType, year, month, day, hour } = formData;
    setUserName(name);
    setError(null);

    const hash = hashInput(name, dateType, year, month, day, hour);

    // 캐시 확인: 동일 입력이면 즉시 반환
    const cached = (() => {
      try { return JSON.parse(localStorage.getItem(CACHE_PREFIX + hash)); }
      catch { return null; }
    })();

    if (cached) {
      setPastLives(cached);
      setCurrentLife(0);
      setScreen('result');
      return;
    }

    setScreen('loading');

    try {
      let data;

      if (IS_MOCK) {
        await new Promise(r => setTimeout(r, 800));
        data = MOCK_PAST_LIVES;
      } else {
        const res = await fetch('/api/past-lives', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, dateType, year, month, day, hour, hash }),
        });
        data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || `서버 오류 (${res.status})`);
      }

      // 전체 결과 캐싱 (단일 키)
      try { localStorage.setItem(CACHE_PREFIX + hash, JSON.stringify(data)); } catch {}

      setPastLives(data);
      setCurrentLife(0);
      setScreen('result');
    } catch (err) {
      setError(err.message);
      setScreen('input');
    }
  };

  const handleNext = () => {
    if (currentLife < pastLives.lives.length - 1) {
      setCurrentLife(i => i + 1);
    } else {
      setScreen('cta');
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
          />
        )}
        {screen === 'cta' && <CTAScreen userName={userName} onReset={handleReset} />}
      </div>
      <div className="branding">신비의거울</div>
    </div>
  );
}

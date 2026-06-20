import { useState, useEffect, useRef } from 'react';
import StarBackground from './components/StarBackground';
import InputScreen from './components/InputScreen';
import IntroScreen from './components/IntroScreen';
import ResultScreen from './components/ResultScreen';
import CTAScreen from './components/CTAScreen';
import ShareScreen from './components/ShareScreen';
import { decodeShareData } from './utils/share.js';
import { MOCK_PAST_LIVES } from './mockData.js';

// VITE_MOCK_MODE=true → 목업 데이터 사용 (API 호출 없음)
const IS_MOCK = import.meta.env.VITE_MOCK_MODE === 'true';

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
  return 2 + (n % 2); // 2~3
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

// 로딩 화면 하단 안내 문구 (5~6초마다 순환)
const LOADING_MESSAGES = [
  '전생을 탐험하는 중...',
  '시간의 강을 거슬러 올라가고 있습니다...',
  '당신의 전생 기억이 깨어나고 있습니다...',
  '영혼의 흔적을 찾아가고 있습니다...',
  '전생의 이야기가 모습을 드러내고 있습니다...',
  '곧 당신의 전생이 밝혀집니다...',
];

function LoadingScreen() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIndex(i => (i + 1) % LOADING_MESSAGES.length);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="loading-screen">
      <video
        src="/images/loading/loading_combined.mp4"
        autoPlay
        loop
        muted
        playsInline
        style={{ maxWidth: '400px', width: '100%', display: 'block', margin: '0 auto' }}
      />
      <p className="loading-text">{LOADING_MESSAGES[msgIndex]}</p>
    </div>
  );
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

  const isEnglish = window.location.pathname.startsWith('/en');

  const [screen, setScreen] = useState(isEnglish ? 'intro' : 'input');
  const [pastLives, setPastLives] = useState(null);
  const [currentLife, setCurrentLife] = useState(0);
  const [userName, setUserName] = useState('');
  const [error, setError] = useState(null);
  const audioRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);

  const handleToggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = !isMuted;
    audio.muted = next;
    setIsMuted(next);
  };

  // 공유 페이지 → 메인으로 이동
  const handleShareStart = () => {
    window.history.replaceState({}, '', window.location.pathname);
    setShowShare(false);
  };

  const handleSubmit = async (formData) => {
    const { name, dateType, year, month, day, hour } = formData;
    setUserName(name);
    setError(null);

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }

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
        // 항상 API 호출 — Redis 번들 캐시 HIT 시 즉시 반환, MISS 시 AI 생성
        const result = await fetchAllLives({ name, dateType, year, month, day, hour, hash, totalLives, soulGrade });
        lives = result.lives;
        soul_summary = result.soul_summary;
      }

      const styleIndexes = buildStyleIndexes(totalLives);
      console.log(`[style] styleIndexes=${JSON.stringify(styleIndexes)}`);
      setPastLives({ total: totalLives, soul_grade: soulGrade, lives, styleIndexes, soul_summary });
      setCurrentLife(0);
      setScreen('result');
    } catch (err) {
      setError(err.message);
      setScreen('error');
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
        <audio ref={audioRef} src="/audio/bgm.mp3" loop />
        <button
          className="mute-btn"
          onClick={handleToggleMute}
          style={{ position: 'fixed', top: 16, right: 16, zIndex: 100, background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', width: 40, height: 40, fontSize: 18, cursor: 'pointer' }}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
        <StarBackground />
        <div className="container">
          <ShareScreen
            shareId={shareRouteId}       // /share/{id} 방식
            shareData={shareData}         // ?data= base64 방식 (하위 호환)
            onStart={handleShareStart}
            isEnglish={isEnglish}
          />
        </div>
        <div className="branding">{isEnglish ? 'imyeppi.com' : '신비의거울'}</div>
      </div>
    );
  }

  return (
    <div className="app">
      <audio ref={audioRef} src="/audio/bgm.mp3" loop />
      <button
        className="mute-btn"
        onClick={handleToggleMute}
        style={{ position: 'fixed', top: 16, right: 16, zIndex: 100, background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', width: 40, height: 40, fontSize: 18, cursor: 'pointer' }}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>
      <StarBackground />
      <div className="container">
        {screen === 'intro' && <IntroScreen onStart={() => setScreen('input')} />}
        {screen === 'input' && <InputScreen onSubmit={handleSubmit} error={error} isEnglish={isEnglish} />}
        {screen === 'loading' && <LoadingScreen />}
        {screen === 'result' && pastLives && (
          <ResultScreen
            userName={userName}
            data={pastLives}
            currentIndex={currentLife}
            onNext={handleNext}
            onPrev={handlePrev}
            isLoadingNext={false}
            isEnglish={isEnglish}
          />
        )}
        {screen === 'cta' && <CTAScreen userName={userName} soulSummary={pastLives?.soul_summary} onReset={handleReset} isEnglish={isEnglish} />}
        {screen === 'error' && (
          <div className="error-screen">
            <p className="error-message">🔮 지금 많은 분들이 전생을 탐험하고 있어요.<br />다시 시도해주세요.</p>
            <button className="reset-btn" onClick={handleReset}>다시 탐험하기</button>
          </div>
        )}
      </div>
      <div className="branding">{isEnglish ? 'imyeppi.com' : '신비의거울'}</div>

    </div>
  );
}

import { useEffect, useState } from 'react';

// ── 역사 인물 카드 테마 ──
const HIST_THEME = {
  '이순신':   { bg: '#071828', color: '#55c8ff', hanja: '李舜臣',   year: '1545 ~ 1598' },
  '정약용':   { bg: '#0a1408', color: '#70c060', hanja: '丁若鏞',   year: '1762 ~ 1836' },
  '황진이':   { bg: '#1a0820', color: '#e080c0', hanja: '黃眞伊',   year: '1506 ~ 1544' },
  '논개':     { bg: '#1a0808', color: '#e05050', hanja: '論介',     year: '1574 ~ 1593' },
  '허준':     { bg: '#0a1208', color: '#60c088', hanja: '許浚',     year: '1539 ~ 1615' },
  '진성여왕': { bg: '#160a20', color: '#c080e0', hanja: '眞聖女王', year: '858 ~ 897'   },
  '장녹수':   { bg: '#1a0a0a', color: '#e06060', hanja: '張綠水',   year: '? ~ 1506'    },
};
const HIST_THEME_DEFAULT = { bg: '#0d0920', color: '#a080cc', hanja: '', year: '' };

// ── 그룹+성별 → 캐릭터 이미지 매핑 ──
// 각 항목: [_1파일, _2파일] — _2가 있으면 50% 확률로 선택
// getCharImage는 `${group}_${gender}` 키만 사용 (12그룹 × 2성별 = 24조합)
const GROUP_IMAGE = {
  // ── fantasy ──
  fantasy_여:     ['gumiho_f_1.jpg',        'gumiho_f_2.jpg'],
  fantasy_남:     ['jeoseungsaja_m_1.jpg',   'jeoseungsaja_m_2.jpg'],  // fallback: _1 유지
  // ── warrior ──
  warrior_남:     ['mushin_m_1.jpg',         'mushin_m_2.jpg'],
  warrior_여:     ['mushin_f_1.jpg',         'mushin_f_2.jpg'],
  // ── shaman ──
  shaman_남:      ['musokin_m_1.jpg',        'musokin_m_2.jpg'],
  shaman_여:      ['shaman_f_1.png',         'shaman_f_2.jpg'],
  // ── entertainer ──
  entertainer_여: ['gisaeng_f_1.jpg',        'gisaeng_f_2.jpg'],
  entertainer_남: ['entertainer_m_1.png',    'entertainer_m_2.jpg'],
  // ── commoner ──
  commoner_여:    ['commoner_f_1.png',       'commoner_f_2.jpg'],
  commoner_남:    ['commoner_m_1.png',       'commoner_m_2.jpg'],
  // ── scholar ──
  scholar_남:     ['uiwon_m_1.jpg',          'uiwon_m_2.jpg'],
  scholar_여:     ['uiwon_f_1.jpg',          'uiwon_f_2.jpg'],
  // ── royal ──
  royal_남:       ['king_m_1.jpg',           'king_m_2.jpg'],
  royal_여:       ['king_f_1.jpg',           'king_f_2.jpg'],
  // ── noble ──
  noble_남:       ['yangban_m_1.jpg',        'yangban_m_2.jpg'],
  noble_여:       ['yangban_f_1.jpg',        'yangban_f_2.jpg'],
  // ── monk ──
  monk_남:        ['monk_m_1.jpg',           'monk_m_2.jpg'],
  monk_여:        ['monk_f_1.jpg',           'monk_f_2.jpg'],
  // ── court ──
  court_여:       ['gungnyeo_f_1.png',       'gungnyeo_f_2.jpg'],
  court_남:       ['court_m_1.png',          'court_m_2.jpg'],
  // ── outlaw ──
  outlaw_남:      ['rebel_m_1.png',          'rebel_m_2.jpg'],
  outlaw_여:      ['rebel_f_1.jpg',          'rebel_f_2.jpg'],
  // ── outcast ──
  outcast_남:     ['outcast_m_1.jpg',        'outcast_m_2.jpg'],
  outcast_여:     ['outcast_f_1.jpg',        'outcast_f_2.jpg'],
};

// group + gender 조합으로 이미지 경로 반환
// _1/_2 파일 모두 있으면 50:50으로 선택
// ※ Math.random()은 React 리렌더마다 다른 값 반환 → 이미지 깜빡임 유발
//    대신 life.name 기반 결정론적 해시 사용 → 같은 생애 = 항상 같은 이미지
function getCharImage(life) {
  if (life.group && life.gender) {
    const key = `${life.group}_${life.gender}`;
    const files = GROUP_IMAGE[key];
    if (files?.length) {
      let file = files[0];
      if (files.length > 1) {
        // name 글자 코드 합산 → 짝수/_2, 홀수/_1 (안정적 50:50 분포)
        const seed = (life.name || '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
        file = seed % 2 === 0 ? files[1] : files[0];
      }
      console.log(`[getCharImage] key=${key} selected=${file}`);
      return `/images/characters/${file}`;
    }
  }
  console.log(`[getCharImage] fallback image_file=${life.image_file}`);
  return life.image_file || '';
}

// 강조색 → 화이트 방향 40% 블렌드 (한글 이름·연도 텍스트용)
function lightenColor(hex, amount = 0.4) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r + (255 - r) * amount)},${Math.round(g + (255 - g) * amount)},${Math.round(b + (255 - b) * amount)})`;
}

const GRADE_META = {
  '첫번째생': { color: '#FFD700', emoji: '✨' },
  '어린영혼':  { color: '#6BA3D4', emoji: '🌱' },
  '오래된영혼': { color: '#A86ECC', emoji: '🌙' },
  '고대영혼':  { color: '#D4624A', emoji: '⚡' },
};

// birth_year / death_year 기반 시대 표시
function eraDisplay(life) {
  const b = life.birth_year;
  const d = life.death_year;
  if (b && d)  return `${b}년 ~ ${d}년`;
  if (b && !d) return `${b}년 ~ 사망 시점 불명`;
  if (!b && d) return `~ ${d}년`;
  // 둘 다 없으면 기존 형식 fallback
  return `${life.era} · ${life.year}`;
}

function CharImage({ src, identity, name, shortName, color }) {
  // 같은 파일명의 .mp4 존재 시 영상으로 표시, 없으면 이미지 fallback
  const videoSrc = src ? src.replace(/\.[^.]+$/, '.mp4') : null;
  const [videoFailed, setVideoFailed] = useState(false);
  const showVideo = !!videoSrc && !videoFailed;

  return (
    <div className="char-img-wrap" style={{ background: `linear-gradient(160deg, ${color}30 0%, ${color}15 100%)` }}>
      {showVideo ? (
        <video
          key={videoSrc}
          className="char-img"
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          onError={() => setVideoFailed(true)}
        />
      ) : (
        <img
          key={src}
          className="char-img"
          src={src || ''}
          alt={`${identity} ${name}`}
        />
      )}
      <div className="char-img-placeholder">
        <span className="char-placeholder-identity">{identity}</span>
        <span className="char-placeholder-name" style={{ color }}>{shortName}</span>
      </div>
    </div>
  );
}

// 한자 글자 수에 따라 폰트 크기 결정
// ≤10자: 48px / 11~15자: 38px (80%) / ≥16자: 29px (60%)
function hanjaFontSize(hanja) {
  const len = hanja.length;
  if (len >= 16) return '29px';
  if (len >= 11) return '38px';
  return '48px';
}

// 괄호 앞까지만 추출 — "懶翁禪師 (속명: 元惠)" → "懶翁禪師"
function stripHanjaParens(hanja) {
  return hanja.split('(')[0].trim();
}

function HistCard({ figure, profile }) {
  const theme = HIST_THEME[figure];
  // HIST_THEME 미등록 시 historical_profile.name_hanja 자동 활용
  const rawHanja   = theme?.hanja        || profile?.name_hanja  || '';
  const hanja      = stripHanjaParens(rawHanja); // 괄호 이후 제거
  const year       = theme?.year         || profile?.birth_death || '';
  const bg         = theme?.bg           || '#160a28';
  const color      = theme?.color        || '#a080cc';
  const lightColor = lightenColor(color);

  // 중앙 정렬·width 100% 공통 스타일
  const centerStyle = { width: '100%', textAlign: 'center', display: 'block' };

  return (
    <div
      className="hist-img-wrap"
      style={{ background: bg, border: `1px solid ${color}40`, flexDirection: 'column', gap: '8px' }}
    >
      {hanja ? (
        // 한자 있음: 한자(크게) + 한글 이름
        <>
          <span style={{
            ...centerStyle,
            fontSize: hanjaFontSize(hanja),
            fontWeight: 300,
            letterSpacing: '8px',
            color,
            opacity: 0.55,
            lineHeight: 1.1,
            textShadow: `0 0 20px ${color}99, 0 0 40px ${color}55, 0 0 80px ${color}22`,
          }}>
            {hanja}
          </span>
          <span style={{
            ...centerStyle,
            fontSize: '22px',
            fontWeight: 600,
            letterSpacing: '4px',
            color: lightColor,
            textShadow: `0 0 12px ${color}88, 0 0 24px ${color}44`,
          }}>
            {figure}
          </span>
        </>
      ) : (
        // 한자 없음: 한글 이름 크게
        <span style={{
          ...centerStyle,
          fontSize: '32px',
          fontWeight: 600,
          letterSpacing: '4px',
          color: lightColor,
          textShadow: `0 0 16px ${color}99, 0 0 32px ${color}55`,
        }}>
          {figure}
        </span>
      )}
      {year && (
        <span style={{ ...centerStyle, fontSize: '12px', letterSpacing: '2px', color: lightColor, opacity: 0.55 }}>
          {year}
        </span>
      )}
    </div>
  );
}

export default function ResultScreen({ userName, data, currentIndex, onNext, onPrev, isLoadingNext = false }) {
  const life = data.lives[currentIndex];
  const meta = GRADE_META[data.soul_grade] || GRADE_META['오래된영혼'];
  const cardColor = life.color || meta.color;
  const p = life.historical_profile; // 편의용 단축

  // 표시용 파생값
  const shortName     = life.name.split(' ').at(-1);              // 마지막 단어만 (연이, 강이도 …)
  const shortIdentity = life.identity.split('(')[0].trim();       // 괄호 앞 직업명만 (구미호, 저승사자 …)

  // 인접 전생 이미지 프리로드 (currentIndex 변경마다 실행)
  useEffect(() => {
    [data.lives[currentIndex - 1], data.lives[currentIndex + 1]]
      .filter(Boolean)
      .map(getCharImage)
      .filter(Boolean)
      .forEach((src) => { const img = new Image(); img.src = src; });
  }, [currentIndex, data.lives]);

  // 페이지 전환은 App.jsx의 onNext/onPrev 내부에서 scrollTo 처리
  const handleNext = () => { onNext(); };
  const handlePrev = () => { onPrev(); };

  return (
    <div className="result-screen">
      <div className="result-header">
        <p className="life-count-text">
          <span className="name-highlight">{userName}</span>님의 전생은 총{' '}
          <span className="count-highlight">{data.total}회</span>입니다
        </p>
        <div className="soul-grade-badge" style={{ borderColor: meta.color, color: meta.color }}>
          {meta.emoji} {data.soul_grade}
        </div>
      </div>

      <div className="dot-progress">
        {Array.from({ length: data.total }, (_, i) => (
          <div
            key={i}
            className={`dot${i === currentIndex ? ' active' : i < currentIndex ? ' past' : ''}`}
            style={i === currentIndex
              ? { backgroundColor: cardColor, boxShadow: `0 0 8px ${cardColor}` }
              : i < currentIndex
              ? { backgroundColor: `${cardColor}60` }
              : {}}
          />
        ))}
      </div>

      <div className="life-card" style={{ borderColor: `${cardColor}50` }}>
        {/* 이미지 영역 — 전생 캐릭터 (3:4) */}
        <CharImage
          key={currentIndex}
          src={getCharImage(life)}
          identity={shortIdentity}
          name={life.name}
          shortName={shortName}
          color={cardColor}
        />

        <div className="card-body">
          <div className="card-header-inline" style={{ borderBottomColor: `${cardColor}25` }}>
            <span className="life-number">{currentIndex + 1}번째 전생</span>
            <span className="era-text" style={{ color: cardColor }}>{eraDisplay(life)}</span>
          </div>

          <div className="card-section">
            <span className="section-label">신분</span>
            <p className="section-content identity">{life.identity}</p>
          </div>

          <div className="card-divider" style={{ backgroundColor: `${cardColor}18` }} />

          <div className="card-section">
            <span className="section-label">전생 이름</span>
            <p className="section-content life-name" style={{ color: cardColor }}>{shortName}</p>
          </div>

          <div className="card-divider" style={{ backgroundColor: `${cardColor}18` }} />

          <div className="card-section">
            <span className="section-label">생애</span>
            <p className="section-content story">{life.story}</p>
          </div>

          <div className="card-divider" style={{ backgroundColor: `${cardColor}18` }} />

          <div className="card-section">
            <span className="section-label">최후</span>
            <p className="section-content death">{life.death}</p>
          </div>

          <div className="card-divider" style={{ backgroundColor: `${cardColor}18` }} />

          <div className="card-section karma-section" style={{ backgroundColor: `${cardColor}0d` }}>
            <span className="section-label karma-label">✦ 현생 업보</span>
            <p className="section-content karma">{life.karma}</p>
          </div>

          {life.past_trace && (
            <>
              <div className="card-divider" style={{ backgroundColor: `${cardColor}18` }} />
              <div className="card-section karma-section" style={{ backgroundColor: `${cardColor}0d` }}>
                <span className="section-label karma-label">✦ 전생의 흔적</span>
                <p className="section-content karma">전생의 {shortIdentity} 때문에 이번생엔... {life.past_trace}</p>
              </div>
            </>
          )}

          {/* 역사 인물 */}
          {life.historical_figure && (
            <>
              <div className="hist-divider">
                <span className="hist-divider-label">✨ 당신의 전생 기운과 닮은 인물</span>
              </div>

              {/* hist-figure-row: 모바일 세로 / PC 가로 배치 */}
              <div className="hist-figure-row">
                <HistCard figure={life.historical_figure} profile={p} />

                <div className="hist-info">
                  {/* ── 이름 헤더 ── */}
                  <div className="hist-name-row">
                    <span className="hist-name">{life.historical_figure}</span>
                    {p?.name_hanja && (
                      <span className="hist-name-hanja">({p.name_hanja})</span>
                    )}
                  </div>
                  <div className="hist-name-divider" />

                  {p && (
                    <>
                      {/* ── 생몰 / 신분 메타 ── */}
                      <div className="hist-meta-list">
                        {p.birth_death && (
                          <div className="hist-meta-row">
                            <span className="hist-meta-icon">📅</span>
                            <span className="hist-meta-label">생몰</span>
                            <span className="hist-meta-value">{p.birth_death}</span>
                          </div>
                        )}
                        {p.title && (
                          <div className="hist-meta-row">
                            <span className="hist-meta-icon">👑</span>
                            <span className="hist-meta-label">신분</span>
                            <span className="hist-meta-value">{p.title}</span>
                          </div>
                        )}
                      </div>

                      {/* ── 주요 업적 ── */}
                      {p.achievement && (
                        <div className="hist-section">
                          <div className="hist-section-label">📖 주요 업적</div>
                          <p className="hist-section-text">{p.achievement}</p>
                        </div>
                      )}

                      {/* ── 역사적 평가 ── */}
                      {p.evaluation && (
                        <div className="hist-section">
                          <div className="hist-section-label">✨ 역사적 평가</div>
                          <p className="hist-section-text">{p.evaluation}</p>
                        </div>
                      )}

                      {/* ── 닮은 이유 ── */}
                      {(p.reason || life.historical_reason) && (
                        <div className="hist-section">
                          <div className="hist-section-label">💫 닮은 이유</div>
                          <p className="hist-section-text hist-reason-text">
                            {p.reason || life.historical_reason}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="nav-buttons">
        {currentIndex > 0 && (
          <button className="nav-btn prev-btn" onClick={handlePrev}>
            ← 이전
          </button>
        )}
        <button
          className="nav-btn next-btn"
          style={{ backgroundColor: isLoadingNext ? `${cardColor}80` : cardColor }}
          onClick={handleNext}
          disabled={isLoadingNext}
        >
          {isLoadingNext
            ? '탐험 중...'
            : currentIndex < data.total - 1
            ? '다음 전생 →'
            : '여정 마치기 ✦'}
        </button>
      </div>

      <p className="disclaimer">재미로 보는 전생 이야기입니다</p>
    </div>
  );
}

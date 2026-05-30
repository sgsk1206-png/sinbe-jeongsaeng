import { useEffect } from 'react';

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
  return (
    <div className="char-img-wrap" style={{ background: `linear-gradient(160deg, ${color}30 0%, ${color}15 100%)` }}>
      <img
        key={src}
        className="char-img"
        src={src || ''}
        alt={`${identity} ${name}`}
      />
      <div className="char-img-placeholder">
        <span className="char-placeholder-identity">{identity}</span>
        <span className="char-placeholder-name" style={{ color }}>{shortName}</span>
      </div>
    </div>
  );
}

function HistCard({ figure }) {
  const theme = HIST_THEME[figure] || HIST_THEME_DEFAULT;
  const { bg, color, hanja, year } = theme;
  const lightColor = lightenColor(color);
  return (
    <div
      className="hist-img-wrap"
      style={{ background: bg, border: `1px solid ${color}40`, flexDirection: 'column', gap: '8px' }}
    >
      {hanja && (
        <span style={{ fontSize: '48px', fontWeight: 300, letterSpacing: '8px', color, opacity: 0.55, lineHeight: 1.1 }}>
          {hanja}
        </span>
      )}
      <span style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '4px', color: lightColor }}>
        {figure}
      </span>
      {year && (
        <span style={{ fontSize: '12px', letterSpacing: '2px', color: lightColor, opacity: 0.55 }}>
          {year}
        </span>
      )}
    </div>
  );
}

export default function ResultScreen({ userName, data, currentIndex, onNext, onPrev }) {
  const life = data.lives[currentIndex];
  const meta = GRADE_META[data.soul_grade] || GRADE_META['오래된영혼'];
  const cardColor = life.color || meta.color;
  const p = life.historical_profile; // 편의용 단축

  // 표시용 파생값
  const shortName     = life.name.split(' ').at(-1);              // 마지막 단어만 (연이, 강이도 …)
  const shortIdentity = life.identity.split('(')[0].trim();       // 괄호 앞 직업명만 (구미호, 저승사자 …)

  // 인접 전생 이미지 프리로드 (currentIndex 변경마다 실행)
  useEffect(() => {
    const neighbors = [
      data.lives[currentIndex - 1]?.image_file,
      data.lives[currentIndex + 1]?.image_file,
    ].filter(Boolean);
    neighbors.forEach((file) => {
      const img = new Image();
      img.src = file;
    });
  }, [currentIndex, data.lives]);

  // 페이지 전환 시 항상 최상단부터 표시
  const handleNext = () => { window.scrollTo(0, 0); onNext(); };
  const handlePrev = () => { window.scrollTo(0, 0); onPrev(); };

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
        {data.lives.map((_, i) => (
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
          src={life.image_file || ''}
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
                <HistCard figure={life.historical_figure} />

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
          style={{ backgroundColor: cardColor }}
          onClick={handleNext}
        >
          {currentIndex < data.lives.length - 1 ? '다음 전생 →' : '여정 마치기 ✦'}
        </button>
      </div>

      <p className="disclaimer">재미로 보는 전생 이야기입니다</p>
    </div>
  );
}

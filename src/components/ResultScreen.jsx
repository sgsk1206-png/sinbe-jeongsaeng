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

function CharImage({ src, identity, name, color }) {
  return (
    <div className="char-img-wrap" style={{ background: `linear-gradient(160deg, ${color}30 0%, ${color}15 100%)` }}>
      <img
        className="char-img"
        src={src || ''}
        alt={`${identity} ${name}`}
      />
      <div className="char-img-placeholder">
        <span className="char-placeholder-identity">{identity}</span>
        <span className="char-placeholder-name" style={{ color }}>{name}</span>
      </div>
    </div>
  );
}

function HistImage({ src, figure }) {
  return (
    <div className="hist-img-wrap">
      <img
        className="hist-img"
        src={src || ''}
        alt={figure}
      />
      <div className="hist-img-placeholder">
        <span className="hist-placeholder-name">{figure}</span>
      </div>
    </div>
  );
}

export default function ResultScreen({ userName, data, currentIndex, onNext, onPrev }) {
  const life = data.lives[currentIndex];
  const meta = GRADE_META[data.soul_grade] || GRADE_META['오래된영혼'];
  const cardColor = life.color || meta.color;
  const p = life.historical_profile; // 편의용 단축

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
          src=""
          identity={life.identity}
          name={life.name}
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
            <p className="section-content life-name" style={{ color: cardColor }}>{life.name}</p>
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

          {/* 역사 인물 */}
          {life.historical_figure && (
            <>
              <div className="hist-divider">
                <span className="hist-divider-label">✨ 당신의 전생 기운과 닮은 인물</span>
              </div>

              {/* hist-figure-row: 모바일 세로 / PC 가로 배치 */}
              <div className="hist-figure-row">
                <HistImage src="" figure={life.historical_figure} />
                <div className="hist-info">
                  <p className="hist-name">
                    {life.historical_figure}
                    {p?.name_hanja && (
                      <span className="hist-name-hanja"> ({p.name_hanja})</span>
                    )}
                  </p>
                  {p && (
                    <>
                      <p className="hist-profile-dates">{p.dates}</p>
                      <p className="hist-profile-status">{p.status}</p>
                      <p className="hist-profile-achievement">{p.achievement}</p>
                      <p className="hist-profile-evaluation">{p.evaluation}</p>
                    </>
                  )}
                  <p className="hist-reason">{life.historical_reason}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="nav-buttons">
        {currentIndex > 0 && (
          <button className="nav-btn prev-btn" onClick={onPrev}>
            ← 이전
          </button>
        )}
        <button
          className="nav-btn next-btn"
          style={{ backgroundColor: cardColor }}
          onClick={onNext}
        >
          {currentIndex < data.lives.length - 1 ? '다음 전생 →' : '여정 마치기 ✦'}
        </button>
      </div>

      <p className="disclaimer">재미로 보는 전생 이야기입니다</p>
    </div>
  );
}

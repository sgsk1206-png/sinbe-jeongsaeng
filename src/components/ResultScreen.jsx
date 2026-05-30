import { useEffect } from 'react';

// ── 역사 인물 패턴 배경 설정 ──
const HIST_CONFIG = {
  '이순신':    { bg: '#071220', words: ['임진왜란','거북선','불패','李舜臣','수군','환도','파도'],   accent: '#55c8ff' },
  '세종대왕':  { bg: '#110d00', words: ['훈민정음','世宗','ㄱㄴㄷ','ㅏㅑㅓ','집현전','측우기'],     accent: '#e8c040' },
  '황진이':    { bg: '#1a0820', words: ['가야금','황진이','기녀','시조','달빛'],                   accent: '#e080c0' },
  '논개':      { bg: '#1a0808', words: ['의기','남강','논개','왜장','꽃'],                        accent: '#e05050' },
  '정약용':    { bg: '#0a1408', words: ['목민심서','茶山','실학','거중기','유배'],                 accent: '#70c060' },
  '광개토대왕': { bg: '#0d0d1a', words: ['광개토','정복','고구려','碑','천하'],                    accent: '#8080e0' },
};
const HIST_DEFAULT = { bg: '#0d0920', words: [], accent: '#9B59B6' };

// 인물명+인덱스 기반 결정론적 의사난수 (0~1)
function pseudoRand(figure, i) {
  let h = [...figure].reduce((acc, c, j) => (acc + c.charCodeAt(0) * (j + 1)) | 0, 0);
  h = ((h ^ (i * 2654435761)) >>> 0);
  return (h % 10000) / 10000;
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

function HistPattern({ figure, profile }) {
  const cfg = HIST_CONFIG[figure] || HIST_DEFAULT;
  return (
    <div className="hist-img-wrap" style={{ background: cfg.bg }}>
      {/* 패턴 텍스트 — 결정론적 위치/크기/투명도 */}
      {cfg.words.map((word, i) => (
        <span
          key={i}
          className="hist-pattern-word"
          style={{
            top:      `${5  + pseudoRand(figure, i * 5 + 0) * 82}%`,
            left:     `${3  + pseudoRand(figure, i * 5 + 1) * 82}%`,
            fontSize: `${11 + pseudoRand(figure, i * 5 + 2) * 16}px`,
            opacity:   0.10 + pseudoRand(figure, i * 5 + 3) * 0.15,
            transform: `rotate(${-20 + pseudoRand(figure, i * 5 + 4) * 40}deg)`,
            color: cfg.accent,
          }}
        >
          {word}
        </span>
      ))}
      {/* 중앙 인물 정보 */}
      <div className="hist-pattern-center">
        {profile?.name_hanja && (
          <span className="hist-pattern-hanja" style={{ color: cfg.accent }}>{profile.name_hanja}</span>
        )}
        <span className="hist-pattern-name">{figure}</span>
        {profile?.birth_death && (
          <span className="hist-pattern-dates">{profile.birth_death}</span>
        )}
      </div>
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

          {/* 역사 인물 */}
          {life.historical_figure && (
            <>
              <div className="hist-divider">
                <span className="hist-divider-label">✨ 당신의 전생 기운과 닮은 인물</span>
              </div>

              {/* hist-figure-row: 모바일 세로 / PC 가로 배치 */}
              <div className="hist-figure-row">
                <HistPattern figure={life.historical_figure} profile={p} />

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

import { useState, useEffect } from 'react';

// ── 그룹+성별 → 이미지 매핑 (ResultScreen과 동일) ──
const GROUP_IMAGE = {
  fantasy_여:     ['gumiho_f_1.jpg',        'gumiho_f_2.jpg',       'gumiho_f_3.jpg'],
  fantasy_남:     ['jeoseungsaja_m_1.jpg',   'jeoseungsaja_m_2.jpg', 'jeoseungsaja_m_3.jpg'],
  warrior_남:     ['mushin_m_1.jpg',         'mushin_m_2.jpg',       'mushin_m_3.jpg'],
  warrior_여:     ['mushin_f_1.jpg',         'mushin_f_2.jpg',       'mushin_f_3.jpg'],
  shaman_남:      ['musokin_m_1.jpg',        'musokin_m_2.jpg',      'musokin_m_3.jpg'],
  shaman_여:      ['shaman_f_1.png',         'shaman_f_2.jpg',       'shaman_f_3.jpg'],
  entertainer_여: ['gisaeng_f_1.jpg',        'gisaeng_f_2.jpg',      'gisaeng_f_3.jpg'],
  entertainer_남: ['entertainer_m_1.png',    'entertainer_m_2.jpg',  'entertainer_m_3.jpg'],
  commoner_여:    ['commoner_f_1.png',       'commoner_f_2.jpg',     'commoner_f_3.jpg'],
  commoner_남:    ['commoner_m_1.png',       'commoner_m_2.jpg',     'commoner_m_3.jpg'],
  scholar_남:     ['uiwon_m_1.jpg',          'uiwon_m_2.jpg',        'uiwon_m_3.jpg'],
  scholar_여:     ['uiwon_f_1.jpg',          'uiwon_f_2.jpg',        'uiwon_f_3.jpg'],
  royal_남:       ['king_m_1.jpg',           'king_m_2.jpg',         'king_m_3.jpg'],
  royal_여:       ['king_f_1.jpg',           'king_f_2.jpg',         'king_f_3.jpg'],
  noble_남:       ['yangban_m_1.jpg',        'yangban_m_2.jpg',      'yangban_m_3.jpg'],
  noble_여:       ['yangban_f_1.jpg',        'yangban_f_2.jpg',      'yangban_f_3.jpg'],
  monk_남:        ['monk_m_1.jpg',           'monk_m_2.jpg',         'monk_m_3.jpg'],
  monk_여:        ['monk_f_1.jpg',           'monk_f_2.jpg',         'monk_f_3.jpg'],
  court_여:       ['gungnyeo_f_1.png',       'gungnyeo_f_2.jpg',     'gungnyeo_f_3.jpg'],
  court_남:       ['court_m_1.png',          'court_m_2.jpg',        'court_m_3.jpg'],
  outlaw_남:      ['rebel_m_1.png',          'rebel_m_2.jpg',        'rebel_m_3.jpg'],
  outlaw_여:      ['rebel_f_1.jpg',          'rebel_f_2.jpg',        'rebel_f_3.jpg'],
  outcast_남:     ['outcast_m_1.jpg',        'outcast_m_2.jpg',      'outcast_m_3.jpg'],
  outcast_여:     ['outcast_f_1.jpg',        'outcast_f_2.jpg',      'outcast_f_3.jpg'],
};

// styleIndex: share-save에 저장된 원본 탐험의 스타일 인덱스 (0=A,1=B,2=C)
function getCharImage(life, styleIndex) {
  if (life.group && life.gender) {
    const key = `${life.group}_${life.gender}`;
    const files = GROUP_IMAGE[key];
    if (files?.length) {
      return `/images/characters/${files[styleIndex % files.length]}`;
    }
  }
  return life.image_file || '';
}

function lightenColor(hex, amount = 0.4) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r+(255-r)*amount)},${Math.round(g+(255-g)*amount)},${Math.round(b+(255-b)*amount)})`;
}

// styleIndex는 share 저장 시 고정된 값 — Math.random() 사용하지 않음
function ShareCharImage({ life, identity, shortName, color, styleIndex = 0 }) {
  const src = getCharImage(life, styleIndex);
  const videoSrc = src ? src.replace(/\.[^.]+$/, '.mp4') : null;
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoReady,  setVideoReady]  = useState(false);
  const showVideo = !!videoSrc && !videoFailed;
  return (
    <div className="char-img-wrap" style={{ background: `linear-gradient(160deg, ${color}30 0%, ${color}15 100%)` }}>
      {/* 비디오 준비 전에는 이미지 표시, 준비되면 fade-out */}
      <img
        className="char-img"
        src={src || ''}
        alt={identity}
        onError={e => { e.currentTarget.style.opacity = '0'; }}
        style={showVideo && videoReady ? { opacity: 0, transition: 'opacity 0.3s' } : undefined}
      />
      {/* visibility:hidden으로 숨겨 모바일 재생버튼 방지 */}
      {showVideo && (
        <video
          className="char-img"
          src={videoSrc}
          autoPlay loop muted playsInline
          onCanPlay={() => setVideoReady(true)}
          onError={() => setVideoFailed(true)}
          style={videoReady
            ? { opacity: 1, transition: 'opacity 0.3s' }
            : { visibility: 'hidden', opacity: 0 }}
        />
      )}
      <div className="char-img-placeholder">
        <span className="char-placeholder-identity">{identity}</span>
        <span className="char-placeholder-name" style={{ color }}>{shortName}</span>
      </div>
    </div>
  );
}

// ── 실제 콘텐츠 표시 ──
function ShareContent({ userName, life, soulGrade, styleIndex = 0, onStart }) {
  const cardColor  = life.color || '#a080cc';
  const lightColor = lightenColor(cardColor);
  const shortName  = life.name?.split(' ').at(-1) || '';
  const shortIdent = life.identity?.split('(')[0].trim() || '';
  const p          = life.historical_profile;

  const eraText = (() => {
    if (life.birth_year && life.death_year) return `${life.birth_year}년 ~ ${life.death_year}년`;
    if (life.birth_year) return `${life.birth_year}년생`;
    return life.era || '';
  })();

  return (
    <div className="share-screen">
      {/* 헤더 */}
      <div className="share-header">
        <span className="share-header-icon" style={{ color: cardColor }}>✦</span>
        <h2 className="share-header-title">
          <span style={{ color: cardColor }}>{userName}</span>님의 전생 이야기
        </h2>
        <p className="share-header-sub">{soulGrade} · {life.era}</p>
      </div>

      {/* 캐릭터 이미지 */}
      <ShareCharImage life={life} identity={shortIdent} shortName={shortName} color={cardColor} styleIndex={styleIndex} />

      {/* 생애 카드 */}
      <div className="life-card" style={{ borderColor: `${cardColor}50` }}>
        <div className="card-body">
          <div className="card-header-inline" style={{ borderBottomColor: `${cardColor}25` }}>
            <span className="life-number">전생</span>
            <span className="era-text" style={{ color: cardColor }}>{eraText}</span>
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

          {life.karma && (
            <>
              <div className="card-divider" style={{ backgroundColor: `${cardColor}18` }} />
              <div className="card-section karma-section" style={{ backgroundColor: `${cardColor}0d` }}>
                <span className="section-label karma-label">✦ 현생 업보</span>
                <p className="section-content karma">{life.karma}</p>
              </div>
            </>
          )}

          {life.past_trace && (
            <>
              <div className="card-divider" style={{ backgroundColor: `${cardColor}18` }} />
              <div className="card-section karma-section" style={{ backgroundColor: `${cardColor}0d` }}>
                <span className="section-label karma-label">✦ 전생의 흔적</span>
                <p className="section-content karma">
                  {life.past_trace.startsWith('전생의')
                    ? life.past_trace
                    : `전생의 ${shortIdent} 때문에 이번생엔... ${life.past_trace}`}
                </p>
              </div>
            </>
          )}

          {/* 역사 인물 */}
          {life.historical_figure && (
            <>
              <div className="hist-divider">
                <span className="hist-divider-label">✨ 당신의 전생 기운과 닮은 인물</span>
              </div>
              <div className="hist-figure-row">
                <div
                  className="hist-img-wrap"
                  style={{ background: '#160a28', border: `1px solid ${cardColor}40`, flexDirection: 'column', gap: '8px' }}
                >
                  {p?.name_hanja ? (
                    <>
                      <span style={{ width:'100%', textAlign:'center', display:'block', fontSize:'40px', fontWeight:300, letterSpacing:'8px', color:cardColor, opacity:0.55, lineHeight:1.1 }}>
                        {p.name_hanja.split('(')[0].trim()}
                      </span>
                      <span style={{ width:'100%', textAlign:'center', display:'block', fontSize:'20px', fontWeight:600, letterSpacing:'4px', color:lightColor }}>
                        {life.historical_figure}
                      </span>
                    </>
                  ) : (
                    <span style={{ width:'100%', textAlign:'center', display:'block', fontSize:'28px', fontWeight:600, letterSpacing:'4px', color:lightColor }}>
                      {life.historical_figure}
                    </span>
                  )}
                  {p?.birth_death && (
                    <span style={{ width:'100%', textAlign:'center', display:'block', fontSize:'12px', letterSpacing:'2px', color:lightColor, opacity:0.55 }}>
                      {p.birth_death}
                    </span>
                  )}
                </div>
                <div className="hist-info">
                  <div className="hist-name-row">
                    <span className="hist-name">{life.historical_figure}</span>
                    {p?.name_hanja && <span className="hist-name-hanja">({p.name_hanja.split('(')[0].trim()})</span>}
                  </div>
                  <div className="hist-name-divider" />
                  {p && (
                    <>
                      {p.title && (
                        <div className="hist-section">
                          <div className="hist-section-label">👑 신분</div>
                          <p className="hist-section-text">{p.title}</p>
                        </div>
                      )}
                      {p.reason && (
                        <div className="hist-section">
                          <div className="hist-section-label">💫 닮은 이유</div>
                          <p className="hist-section-text hist-reason-text">{p.reason}</p>
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

      {/* CTA */}
      <div className="share-cta-wrap">
        <p className="share-cta-desc">나의 전생은 무엇일까요?</p>
        <button className="share-cta-btn" style={{ background: cardColor }} onClick={onStart}>
          나의 전생 탐험하기 →
        </button>
      </div>

      <p className="disclaimer">재미로 보는 전생 이야기입니다</p>
    </div>
  );
}

// ── 로딩 화면 ──
function ShareLoading({ isEnglish }) {
  return (
    <div className="share-screen" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div className="loading-orb" />
      <p className="loading-text" style={{ marginTop: 24 }}>{isEnglish ? 'Retrieving your past-life memories...' : '전생의 기억을 불러오는 중...'}</p>
      <p className="loading-sub">{isEnglish ? 'Traveling back through the river of time' : '시간의 강을 거슬러 올라가고 있습니다'}</p>
    </div>
  );
}

// ── 에러/만료 화면 ──
function ShareError({ onStart }) {
  return (
    <div className="share-screen" style={{ alignItems: 'center', textAlign: 'center', paddingTop: 60 }}>
      <p style={{ fontSize: 40, marginBottom: 16 }}>🌌</p>
      <p style={{ fontSize: 18, color: 'var(--text)', fontWeight: 600, marginBottom: 10 }}>
        이미 사라진 전생이에요
      </p>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 32 }}>
        공유 링크가 만료되었거나 존재하지 않습니다.<br />
        나의 전생을 직접 탐험해보세요.
      </p>
      <button className="share-cta-btn" style={{ background: '#7B2FBE', maxWidth: 280 }} onClick={onStart}>
        나의 전생 탐험하기 →
      </button>
    </div>
  );
}

// ── 메인 컴포넌트 ──
// shareId: Redis ID (새 방식) — /share/{shareId} 경로로 접근 시
// shareData: 직접 전달 (하위 호환 — 기존 ?data= base64 방식)
export default function ShareScreen({ shareId = null, shareData = null, onStart, isEnglish }) {
  const [resolved, setResolved] = useState(shareData);
  const [loading,  setLoading]  = useState(!!shareId && !shareData);
  const [error,    setError]    = useState(false);

  useEffect(() => {
    if (!shareId || shareData) return;
    setLoading(true);
    fetch(`/api/share-get?id=${shareId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(true); return; }
        setResolved(d);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [shareId, shareData]);

  if (loading) return <ShareLoading isEnglish={isEnglish} />;
  if (error || !resolved) return <ShareError onStart={onStart} />;

  return (
    <ShareContent
      userName={resolved.userName}
      life={resolved.life}
      soulGrade={resolved.soulGrade}
      styleIndex={resolved.styleIndex ?? 0}
      onStart={onStart}
    />
  );
}

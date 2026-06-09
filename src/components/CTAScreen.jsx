const CTA_ITEMS = [
  {
    icon: '☀️',
    title: '오늘 운세',
    desc: '오늘 나의 운명의 흐름을 확인하세요',
    color: '#E8A020',
    href: 'https://www.sinbe.net/todayFortune?tab=saju',
  },
  {
    icon: '🃏',
    title: '타로 상담',
    desc: '카드가 말하는 당신의 미래',
    color: '#4A90D4',
    href: 'https://sinbe.net/?cate=1',
  },
  {
    icon: '☯️',
    title: '사주 상담',
    desc: '운명의 흐름을 읽어드립니다',
    color: '#A86ECC',
    href: 'https://sinbe.net/?cate=2',
  },
  {
    icon: '🔮',
    title: '신점 상담',
    desc: '신령의 기운으로 풀어드립니다',
    color: '#5BBFA8',
    href: 'https://sinbe.net/?cate=3',
  },
];

export default function CTAScreen({ userName, soulSummary, onReset }) {
  return (
    <div className="cta-screen">
      <div className="cta-header">
        <span className="cta-star">✦</span>
        <h2 className="cta-title">여정이 끝났습니다</h2>
        <p className="cta-subtitle">
          <span className="name-highlight">{userName}</span>님의 전생 탐험이 완료되었습니다
        </p>
        <p className="cta-desc">더 깊은 운명의 비밀을 신비의거울에서 확인해보세요</p>
      </div>

      {/* 영혼 종합 리딩 */}
      {soulSummary && (
        <div className="soul-summary-card">
          <div className="soul-summary-header">
            <span className="soul-summary-icon">🔮</span>
            <h3 className="soul-summary-title">영혼의 종합 리딩</h3>
          </div>
          <p className="soul-summary-text">{soulSummary}</p>
        </div>
      )}

      <div className="cta-cards">
        {CTA_ITEMS.map((item) => (
          <a
            key={item.title}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="cta-card"
            style={{ borderColor: `${item.color}35` }}
          >
            <span className="cta-icon" style={{ color: item.color }}>{item.icon}</span>
            <div className="cta-card-content">
              <p className="cta-card-title" style={{ color: item.color }}>{item.title}</p>
              <p className="cta-card-desc">{item.desc}</p>
            </div>
            <span className="cta-arrow" style={{ color: item.color }}>→</span>
          </a>
        ))}
      </div>

      <button className="reset-btn" onClick={onReset}>
        다시 탐험하기
      </button>
    </div>
  );
}

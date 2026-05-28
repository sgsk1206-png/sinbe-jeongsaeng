const CTA_ITEMS = [
  {
    icon: '💕',
    title: '연인 궁합',
    desc: '두 영혼의 인연을 확인하세요',
    color: '#E91E8C',
  },
  {
    icon: '☯',
    title: '사주 풀이',
    desc: '운명의 흐름을 읽어드립니다',
    color: '#A86ECC',
  },
  {
    icon: '🃏',
    title: '타로 상담',
    desc: '카드가 말하는 당신의 미래',
    color: '#4A90D4',
  },
];

export default function CTAScreen({ userName, onReset }) {
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

      <div className="cta-cards">
        {CTA_ITEMS.map((item) => (
          <a
            key={item.title}
            href="https://sinbe.net"
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

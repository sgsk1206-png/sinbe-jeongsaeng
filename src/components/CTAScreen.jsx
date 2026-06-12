import { useState } from 'react';

const CTA_ITEMS = [
  {
    icon: '☀️',
    title: '오늘 운세',
    desc: '오늘 나의 운명의 흐름을 확인하세요',
    color: '#E8A020',
    href: 'https://www.sinbe.net/todayFortune?tab=saju',
  },
];

const COUNSELORS = [
  { code: '985', name: '환희보살', category: '신점' },
  { code: '993', name: '자운도사', category: '신점' },
  { code: '502', name: '눈꽃신녀', category: '신점' },
  { code: '797', name: '미담', category: '신점' },
  { code: '513', name: '영혜', category: '신점' },
  { code: '490', name: '반야', category: '신점' },
  { code: '220', name: '진주', category: '타로' },
  { code: '774', name: '보라', category: '타로' },
  { code: '100', name: '해온', category: '타로' },
  { code: '557', name: '새나', category: '타로' },
  { code: '730', name: '월령', category: '타로' },
  { code: '999', name: '현묘', category: '사주' },
];

export default function CTAScreen({ userName, soulSummary, onReset }) {
  const [counselor] = useState(() => COUNSELORS[Math.floor(Math.random() * COUNSELORS.length)]);
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

      {/* 상담사 추천 */}
      <div className="counselor-card">
        <span className="counselor-badge">{counselor.category}</span>
        <img
          className="counselor-photo"
          src={`/images/counselors/${counselor.code}.jpg`}
          alt={counselor.name}
        />
        <p className="counselor-name">{counselor.name}</p>
        <a
          className="counselor-btn"
          href={`https://www.sinbe.net/counselDetail?Code=${counselor.code}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          상담하러 가기 →
        </a>
      </div>

      <button className="reset-btn" onClick={onReset}>
        다시 탐험하기
      </button>
    </div>
  );
}

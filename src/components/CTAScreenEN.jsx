export default function CTAScreenEN({ userName, soulSummary, onReset }) {
  return (
    <div className="cta-screen">
      <div className="cta-header">
        <span className="cta-star">✦</span>
        <h2 className="cta-title">Your Journey Has Ended</h2>
        <p className="cta-subtitle">
          <span className="name-highlight">{userName}</span>'s past-life exploration is complete
        </p>
      </div>

      {soulSummary && (
        <div className="soul-summary-card">
          <div className="soul-summary-header">
            <span className="soul-summary-icon">🔮</span>
            <h3 className="soul-summary-title">Your Soul's Reading</h3>
          </div>
          <p className="soul-summary-text">{soulSummary}</p>
        </div>
      )}

      <div className="creator-intro">
        <h3 className="creator-intro-title">Hi, I'm imyeppi — the person behind this Past Life Explorer.</h3>
        <p className="creator-intro-text">
          I'm a one-person team — I do the planning, the building, and the marketing, all by myself.
        </p>
        <p className="creator-intro-text">
          This app is built on traditions passed down in Korea for centuries — <em>Saju</em> (사주, the study of destiny),
          the Five Elements (오행), <em>Sinsal</em> (신살, fate-shaping stars like Dohwasal and Yeokmasal),
          and <em>Manseryeok</em> (만세력), the traditional calendar system used to calculate it all.
        </p>
        <p className="creator-intro-text">
          The characters in your past lives are fictional, but the era they lived in reflects real Korean history.
          And the figure who shares your energy shown alongside them is a real person who actually existed in Korean history.
        </p>
        <p className="creator-intro-text">
          I hope it was a mysterious and meaningful journey.
        </p>
      </div>

      <div className="feedback-section">
        <p className="feedback-text">
          Got feedback, or an idea for what I should build next? Send it to{' '}
          <a className="feedback-email" href="mailto:sgsk1206@gmail.com">sgsk1206@gmail.com</a>
          {' '}— if your idea gets picked, I'll invite you to be part of making it happen.
        </p>
      </div>

      <a className="support-btn" href="https://ko-fi.com/imyeppi" target="_blank" rel="noopener noreferrer">
        ☕ Support Me
      </a>

      <div className="solemate-section">
        <div className="solemate-card">
          <span className="solemate-icon">🔐</span>
          <h3 className="solemate-title">Solemate — Your Secret Space</h3>
          <p className="solemate-desc">
            A private encrypted diary where only you hold the key. Share selectively. Keep your secrets safe.
          </p>
          <a
            className="solemate-btn"
            href="https://diary.imyeppi.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Try Open Beta →
          </a>
        </div>
        <a
          className="solemate-more-link"
          href="https://imyeppi.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          More from imyeppi →
        </a>
      </div>

      <button className="reset-btn" onClick={onReset}>
        Start Over
      </button>
    </div>
  );
}

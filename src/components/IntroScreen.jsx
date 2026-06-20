export default function IntroScreen({ onStart }) {
  return (
    <div className="intro-screen">
      <div className="intro-header">
        <span className="intro-star">✦</span>
        <h2 className="intro-title">What is this?</h2>
      </div>

      <div className="intro-body">
        <p className="intro-lead">This is not a random AI character generator.</p>

        <p className="intro-text">
          For centuries, Koreans have used <em>Saju</em> (사주, Four Pillars of Destiny) — a
          traditional system that reads a person's birth year, month, day, and hour to understand
          their fate, personality, and life path.
        </p>

        <p className="intro-text">
          It's built on <em>Myeongri-hak</em> (명리학), the study of destiny, combined with the
          Five Elements (오행) — wood, fire, earth, metal, and water — believed to shape a
          person's energy from birth.
        </p>

        <p className="intro-text">
          This app takes your birth information, runs it through this centuries-old framework, and
          reimagines who you might have been in a past life — based on real Korean fortune-telling
          tradition, not random generation.
        </p>
      </div>

      <button className="intro-btn" onClick={onStart}>
        Try it now →
      </button>
    </div>
  );
}

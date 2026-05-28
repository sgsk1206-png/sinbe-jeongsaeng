import { useEffect, useRef } from 'react';

export default function StarBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // ── 배경별 270개 ──
    const COUNT = 270;
    const stars = Array.from({ length: COUNT }, () => {
      const isMoving     = Math.random() < 0.3;
      const twinklePeriod = 2 + Math.random() * 4;
      const movePeriodX  = 4 + Math.random() * 6;
      const movePeriodY  = 4 + Math.random() * 6;
      return {
        x: Math.random(),
        y: Math.random(),
        baseR: 0.5 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
        twinkleSpeed: (Math.PI * 2) / twinklePeriod,
        isMoving,
        moveAmpX:   isMoving ? 5 + Math.random() * 10 : 0,
        moveAmpY:   isMoving ? 5 + Math.random() * 10 : 0,
        moveSpeedX: isMoving ? (Math.PI * 2) / movePeriodX : 0,
        moveSpeedY: isMoving ? (Math.PI * 2) / movePeriodY : 0,
        movePhaseX: Math.random() * Math.PI * 2,
        movePhaseY: Math.random() * Math.PI * 2,
      };
    });

    // ── 별똥별 ──
    const shootingStars = [];
    // 첫 등장: 3~8초 뒤
    let nextShootTime = Date.now() + (3 + Math.random() * 5) * 1000;

    function spawnShootingStar(w, h) {
      const count = Math.random() < 0.3 ? 2 : 1; // 30% 확률로 2개 동시

      for (let i = 0; i < count; i++) {
        // 70% 좌상→우하(45°), 30% 우상→좌하(135°)
        const goRight  = Math.random() < 0.7;
        const baseAngle = goRight ? Math.PI / 4 : (Math.PI * 3) / 4;
        const angle    = baseAngle + (Math.random() - 0.5) * 0.5; // ±~14° 변이

        // 시작 위치: 화면 상단 바깥
        const startX = goRight
          ? Math.random() * w * 0.7             // 좌측 70%에서 시작
          : w * 0.3 + Math.random() * w * 0.7;  // 우측 70%에서 시작
        const startY = -10 - Math.random() * 60; // 화면 위 10~70px 바깥

        shootingStars.push({
          x: startX,
          y: startY,
          angle,
          speed:     700 + Math.random() * 500,  // 700~1200 px/s
          length:    100 + Math.random() * 100,  // 100~200px 꼬리
          spawnTime: Date.now(),
          duration:  0.7 + Math.random() * 0.5,  // 0.7~1.2s
        });
      }
    }

    let animId;
    const draw = () => {
      const w   = canvas.width;
      const h   = canvas.height;
      const now = Date.now();
      const t   = now / 1000;

      ctx.fillStyle = '#080512';
      ctx.fillRect(0, 0, w, h);

      // ── 배경별 ──
      for (const s of stars) {
        const sin   = 0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.phase);
        const alpha = 0.2 + 0.8 * sin;
        const scale = 0.8 + 0.5 * sin;
        const r     = s.baseR * scale;

        const px = s.isMoving
          ? s.x * w + Math.sin(t * s.moveSpeedX + s.movePhaseX) * s.moveAmpX
          : s.x * w;
        const py = s.isMoving
          ? s.y * h + Math.cos(t * s.moveSpeedY + s.movePhaseY) * s.moveAmpY
          : s.y * h;

        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220, 200, 255, ${alpha.toFixed(3)})`;
        ctx.fill();
      }

      // ── 별똥별 생성 체크 ──
      if (now >= nextShootTime) {
        spawnShootingStar(w, h);
        nextShootTime = now + (3 + Math.random() * 5) * 1000; // 3~8초 후 다음 등장
      }

      // ── 별똥별 그리기 ──
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const ss      = shootingStars[i];
        const elapsed = (now - ss.spawnTime) / 1000;

        if (elapsed >= ss.duration) {
          shootingStars.splice(i, 1);
          continue;
        }

        const progress = elapsed / ss.duration;
        // sin 곡선으로 자연스럽게 등장→최대→소멸
        const alpha = Math.sin(progress * Math.PI) * 0.85;

        const headX = ss.x + Math.cos(ss.angle) * ss.speed * elapsed;
        const headY = ss.y + Math.sin(ss.angle) * ss.speed * elapsed;
        const tailX = headX - Math.cos(ss.angle) * ss.length;
        const tailY = headY - Math.sin(ss.angle) * ss.length;

        // 꼬리(투명) → 머리(흰색) 그라디언트
        const grad = ctx.createLinearGradient(tailX, tailY, headX, headY);
        grad.addColorStop(0,   'rgba(255, 255, 255, 0)');
        grad.addColorStop(0.6, `rgba(240, 230, 255, ${(alpha * 0.4).toFixed(3)})`);
        grad.addColorStop(1,   `rgba(255, 255, 255, ${alpha.toFixed(3)})`);

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(headX, headY);
        ctx.strokeStyle = grad;
        ctx.lineWidth   = 1.5;
        ctx.lineCap     = 'round';
        ctx.stroke();
      }

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}

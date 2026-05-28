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

    // 기존 180개의 1.5배 = 270개
    const COUNT = 270;
    const stars = Array.from({ length: COUNT }, () => {
      const isMoving = Math.random() < 0.3;        // 30% 별은 움직임
      const twinklePeriod = 2 + Math.random() * 4; // 반짝임 주기 2~6초
      const movePeriodX   = 4 + Math.random() * 6; // 이동 주기 4~10초
      const movePeriodY   = 4 + Math.random() * 6;
      return {
        x: Math.random(),
        y: Math.random(),
        baseR: 0.5 + Math.random() * 1.5,           // 반지름 0.5~2px (직경 1~4px)
        phase: Math.random() * Math.PI * 2,
        twinkleSpeed: (Math.PI * 2) / twinklePeriod, // 반짝임 각속도
        isMoving,
        moveAmpX:  isMoving ? 5 + Math.random() * 10 : 0, // 이동 폭 5~15px
        moveAmpY:  isMoving ? 5 + Math.random() * 10 : 0,
        moveSpeedX: isMoving ? (Math.PI * 2) / movePeriodX : 0,
        moveSpeedY: isMoving ? (Math.PI * 2) / movePeriodY : 0,
        movePhaseX: Math.random() * Math.PI * 2,
        movePhaseY: Math.random() * Math.PI * 2,
      };
    });

    let animId;
    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#080512';
      ctx.fillRect(0, 0, w, h);

      const t = Date.now() / 1000;
      for (const s of stars) {
        const sin   = 0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.phase);
        const alpha = 0.2 + 0.8 * sin;  // 0.2 ~ 1.0
        const scale = 0.8 + 0.5 * sin;  // 0.8 ~ 1.3
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

export function mountHeroField(canvas) {
  const hero = canvas.closest(".dc-hero");
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};

  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let width = 0;
  let height = 0;
  let frame = 0;
  let visible = true;
  let lastPaint = -Infinity;
  let pointer = 0;
  let drift = 0;

  function draw(time) {
    ctx.clearRect(0, 0, width, height);
    const phase = motion.matches ? 0 : time / 2600;
    drift += (pointer - drift) * 0.045;
    const columns = width < 680 ? 75 : 146;
    const rows = 38;

    for (let row = 0; row < rows; row++) {
      const z = row / (rows - 1);
      const depth = z * z;
      for (let col = 0; col < columns; col++) {
        const u = col / (columns - 1);
        const spread = 1.12 + depth * 0.6;
        const x = width * (0.5 + (u - 0.5) * spread) + drift * 30 * (1 - z);
        const ridge = Math.sin(u * 11 - z * 5 + phase) * 0.52 +
          Math.sin(u * 20 + z * 2 - phase * 0.7) * 0.17;
        const y = height * (0.72 + depth * 0.39 - u * u * 0.27 + ridge * (0.12 + depth * 0.07));
        const red = Math.exp(-Math.pow((z - 0.42 - Math.sin(u * 7 + phase * 0.45) * 0.15) / 0.082, 2));
        const light = Math.max(0, Math.min(1, (0.3 + ridge * 0.45 + red * 0.55) * (1 - depth * 0.61)));
        ctx.fillStyle = red > 0.27 ? `rgba(255, 23, 69, ${light})` : `rgba(224, 229, 240, ${light})`;
        const size = 0.65 + depth * 1.15 + red * 0.4;
        ctx.fillRect(x, y, size, size);
      }
    }
  }

  function tick(time) {
    if (time - lastPaint >= 32) {
      draw(time);
      lastPaint = time;
    }
    frame = requestAnimationFrame(tick);
  }

  function sync() {
    cancelAnimationFrame(frame);
    if (visible && !document.hidden && !motion.matches) {
      frame = requestAnimationFrame(tick);
    } else {
      draw(0);
    }
  }

  const resize = new ResizeObserver(() => {
    const bounds = canvas.getBoundingClientRect();
    const scale = Math.min(devicePixelRatio || 1, 2);
    width = bounds.width;
    height = bounds.height;
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    draw(0);
  });
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  });

  function move(event) {
    if (event.pointerType !== "mouse" || motion.matches) return;
    const { left, width: heroWidth } = hero.getBoundingClientRect();
    pointer = (event.clientX - left) / heroWidth - 0.5;
  }

  function reset() {
    pointer = 0;
  }

  resize.observe(canvas);
  intersection.observe(hero);
  hero.addEventListener("pointermove", move);
  hero.addEventListener("pointerleave", reset);
  document.addEventListener("visibilitychange", sync);
  motion.addEventListener("change", sync);

  return () => {
    cancelAnimationFrame(frame);
    resize.disconnect();
    intersection.disconnect();
    hero.removeEventListener("pointermove", move);
    hero.removeEventListener("pointerleave", reset);
    document.removeEventListener("visibilitychange", sync);
    motion.removeEventListener("change", sync);
  };
}

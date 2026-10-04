/* © 2026 Augusto Rodrigo Alterats. Uso educativo con cita de autoría. */
const particulasCanvas = document.querySelector('#particulas');
if (particulasCanvas) {
  const particulasCtx = particulasCanvas.getContext('2d');
  const movimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)');
  let particulas = [];
  let anchoFondo = 0;
  let altoFondo = 0;
  let ultimoFotograma = 0;
  let fotogramaParticulas = 0;

  function dibujarParticulas(delta = 0) {
    particulasCtx.clearRect(0, 0, anchoFondo, altoFondo);
    particulas.forEach(particula => {
      if (!movimientoReducido.matches) {
        particula.x += particula.vx * delta;
        particula.y += particula.vy * delta;
        if (particula.x < -5) particula.x = anchoFondo + 5;
        if (particula.x > anchoFondo + 5) particula.x = -5;
        if (particula.y < -5) particula.y = altoFondo + 5;
        if (particula.y > altoFondo + 5) particula.y = -5;
      }
    });
    for (let i = 0; i < particulas.length; i++) {
      const a = particulas[i];
      for (let j = i + 1; j < particulas.length; j++) {
        const b = particulas[j];
        const distancia = Math.hypot(a.x - b.x, a.y - b.y);
        if (distancia < 115) {
          particulasCtx.strokeStyle = `rgba(35, 105, 67, ${0.2 * (1 - distancia / 115)})`;
          particulasCtx.lineWidth = 1;
          particulasCtx.beginPath();
          particulasCtx.moveTo(a.x, a.y);
          particulasCtx.lineTo(b.x, b.y);
          particulasCtx.stroke();
        }
      }
      particulasCtx.beginPath();
      particulasCtx.arc(a.x, a.y, a.radio, 0, Math.PI * 2);
      particulasCtx.fillStyle = 'rgba(35, 105, 67, 0.62)';
      particulasCtx.fill();
    }
  }

  function animarParticulas(tiempo) {
    fotogramaParticulas = 0;
    const delta = ultimoFotograma ? Math.min((tiempo - ultimoFotograma) / 16.67, 2) : 1;
    ultimoFotograma = tiempo;
    dibujarParticulas(delta);
    if (!movimientoReducido.matches && !document.hidden) {
      fotogramaParticulas = requestAnimationFrame(animarParticulas);
    }
  }

  function iniciarParticulas() {
    if (fotogramaParticulas) cancelAnimationFrame(fotogramaParticulas);
    const escala = Math.min(window.devicePixelRatio || 1, 2);
    anchoFondo = window.innerWidth;
    altoFondo = window.innerHeight;
    particulasCanvas.width = Math.round(anchoFondo * escala);
    particulasCanvas.height = Math.round(altoFondo * escala);
    particulasCtx.setTransform(escala, 0, 0, escala, 0, 0);
    const cantidad = Math.min(60, Math.max(22, Math.round(anchoFondo * altoFondo / 22000)));
    particulas = Array.from({ length: cantidad }, () => ({
      x: Math.random() * anchoFondo,
      y: Math.random() * altoFondo,
      vx: (Math.random() - 0.5) * 0.9,
      vy: (Math.random() - 0.5) * 0.9,
      radio: 1 + Math.random() * 1.2
    }));
    ultimoFotograma = 0;
    dibujarParticulas();
    if (!movimientoReducido.matches && !document.hidden) {
      fotogramaParticulas = requestAnimationFrame(animarParticulas);
    }
  }

  window.addEventListener('resize', iniciarParticulas);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !movimientoReducido.matches) iniciarParticulas();
  });
  movimientoReducido.addEventListener('change', iniciarParticulas);
  iniciarParticulas();
}

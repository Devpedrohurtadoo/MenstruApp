/**
 * @fileoverview Sistema de partículas flotantes para Menstruapp
 */
(function () {
  'use strict';

  const PARTICLE_COUNT = 42;
  const REPULSION_RADIUS = 80;
  const REPULSION_STRENGTH = 2.5;

  let canvas = null;
  let ctx = null;
  let particles = [];
  let animationId = null;
  let mouseX = -1000;
  let mouseY = -1000;
  let targetAccent = { r: 244, g: 167, b: 185 };
  let currentAccent = { r: 244, g: 167, b: 185 };
  let intensity = 1;
  let reducedMotion = false;

  /**
   * @description Parsea un color hex a RGB
   * @param {string} hex - Color en formato #RRGGBB
   * @returns {{ r: number, g: number, b: number }}
   */
  const hexToRgb = (hex) => {
    const h = (hex || '#F4A7B9').replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16) || 244,
      g: parseInt(h.substring(2, 4), 16) || 167,
      b: parseInt(h.substring(4, 6), 16) || 185
    };
  };

  /**
   * @description Crea una partícula con propiedades aleatorias
   * @param {number} width - Ancho del canvas
   * @param {number} height - Alto del canvas
   * @returns {Object} Partícula
   */
  const createParticle = (width, height) => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: 2 + Math.random() * 5,
    speedY: 0.3 + Math.random() * 0.5,
    speedX: (Math.random() - 0.5) * 0.3,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.02,
    opacity: 0.05 + Math.random() * 0.15,
    isPetal: Math.random() > 0.5
  });

  /**
   * @description Inicializa el sistema de partículas
   * @param {string} [accentColor='#F4A7B9'] - Color de acento
   * @param {number} [level=1] - Intensidad 0-3
   * @returns {void}
   */
  const initParticles = (accentColor = '#F4A7B9', level = 1) => {
    canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    targetAccent = hexToRgb(accentColor);
    currentAccent = { ...targetAccent };
    intensity = level;
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (particles.length === 0) {
        particles = Array.from({ length: PARTICLE_COUNT }, () =>
          createParticle(canvas.width, canvas.height)
        );
      }
    };

    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });
    document.addEventListener('touchmove', (e) => {
      if (e.touches[0]) {
        mouseX = e.touches[0].clientX;
        mouseY = e.touches[0].clientY;
      }
    }, { passive: true });

    if (animationId) cancelAnimationFrame(animationId);
    animate();
  };

  /**
   * @description Dibuja una partícula en el canvas
   * @param {Object} p - Partícula
   * @returns {void}
   */
  const drawParticle = (p) => {
    if (!ctx) return;
    const { r, g, b } = currentAccent;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.opacity * intensity;
    ctx.fillStyle = `rgb(${r},${g},${b})`;

    if (p.isPetal) {
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  /**
   * @description Actualiza posición de partículas
   * @returns {void}
   */
  const updateParticles = () => {
    const w = canvas.width;
    const h = canvas.height;

    currentAccent.r += (targetAccent.r - currentAccent.r) * 0.02;
    currentAccent.g += (targetAccent.g - currentAccent.g) * 0.02;
    currentAccent.b += (targetAccent.b - currentAccent.b) * 0.02;

    particles.forEach((p) => {
      if (!reducedMotion && intensity > 0) {
        p.y += p.speedY * intensity;
        p.x += p.speedX;
        p.rotation += p.rotSpeed;

        const dx = p.x - mouseX;
        const dy = p.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < REPULSION_RADIUS && dist > 0) {
          const force = (REPULSION_RADIUS - dist) / REPULSION_RADIUS * REPULSION_STRENGTH;
          p.x += (dx / dist) * force;
          p.y += (dy / dist) * force;
        }
      }

      if (p.y > h + 10) {
        p.y = -10;
        p.x = Math.random() * w;
      }
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
    });
  };

  /**
   * @description Loop de animación principal
   * @returns {void}
   */
  const animate = () => {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (intensity > 0) {
      updateParticles();
      particles.forEach(drawParticle);
    }
    animationId = requestAnimationFrame(animate);
  };

  /**
   * @description Actualiza color e intensidad de partículas
   * @param {string} accent - Color hex
   * @param {number} level - 0 ninguna, 1 suave, 2 media, 3 intensa
   * @returns {void}
   */
  const setParticleTheme = (accent, level = 1) => {
    targetAccent = hexToRgb(accent);
    intensity = level;
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };

  window.ParticlesModule = {
    initParticles,
    setParticleTheme,
    hexToRgb
  };

  document.addEventListener('DOMContentLoaded', () => {
    initParticles('#F4A7B9', 1);
  });

  // === TESTS ===
  window.runTests_particles = () => {
    console.group('🧪 Tests Particles Module');
    const rgb = hexToRgb('#C084FC');
    console.assert(rgb.r === 192, '❌ hexToRgb r');
    console.assert(rgb.g === 132, '❌ hexToRgb g');
    console.log('✅ Test 1 passed: hexToRgb');
    console.assert(typeof initParticles === 'function', '❌ initParticles');
    console.log('✅ Test 2 passed: initParticles exists');
    console.groupEnd();
  };
})();

(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  $('#year').textContent = new Date().getFullYear();

  const themeButton = $('.theme-button');

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    themeButton.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
    $('meta[name="theme-color"]').content = theme === 'dark' ? '#121513' : '#f3f3eb';
  }

  try {
    const saved = localStorage.getItem('fk-theme');
    if (saved === 'dark' || saved === 'light') {
      setTheme(saved);
    }
  } catch (_) {}

  themeButton.addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    setTheme(theme);

    try {
      localStorage.setItem('fk-theme', theme);
    } catch (_) {}
  });

  const menuButton = $('.menu-button');

  function closeMenu() {
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open menu');
    $('.navigation').classList.remove('open');
  }

  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    $('.navigation').classList.toggle('open', open);
  });

  $$('.navigation a').forEach((link) => link.addEventListener('click', closeMenu));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenu();
    }
  });

  document.addEventListener('click', (event) => {
    if (!$('.header').contains(event.target)) {
      closeMenu();
    }
  });

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const surfaces = $$('[data-motion-surface]');
  const motionButton = $('.motion-toggle');
  let userPaused = false;

  function updateMotion() {
    const paused = userPaused || reducedMotion.matches || document.hidden;

    document.documentElement.dataset.motionPaused = String(paused);
    motionButton.setAttribute('aria-pressed', String(userPaused || reducedMotion.matches));
    motionButton.setAttribute(
      'aria-label',
      reducedMotion.matches
        ? 'Animation disabled by reduced motion preference'
        : userPaused
          ? 'Play all decorative animation'
          : 'Pause all decorative animation'
    );

    motionButton.disabled = reducedMotion.matches;

    const labelText = reducedMotion.matches ? 'Motion reduced ' : userPaused ? 'Play motion ' : 'Pause motion ';
    motionButton.replaceChildren(document.createTextNode(labelText));

    const icon = document.createElement('span');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = userPaused ? '▷' : 'Ⅱ';
    motionButton.append(icon);
  }

  motionButton.addEventListener('click', () => {
    userPaused = !userPaused;
    updateMotion();
  });

  reducedMotion.addEventListener('change', () => {
    updateMotion();
    if (reducedMotion.matches) {
      $$('.motion-reveal').forEach((el) => el.classList.add('visible'));
    }
  });

  document.addEventListener('visibilitychange', updateMotion);
  updateMotion();

  if ('IntersectionObserver' in window) {
    surfaces.forEach((el) => {
      el.dataset.inView = 'false';
    });

    const motionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.dataset.inView = String(entry.isIntersecting && entry.intersectionRatio >= 0.08);
        });
      },
      { threshold: [0, 0.08, 0.25] }
    );

    surfaces.forEach((el) => motionObserver.observe(el));
  }

  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.06 }
    );

    $$('.reveal').forEach((el) => {
      el.classList.add('motion-reveal');
      observer.observe(el);
    });
  }

  $('.copy-email').addEventListener('click', async () => {
    const email = 'farhadk8552@gmail.com';

    try {
      await navigator.clipboard.writeText(email);
      $('.copy-status').textContent = 'Email copied';
    } catch (_) {
      $('.copy-status').textContent = 'Copy manually: ' + email;
    }

    setTimeout(() => {
      $('.copy-status').textContent = '';
    }, 5000);
  });
})();

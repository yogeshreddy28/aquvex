/* AQUVEX homepage interactions */
(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = document.querySelector('#site-header');
  const menuButton = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#primary-nav');

  // Sticky header and mobile navigation
  const updateHeader = () => header.classList.toggle('scrolled', window.scrollY > 24);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!open));
    menuButton.querySelector('.sr-only').textContent = open ? 'Open navigation' : 'Close navigation';
    navigation.classList.toggle('is-open', !open);
    document.body.classList.toggle('menu-open', !open);
  });

  navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    menuButton.setAttribute('aria-expanded', 'false');
    navigation.classList.remove('is-open');
    document.body.classList.remove('menu-open');
  }));

  // Scroll reveal
  const revealItems = document.querySelectorAll('.reveal');
  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach(item => item.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealItems.forEach(item => revealObserver.observe(item));
  }

  // Subtle hero parallax
  const heroMedia = document.querySelector('.hero-media');
  if (!reducedMotion && heroMedia) {
    window.addEventListener('scroll', () => {
      if (window.scrollY < window.innerHeight) heroMedia.style.transform = `translateY(${window.scrollY * 0.14}px) scale(1.02)`;
    }, { passive: true });
  }

  // Before and after comparison
  const comparison = document.querySelector('[data-comparison]');
  if (comparison) {
    const range = comparison.querySelector('input');
    const before = comparison.querySelector('.comparison-before');
    const handle = comparison.querySelector('.compare-handle');
    const updateComparison = () => {
      const value = `${range.value}%`;
      before.style.width = value;
      handle.style.left = value;
      range.setAttribute('aria-valuetext', `${range.value} percent before image visible`);
    };
    range.addEventListener('input', updateComparison);
    updateComparison();
  }

  // Testimonial slider
  const slides = [...document.querySelectorAll('.testimonial')];
  const dotsContainer = document.querySelector('.slider-dots');
  let activeSlide = 0;
  let sliderTimer;

  const showSlide = index => {
    activeSlide = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.classList.toggle('is-active', i === activeSlide));
    dotsContainer.querySelectorAll('button').forEach((dot, i) => {
      dot.classList.toggle('is-active', i === activeSlide);
      dot.setAttribute('aria-selected', String(i === activeSlide));
    });
  };

  const resetSlider = () => {
    window.clearInterval(sliderTimer);
    if (!reducedMotion) sliderTimer = window.setInterval(() => showSlide(activeSlide + 1), 7000);
  };

  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Show customer story ${i + 1}`);
    dot.addEventListener('click', () => { showSlide(i); resetSlider(); });
    dotsContainer.appendChild(dot);
  });
  document.querySelector('[data-prev]').addEventListener('click', () => { showSlide(activeSlide - 1); resetSlider(); });
  document.querySelector('[data-next]').addEventListener('click', () => { showSlide(activeSlide + 1); resetSlider(); });
  showSlide(0);
  resetSlider();

  // Accessible FAQ accordion
  document.querySelectorAll('.faq-item button').forEach(button => {
    button.addEventListener('click', () => {
      const answer = document.querySelector(`#${button.getAttribute('aria-controls')}`);
      const expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!expanded));
      button.querySelector('span').textContent = expanded ? '+' : '−';
      answer.hidden = expanded;
    });
  });

  // Free inspection form and WhatsApp handoff
  const inspectionDialog = document.querySelector('#inspection-dialog');
  const inspectionForm = document.querySelector('#inspection-form');
  const inspectionOpeners = document.querySelectorAll('[data-inspection-open]');
  const inspectionClose = document.querySelector('[data-inspection-close]');

  const openInspection = event => {
    event.preventDefault();
    inspectionDialog.showModal();
    document.body.classList.add('dialog-open');
  };

  const closeInspection = () => {
    inspectionDialog.close();
    document.body.classList.remove('dialog-open');
  };

  inspectionOpeners.forEach(opener => opener.addEventListener('click', openInspection));
  inspectionClose.addEventListener('click', closeInspection);
  inspectionDialog.addEventListener('click', event => {
    if (event.target === inspectionDialog) closeInspection();
  });
  inspectionDialog.addEventListener('cancel', () => document.body.classList.remove('dialog-open'));

  inspectionForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!inspectionForm.reportValidity()) return;

    const data = new FormData(inspectionForm);
    const message = [
      'Hello AQUVEX, I would like to book a free waterproofing inspection.',
      '',
      `Name: ${data.get('name')}`,
      `Phone: ${data.get('phone')}`,
      `Location: ${data.get('location')}`,
      `Service: ${data.get('service')}`,
      `Problem: ${data.get('issue')}`
    ].join('\n');

    window.location.href = `https://wa.me/916362298379?text=${encodeURIComponent(message)}`;
  });

  // Current copyright year
  document.querySelector('#year').textContent = new Date().getFullYear();
})();

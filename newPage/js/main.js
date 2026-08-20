document.addEventListener('DOMContentLoaded', () => {
  setFooterYear();
  initNavbarScroll();
  initSmoothScrollLinks();
  initHeroSlider();
  initScrollReveal();
  initCounters();
  initContactForm();
  initParticles();
  initBackToTop();
});

/* Footer year */
function setFooterYear() {
  const el = document.getElementById('currentYear');
  if (el) el.textContent = new Date().getFullYear();
}

/* Navbar shadow on scroll */
function initNavbarScroll() {
  const nav = document.getElementById('mainNav');
  if (!nav) return;
  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 10);
  };
  window.addEventListener('scroll', onScroll);
  onScroll();
}

/* Smooth scroll for in-page nav links + collapse mobile menu after click */
function initSmoothScrollLinks() {
  const navCollapse = document.getElementById('navbarContent');
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href').slice(1);
      const target = targetId ? document.getElementById(targetId) : null;

      if (targetId === '' || targetId === 'top') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }

      if (navCollapse && navCollapse.classList.contains('show')) {
        const bsCollapse = bootstrap.Collapse.getOrCreateInstance(navCollapse);
        bsCollapse.hide();
      }
    });
  });
}

/* Hero dashboard slider */
function initHeroSlider() {
  const slides = document.querySelectorAll('.dashboard-slide');
  const dots = document.querySelectorAll('.slide-dot');
  if (!slides.length) return;

  let current = 0;

  function goToSlide(index) {
    slides[current].classList.remove('active');
    dots[current]?.classList.remove('active');
    current = index;
    slides[current].classList.add('active');
    dots[current]?.classList.add('active');
  }

  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => goToSlide(index));
  });

  setInterval(() => {
    goToSlide((current + 1) % slides.length);
  }, 3000);
}

/* Fade/slide-in on scroll using IntersectionObserver */
function initScrollReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
        }
      });
    },
    { threshold: 0.2 }
  );

  items.forEach((item) => observer.observe(item));
}

/* Animated counters in "Problema" section */
function initCounters() {
  const section = document.querySelector('.problema-section');
  if (!section) return;

  let animated = false;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !animated) {
          animated = true;
          animateCounters();
        }
      });
    },
    { threshold: 0.3 }
  );
  observer.observe(section);

  function animateCounters() {
    const counters = document.querySelectorAll('.counter-number');
    counters.forEach((counter) => {
      const target = parseInt(counter.getAttribute('data-target'), 10);
      const duration = 2000;
      const increment = target / (duration / 16);
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        counter.textContent = Math.floor(current).toLocaleString('es-MX');
      }, 16);
    });
  }
}

/* Contact form: real submit to Formspree via fetch (AJAX) */
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const submitBtn = document.getElementById('contactSubmitBtn');
  const btnDefaultLabel = submitBtn ? submitBtn.innerHTML : '';
  const successPanel = document.getElementById('contactSuccess');
  const errorPanel = document.getElementById('contactError');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    errorPanel?.classList.add('d-none');

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML =
        '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Enviando...';
    }

    fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' },
    })
      .then((response) => {
        if (response.ok) {
          form.classList.add('d-none');
          successPanel?.classList.remove('d-none');
        } else {
          throw new Error('Formspree submission failed');
        }
      })
      .catch(() => {
        errorPanel?.classList.remove('d-none');
      })
      .finally(() => {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = btnDefaultLabel;
        }
      });
  });

  const sendAnotherBtn = document.getElementById('contactSendAnother');
  sendAnotherBtn?.addEventListener('click', () => {
    form.reset();
    successPanel?.classList.add('d-none');
    form.classList.remove('d-none');
  });
}

/* Floating particles background on contact section */
function initParticles() {
  const container = document.getElementById('contactoParticles');
  if (!container) return;

  const count = 10;
  for (let i = 0; i < count; i++) {
    const dot = document.createElement('div');
    dot.className = 'particle';
    dot.style.top = `${Math.random() * 100}%`;
    dot.style.left = `${Math.random() * 100}%`;
    dot.style.animationDelay = `${Math.random() * 3}s`;
    dot.style.animationDuration = `${3 + Math.random() * 2}s`;
    container.appendChild(dot);
  }
}

/* Back-to-top floating button */
function initBackToTop() {
  const btn = document.getElementById('backToTop');
  if (!btn) return;

  const toggleVisibility = () => {
    btn.classList.toggle('is-visible', window.scrollY > 400);
  };

  window.addEventListener('scroll', toggleVisibility, { passive: true });
  toggleVisibility();

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

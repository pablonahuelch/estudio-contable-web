// ===== Year =====
document.getElementById('year').textContent = new Date().getFullYear();

// ===== Header on scroll + progress bar =====
const header = document.getElementById('header');
const progressBar = document.getElementById('progressBar');

function headerScroll(){
  const y = window.scrollY;
  header.classList.toggle('scrolled', y > 40);
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const pct = docHeight > 0 ? (y / docHeight) * 100 : 0;
  progressBar.style.width = pct + '%';
}

// ===== Mobile menu =====
const menuToggle = document.getElementById('menuToggle');
menuToggle.addEventListener('click', () => header.classList.toggle('nav-open'));
document.querySelectorAll('.nav__link').forEach(link => {
  link.addEventListener('click', () => header.classList.remove('nav-open'));
});

// ===== Scroll reveal (simple sections) =====
const revealEls = document.querySelectorAll('[data-reveal]');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting){
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold:0.15, rootMargin:'0px 0px -60px 0px' });
revealEls.forEach(el => revealObserver.observe(el));

// ===== Count up stats =====
const counters = document.querySelectorAll('[data-count]');
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const target = parseInt(el.getAttribute('data-count'), 10);
    const suffix = el.getAttribute('data-suffix') || '';
    const duration = 1400;
    const start = performance.now();
    function tick(now){
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    counterObserver.unobserve(el);
  });
}, { threshold:0.6 });
counters.forEach(el => counterObserver.observe(el));

// ===== Magnetic buttons =====
const isTouch = matchMedia('(hover: none), (pointer: coarse)').matches;
const magnets = document.querySelectorAll('.magnetic');
if (!isTouch){
  magnets.forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const relX = e.clientX - rect.left - rect.width / 2;
      const relY = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${relX * 0.25}px, ${relY * 0.35}px)`;
    });
    btn.addEventListener('mouseleave', () => { btn.style.transform = 'translate(0,0)'; });
  });
}

// ===== Team card tilt =====
const tiltCards = document.querySelectorAll('.team-card');
if (!isTouch){
  tiltCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${-py * 5}deg) rotateY(${px * 6}deg) translateY(-8px)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
}

// ===== Smooth anchor scroll offset for fixed header =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e){
    const id = this.getAttribute('href');
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    const offset = 84;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior:'smooth' });
  });
});

/* =========================================================
   APPLE-STYLE SCROLL ENGINE
   Drives 3D transforms from scroll progress via rAF.
   Skips heavy 3D work on touch/small screens (perf + no hover).
========================================================= */
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const enablePinFX = !isTouch && !reduceMotion && window.innerWidth > 980;

function clamp01(v){ return Math.max(0, Math.min(1, v)); }
function lerp(a, b, t){ return a + (b - a) * t; }

// ---- Hero pin zoom ----
const heroPin = document.querySelector('.hero-pin');
const heroStage = document.getElementById('heroStage');
const heroStats = document.getElementById('heroStats');
const heroCue = document.querySelector('.hero-pin__cue');
const heroParts = heroStage ? heroStage.querySelectorAll('[data-hero]') : [];

function updateHero(){
  if (!heroPin || !enablePinFX) return;
  const rect = heroPin.getBoundingClientRect();
  const total = rect.height - window.innerHeight;
  const p = clamp01(-rect.top / Math.max(total, 1));

  // Fully visible from the very start — only a subtle zoom/drift while scrolling,
  // fading out late (p > .8) as the next section approaches.
  const scale = lerp(1, 1.08, clamp01(p / 0.8));
  const drift = lerp(0, -70, clamp01(p / 0.8));
  const opacity = 1 - clamp01((p - 0.8) / 0.2);

  heroStage.style.transform = `translateZ(0) scale(${scale}) translateY(${drift}px)`;
  heroStage.style.opacity = opacity;

  if (heroStats){
    const statsOp = 1 - clamp01((p - 0.7) / 0.3);
    heroStats.style.opacity = statsOp;
    heroStats.style.transform = 'translateY(0)';
  }
  if (heroCue){ heroCue.style.opacity = 1 - clamp01(p / 0.15); }
}

let ticking = false;
function onScrollRAF(){
  headerScroll();
  updateHero();
  ticking = false;
}
window.addEventListener('scroll', () => {
  if (!ticking){
    requestAnimationFrame(onScrollRAF);
    ticking = true;
  }
}, { passive:true });

window.addEventListener('resize', onScrollRAF);
onScrollRAF();

/* =========================================================
   SECTION NAV — botones/dots para moverse entre secciones
   sin depender de scrollear manualmente por cada escena.
========================================================= */
(function(){
  const waypoints = Array.from(document.querySelectorAll('[data-label]'));
  if (!waypoints.length) return;

  const navEl = document.getElementById('sectionNav');
  const dotsEl = document.getElementById('navDots');
  const prevBtn = document.getElementById('navPrev');
  const nextBtn = document.getElementById('navNext');
  const heroCueBtn = document.getElementById('heroCueBtn');
  const headerOffset = 84;

  waypoints.forEach((el, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'section-nav__dot';
    dot.setAttribute('data-title', el.getAttribute('data-label'));
    dot.setAttribute('aria-label', 'Ir a ' + el.getAttribute('data-label'));
    dot.addEventListener('click', () => goTo(i));
    dotsEl.appendChild(dot);
  });
  const dots = Array.from(dotsEl.children);

  function goTo(index){
    index = Math.max(0, Math.min(waypoints.length - 1, index));
    const el = waypoints[index];
    const absoluteTop = el.getBoundingClientRect().top + window.scrollY;
    let top;
    if (el.classList.contains('hero-pin')){
      top = 0;
    } else {
      const elHeight = el.offsetHeight;
      const available = window.innerHeight - headerOffset;
      if (elHeight <= available){
        // Center the whole element (image + text together) in the visible area,
        // below the fixed header, instead of just aligning its top edge.
        top = absoluteTop - headerOffset - (available - elHeight) / 2;
      } else {
        top = absoluteTop - headerOffset;
      }
    }
    window.scrollTo({ top, behavior:'smooth' });
  }

  function currentIndex(){
    const y = window.scrollY + window.innerHeight * 0.4;
    let idx = 0;
    waypoints.forEach((el, i) => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      if (y >= top) idx = i;
    });
    return idx;
  }

  function refresh(){
    const idx = currentIndex();
    dots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
    prevBtn.disabled = idx === 0;
    nextBtn.disabled = idx === waypoints.length - 1;
    navEl.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.3);
  }

  prevBtn.addEventListener('click', () => goTo(currentIndex() - 1));
  nextBtn.addEventListener('click', () => goTo(currentIndex() + 1));
  if (heroCueBtn) heroCueBtn.addEventListener('click', () => goTo(1));

  window.addEventListener('scroll', refresh, { passive:true });
  window.addEventListener('resize', refresh);
  refresh();
})();

/* =========================================================
   SERVICES — módulos verticales grandes. Cada uno entra con
   la cortina en degradé de marca deslizándose de la imagen y
   el texto apareciendo en cascada, la primera vez que se ve.
========================================================= */
(function(){
  const blocks = document.querySelectorAll('[data-service]');
  if (!blocks.length) return;

  if (reduceMotion){
    blocks.forEach(b => b.classList.add('is-in'));
    return;
  }

  const serviceObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting){
        entry.target.classList.add('is-in');
        serviceObserver.unobserve(entry.target);
      }
    });
  }, { threshold:0.25, rootMargin:'0px 0px -80px 0px' });

  blocks.forEach(b => serviceObserver.observe(b));
})();

/* =========================================================
   CONTACT FORM — envío de mail sin backend propio, vía
   Web3Forms (https://web3forms.com). Requiere reemplazar el
   access_key hidden input en el HTML por el de tu cuenta.
========================================================= */
(function(){
  const form = document.getElementById('contactForm');
  if (!form) return;

  const msgEl = document.getElementById('contactMsg');
  const submitBtn = form.querySelector('button[type="submit"]');
  const submitLabel = submitBtn.querySelector('span');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const accessKey = form.querySelector('[name="access_key"]').value;
    if (!accessKey || accessKey.includes('REEMPLAZAR')){
      msgEl.textContent = 'Falta configurar el Access Key de Web3Forms en el HTML.';
      msgEl.className = 'contact-form__msg is-error';
      return;
    }

    submitBtn.disabled = true;
    const originalLabel = submitLabel.textContent;
    submitLabel.textContent = 'Enviando...';
    msgEl.textContent = '';
    msgEl.className = 'contact-form__msg';

    try{
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(form)
      });
      const result = await res.json();

      if (result.success){
        msgEl.textContent = '¡Gracias! Recibimos tu consulta, te respondemos a la brevedad.';
        msgEl.className = 'contact-form__msg is-ok';
        form.reset();
      } else {
        throw new Error(result.message || 'No se pudo enviar');
      }
    } catch (err){
      msgEl.textContent = 'Hubo un error al enviar. Probá de nuevo o escribinos por WhatsApp.';
      msgEl.className = 'contact-form__msg is-error';
    } finally {
      submitBtn.disabled = false;
      submitLabel.textContent = originalLabel;
    }
  });
})();

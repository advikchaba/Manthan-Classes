const API = '/api';

/* ---------------------------------------------------------
   Theme
   --------------------------------------------------------- */

function initThemeToggle() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;

  const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';
  btn.setAttribute('aria-pressed', String(isDark()));

  btn.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    btn.setAttribute('aria-pressed', String(next === 'dark'));
    try { localStorage.setItem('mc-theme', next); } catch (e) { /* storage blocked */ }
  });
}

/* ---------------------------------------------------------
   Helpers
   --------------------------------------------------------- */

const templates = {
  dashboard: document.getElementById("tpl-dashboard").content,
  courses: document.getElementById("tpl-courses").content,
  classes: document.getElementById("tpl-classes").content,
  material: document.getElementById("tpl-material").content,
  tests: document.getElementById("tpl-tests").content
};

const app = document.getElementById("app");

const chevron = '<svg class="icon chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';

const subjectLabel = (s) => {
  const map = { physics: 'Physics', maths: 'Mathematics', chemistry: 'Chemistry', biology: 'Biology' };
  if (!s) return '';
  return map[String(s).toLowerCase()] || s;
};

const meta = (...parts) => parts.filter(p => p !== null && p !== undefined && p !== '').join(' · ');

const priceLabel = (price) => (price && Number(price) > 0 ? 'Rs. ' + price : 'Free');

function initialsFor(name) {
  const clean = String(name || '').replace(/[^a-zA-Z0-9 ]/g, '').trim();
  if (!clean) return 'MC';
  const words = clean.split(/\s+/);
  const raw = words.length > 1 ? words[0][0] + words[1][0] : clean.slice(0, 2);
  return raw.toUpperCase();
}

function render(templateId) {
  const tpl = templates[templateId];
  if (!tpl) return;
  const clone = tpl.cloneNode(true);
  app.innerHTML = "";
  app.appendChild(clone);
  app.scrollTop = 0;
  if (templateId === "material") { initMaterialFilters(); loadMaterials(); }
  if (templateId === "courses") loadCourses();
  if (templateId === "classes") loadClasses();
  if (templateId === "tests") loadTests();
  if (templateId === "dashboard") loadDashboard();
}

function openMeet(url) {
  window.open(url, "_blank");
}

function openCourse(id) {
  fetch(API + '/courses').then(r => r.json()).then(courses => {
    const c = courses.find(x => x.id == id);
    if (!c) { alert('Course not found'); return; }
    const videos = c.videos || (c.videoFile ? [c.videoFile] : []);
    app.innerHTML = `
<div class="page student-page">
  <header class="page-header">
    <button class="btn-back" onclick="render('courses')">All courses</button>
    <h1>${c.name}</h1>
    <p class="section-desc">${meta(subjectLabel(c.subject), c.classLevel ? 'Class ' + c.classLevel : '', priceLabel(c.price))}</p>
  </header>
  ${c.coverImage ? `<img class="course-cover" src="${encodeURI(c.coverImage)}" alt="${c.name}">` : ''}
  <div class="section-head">
    <h2 class="section-title">Videos</h2>
    <span class="count-chip">${videos.length}</span>
  </div>
  ${videos.length ? videos.map((v, i) => `
  <div class="card video-card">
    <h3 class="card-title">Lecture ${i + 1}</h3>
    <video controls preload="metadata"><source src="${encodeURI(v)}"></video>
    <a href="${encodeURI(v)}" target="_blank" class="btn-outline">Open in new tab</a>
  </div>`).join('') : '<div class="card"><p class="card-sub">No videos uploaded for this course yet.</p></div>'}
  ${c.pdfFile ? `
  <div class="section-head" style="margin-top:24px;">
    <h2 class="section-title">PDF material</h2>
  </div>
  <a href="${encodeURI(c.pdfFile)}" target="_blank" class="btn-outline">Open PDF</a>` : ''}
</div>`;
  });
}

function openTest(title) {
  fetch(API + '/tests').then(r => r.json()).then(tests => {
    const test = tests.find(t => t.name === title);
    if (!test) { alert('Test not found'); return; }
    renderTest(test);
  });
}

function renderTest(test) {
  const questions = test.questions || [];
  const timeLimit = test.timeLimit || 300;
  let timeLeft = timeLimit;
  let timerInterval;

  app.innerHTML = `
<div class="page student-page">
  <header class="page-header">
    <button class="btn-back" onclick="clearInterval(window.__mcTimer); render('tests')">All tests</button>
    <h1>${test.name}</h1>
    <p class="section-desc">Class ${test.classLevel || ''} &bull; ${test.subject || ''} &bull; ${questions.length} questions</p>
    <div id="timer" class="timer">${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}</div>
  </header>
  <form id="quizForm" class="form-card">
    ${questions.map((q, i) => `
    <div class="mcq-row">
      <span class="field-label">Question ${i + 1}</span>
      <p class="card-title" style="font-weight:500;margin:2px 0 4px;">${q.question}</p>
      <div class="options">
        ${q.options.map((opt, j) => `
        <div class="option-item">
          <input type="radio" name="q${i}" value="${j}" id="q${i}_${j}">
          <label for="q${i}_${j}">${opt}</label>
        </div>`).join('')}
      </div>
    </div>`).join('')}
    <button type="submit" class="btn-primary">Submit test</button>
  </form>
</div>`;

  window.__mcTimer = timerInterval = setInterval(() => {
    timeLeft--;
    const timerEl = document.getElementById("timer");
    if (timerEl) {
      timerEl.textContent = `${Math.floor(Math.max(timeLeft, 0) / 60)}:${String(Math.max(timeLeft, 0) % 60).padStart(2, '0')}`;
      if (timeLeft <= 30) timerEl.classList.add('low');
    }
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      const form = document.getElementById("quizForm");
      if (form) form.dispatchEvent(new Event("submit", { cancelable: true }));
    }
  }, 1000);

  document.getElementById("quizForm").addEventListener("submit", (e) => {
    e.preventDefault();
    clearInterval(timerInterval);
    let score = 0;
    questions.forEach((q, i) => {
      const selected = document.querySelector(`input[name="q${i}"]:checked`);
      if (selected && parseInt(selected.value) === q.correct) score++;
    });
    window.__lastTest = test;
showResults(test, score, questions.length);
  });
}

function showResults(test, score, total) {
  const pct = total ? Math.round(score / total * 100) : 0;
  app.innerHTML = `
<div class="page student-page">
  <header class="page-header">
    <button class="btn-back" onclick="render('tests')">All tests</button>
    <h1>Test results</h1>
    <p class="section-desc">${test.name}</p>
  </header>
  <div class="card result-card">
    <span class="result-score">${score} / ${total}</span>
    <p class="result-meta">${pct}% correct</p>
    <button class="btn-primary" onclick="renderTest(window.__lastTest)">Reattempt</button>
    <button class="btn-outline" onclick="render('tests')">Back to tests</button>
  </div>
</div>`;
}

async function fetchJSON(url) {
  try {
    const res = await fetch(url);
    return await res.json();
  } catch (e) {
    console.error(e);
    return [];
  }
}

/* ---------------------------------------------------------
   Lists
   --------------------------------------------------------- */

async function loadCourses() {
  const grid = document.getElementById("courseGrid");
  if (!grid) return;
  const courses = await fetchJSON(API + '/courses');
  if (courses.length === 0) {
    grid.innerHTML = '<div class="card"><p class="card-sub">No courses available yet. Check back soon.</p></div>';
    return;
  }
  grid.innerHTML = courses.map(c => `
<div class="course-card" role="button" tabindex="0" onclick="openCourse(${c.id})">
  <div>
    <span class="course-badge">Class ${c.classLevel || '—'}</span>
    <h3 class="card-title">${c.name}</h3>
    <p class="card-sub">${meta(subjectLabel(c.subject), priceLabel(c.price), (c.videos ? c.videos.length : (c.videoFile ? 1 : 0)) + ' videos')}</p>
  </div>
  ${c.coverImage ? `<img class="course-thumb" src="${encodeURI(c.coverImage)}" alt="">` : ''}
  ${chevron}
</div>`).join('');
}

async function loadClasses() {
  const grid = document.getElementById("classGrid");
  if (!grid) return;
  const classes = await fetchJSON(API + '/classes');
  if (classes.length === 0) {
    grid.innerHTML = '<div class="card"><p class="card-sub">No live classes scheduled yet.</p></div>';
    return;
  }
  grid.innerHTML = classes.map(c => `
<div class="card">
  <span class="live-chip"><span class="dot"></span>Live</span>
  <h3 class="card-title" style="margin-top:8px;">${c.name}</h3>
  <p class="card-sub" style="margin-bottom:14px;">${meta(subjectLabel(c.subject), c.grade ? 'Class ' + c.grade : '')}</p>
  <button class="btn-outline meet-btn" onclick="openMeet('${c.meetLink || 'https://meet.google.com/new'}')">Join meeting</button>
</div>`).join('');
}

async function loadMaterials() {
  const grid = document.getElementById("materialGrid");
  if (!grid) return;
  const materials = await fetchJSON(API + '/materials');
  if (materials.length === 0) {
    grid.innerHTML = '<div class="card"><p class="card-sub">No study material uploaded yet.</p></div>';
    return;
  }
  grid.innerHTML = materials.map(m => `
<div class="card material-card">
  <h3 class="card-title">${m.title}</h3>
  <p class="card-sub" style="margin:4px 0 12px;">${meta(m.grade ? 'Class ' + m.grade : '', subjectLabel(m.subject))}</p>
  ${m.pdfFile
    ? `<a href="${encodeURI(m.pdfFile)}" target="_blank" class="btn-outline">View PDF</a>`
    : '<button class="btn-outline">View</button>'}
</div>`).join('');
}

async function loadTests() {
  const grid = document.getElementById("testGrid");
  if (!grid) return;
  const tests = await fetchJSON(API + '/tests');
  if (tests.length === 0) {
    grid.innerHTML = '<div class="card"><p class="card-sub">No tests published yet.</p></div>';
    return;
  }
  grid.innerHTML = tests.map(t => `
<div class="test-card" role="button" tabindex="0" onclick="openTest('${t.name.replace(/'/g, "\\'")}')">
  <div>
    <h3 class="card-title">${t.name}</h3>
    <p class="card-sub">${meta(t.classLevel ? 'Class ' + t.classLevel : '', subjectLabel(t.subject), (t.questions ? t.questions.length : 0) + ' questions')}</p>
  </div>
  ${t.coverImage ? `<img class="course-thumb" src="${encodeURI(t.coverImage)}" alt="">` : ''}
</div>`).join('');
}

async function loadDashboard() {
  const [courses, classes, materials, tests] = await Promise.all([
    fetchJSON(API + '/courses'),
    fetchJSON(API + '/classes'),
    fetchJSON(API + '/materials'),
    fetchJSON(API + '/tests')
  ]);

  const setStat = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value).padStart(2, '0');
  };
  setStat('statLive', classes.length);
  setStat('statCourses', courses.length);
  setStat('statTests', tests.length);
  setStat('statMaterial', materials.length);

  const featuredGrid = document.querySelector(".featured-grid");
  if (featuredGrid && courses.length > 0) {
    featuredGrid.innerHTML = courses.slice(0, 4).map(c => `
<div class="featured-card" onclick="openCourse(${c.id})">
  ${c.coverImage
    ? `<img class="featured-thumb" src="${encodeURI(c.coverImage)}" alt="">`
    : `<div class="featured-thumb placeholder">${initialsFor(c.name)}</div>`}
  <div class="featured-body">
    <span class="featured-badge">Class ${c.classLevel || '—'}</span>
    <h3 class="card-title">${c.name}</h3>
    <p class="card-sub">${meta(subjectLabel(c.subject), (c.videos ? c.videos.length : (c.videoFile ? 1 : 0)) + ' videos')}</p>
  </div>
  <span class="featured-price">${priceLabel(c.price)}</span>
  ${chevron}
</div>`).join('');
  }

  const liveGrid = document.querySelector(".live-grid");
  if (liveGrid && classes.length > 0) {
    liveGrid.innerHTML = classes.map(c => `
<div class="live-card">
  <div class="live-main">
    <span class="live-chip"><span class="dot"></span>Live</span>
    <h3 class="card-title">${c.name}</h3>
    <p class="card-sub">${meta(subjectLabel(c.subject), c.grade ? 'Class ' + c.grade : '')}</p>
  </div>
  <button class="btn-outline meet-btn" onclick="openMeet('${c.meetLink || 'https://meet.google.com/new'}')">Join</button>
</div>`).join('');
  }

  const studyGrid = document.querySelector(".study-grid");
  if (studyGrid && materials.length > 0) {
    studyGrid.innerHTML = materials.slice(0, 4).map(m => `
<div class="study-card">
  <h3 class="card-title">${m.title}</h3>
  <p class="card-sub">${meta(m.grade ? 'Class ' + m.grade : '', subjectLabel(m.subject))}</p>
  ${m.pdfFile
    ? `<a href="${encodeURI(m.pdfFile)}" target="_blank" class="btn-outline">View</a>`
    : '<button class="btn-outline">View</button>'}
</div>`).join('');
  }

  const testGrid = document.querySelector(".test-grid");
  if (testGrid && tests.length > 0) {
    testGrid.innerHTML = tests.slice(0, 4).map(t => `
<div class="test-card" role="button" tabindex="0" onclick="openTest('${t.name.replace(/'/g, "\\'")}')">
  <div>
    <h3 class="card-title">${t.name}</h3>
    <p class="card-sub">${meta(t.classLevel ? 'Class ' + t.classLevel : '', subjectLabel(t.subject), (t.questions ? t.questions.length : 0) + ' MCQs')}</p>
  </div>
</div>`).join('');
  }
}

/* ---------------------------------------------------------
   Filters + navigation
   --------------------------------------------------------- */

function initMaterialFilters() {
  const gradeFilter = document.getElementById("filterGrade");
  const subjectFilter = document.getElementById("filterSubject");
  const searchInput = document.getElementById("searchMaterial");
  if (!gradeFilter || !subjectFilter || !searchInput) return;

  function filterMaterials() {
    const cards = document.querySelectorAll("#materialGrid .material-card");
    const g = gradeFilter.value;
    const s = subjectFilter.value;
    const q = searchInput.value.toLowerCase();
    cards.forEach(card => {
      const title = card.querySelector(".card-title").textContent.toLowerCase();
      const sub = card.querySelector(".card-sub").textContent.toLowerCase();
      const matchGrade = !g || sub.includes("class " + g);
      const matchSubject = !s || sub.includes(s);
      const matchSearch = title.includes(q) || sub.includes(q);
      card.style.display = (matchGrade && matchSubject && matchSearch) ? "" : "none";
    });
  }

  gradeFilter.addEventListener("change", filterMaterials);
  subjectFilter.addEventListener("change", filterMaterials);
  searchInput.addEventListener("input", filterMaterials);
}

document.querySelector(".sidebar-nav").addEventListener("click", (e) => {
  const btn = e.target.closest(".sidebar-item");
  if (!btn) return;
  document.querySelectorAll(".sidebar-item").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  render(btn.dataset.section);
});

initThemeToggle();
render("dashboard");

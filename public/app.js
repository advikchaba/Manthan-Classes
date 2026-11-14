const API = '/api';

/* ---------------------------------------------------------
   Theme
   --------------------------------------------------------- */

function initThemeToggle() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;

  const root = document.documentElement;
  const isDark = () => root.getAttribute('data-theme') === 'dark';
  const meta = document.querySelector('meta[name="theme-color"]');

  const sync = () => {
    btn.setAttribute('aria-pressed', String(isDark()));
    btn.setAttribute('aria-label', isDark() ? 'Switch to light theme' : 'Switch to dark theme');
    if (meta) meta.setAttribute('content', isDark() ? '#0f1112' : '#f2f3ef');
  };

  sync();

  btn.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    root.classList.add('no-transitions');
    root.setAttribute('data-theme', next);
    sync();
    try { localStorage.setItem('mc-theme', next); } catch (e) { /* storage blocked */ }
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('no-transitions')));
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

const SUBJECTS = { physics: 'Physics', maths: 'Mathematics', chemistry: 'Chemistry', biology: 'Biology' };

const subjectName = (s) => {
  if (!s) return '';
  const key = String(s).toLowerCase();
  return SUBJECTS[key] || s;
};

const dotFor = (s) => `<span class="dot ${String(s || '').toLowerCase()}" aria-hidden="true"></span>`;

const metas = (parts) => {
  const clean = parts.filter((p) => p !== null && p !== undefined && p !== '');
  if (!clean.length) return '';
  return `<span class="row-meta">${clean.map((p) => `<span>${p}</span>`).join('')}</span>`;
};

const priceLabel = (price) => (price && Number(price) > 0 ? 'Rs. ' + price : 'Free');

const videoCount = (c) => (c.videos ? c.videos.length : (c.videoFile ? 1 : 0));

const lectureLabel = (n) => n + (n === 1 ? ' lecture' : ' lectures');

const attr = (v) => String(v == null ? '' : v).replace(/'/g, '&#39;').replace(/"/g, '&quot;');

function initialsFor(name) {
  const clean = String(name || '').replace(/[^a-zA-Z0-9 ]/g, '').trim();
  if (!clean) return 'MC';
  const words = clean.split(/\s+/);
  return (words.length > 1 ? words[0][0] + words[1][0] : clean.slice(0, 2)).toUpperCase();
}

const emptyRow = (title, sub) => `
<div class="row">
  <div class="row-main">
    <div class="row-text">
      <div class="row-title">${title}</div>
      ${metas([sub])}
    </div>
  </div>
</div>`;

function setCount(id, n) {
  const el = document.getElementById(id);
  if (el) el.textContent = n ? ' (' + n + ')' : '';
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

/* ---------------------------------------------------------
   Rows
   --------------------------------------------------------- */

function courseRow(c) {
  const thumb = c.coverImage
    ? `<img class="thumb" src="${encodeURI(c.coverImage)}" alt="">`
    : `<span class="thumb-placeholder" aria-hidden="true">${initialsFor(c.name)}</span>`;

  return `
<button class="row" onclick="openCourse(${c.id})">
  <span class="row-main">
    ${thumb}
    <span class="row-text">
      <span class="row-title">${c.name}</span>
      ${metas([subjectName(c.subject), c.classLevel ? 'Class ' + c.classLevel : '', lectureLabel(videoCount(c))])}
    </span>
  </span>
  <span class="row-end"><span class="row-value">${priceLabel(c.price)}</span></span>
</button>`;
}

function testRow(t) {
  const count = t.questions ? t.questions.length : 0;
  return `
<button class="row" onclick="openTest('${attr(t.name)}')">
  <span class="row-main">
    ${dotFor(t.subject)}
    <span class="row-text">
      <span class="row-title">${t.name}</span>
      ${metas([t.classLevel ? 'Class ' + t.classLevel : '', subjectName(t.subject), count + (count === 1 ? ' question' : ' questions')])}
    </span>
  </span>
  <span class="row-end"><span class="row-value">Start</span></span>
</button>`;
}

function materialRow(m, compact) {
  const subject = subjectName(m.subject);
  const grade = m.grade ? 'Class ' + m.grade : '';
  const action = m.pdfFile
    ? `<a class="btn btn-quiet" href="${encodeURI(m.pdfFile)}" target="_blank" rel="noopener">Open PDF</a>`
    : `<span class="row-value">PDF</span>`;

  if (compact) {
    return `
<div class="row material-card">
  <div class="row-main">
    ${dotFor(m.subject)}
    <div class="row-text">
      <div class="row-title">${m.title}</div>
      ${metas([grade, subject])}
    </div>
  </div>
</div>`;
  }

  return `
<div class="row material-card">
  <div class="row-main">
    ${dotFor(m.subject)}
    <div class="row-text">
      <div class="row-title">${m.title}</div>
      ${metas([grade, subject])}
    </div>
  </div>
  <div class="row-end">${action}</div>
</div>`;
}

function classRow(c) {
  return `
<div class="row">
  <div class="row-main">
    ${dotFor(c.subject)}
    <div class="row-text">
      <div class="row-title">${c.name}</div>
      ${metas([subjectName(c.subject), c.grade ? 'Class ' + c.grade : ''])}
    </div>
  </div>
  <div class="row-end">
    <button class="btn btn-quiet" onclick="openMeet('${attr(c.meetLink || 'https://meet.google.com/new')}')">Join</button>
  </div>
</div>`;
}

/* ---------------------------------------------------------
   Course detail
   --------------------------------------------------------- */

function openCourse(id) {
  fetch(API + '/courses').then(r => r.json()).then(courses => {
    const c = courses.find(x => x.id == id);
    if (!c) { alert('Course not found'); return; }
    const videos = c.videos || (c.videoFile ? [c.videoFile] : []);

    app.innerHTML = `
<div class="page student-page">
  <header class="page-head">
    <button class="btn-back" onclick="render('courses')">All courses</button>
    <h1>${c.name}</h1>
    <p class="page-sub">${[subjectName(c.subject), c.classLevel ? 'Class ' + c.classLevel : '', priceLabel(c.price)].filter(Boolean).join(', ')}</p>
  </header>
  ${c.coverImage ? `<img class="course-cover" src="${encodeURI(c.coverImage)}" alt="">` : ''}
  <section class="block">
    <header class="block-head">
      <h2 class="block-title">Lectures<span class="block-count">${videos.length}</span></h2>
    </header>
    ${videos.length
      ? videos.map((v, i) => `
    <div class="video-card">
      <div class="row-title">Lecture ${i + 1}</div>
      <video controls preload="metadata"><source src="${encodeURI(v)}"></video>
      <a class="btn btn-quiet" href="${encodeURI(v)}" target="_blank" rel="noopener">Open video</a>
    </div>`).join('')
      : emptyRow('No lectures uploaded yet', 'They appear here once your teacher adds them.')}
  </section>
  ${c.pdfFile ? `
  <section class="block">
    <header class="block-head"><h2 class="block-title">PDF material</h2></header>
    <div class="list">
      <div class="row">
        <div class="row-main">
          <div class="row-text">
            <div class="row-title">Course notes</div>
            ${metas([subjectName(c.subject)])}
          </div>
        </div>
        <div class="row-end"><a class="btn btn-quiet" href="${encodeURI(c.pdfFile)}" target="_blank" rel="noopener">Open PDF</a></div>
      </div>
    </div>
  </section>` : ''}
</div>`;
  });
}

/* ---------------------------------------------------------
   Tests
   --------------------------------------------------------- */

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
  <header class="page-head">
    <button class="btn-back" onclick="clearInterval(window.__mcTimer); render('tests')">All tests</button>
    <h1>${test.name}</h1>
    <p class="page-sub">${[test.classLevel ? 'Class ' + test.classLevel : '', subjectName(test.subject), questions.length + (questions.length === 1 ? ' question' : ' questions')].filter(Boolean).join(', ')}</p>
  </header>
  <section class="block">
    <header class="block-head">
      <h2 class="block-title">Questions</h2>
      <span id="timer" class="timer">${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}</span>
    </header>
    <form id="quizForm">
      ${questions.map((q, i) => `
      <div class="mcq-row">
        <p class="q-text"><span class="q-num">${i + 1}</span><span>${q.question}</span></p>
        <div class="options">
          ${q.options.map((opt, j) => `
          <div class="option-item">
            <input type="radio" name="q${i}" value="${j}" id="q${i}_${j}">
            <label for="q${i}_${j}">${opt}</label>
          </div>`).join('')}
        </div>
      </div>`).join('')}
      <button type="submit" class="btn-primary" style="margin-top:22px;">Submit test</button>
    </form>
  </section>
</div>`;

  window.__mcTimer = timerInterval = setInterval(() => {
    timeLeft--;
    const timerEl = document.getElementById("timer");
    if (timerEl) {
      const safe = Math.max(timeLeft, 0);
      timerEl.textContent = `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
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
    showResults(test, score, questions.length);
  });
}

function showResults(test, score, total) {
  const pct = total ? Math.round(score / total * 100) : 0;
  app.innerHTML = `
<div class="page student-page">
  <header class="page-head">
    <button class="btn-back" onclick="render('tests')">All tests</button>
    <h1>${test.name}</h1>
    <p class="page-sub">${[test.classLevel ? 'Class ' + test.classLevel : '', subjectName(test.subject)].filter(Boolean).join(', ')}</p>
  </header>
  <div class="result-card">
    <span class="result-score">${score} / ${total}</span>
    <span class="result-meta">${pct}% correct</span>
    <button class="btn-primary" onclick='renderTest(${JSON.stringify(test).replace(/'/g, "&#39;")})'>Try again</button>
    <button class="btn-outline" onclick="render('tests')">Back to tests</button>
  </div>
</div>`;
}

/* ---------------------------------------------------------
   Data
   --------------------------------------------------------- */

async function fetchJSON(url) {
  try {
    const res = await fetch(url);
    return await res.json();
  } catch (e) {
    console.error(e);
    return [];
  }
}

async function loadCourses() {
  const grid = document.getElementById("courseGrid");
  if (!grid) return;
  const courses = await fetchJSON(API + '/courses');
  grid.innerHTML = courses.length
    ? courses.map(courseRow).join('')
    : emptyRow('No courses yet', 'Your teacher will publish them here.');
}

async function loadClasses() {
  const grid = document.getElementById("classGrid");
  if (!grid) return;
  const classes = await fetchJSON(API + '/classes');
  grid.innerHTML = classes.length
    ? classes.map(classRow).join('')
    : emptyRow('No live classes scheduled', 'Sessions appear here when your teacher opens one.');
}

async function loadMaterials() {
  const grid = document.getElementById("materialGrid");
  if (!grid) return;
  const materials = await fetchJSON(API + '/materials');
  grid.innerHTML = materials.length
    ? materials.map(m => materialRow(m, false)).join('')
    : emptyRow('No study material yet', 'Notes and PDFs uploaded by your teacher will appear here.');
}

async function loadTests() {
  const grid = document.getElementById("testGrid");
  if (!grid) return;
  const tests = await fetchJSON(API + '/tests');
  grid.innerHTML = tests.length
    ? tests.map(testRow).join('')
    : emptyRow('No tests yet', 'Practice tests appear here once they are published.');
}

async function loadDashboard() {
  const dateEl = document.getElementById('todayLabel');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long'
    });
  }

  const [courses, classes, materials, tests] = await Promise.all([
    fetchJSON(API + '/courses'),
    fetchJSON(API + '/classes'),
    fetchJSON(API + '/materials'),
    fetchJSON(API + '/tests')
  ]);

  setCount('courseCount', courses.length);
  setCount('testCount', tests.length);
  setCount('materialCount', materials.length);

  const nowSlot = document.getElementById('nowSlot');
  if (nowSlot) {
    if (classes.length) {
      const c = classes[0];
      nowSlot.innerHTML = `
<div class="list live-slot">
  <div class="row is-live">
    <div class="row-main">
      <div class="row-text">
        <div class="row-title">${c.name}</div>
        <div class="row-meta"><span class="live-tag"><span class="pulse" aria-hidden="true"></span>Live now</span><span>${[subjectName(c.subject), c.grade ? 'Class ' + c.grade : ''].filter(Boolean).join(', ')}</span></div>
      </div>
    </div>
    <div class="row-end">
      <button class="btn btn-solid" onclick="openMeet('${attr(c.meetLink || 'https://meet.google.com/new')}')">Join class</button>
    </div>
  </div>
</div>`;
    } else {
      nowSlot.innerHTML = `<div class="list live-slot">${emptyRow('No live class right now', 'Check back when your teacher starts a session.')}</div>`;
    }
  }

  const courseList = document.getElementById('courseList');
  if (courseList) {
    courseList.innerHTML = courses.length
      ? courses.slice(0, 4).map(courseRow).join('')
      : emptyRow('No courses yet', 'Your teacher will publish them here.');
  }

  const testList = document.getElementById('testList');
  if (testList) {
    testList.innerHTML = tests.length
      ? tests.slice(0, 4).map(testRow).join('')
      : emptyRow('No tests yet', 'Practice tests appear here once they are published.');
  }

  const materialList = document.getElementById('materialList');
  if (materialList) {
    materialList.innerHTML = materials.length
      ? materials.slice(0, 4).map(m => materialRow(m, true)).join('')
      : emptyRow('No notes yet', 'Notes and PDFs uploaded by your teacher will appear here.');
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
    const rows = document.querySelectorAll("#materialGrid .material-card");
    const g = gradeFilter.value;
    const s = subjectFilter.value;
    const q = searchInput.value.toLowerCase();
    rows.forEach(row => {
      const title = row.querySelector(".row-title").textContent.toLowerCase();
      const meta = row.querySelector(".row-meta") ? row.querySelector(".row-meta").textContent.toLowerCase() : '';
      const matchGrade = !g || meta.includes("class " + g);
      const matchSubject = !s || meta.includes(s);
      const matchSearch = title.includes(q) || meta.includes(q);
      row.style.display = (matchGrade && matchSubject && matchSearch) ? "" : "none";
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

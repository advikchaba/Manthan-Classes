const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(__dirname));

// Data helpers
function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    return { classes: [], courses: [], materials: [], tests: [] };
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Initialize data file if missing
if (!fs.existsSync(DATA_FILE)) saveData({ classes: [], courses: [], materials: [], tests: [] });

// API Routes

// Classes
app.get('/api/classes', (req, res) => {
  const data = loadData();
  res.json(data.classes);
});

app.post('/api/classes', (req, res) => {
  const data = loadData();
  const newClass = { id: Date.now(), ...req.body, createdAt: new Date().toISOString() };
  data.classes.push(newClass);
  saveData(data);
  res.json(newClass);
});

// Courses
app.get('/api/courses', (req, res) => {
  const data = loadData();
  res.json(data.courses);
});

app.post('/api/courses', upload.fields([{ name: 'coverImage', maxCount: 1 }, { name: 'videos', maxCount: 10 }, { name: 'pdfFile', maxCount: 1 }]), (req, res) => {
  const data = loadData();
  const files = req.files || {};
  const videos = (files.videos || []).map(f => '/uploads/' + f.filename);
  const newCourse = {
    id: Date.now(),
    name: req.body.name,
    classLevel: req.body.classLevel,
    subject: req.body.subject,
    price: req.body.price,
    coverImage: files.coverImage ? '/uploads/' + files.coverImage[0].filename : null,
    videos: videos,
    videoFile: videos.length > 0 ? videos[0] : null,
    pdfFile: files.pdfFile ? '/uploads/' + files.pdfFile[0].filename : null,
    createdAt: new Date().toISOString()
  };
  data.courses.push(newCourse);
  saveData(data);
  res.json(newCourse);
});

// Study Materials
app.get('/api/materials', (req, res) => {
  const data = loadData();
  res.json(data.materials);
});

app.post('/api/materials', upload.single('pdfFile'), (req, res) => {
  const data = loadData();
  const newMaterial = {
    id: Date.now(),
    title: req.body.title,
    grade: req.body.grade,
    subject: req.body.subject,
    pdfFile: req.file ? '/uploads/' + req.file.filename : null,
    createdAt: new Date().toISOString()
  };
  data.materials.push(newMaterial);
  saveData(data);
  res.json(newMaterial);
});

// Tests
app.get('/api/tests', (req, res) => {
  const data = loadData();
  res.json(data.tests);
});

app.post('/api/tests', upload.single('coverImage'), (req, res) => {
  const data = loadData();
  let questions = [];
  try { questions = JSON.parse(req.body.questions || '[]'); } catch (e) { questions = []; }
  const newTest = {
    id: Date.now(),
    name: req.body.name,
    classLevel: req.body.classLevel,
    subject: req.body.subject,
    timeLimit: parseInt(req.body.timeLimit) || 300,
    coverImage: req.file ? '/uploads/' + req.file.filename : null,
    questions,
    createdAt: new Date().toISOString()
  };
  data.tests.push(newTest);
  saveData(data);
  res.json(newTest);
});

// Security code verification
app.post('/api/verify-code', (req, res) => {
  const { code } = req.body;
  if (code === 'MOTA') {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'Invalid code' });
  }
});

// Delete endpoints
app.delete('/api/classes/:id', (req, res) => {
  const data = loadData();
  data.classes = data.classes.filter(c => c.id != req.params.id);
  saveData(data);
  res.json({ success: true });
});

app.delete('/api/courses/:id', (req, res) => {
  const data = loadData();
  data.courses = data.courses.filter(c => c.id != req.params.id);
  saveData(data);
  res.json({ success: true });
});

app.delete('/api/materials/:id', (req, res) => {
  const data = loadData();
  data.materials = data.materials.filter(m => m.id != req.params.id);
  saveData(data);
  res.json({ success: true });
});

app.delete('/api/tests/:id', (req, res) => {
  const data = loadData();
  data.tests = data.tests.filter(t => t.id != req.params.id);
  saveData(data);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log('Manthan Classes backend running on http://localhost:' + PORT);
});
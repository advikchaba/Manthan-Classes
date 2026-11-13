const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const DATA_FILE = '/tmp/data.json';
const UPLOAD_DIR = '/tmp/uploads';

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));

function loadData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch (e) { return { classes: [], courses: [], materials: [], tests: [] }; }
}
function saveData(data) { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }
if (!fs.existsSync(DATA_FILE)) saveData({ classes: [], courses: [], materials: [], tests: [] });

app.get('/api/classes', (req, res) => res.json(loadData().classes));
app.post('/api/classes', (req, res) => {
  const data = loadData();
  const nc = { id: Date.now(), ...req.body, createdAt: new Date().toISOString() };
  data.classes.push(nc); saveData(data); res.json(nc);
});
app.delete('/api/classes/:id', (req, res) => {
  const data = loadData(); data.classes = data.classes.filter(c => c.id != req.params.id); saveData(data); res.json({ success: true });
});

app.get('/api/courses', (req, res) => res.json(loadData().courses));
app.post('/api/courses', upload.fields([{ name: 'coverImage', maxCount: 1 }, { name: 'videos', maxCount: 10 }, { name: 'pdfFile', maxCount: 1 }]), (req, res) => {
  const data = loadData(); const files = req.files || {};
  const videos = (files.videos || []).map(f => '/uploads/' + f.filename);
  const nc = { id: Date.now(), name: req.body.name, classLevel: req.body.classLevel, subject: req.body.subject, price: req.body.price, coverImage: files.coverImage ? '/uploads/' + files.coverImage[0].filename : null, videos, videoFile: videos[0] || null, pdfFile: files.pdfFile ? '/uploads/' + files.pdfFile[0].filename : null, createdAt: new Date().toISOString() };
  data.courses.push(nc); saveData(data); res.json(nc);
});
app.delete('/api/courses/:id', (req, res) => {
  const data = loadData(); data.courses = data.courses.filter(c => c.id != req.params.id); saveData(data); res.json({ success: true });
});

app.get('/api/materials', (req, res) => res.json(loadData().materials));
app.post('/api/materials', upload.single('pdfFile'), (req, res) => {
  const data = loadData();
  const nm = { id: Date.now(), title: req.body.title, grade: req.body.grade, subject: req.body.subject, pdfFile: req.file ? '/uploads/' + req.file.filename : null, createdAt: new Date().toISOString() };
  data.materials.push(nm); saveData(data); res.json(nm);
});
app.delete('/api/materials/:id', (req, res) => {
  const data = loadData(); data.materials = data.materials.filter(m => m.id != req.params.id); saveData(data); res.json({ success: true });
});

app.get('/api/tests', (req, res) => res.json(loadData().tests));
app.post('/api/tests', upload.single('coverImage'), (req, res) => {
  const data = loadData();
  let questions = []; try { questions = JSON.parse(req.body.questions || '[]'); } catch (e) {}
  const nt = { id: Date.now(), name: req.body.name, classLevel: req.body.classLevel, subject: req.body.subject, timeLimit: parseInt(req.body.timeLimit) || 300, coverImage: req.file ? '/uploads/' + req.file.filename : null, questions, createdAt: new Date().toISOString() };
  data.tests.push(nt); saveData(data); res.json(nt);
});
app.delete('/api/tests/:id', (req, res) => {
  const data = loadData(); data.tests = data.tests.filter(t => t.id != req.params.id); saveData(data); res.json({ success: true });
});

app.post('/api/verify-code', (req, res) => {
  res.json({ success: req.body.code === 'MOTA' });
});

// Serve static files from the project root
app.use(express.static(path.join(__dirname, '..')));

module.exports = app;
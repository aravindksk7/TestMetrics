const path   = require('path');
const os     = require('os');
const multer = require('multer');
const router = require('express').Router();
const ctrl   = require('../controllers/adminController');
const { generateSampleXlsx } = require('../utils/generateSampleXlsx');

const upload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (_req, file, cb) => {
      const ext  = path.extname(file.originalname) || '.xlsx';
      const name = `xray_upload_${Date.now()}${ext}`;
      cb(null, name);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const ok = /\.(xlsx|xls)$/i.test(file.originalname);
    cb(ok ? null : new Error('Only .xlsx / .xls files are accepted'), ok);
  },
});

router.get('/sample-xlsx', (_req, res) => {
  try {
    const buf = generateSampleXlsx();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="xray_import_sample.xlsx"');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/',                      ctrl.startIngestion);
router.post('/upload', upload.single('file'), ctrl.uploadAndIngest);
router.get('/history',                ctrl.getHistory);
router.get('/:job_id',                ctrl.getJobStatus);

module.exports = router;

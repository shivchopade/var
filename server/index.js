const express = require('express');
const cors = require('cors');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { PDFDocument } = require('pdf-lib');
const { Cashfree } = require('cashfree-pg');
require('dotenv').config();

const app = express();

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'X-Client-Id', 'X-Client-Secret', 'X-Api-Version']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Cashfree
Cashfree.XClientId = process.env.CLIENT_ID;
Cashfree.XClientSecret = process.env.CLIENT_SECRET;
Cashfree.XEnvironment = Cashfree.Environment.SANDBOX;

// File upload configuration
const UPLOAD_FOLDER = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_FOLDER)) {
  fs.mkdirSync(UPLOAD_FOLDER, { recursive: true, mode: 0o755 });
}
const ALLOWED_EXTENSIONS = new Set(['pdf', 'txt', 'jpg', 'png']);
const MAX_PAGES = 100;
const PRINTER_NAME = 'HP_DeskJet_2876';

// Configure Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_FOLDER),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).slice(1).toLowerCase();
  ALLOWED_EXTENSIONS.has(ext) ? cb(null, true) : cb(new Error('Invalid file type'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// In-memory storage for print jobs
const printJobs = new Map();

// Helper functions
async function getPdfPageCount(filePath) {
  try {
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    return pdfDoc.getPageCount();
  } catch (error) {
    throw new Error('Error reading PDF file');
  }
}

function generateOrderId() {
  return crypto.randomBytes(8).toString('hex').substr(0, 12);
}

// Routes
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    console.log('Upload request received');
    if (!req.file) {
      console.log('No file in request');
      throw new Error('No file uploaded');
    }
    
    console.log('File received:', req.file.filename);
    const filePath = path.join(UPLOAD_FOLDER, req.file.filename);
    let pageCount = 1;

    if (req.file.mimetype === 'application/pdf') {
      console.log('Processing PDF file');
      pageCount = await getPdfPageCount(filePath);
      console.log('Page count:', pageCount);
      if (pageCount > MAX_PAGES) {
        fs.unlinkSync(filePath);
        throw new Error(`PDF exceeds maximum ${MAX_PAGES} pages`);
      }
    }

    const orderId = generateOrderId();
    printJobs.set(orderId, { filePath, pageCount, paid: false });

    console.log('Upload successful, sending response');
    res.json({
      orderId,
      pageCount,
      amount: pageCount
    });

  } catch (error) {
    console.error('Upload error details:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/create-payment', async (req, res) => {
  try {
    const { orderId, amount } = req.body;
    const job = printJobs.get(orderId);
    if (!job) throw new Error('Invalid print job');

    const request = {
      order_amount: amount,
      order_currency: "INR",
      order_id: orderId,
      customer_details: {
        customer_id: `cust_${crypto.randomBytes(4).toString('hex')}`,
        customer_phone: "9999999999"
      }
    };

    const response = await Cashfree.PGCreateOrder("2023-08-01", request);
    job.paymentSessionId = response.data.payment_session_id;
    
    res.json({ 
      paymentSessionId: response.data.payment_session_id,
      orderId
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/verify-payment', async (req, res) => {
  try {
    const { orderId } = req.body;
    const job = printJobs.get(orderId);
    if (!job) throw new Error('Invalid order ID');

    const payments = await Cashfree.PGOrderFetchPayments("2023-08-01", orderId);
    const successful = payments.data.some(p => p.payment_status === 'SUCCESS');

    if (successful) {
      // Print the file
      execFile('lp', ['-d', PRINTER_NAME, job.filePath], (error) => {
        if (error) {
          console.error('Printing error:', error);
        }
        // Cleanup
        fs.unlinkSync(job.filePath);
        printJobs.delete(orderId);
      });
      
      res.json({ success: true });
    } else {
      res.json({ success: false });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(process.env.PORT || 8000, () => {
  console.log(`Server running on port ${process.env.PORT || 8000}`);
});
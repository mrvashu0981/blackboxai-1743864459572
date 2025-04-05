const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto-js');
const QRCode = require('qrcode');

const app = express();
const PORT = 3000;

// Create necessary directories if they don't exist
const uploadDir = path.join(__dirname, '../uploads');
const qrDir = path.join(__dirname, '../qr-images');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });

// File storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPG, PNG, and PDF are allowed.'));
        }
    }
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Data storage (in a real app, use a database)
const dataPath = path.join(__dirname, 'data.json');
let fileData = {};

if (fs.existsSync(dataPath)) {
    fileData = JSON.parse(fs.readFileSync(dataPath));
}

// Routes
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        const { url, isPrivate } = req.body;
        const file = req.file;

        if (!file && !url) {
            return res.status(400).json({ error: 'Either file or URL is required' });
        }

        const fileId = crypto.lib.WordArray.random(16).toString();
        const privateKey = isPrivate ? crypto.lib.WordArray.random(8).toString() : null;

        // Store file metadata
        fileData[fileId] = {
            type: file ? 'file' : 'url',
            path: file ? file.path : url,
            originalName: file ? file.originalname : null,
            isPrivate,
            privateKey: privateKey ? crypto.AES.encrypt(privateKey, process.env.ENCRYPTION_KEY || 'default-secret').toString() : null,
            createdAt: new Date().toISOString()
        };

        // Save metadata
        fs.writeFileSync(dataPath, JSON.stringify(fileData, null, 2));

        // Generate QR code
        const qrData = JSON.stringify({ fileId });
        const qrPath = path.join(qrDir, `${fileId}.png`);
        await QRCode.toFile(qrPath, qrData, {
            color: {
                dark: '#1E3A8A',
                light: '#FFFFFF'
            }
        });

        res.json({ 
            success: true,
            fileId,
            qrUrl: `/qr-images/${fileId}.png`,
            privateKey
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/access/:fileId', (req, res) => {
    const { fileId } = req.params;
    const { key } = req.query;

    if (!fileData[fileId]) {
        return res.status(404).json({ error: 'File not found' });
    }

    const fileInfo = fileData[fileId];

    // Check private key if required
    if (fileInfo.isPrivate) {
        if (!key) {
            return res.status(401).json({ error: 'Private key is required' });
        }

        const storedKey = crypto.AES.decrypt(fileInfo.privateKey, process.env.ENCRYPTION_KEY || 'default-secret').toString(crypto.enc.Utf8);
        if (key !== storedKey) {
            return res.status(403).json({ error: 'Invalid private key' });
        }
    }

    // Return file data
    if (fileInfo.type === 'file') {
        res.sendFile(fileInfo.path);
    } else {
        res.redirect(fileInfo.path);
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
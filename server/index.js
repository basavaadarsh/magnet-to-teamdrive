import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import multer from 'multer';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import torrentRouter from './routes/torrent.js';
import authRouter from './routes/auth.js';
import { setupWebTorrentClient } from './services/torrentService.js';
import { validateEnv } from './utils/validate.js';

// Load environment variables
dotenv.config();

// Validate required environment variables
validateEnv();

// Setup paths
const __dirname = dirname(fileURLToPath(import.meta.url));
const tempDir = join(__dirname, 'temp');

// Initialize Express app
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/x-bittorrent') {
      cb(null, true);
    } else {
      cb(new Error('Only .torrent files are allowed'));
    }
  }
});

// Setup WebTorrent client
setupWebTorrentClient(io);

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('dev'));
app.use(express.json());

// Make upload middleware available to routes
app.use((req, res, next) => {
  req.upload = upload;
  next();
});

// API Routes - ensure these come before any static file handling
app.use('/api/auth', authRouter);
app.use('/api/torrent', torrentRouter);

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error'
    }
  });
});

// Start server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Server shutting down...');
  // Clean up resources
  process.exit(0);
});

export default app;
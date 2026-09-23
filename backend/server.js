const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { getDB } = require('./database');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Security Headers: XSS protection, anti-clickjacking, disable X-Powered-By header
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting disabled as not yet required for local testing/development
// app.use('/api', apiLimiter);
// app.use('/api/auth/login', loginLimiter);

// Enable CORS & JSON Parsing
app.use(cors({ origin: '*' }));
app.use(express.json());

const path = require('path');

// Serve uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Mount API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/units', require('./routes/unitRoutes'));
app.use('/api/institutions', require('./routes/institutionRoutes'));
app.use('/api/catalog', require('./routes/catalogRoutes'));
app.use('/api/demands', require('./routes/demandRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/refreshment-bills', require('./routes/billRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/bill-collection', require('./routes/billCollectionRoutes'));
app.use('/api/delivery', require('./routes/deliveryRoutes'));
app.use('/api/packets', require('./routes/packetRoutes'));

app.use('/api/stream', require('./routes/streamRoutes'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    system: 'NCC Refreshment Demand & Supply System API',
    timestamp: new Date().toISOString()
  });
});

// Serve React frontend in production
if (process.env.NODE_ENV === 'production') {
  const frontendBuild = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(frontendBuild));
  // All non-API routes → serve React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuild, 'index.html'));
  });
}

// Initialize database and start server
getDB()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`=======================================================`);
      console.log(` NCC Refreshment API Server running on port ${PORT} (LAN 0.0.0.0)`);
      console.log(` Health check: http://localhost:${PORT}/api/health`);
      console.log(`=======================================================`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import database configuration
const { config, prisma } = require('./src/config/config');

const app = express();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: config.fileUpload.maxFileSize }));
app.use(express.urlencoded({ extended: true, limit: config.fileUpload.maxFileSize }));

// Logging
app.use(morgan('combined'));

// Health check endpoint with database connectivity
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'OK',
      message: 'Resume Processing System API is running',
      timestamp: new Date().toISOString(),
      environment: config.server.nodeEnv,
      database: 'Connected',
      version: '1.0.0',
    });
  } catch (error) {
    res.status(503).json({
      status: 'Service Unavailable',
      message: 'Database connection failed',
      timestamp: new Date().toISOString(),
      environment: config.server.nodeEnv,
      database: 'Disconnected',
      error: error.message,
    });
  }
});

// API information endpoint
app.get('/api', async (req, res) => {
  try {
    // Get some basic stats from the database
    const userCount = await prisma.user.count();
    const resumeCount = await prisma.resume.count();
    const skillCount = await prisma.skill.count();
    const jobCount = await prisma.job.count();
    
    res.status(200).json({
      message: 'Resume Processing System API',
      version: '1.0.0',
      status: 'Active',
      database: {
        connected: true,
        stats: {
          users: userCount,
          resumes: resumeCount,
          skills: skillCount,
          jobs: jobCount,
        }
      },
      endpoints: {
        health: '/health',
        api: '/api',
        // Additional endpoints will be added in subsequent steps
      },
    });
  } catch (error) {
    res.status(500).json({
      message: 'Resume Processing System API',
      version: '1.0.0',
      status: 'Error',
      database: {
        connected: false,
        error: error.message,
      },
      endpoints: {
        health: '/health',
        api: '/api',
      },
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

const PORT = config.server.port;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API endpoint: http://localhost:${PORT}/api`);
  console.log(`🌍 Environment: ${config.server.nodeEnv}`);
});

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('\n🔄 Graceful shutdown initiated...');
  
  // Close server
  server.close(async () => {
    console.log('📡 HTTP server closed');
    
    // Disconnect Prisma
    try {
      await prisma.$disconnect();
      console.log('🗄️ Database connection closed');
    } catch (error) {
      console.error('❌ Error closing database connection:', error);
    }
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('⏰ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = app;

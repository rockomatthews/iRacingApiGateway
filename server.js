import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { login, verifyAuth, manualReAuth } from './iRacingApi.js';

dotenv.config();

const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.speedtrapbets.com';

app.use(cors({
  origin: FRONTEND_URL,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

const PORT = process.env.PORT || 3001;

// Middleware to check authentication before each request
app.use(async (req, res, next) => {
  try {
    const isAuthenticated = await verifyAuth();
    if (!isAuthenticated) {
      console.log('Authentication failed. Attempting manual re-authentication...');
      await manualReAuth();
    }
    next();
  } catch (error) {
    console.error('Error in authentication middleware:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Endpoint to search for an iRacing name (Placeholder - if needed later)
app.get('/api/search-iracing-name', async (req, res) => {
  res.status(501).json({ error: 'Not Implemented' });
});

// Start the server and attempt login to iRacing API
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  const loginSuccess = await login(process.env.IRACING_EMAIL, process.env.IRACING_PASSWORD);
  if (!loginSuccess) {
    console.error('Server started but iRacing login failed. Some functionality may be limited.');
  }
});

export default app;

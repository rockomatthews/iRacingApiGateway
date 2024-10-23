import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { login, verifyAuth, manualReAuth, searchIRacingName } from './iRacingApi.js';

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

let reAuthAttempts = 0;
const MAX_REAUTH_ATTEMPTS = 3;

// Middleware to check authentication before each request
app.use(async (req, res, next) => {
  try {
    const isAuthenticated = await verifyAuth();
    if (!isAuthenticated) {
      if (reAuthAttempts < MAX_REAUTH_ATTEMPTS) {
        console.log('Authentication failed. Attempting manual re-authentication...');
        await manualReAuth();
        reAuthAttempts++;
      } else {
        console.error('Maximum re-authentication attempts reached. Please check credentials or connection.');
        return res.status(401).json({ error: 'Authentication failed' });
      }
    } else {
      // Reset re-authentication attempts on successful verification
      reAuthAttempts = 0;
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

// Endpoint to search for an iRacing name
app.get('/api/search-iracing-name', async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res.status(400).json({ error: 'Name parameter is required' });
    }

    console.log('Searching for:', name);

    const result = await searchIRacingName(name);
    console.log('Search result:', result);

    if (result.exists) {
      res.json({ exists: true, name: result.name, id: result.id });
    } else {
      res.json({ exists: false, message: `${name} has not been found in iRacing.` });
    }
  } catch (error) {
    console.error('Error in search-iracing-name endpoint:', error);
    res.status(500).json({ 
      error: 'An error occurred while searching for the iRacing name', 
      details: error.message
    });
  }
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

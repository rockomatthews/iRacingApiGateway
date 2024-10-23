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

// Middleware to check authentication before each request
app.use(async (req, res, next) => {
  try {
    console.log('Verifying authentication before processing request...');
    const isAuthenticated = await verifyAuth();
    if (!isAuthenticated) {
      console.log('Authentication failed. Attempting manual re-authentication...');
      await manualReAuth();
      const reAuthSuccess = await verifyAuth();
      if (!reAuthSuccess) {
        console.error('Re-authentication failed. Please check credentials or connection.');
        return res.status(401).json({ error: 'Authentication failed after re-authentication attempt' });
      } else {
        console.log('Re-authentication successful. Proceeding with request.');
      }
    } else {
      console.log('Authentication verified successfully. Proceeding with request.');
    }
    next();
  } catch (error) {
    console.error('Error in authentication middleware:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
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

    console.log(`Received search request for iRacing name: ${name}`);

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
  console.log('Attempting initial login to iRacing API...');
  const loginSuccess = await login(process.env.IRACING_EMAIL, process.env.IRACING_PASSWORD);
  if (!loginSuccess) {
    console.error('Initial login failed. Please check your credentials or network connection. The server is running, but some functionality may be limited until login is successful.');
  } else {
    console.log('Initial authentication successful. Server is fully operational.');
  }
});

export default app;

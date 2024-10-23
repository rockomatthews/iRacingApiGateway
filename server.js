import express from 'express';
import dotenv from 'dotenv';
import { login, exchangeCodeForToken, verifyAuth } from './iRacingApi.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

let currentAccessToken = null;
let currentCodeVerifier = null;

app.get('/login', (req, res) => {
  // Generate a new code verifier and code challenge each time
  currentCodeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(currentCodeVerifier);
  
  const clientId = process.env.IRACING_CLIENT_ID;
  const redirectUri = process.env.IRACING_REDIRECT_URI;
  
  const authorizeUrl = `${BASE_URL}/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=iracing.profile&code_challenge=${codeChallenge}&code_challenge_method=S256`;

  console.log('Redirecting to:', authorizeUrl);
  res.redirect(authorizeUrl);
});

app.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Authorization code not provided');
  }

  try {
    // Exchange the code for an access token
    const accessToken = await exchangeCodeForToken(code, currentCodeVerifier);
    if (accessToken) {
      currentAccessToken = accessToken;
      res.json({ message: 'Login successful', accessToken });
    } else {
      res.status(500).send('Failed to retrieve access token');
    }
  } catch (error) {
    console.error('Callback processing failed:', error.message);
    res.status(500).send('An error occurred during callback processing');
  }
});

app.get('/profile', async (req, res) => {
  if (!currentAccessToken) {
    return res.status(401).send('Unauthorized: Please login first');
  }

  const isValid = await verifyAuth(currentAccessToken);
  if (isValid) {
    res.send('Profile access granted');
  } else {
    res.status(401).send('Unauthorized: Token verification failed');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;

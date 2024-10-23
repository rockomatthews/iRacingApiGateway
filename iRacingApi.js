import axios from 'axios';
import crypto from 'crypto';
import https from 'https';
import tough from 'tough-cookie';
import dotenv from 'dotenv';

dotenv.config();

const { CookieJar } = tough;

const BASE_URL = 'https://oauth.iracing.com/oauth2';
const cookieJar = new CookieJar();

const instance = axios.create({
  httpsAgent: new https.Agent({  
    rejectUnauthorized: false
  })
});

// Function to generate a random code verifier between 43 and 128 characters
function generateCodeVerifier() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890-._~';
  const length = 128;
  let result = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters[randomIndex];
  }
  return result;
}

// Function to generate a code challenge from the code verifier
function generateCodeChallenge(verifier) {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return hash.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function login() {
  const clientId = process.env.IRACING_CLIENT_ID;
  const redirectUri = process.env.IRACING_REDIRECT_URI;
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  
  console.log('Attempting to start OAuth flow with PKCE...');

  try {
    // Construct the authorization URL
    const authorizeUrl = `${BASE_URL}/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=iracing.profile&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    console.log('Redirecting user to:', authorizeUrl);
    // The client should be redirected to this URL for login; here you need user interaction.
    // After user interaction, they will be redirected to the redirect_uri with a code.

    // TODO: Add mechanism to manage the redirect and complete the OAuth flow.
    // This is typically done through a web page redirect in the browser.

  } catch (error) {
    console.error('Failed to start the OAuth flow:', error.message);
  }
}

async function exchangeCodeForToken(code, codeVerifier) {
  console.log('Attempting to exchange code for token...');
  try {
    const response = await instance.post(`${BASE_URL}/token`, null, {
      params: {
        grant_type: 'authorization_code',
        client_id: process.env.IRACING_CLIENT_ID,
        code: code,
        redirect_uri: process.env.IRACING_REDIRECT_URI,
        code_verifier: codeVerifier
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('Token exchange response:', response.status, response.statusText);
    console.log('Response data:', response.data);
    
    return response.data.access_token;
  } catch (error) {
    console.error('Failed to exchange code for token:', error.response?.data || error.message);
    return null;
  }
}

async function verifyAuth(accessToken) {
  try {
    console.log('Verifying authorization with access token...');
    const response = await instance.get(`${BASE_URL}/iracing/profile`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'Mozilla/5.0 (compatible; iRacing/1.0)'
      }
    });

    console.log('Verification response status:', response.status);
    return response.status === 200;
  } catch (error) {
    console.error('Auth verification failed:', error.response?.data || error.message);
    return false;
  }
}

export {
  login,
  exchangeCodeForToken,
  verifyAuth
};

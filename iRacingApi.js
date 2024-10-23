import axios from 'axios';
import crypto from 'crypto';
import https from 'https';
import tough from 'tough-cookie';
import dotenv from 'dotenv';

dotenv.config();

const { CookieJar } = tough;

const BASE_URL = 'https://oauth.iracing.com/oauth2';
const DATA_BASE_URL = 'https://members-ng.iracing.com/data/lookup'; // The base URL for data endpoints.
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

// Function to search for an iRacing driver by name
async function searchIRacingName(name, accessToken) {
    try {
      // Retrieve cookies to make sure authenticated requests are used
      const cookies = await cookieJar.getCookies(DATA_BASE_URL);
      const cookieString = cookies.map(cookie => `${cookie.key}=${cookie.value}`).join('; ');
  
      console.log('Attempting to search for iRacing driver by name:', name);
      
      // Request to search for driver data using cookies and access token
      const response = await instance.get(`${DATA_BASE_URL}/drivers`, {
        params: {
          search_term: name,
          lowerbound: 1,
          upperbound: 25
        },
        headers: {
          'Cookie': cookieString,
          'Authorization': `Bearer ${accessToken}`, // Adding the access token in the headers
          'User-Agent': 'Mozilla/5.0 (compatible; iRacing/1.0)'
        }
      });
  
      // If a valid response with a driver link is received, proceed to get driver details
      if (response.data && response.data.link) {
        const driverDataResponse = await instance.get(response.data.link, {
          headers: {
            'Cookie': cookieString,
            'Authorization': `Bearer ${accessToken}`, // Adding the access token here too
            'User-Agent': 'Mozilla/5.0 (compatible; iRacing/1.0)'
          }
        });
  
        const drivers = Array.isArray(driverDataResponse.data) ? driverDataResponse.data : [];
  
        if (drivers.length > 0) {
          // Attempt to find a matching driver by comparing names
          const matchingDriver = drivers.find(driver => 
            driver.display_name.toLowerCase() === name.toLowerCase() ||
            driver.display_name.toLowerCase().includes(name.toLowerCase())
          );
  
          if (matchingDriver) {
            console.log(`Driver found: Name - ${matchingDriver.display_name}, ID - ${matchingDriver.cust_id}`);
            return {
              exists: true,
              name: matchingDriver.display_name,
              id: matchingDriver.cust_id
            };
          }
        }
      }
  
      // If no matching driver is found, log this outcome
      console.log(`Driver with name "${name}" not found in iRacing.`);
      return { exists: false };
    } catch (error) {
      console.error('Error searching for iRacing name:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }
  

export {
  exchangeCodeForToken,
  verifyAuth,
  searchIRacingName
};

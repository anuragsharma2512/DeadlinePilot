require('dotenv').config();
const axios = require('axios');
const db = require('../db/client');
const Task = require('../models/Task');

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

/**
 * Generates the Google OAuth 2.0 authorization URL.
 * Passes the user's JWT token in the 'state' parameter to identify them on callback.
 */
function getAuthUrl(jwtToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.trim() : null;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ? process.env.GOOGLE_REDIRECT_URI.trim() : 'http://localhost:5000/api/calendar/callback';

  if (!clientId) {
    return null;
  }

  const scopes = [
    'https://www.googleapis.com/auth/calendar.readonly'
  ];

  return `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scopes.join(' '))}&` +
    `access_type=offline&` +
    `prompt=consent&` +
    `state=${encodeURIComponent(jwtToken)}`;
}

/**
 * Exchanges authorization code for tokens and saves them in the user profile.
 */
async function handleOAuthCallback(code, userId) {
  const clientId = process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.trim() : null;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ? process.env.GOOGLE_CLIENT_SECRET.trim() : null;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ? process.env.GOOGLE_REDIRECT_URI.trim() : 'http://localhost:5000/api/calendar/callback';

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured.');
  }

  const response = await axios.post(GOOGLE_TOKEN_URL, new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code'
  }), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  const tokenData = response.data;
  
  // Store token details with an acquired_at timestamp to handle expiry
  const tokenObject = {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token, // Only sent on first consent
    expires_in: tokenData.expires_in,
    acquired_at: Date.now()
  };

  // Update profile in DB
  await Task.updateProfile(userId, {
    google_calendar_token: JSON.stringify(tokenObject)
  });

  return tokenObject;
}

/**
 * Retrieves a valid, unexpired access token for the user.
 * Refreshes the token automatically if expired.
 */
async function getValidAccessToken(userId) {
  const profile = await Task.getProfile(userId);
  if (!profile || !profile.google_calendar_token) {
    return null;
  }

  let tokenData;
  try {
    tokenData = JSON.parse(profile.google_calendar_token);
  } catch (e) {
    return null;
  }

  const { access_token, refresh_token, expires_in, acquired_at } = tokenData;
  
  // Check if token is expired (adding 1 min buffer)
  const isExpired = Date.now() > (acquired_at + (expires_in - 60) * 1000);

  if (!isExpired) {
    return access_token;
  }

  // Token is expired, try to refresh it
  if (!refresh_token) {
    console.warn(`No refresh token available for user ${userId}. Must re-authenticate.`);
    return null;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  try {
    console.log(`Refreshing Google access token for user ${userId}...`);
    const response = await axios.post(GOOGLE_TOKEN_URL, new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refresh_token,
      grant_type: 'refresh_token'
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const newTokens = response.data;
    
    // Save updated token details (keeping the original refresh token)
    const updatedTokenObject = {
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token || refresh_token,
      expires_in: newTokens.expires_in,
      acquired_at: Date.now()
    };

    await Task.updateProfile(userId, {
      google_calendar_token: JSON.stringify(updatedTokenObject)
    });

    return newTokens.access_token;
  } catch (error) {
    console.error(`Failed to refresh Google token for user ${userId}:`, error.message);
    return null;
  }
}

/**
 * Fetches today's calendar events from Google Calendar.
 * Falls back to mock events if not connected.
 */
async function getTodayEvents(userId) {
  const accessToken = await getValidAccessToken(userId);
  
  if (!accessToken) {
    console.log(`User ${userId} not connected to Google Calendar. Using mock events.`);
    return getLocalMockEvents();
  }

  try {
    // Set time limits for today (local time bounds)
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const response = await axios.get(GOOGLE_EVENTS_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      }
    });

    const items = response.data.items || [];
    
    return items.map(item => {
      // Extract start & end times (supporting both all-day and timed events)
      const startDateTime = item.start.dateTime || item.start.date;
      const endDateTime = item.end.dateTime || item.end.date;
      
      const startDate = new Date(startDateTime);
      const endDate = new Date(endDateTime);

      // Format to HH:MM
      const formatTime = (date) => {
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      };

      return {
        title: item.summary || 'Untitled Event',
        start: formatTime(startDate),
        end: formatTime(endDate),
        startISO: startDateTime,
        endISO: endDateTime
      };
    });
  } catch (error) {
    console.error(`Error fetching Google Calendar events for user ${userId}:`, error.message);
    return getLocalMockEvents();
  }
}

/**
 * Disconnects Google Calendar for a user.
 */
async function disconnectCalendar(userId) {
  await Task.updateProfile(userId, {
    google_calendar_token: null
  });
}

function getLocalMockEvents() {
  const now = new Date();
  
  const standupStart = new Date(now);
  standupStart.setHours(10, 0, 0, 0);
  const standupEnd = new Date(now);
  standupEnd.setHours(10, 30, 0, 0);

  const lunchStart = new Date(now);
  lunchStart.setHours(12, 0, 0, 0);
  const lunchEnd = new Date(now);
  lunchEnd.setHours(13, 0, 0, 0);

  const reviewStart = new Date(now);
  reviewStart.setHours(14, 30, 0, 0);
  const reviewEnd = new Date(now);
  reviewEnd.setHours(15, 30, 0, 0);

  return [
    {
      title: 'Weekly Team Sync (Mock)',
      start: '10:00',
      end: '10:30',
      startISO: standupStart.toISOString(),
      endISO: standupEnd.toISOString()
    },
    {
      title: 'Lunch Break (Mock)',
      start: '12:00',
      end: '13:00',
      startISO: lunchStart.toISOString(),
      endISO: lunchEnd.toISOString()
    },
    {
      title: 'Client Review Meeting (Mock)',
      start: '14:30',
      end: '15:30',
      startISO: reviewStart.toISOString(),
      endISO: reviewEnd.toISOString()
    }
  ];
}

module.exports = {
  getAuthUrl,
  handleOAuthCallback,
  getTodayEvents,
  disconnectCalendar,
  getLocalMockEvents
};

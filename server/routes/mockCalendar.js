const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/auth');
const googleCalendarService = require('../services/googleCalendarService');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_lifesaver_key_123!';

// GET /api/calendar/auth - Retrieve Google OAuth URL
router.get('/auth', (req, res) => {
  // Extract token from authorization header or query param
  let token = null;
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required.' });
  }

  const authUrl = googleCalendarService.getAuthUrl(token);

  if (!authUrl) {
    return res.json({ 
      status: 'not_configured', 
      message: 'Google OAuth credentials not configured on the server. Using mock events.',
      url: null 
    });
  }

  res.json({ status: 'ok', url: authUrl });
});

// GET /api/calendar/callback - OAuth Callback from Google
router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    console.error('Google OAuth callback error:', error);
    return res.redirect('http://localhost:5173/dashboard?calendar_error=access_denied');
  }

  if (!code || !state) {
    return res.status(400).send('Invalid callback request parameters.');
  }

  try {
    // Decode state (which is the user's JWT token) to identify the user
    const decoded = jwt.verify(state, JWT_SECRET);
    const userId = decoded.id;

    // Exchange code for tokens and save
    await googleCalendarService.handleOAuthCallback(code, userId);

    // Redirect user back to the frontend dashboard with a success flag
    res.redirect('http://localhost:5173/dashboard?calendar_connected=true');
  } catch (err) {
    console.error('Error handling Google OAuth callback:', err.message);
    res.status(500).send('Failed to authenticate with Google. Please try again.');
  }
});

// Apply auth middleware for other endpoints
router.use(authMiddleware);

// GET /api/calendar/events - Fetch today's events (real or mock)
router.get('/events', async (req, res, next) => {
  try {
    const events = await googleCalendarService.getTodayEvents(req.user.id);
    res.json(events);
  } catch (error) {
    next(error);
  }
});

// POST /api/calendar/disconnect - Disconnect Google Calendar
router.post('/disconnect', async (req, res, next) => {
  try {
    await googleCalendarService.disconnectCalendar(req.user.id);
    res.json({ success: true, message: 'Google Calendar disconnected.' });
  } catch (error) {
    next(error);
  }
});

module.exports = {
  router,
  getMockEvents: googleCalendarService.getLocalMockEvents
};

# DeadlinePiolet 

An AI-powered task manager for people working under deadline pressure. The app turns messy task dumps into structured todos, scores priorities, builds a time-blocked "war plan", sends coaching interventions, tracks productivity insights, and can optionally sync around Google Calendar events.

## Features

- User registration and login with JWT authentication
- Brain-dump task parsing with Google Gemini and local fallback parsing
- Priority scoring based on deadline, urgency, impact, and overdue status
- Time-blocked daily war plan generation
- AI coach chat with manual interventions and SSE push messages
- Task completion tracking, overdue counts, streaks, and productivity insights
- Habit tracking
- Optional Google Calendar OAuth integration
- Local mock calendar events when Google Calendar is not connected
- Autonomous task execution draft generation with Gemini and local fallback

## Tech Stack

Frontend:

- React 18
- Vite
- Tailwind CSS
- Axios
- React Router
- Lucide React icons

Backend:

- Node.js
- Express
- libSQL / SQLite-compatible local database
- JWT authentication
- bcrypt password hashing
- Google Gemini API
- Google Calendar API
- Server-Sent Events for coaching pushes

## Project Structure

```text
last-minute-lifesaver/
  client/                 React frontend
    src/
      api/                Axios API client
      components/         UI components
      pages/              App pages
  server/                 Express backend
    db/                   Database client and schema initialization
    middleware/           Auth middleware
    models/               Task model and profile logic
    routes/               API routes
    services/             Gemini, Google Calendar, priority scoring
    shared/               AI prompts
    scripts/              Seed scripts
  .gitignore              Files excluded from Git
  README.md
```

## Prerequisites

- Node.js 18 or newer
- npm
- A Gemini API key from Google AI Studio, if you want real AI responses
- Google OAuth credentials, only if you want real Google Calendar sync

The app still works without Gemini or Google Calendar because it includes local fallback logic and mock events.

## Environment Variables

Create a backend env file from the example:

```bash
cd server
copy .env.example .env
```

On macOS/Linux:

```bash
cd server
cp .env.example .env
```

Required / useful variables:

```env
PORT=5000
JWT_SECRET=your_jwt_secret_here
CLIENT_URL=http://localhost:5173

DATABASE_URL=file:lifesaver.db
DATABASE_AUTH_TOKEN=

GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash,gemini-2.0-flash
```

Optional Google Calendar variables:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/calendar/callback
```

Frontend API URL is optional. By default the frontend uses `http://localhost:5000/api`.

```env
VITE_API_URL=http://localhost:5000/api
```

## Installation

Install backend dependencies:

```bash
cd server
npm install
```

Install frontend dependencies:

```bash
cd client
npm install
```

## Database Setup

Initialize the local database:

```bash
cd server
npm run db:init
```

Optional: seed demo data:

```bash
cd server
npm run db:seed
```

The local database file is `server/lifesaver.db`. It is ignored by Git.

## Running Locally

Start the backend:

```bash
cd server
npm run dev
```

Backend runs on:

```text
http://localhost:5000
```

Start the frontend in another terminal:

```bash
cd client
npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

## Available Scripts

Backend scripts:

```bash
npm run dev       # Start backend with node --watch
npm start         # Start backend normally
npm run db:init   # Initialize database schema
npm run db:seed   # Seed demo data
```

Frontend scripts:

```bash
npm run dev       # Start Vite dev server
npm run build     # Build production frontend
npm run preview   # Preview production build
npm run lint      # Run ESLint
```

## Main API Routes

Auth:

- `POST /api/auth/register`
- `POST /api/auth/login`

Tasks:

- `GET /api/tasks`
- `POST /api/tasks`
- `POST /api/tasks/batch`
- `PUT /api/tasks/:id`
- `PATCH /api/tasks/:id/complete`
- `DELETE /api/tasks/:id`
- `POST /api/tasks/parse`
- `POST /api/tasks/:id/execute`

AI:

- `GET /api/ai/warplan`
- `POST /api/ai/coach`
- `GET /api/ai/coach/stream`

Calendar:

- `GET /api/calendar/auth`
- `GET /api/calendar/callback`
- `GET /api/calendar/events`
- `POST /api/calendar/disconnect`

Insights:

- `GET /api/insights`

Habits:

- `GET /api/tasks/habits`
- `POST /api/tasks/habits`
- `POST /api/tasks/habits/:id/complete`
- `DELETE /api/tasks/habits/:id`

## Gemini Behavior

The backend calls Gemini through `server/services/claudeService.js`. Despite the filename, this service currently talks to Google Gemini.

If Gemini fails, the app does not crash. It falls back to:

- Local task extraction
- Local war-plan scheduling
- Local coaching messages
- Local task execution simulation

If you see a Gemini 404, check `GEMINI_MODEL`. The current default is:

```env
GEMINI_MODEL=gemini-2.5-flash,gemini-2.0-flash
```

The server tries models in order.

## Google Calendar Behavior

If Google Calendar credentials are not configured, the app uses mock calendar events. This is expected and useful for local development.

To enable real Google Calendar sync:

1. Create OAuth credentials in Google Cloud Console.
2. Add the backend callback URL:

```text
http://localhost:5000/api/calendar/callback
```

3. Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` to `server/.env`.
4. Restart the backend.
5. Use the calendar connect button in the app.

## Secrets and Git

Do not commit real secrets. The project `.gitignore` excludes:

- `.env`
- `.env.*`
- `server/.env`
- `client/.env`
- local database files like `*.db` and `server/lifesaver.db`
- `node_modules`
- build output like `dist`

Keep `.env.example` committed because it documents the required configuration without exposing real keys.

## Troubleshooting

Backend cannot start:

- Run `npm install` inside `server`
- Check `server/.env`
- Run `npm run db:init`

Frontend cannot reach backend:

- Confirm backend is running on `http://localhost:5000`
- Check `VITE_API_URL` if you set it
- Check `CLIENT_URL` in `server/.env`

Coach message shows old overdue counts:

- Refresh the page after code changes
- Confirm the backend is running with the latest code
- Complete the task again from the active task list, not from stale browser state

Google Calendar says not configured:

- Add Google OAuth credentials to `server/.env`
- Restart the backend
- Confirm the redirect URI exactly matches the Google Cloud Console value

Gemini returns errors:

- Confirm `GEMINI_API_KEY` is valid
- Confirm `GEMINI_MODEL` contains available model names
- Restart the backend after changing `.env`

## Production Notes

- Replace the development `JWT_SECRET` with a strong random value
- For a single VPS, SQLite/libSQL is fine if the `server/lifesaver.db` file is stored on persistent disk and the server process has write permission to the `server` directory
- The backend runs `server/db/schema.sql` on startup, so missing tables are created automatically before the API starts
- Use a managed database or Turso/libSQL URL for production if you deploy multiple backend instances, need automated backups, or do not want to manage a database file on the VPS
- Set `CLIENT_URL` to the deployed frontend URL
- Store secrets in the host platform's environment variable manager
- Keep `.env` files out of Git
- Configure Google OAuth redirect URLs for the deployed backend

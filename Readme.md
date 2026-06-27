# ⚡ Last-Minute Life Saver

An AI-powered productivity companion that helps you plan, prioritize, and complete tasks before deadlines are missed.

## What it does

- Paste a messy brain dump → AI extracts and prioritizes your tasks
- Generates a daily action plan based on your deadlines and calendar
- Coaches you in real-time when you fall behind

## Tech Stack

- **Frontend:** React + Tailwind CSS
- **Backend:** Node.js + Express
- **AI:** Claude API (claude-sonnet-4-6)
- **Database:** SQLite

## Getting Started

**1. Clone the repo**
```bash
git clone https://github.com/your-username/last-minute-lifesaver.git
cd last-minute-lifesaver
```

**2. Install dependencies**
```bash
cd server && npm install
cd ../client && npm install
```

**3. Add your API key**
```bash
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env
```

**4. Run the app**
```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm start
```

App runs at `http://localhost:3000`

## Project Structure

```
last-minute-lifesaver/
├── client/       # React frontend
├── server/       # Node.js backend
└── shared/       # Shared prompts and utilities
```

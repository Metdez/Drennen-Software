# Drennen MGMT 305 — Guest Speaker Question Sheet Generator

A private web application for university professors to turn Canvas student submissions into polished, print-ready interview question sheets.

## Setup

### Prerequisites
- Node.js 18+
- A Supabase project
- An xAI API key
- A Vercel account

### Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the environment variables template:
   ```bash
   cp .env.example .env.local
   ```
4. Fill in your actual values in `.env.local` (see Environment Variables below)
5. Apply the database schema:
   ```bash
   npx supabase db push
   ```
   Or copy the SQL from `supabase/migrations/` and run it in the Supabase SQL editor.
6. Start the dev server:
   ```bash
   npm run dev
   ```

### Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `XAI_API_KEY` | Your xAI API key |
| `XAI_BASE_URL` | xAI endpoint (default: https://api.x.ai/v1) |
| `XAI_MODEL` | Model to use (default: grok-4-1-fast-reasoning) |

### Deployment to Vercel

1. Push to GitHub
2. Import the project in Vercel
3. Add all environment variables in Vercel → Settings → Environment Variables
4. Deploy

### Adding New Professor Accounts

This app does not allow self-signup. To add a new user:
1. Go to your Supabase project dashboard
2. Authentication → Users → Invite User
3. Enter the professor's email address

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database + Auth:** Supabase
- **AI:** xAI Grok
- **Hosting:** Vercel
- **PDF Export:** @react-pdf/renderer
- **Word Export:** docx

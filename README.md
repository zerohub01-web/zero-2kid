# ZERO OS Monorepo

## Apps
- apps/web: Next.js 14 + TypeScript public + admin UI
- apps/api: Express + MongoDB API, auth, analytics, automation

## Setup
1. Copy env files:
   - `apps/api/.env.example` -> `apps/api/.env`
   - `apps/web/.env.example` -> `apps/web/.env.local`
2. Fill required values:
   - MongoDB (`MONGODB_URI`)
   - Resend (`RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_NOTIFY_EMAIL`)
   - Frontend API URL (`NEXT_PUBLIC_API_BASE_URL=http://localhost:4000` for local)
3. Install dependencies:
   - `npm install`
4. Run both apps:
   - `npm run dev`
5. Open:
   - Website: `http://localhost:3000`
   - API health: `http://localhost:4000/health`

## Hidden Admin Route
- `http://localhost:3000/zero-control`

## Marketing System Routes
- Landing page: `http://localhost:3000/`
- Lead form: `http://localhost:3000/book`
- Call scheduler: `http://localhost:3000/book-call`
- Blog: `http://localhost:3000/blog`

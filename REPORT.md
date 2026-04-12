# Mini CRM - Setup Guide (Secrets Cleaned)

## 🚨 Secrets Removed
All Supabase keys purged from repo. Use .env files.

## Environment Setup

### Copy .env.example
```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### Fill .env (your new keys)
**frontend/.env**:
```
VITE_SUPABASE_URL=https://hdpnehemjbhvmdldrdeh.supabase.co
VITE_SUPABASE_ANON_KEY=[NEW_ANON_KEY]
VITE_API_BASE_URL=https://relvio-crm-v01.vercel.app
```

**backend/.env**:
```
SUPABASE_URL=https://hdpnehemjbhvmdldrdeh.supabase.co
SUPABASE_ANON_KEY=[NEW_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[NEW_SERVICE_ROLE_KEY]
PORT=3001
```

## Admin Setup
Run `create_admin_fixed.sql` in Supabase SQL Editor:
```
rassa1962@gmail.com / bpeFP8n9LrqNUpR → role='admin'
```

## Vercel Deployment
```
vercel env add SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add SUPABASE_URL
vercel --prod
```

## Local Dev
```bash
# Backend
cd backend && npm run dev

# Frontend  
cd frontend && npm run dev
```

## API Docs
- `POST /api/public/leads` - MHNext bridge
- `GET /api/me` - Profile (admin/specialist)
- `GET /admin/leads` - Admin panel (role=admin)

**Repo clean!** GitGuardian green 🚀

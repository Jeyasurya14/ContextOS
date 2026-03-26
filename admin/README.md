# ContextOS Admin Dashboard

Separate admin dashboard for managing ContextOS users and system operations.

## Features

- **User Management**: View, edit, suspend, and delete users
- **System Analytics**: Monitor usage, integrations, and revenue
- **Integration Management**: View and manage all user integrations
- **Content Moderation**: Monitor queries and reported content
- **System Settings**: Feature flags, rate limits, maintenance mode

## Setup

1. Install dependencies:
```bash
cd admin
npm install
```

2. Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

3. Run development server:
```bash
npm run dev
```

The admin dashboard will be available at `http://localhost:3002`

## Deployment

Deploy to a separate subdomain (e.g., `admin.contextos.com`):

1. Build the application:
```bash
npm run build
```

2. Deploy to Vercel/Netlify with subdomain configuration

## Security

- Admin-only authentication with role-based access
- Separate JWT tokens for admin users
- IP whitelisting recommended for production
- All admin actions are logged

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **State**: Zustand
- **Backend**: Shared FastAPI backend with admin routes

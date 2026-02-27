# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sales System is a comprehensive CRM and sales management platform by Damien Reynaud (French-language UI). Built with Next.js App Router and Supabase, it features a multi-role system (admin, manager, setter, closer, client_b2b, client_b2c) with 88 routes covering: deal pipeline (Kanban), contact management, booking scheduling, contract lifecycle, team management, sales analytics, learning academy, prospecting tools, gamification, community forum, roleplay training, WhatsApp integration, and marketplace.

## Commands

- `npm run dev` — Start Next.js dev server
- `npm run build` — Production build (`next build --webpack`)
- `npm run start` — Start production server
- `npm run lint` — ESLint across the project

## Architecture

### Tech Stack
React 19 + TypeScript 5 + Next.js 16 (App Router) + Tailwind CSS 4 + Supabase (PostgreSQL + Auth + RLS). State: Zustand. Validation: Zod. Charts: Recharts. DnD: @dnd-kit. Flowcharts: @xyflow/react. PDF: @react-pdf/renderer. PWA: next-pwa. Deployed on Vercel.

### Directory Layout
```
src/
  app/
    layout.tsx             # Root layout (fonts, Sonner toasts, lang="fr")
    globals.css            # Theme CSS variables
    (auth)/                # Public auth routes
      login/, register/
    (app)/                 # Protected routes (88 pages)
      layout.tsx           # Server component: fetches user, passes to AppShell
      app-shell.tsx        # Client component: sidebar + mobile nav wrapper
      dashboard/           # Role-specific dashboards
      crm/                 # Deal pipeline (Kanban with dnd-kit)
      contacts/            # Contact database + [id] detail
      bookings/            # Appointment scheduling
      calls/               # Call management
      contracts/           # Contract lifecycle + [id] detail + invoices + payments
      analytics/           # Sales analytics (funnel, attribution, heatmap, projections, sources)
      academy/             # LMS (courses + [courseId] detail + library + revision)
      chat/                # Messaging (video, broadcast, replays)
      community/           # Forum (posts, threads, members, manage)
      prospecting/         # Lead gen (hub, linkedin, instagram, follow-ups, scoring, templates)
      scripts/             # Sales scripts (flowchart, mindmap, present, templates)
      roleplay/            # Training (session/[id], debrief/[id], spectate, profiles)
      challenges/          # Gamification (individual + team)
      whatsapp/            # WhatsApp integration (settings, sequences)
      team/                # Team management + leaderboard
      marketplace/         # Partner extensions
      settings/            # Admin config (ai-modes, branding, onboarding, subscription, voice, white-label)
      inbox/, notifications/, onboarding/, portal/, profile/, referral/, resources/, kpis/
    api/
      push/route.ts        # Web push subscription management
      auth/callback/route.ts  # OAuth code exchange
    book/[slug]/           # Public booking page
  components/
    ui/                    # 24 shadcn/ui components
    layout/                # sidebar, mobile-nav, topbar, page-header
  lib/
    actions/               # 30+ server action files ("use server")
      dashboard.ts, crm.ts, prospecting.ts, analytics.ts, academy.ts, community.ts,
      contracts.ts, payments.ts, automation.ts, gamification.ts, roleplay.ts,
      whatsapp.ts, marketplace.ts, voice.ts, scripts-v2.ts, communication.ts,
      onboarding.ts, referral.ts, notifications.ts, push.ts, inbox.ts,
      health-score.ts, maturity.ts, ai-modes.ts, white-label.ts, hub-setting.ts,
      nps.ts, matching.ts, content.ts, ...
    supabase/
      client.ts            # Browser Supabase client
      server.ts            # Server Supabase client (cookies-based)
      middleware.ts         # Auth + role redirect + onboarding check
    hooks/
      use-user.ts          # Client-side auth state hook (user + profile + loading)
    types/
      database.ts          # 75+ table types, 6 role types, full Database schema
    constants.ts           # NAV_ITEMS (32 items), pipeline stages, gamification levels
    utils.ts               # cn() (clsx + tailwind-merge)
  middleware.ts            # Next.js middleware entry
```

### Key Patterns

**Server actions**: 30+ files in `lib/actions/` using `"use server"` directive. Pattern: create Supabase server client → check auth → query/mutate → `revalidatePath()`. Each action file handles one domain (dashboard, crm, prospecting, etc.).

**Multi-role routing**: Middleware checks auth + profile. Public routes: `/login`, `/register`, `/book`. Clients with incomplete onboarding are forced to `/onboarding`. Role-based nav filtering in `constants.ts` (32 items with `roles` arrays).

**App Shell**: Server layout fetches user profile → passes to client AppShell. Desktop: fixed sidebar (240px, collapsible to 68px). Mobile: bottom navigation. Dark theme sidebar (#14080e).

**Pipeline stages**: Configurable via `pipeline_stages` table. Default 6 stages: Prospect → Contacte → Appel Decouverte → Proposition → Closing → Client Signe. CRM Kanban uses @dnd-kit for drag-drop.

**Gamification**: 5 levels (Debutant → Legende, 0-7000 pts). Challenges, streaks, daily journals, quotas. Tracked in `gamification_profiles` table.

**Sales scripts**: Flowchart editor using @xyflow/react. Mindmap and presentation modes. Templates library.

### Path Alias
`@/*` maps to `./src/*` (configured in `tsconfig.json`). Always use `@/` imports.

### Environment Variables
Defined in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key

### Supabase
- Browser client in `lib/supabase/client.ts`, server client in `lib/supabase/server.ts`
- Session management via middleware
- Schema files: `schema.sql` (20KB), `schema-v2.sql` (42KB), multiple seed files
- 75+ tables covering: deals, contacts, bookings, contracts, courses, channels, messages, community, prospects, gamification, challenges, roleplay, voice, whatsapp, automation, marketplace, affiliates, white_label
- 6 roles: `admin`, `manager`, `setter`, `closer`, `client_b2b`, `client_b2c`

## Conventions

- All UI text is in French (`<html lang="fr">`)
- TypeScript strict mode
- Toast notifications via Sonner (top-right, dark theme #14080e)
- Icons from `lucide-react`
- Fonts: Plus Jakarta Sans (sans) + Playfair Display (serif)
- Theme: dark sidebar (#14080e), accent green (#7af17a), chart colors (green/blue/amber/purple/red)
- `cn()` helper from `lib/utils.ts` for conditional Tailwind classes
- PWA via next-pwa (webpack cache strategy, Supabase storage caching)
- shadcn/ui for all UI primitives (24 components)
- Server actions for all mutations (never mutate from client components directly)

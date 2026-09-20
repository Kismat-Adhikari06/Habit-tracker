# Habit-tracker

A personal habit/activity tracking web app with GitHub contribution-style heatmaps, built with Next.js 16, TypeScript, Tailwind CSS, shadcn/ui, Prisma ORM, and SQLite.

## Features

- Habit cards with contribution-style activity heatmaps (Daily / Weekly / Yearly views)
- Four tracking types: Duration (timer + manual), Distance, Quantity (quick-adds), Boolean
- Per-habit accent colors, Lucide icons, and target-based heatmap intensity
- Activity, habits, and timer sessions persisted to SQLite via Prisma
- Server actions for all mutations

## Setup

```bash
npm install
npx prisma migrate dev   # apply migrations
npm run db:seed          # optional: seed sample habits
npm run dev
```

## Stack

- Next.js (App Router) + React 19
- TypeScript, Tailwind CSS v4, shadcn-style components, Radix UI
- Prisma ORM + SQLite
- Lucide icons

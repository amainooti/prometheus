# CryptoLeads CRM

A manual crypto-native lead research and organization tool. Built with Next.js, Prisma, Supabase, and shadcn/ui.

> **Important:** This app does NOT scrape LinkedIn or automate any profile visits. It is a manual research CRM — it generates search queries you open yourself, and lets you log, score, and track leads manually.

---

## Tech Stack

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** + **shadcn/ui**
- **Prisma** ORM
- **Supabase** (PostgreSQL)
- **TanStack Table** for lead table
- **Zod** for validation

---

## Setup

### 1. Clone and install

```bash
git clone <your-repo>
cd crypto-lead-crm
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free project
2. Go to **Project Settings → Database → Connection string**
3. Copy both the **Transaction** pooler URL and the **Session** pooler URL

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your Supabase connection strings:

```env
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
```

### 4. Push schema to Supabase and seed keywords

```bash
npm run db:generate   # Generate Prisma client
npm run db:push       # Push schema to Supabase (no migration files)
npm run db:seed       # Seed 300+ keywords across 11 categories
```

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run db:push` | Push schema to DB (no migration history) |
| `npm run db:migrate` | Run migrations (production) |
| `npm run db:seed` | Seed keyword library |
| `npm run db:studio` | Open Prisma Studio (GUI for DB) |
| `npm run db:reset` | Reset DB and re-seed |

---

## Workflow

```
Keyword Library → Query Generator → Manual Search → Add Lead → Review → Email Check → Export CSV
```

## Priority Score

| Score | Description |
|---|---|
| **A+** | Founder/investor actively promoting blockchain or crypto |
| **A** | Strong crypto-native builder, educator, analyst, or community voice |
| **B** | Active crypto enthusiast, holder, trader, NFT collector, or DeFi user |
| **C** | Beginner-believer who holds crypto or supports blockchain but posts lightly |
| **D** | Weak or vague crypto interest with no visible activity |

## Email Confidence Score

| Score | Description |
|---|---|
| **High** | Email listed publicly by the person or verified by an email tool |
| **Medium** | Found through reputable database/tool but not personally listed |
| **Low** | Guessed email format or unverified |
| **Do Not Contact** | Unverifiable, private-looking, or unrelated email |
# AI Personal OS

A modern, full-stack personal AI operating system: chat, notes, tasks, calendar, files, and a knowledge base, all in one workspace. Built with Next.js 15, TypeScript, Tailwind, Prisma, and NextAuth.

All 5 planned phases are implemented:

## ✅ Phase 1: Foundation + Auth
- Register, Login, Forgot/Reset Password, protected routes, sessions
- Profile with avatar upload, Settings (theme, language, notifications, API keys, password change)
- Responsive sidebar/topbar shell, working dark mode, real DB-backed dashboard

## ✅ Phase 2: AI Chat
- Multiple conversations (create, rename, delete)
- Streaming responses from OpenAI or Anthropic (whichever you configure in Settings)
- Markdown rendering with syntax-highlighted, copyable code blocks
- Copy message, regenerate last reply, stop generation mid-stream

## ✅ Phase 3: Notes + Task Manager
- Notes: create, edit, delete, search, pin, tags, autosave
- AI actions on notes: summarize, rewrite, translate
- Tasks: Kanban board (To do / In progress / Done), due dates, priority, category
- Subtasks with an AI-generated breakdown, plus a task analytics chart

## ✅ Phase 4: Calendar + File Manager
- Day, week, and month calendar views with an event create/edit panel
- Drag-and-drop rescheduling in month view, optional reminders
- File manager: folders, drag-and-drop upload, previews, search
- AI file summary for text-based files (.txt, .md, .json, etc.)

## ✅ Phase 5: Knowledge Base
- Upload .txt, .md, .pdf, and .docx documents
- Automatic text extraction and chunking (schema is RAG-ready: each chunk has an `embedding` column ready for a real vector search later)
- "Ask your knowledge base" — retrieves the most relevant chunks and generates a cited answer

**Honest scope notes:**
- Knowledge base retrieval uses keyword/token-overlap scoring, not vector embeddings. It's a fully working RAG pipeline (chunk → retrieve → generate) and the `DocumentChunk.embedding` column is already in place — swap `lib/kb/search.ts` for a real embedding-based lookup whenever you're ready, without touching the API or UI.
- AI file summaries only read text-based files directly; PDF/DOCX summarization would need the same extraction pipeline as the Knowledge Base wired in — a natural next step.
- Password reset emails aren't actually sent (see below) — this keeps setup at zero config.
- Avatar/file/knowledge-base uploads are saved to the local filesystem, which works great for local dev but isn't persistent on most serverless hosts — swap in object storage (S3, R2, etc.) before deploying.

## Tech stack

Next.js 15 · React 18 · TypeScript · Tailwind CSS · Prisma ORM · SQLite · NextAuth · Zod · React Hook Form · Framer Motion · Lucide Icons · Recharts · react-markdown · OpenAI SDK · Anthropic SDK · pdf-parse · mammoth

## Getting started

### Prerequisites

- Node.js 18.18+ (Node 20 LTS recommended)
- npm (this project intentionally does not use pnpm or yarn)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Then open `.env` and set `NEXTAUTH_SECRET` to a random string:

```bash
openssl rand -base64 32
```

(On Windows without OpenSSL, any long random string works for local development.)

### 3. Set up the database

```bash
npx prisma generate
npx prisma db push
```

Optional — seed a demo account (`demo@ai-os.dev` / `password123`):

```bash
npm run prisma:seed
```

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Add an AI provider key

To use AI Chat, Notes AI actions, Task breakdown, or the Knowledge Base, sign in, go to **Settings → API keys**, choose OpenAI or Anthropic as your provider, and paste in a key from that provider. Nothing AI-related works without this step — it's the one manual setup item beyond the commands above.

## Folder structure

```
ai-os/
├── app/
│   ├── (auth)/            # login, register, forgot/reset password (public)
│   ├── (dashboard)/       # dashboard, chat, notes, tasks, calendar, files,
│   │                      #   knowledge-base, profile, settings (protected)
│   ├── api/
│   │   ├── auth/          # NextAuth handler, register, forgot/reset password
│   │   ├── user/          # profile, avatar, settings, password
│   │   ├── chats/         # chat CRUD, streaming messages, regenerate
│   │   ├── notes/         # notes CRUD + AI actions
│   │   ├── tasks/         # tasks CRUD, subtasks, AI breakdown
│   │   ├── events/        # calendar CRUD
│   │   ├── folders/       # file manager folders
│   │   ├── files/         # file manager uploads + AI summary
│   │   └── knowledge-base/# document upload + AI search
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── ui/                # Button, Input, Card, Select, Switch, Sheet, etc.
│   ├── layout/            # Sidebar, Topbar, MobileNav, ThemeToggle
│   ├── auth/              # Login/Register/Forgot/Reset forms
│   ├── dashboard/         # Profile form, Settings form
│   ├── chat/              # Chat sidebar, message view, markdown renderer
│   ├── notes/             # Notes workspace
│   ├── tasks/             # Tasks board + task sheet
│   ├── calendar/          # Calendar workspace + event sheet
│   ├── files/             # File manager workspace
│   └── knowledge-base/    # Knowledge base workspace
├── lib/
│   ├── auth.ts             # NextAuth config
│   ├── prisma.ts           # Prisma client singleton
│   ├── mailer.ts           # Pluggable email helper (console-logs in dev)
│   ├── utils.ts
│   ├── validations/        # Zod schemas
│   ├── ai/                 # Provider abstraction (OpenAI/Anthropic), one-shot completion
│   └── kb/                 # Text extraction, chunking, retrieval
├── prisma/
│   ├── schema.prisma        # Full data model for all 5 phases
│   └── seed.ts
├── public/uploads/          # Avatars, file manager uploads, KB documents
├── types/                   # Session + pdf-parse typing
├── middleware.ts            # Route protection
└── .env.example
```

## Password reset in development

No email provider is configured out of the box (keeps setup at zero config). When you request a password reset, the link is printed to your **terminal** (where `npm run dev` is running) instead of being emailed. Copy that link into your browser to test the flow. See `lib/mailer.ts` to wire up a real provider (Resend, SMTP, etc.) later.

## Available commands

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Start the production server (after build) |
| `npm run lint` | Run ESLint |
| `npx prisma studio` | Visual database browser |
| `npx prisma db push` | Sync schema to the SQLite database |
| `npm run prisma:seed` | Seed a demo user |

## Deployment notes

- SQLite is for local development. For production, swap `DATABASE_URL` to a hosted Postgres/MySQL instance and change the `provider` in `prisma/schema.prisma` accordingly, then run `npx prisma migrate deploy`.
- Set `NEXTAUTH_URL` to your production domain and use a strong `NEXTAUTH_SECRET`.
- All uploads (avatars, file manager, knowledge base) currently save to the local filesystem under `public/uploads` — on most serverless hosts (e.g. Vercel) this is not persistent. Swap in an object storage provider (S3, Cloudflare R2, etc.) before deploying.
- API keys are currently stored as plain text per-user in the database for simplicity. For production, encrypt them at rest (e.g. with a library like `@47ng/cloak`) before storing.

## Troubleshooting

**`npx prisma generate` fails or types are missing**
Delete `node_modules/.prisma` and re-run `npx prisma generate`.

**"Invalid `prisma.user.findUnique()` invocation" / table doesn't exist**
Run `npx prisma db push` again — the SQLite file may not have been created yet.

**Styles look unstyled / no Tailwind**
Make sure `npm install` finished successfully and restart `npm run dev`.

**Login redirects back to `/login` immediately**
Check that `NEXTAUTH_SECRET` and `NEXTAUTH_URL` are set correctly in `.env`.

**AI features return "No API key configured"**
Go to Settings → API keys, pick a provider, and paste in a valid key for that provider.

**PDF or DOCX upload to the Knowledge Base fails**
Some PDFs are scanned images with no embedded text layer — `pdf-parse` can only extract real text, not OCR scanned pages.


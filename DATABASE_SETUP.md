# Database Setup Guide

## Current Setup: SQLite (Development)

Database file: `packages/db/prisma/dev.db`

SQLite digunakan untuk development lokal karena MySQL tidak tersedia di Laragon.

## Switching to MySQL (Production)

### Step 1: Update Prisma Schema

Edit `packages/db/prisma/schema.prisma`:

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

### Step 2: Remove MySQL-specific Attributes

Tambahkan kembali `@db.*` attributes yang dihapus untuk SQLite:

```prisma
bio                   String?   @db.Text
accessTokenEncrypted  String?   @map("access_token_encrypted") @db.Text
postText              String?   @map("post_text") @db.Text
permalink             String?   @db.Text
engagementRate        Decimal?  @map("engagement_rate") @db.Decimal(10, 4)
queryString           String    @map("query_string") @db.Text
confidenceScore       Decimal?  @map("confidence_score") @db.Decimal(5, 4)
errorMessage          String?   @map("error_message") @db.Text
```

### Step 3: Update .env

```env
DATABASE_URL="mysql://username:password@hostname:3306/database_name"
```

### Step 4: Run Migration

```bash
# Copy .env to packages/db
cp .env packages/db/.env

# Push schema to MySQL
pnpm run db:push

# Or use migrations (recommended for production)
pnpm run db:migrate
```

## cPanel MySQL Setup

1. Login cPanel → **MySQL Database Wizard**
2. Create database: `username_sinyalapi`
3. Create user dengan password kuat
4. Grant **ALL PRIVILEGES**
5. Copy `DATABASE_URL` dari cPanel ke `.env`
6. Run `pnpm run db:push`

## Available Commands

```bash
# Generate Prisma Client
pnpm run db:generate

# Push schema to database (dev)
pnpm run db:push

# Run migrations (production)
pnpm run db:migrate

# Open Prisma Studio (GUI)
npx prisma studio
```

## Database Tables (11 Total)

| Table | Description |
|---|---|
| `users` | User accounts |
| `workspaces` | Workspaces/organizations |
| `workspace_members` | User-workspace relationships |
| `threads_accounts` | Connected Threads accounts |
| `threads_posts` | Threads posts data |
| `post_metrics` | Post engagement metrics |
| `monitored_keywords` | Saved keyword queries |
| `monitored_competitors` | Saved competitor usernames |
| `post_classifications` | Sentiment/topic classifications |
| `sync_jobs` | Background job queue |
| `audit_logs` | Audit trail |

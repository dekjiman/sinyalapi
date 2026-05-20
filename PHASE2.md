# Phase 2: Owned-Media Dashboard

## Status: ✅ COMPLETED

## Completed Items

### 1. Threads API Service
- [x] **ThreadsApiService** (`services/threads-api.service.ts`)
  - `getAccessToken(accountId)` - Decrypt and validate access token
  - `getAccountsByWorkspace(workspaceId)` - List connected accounts
  - `getProfile(accountId)` - Fetch Threads profile from Meta API
  - `getMediaList(accountId, limit, before, after)` - Fetch posts with pagination
  - `getMediaInsights(accountId, mediaId)` - Fetch per-post insights
  - `refreshProfile(accountId)` - Force refresh profile (clear cache)
  - `refreshMedia(accountId)` - Force refresh media (clear cache)
  - `disconnectAccount(accountId, userId)` - Disconnect and clean up
- [x] Auto-save posts and metrics to database on fetch
- [x] Engagement calculation (likes + replies + quotes + reposts + shares)
- [x] Engagement rate calculation (engagement / followers * 100)
- [x] Token expiry detection and status update
- [x] Redis/in-memory caching (15 min TTL for profile and media)

### 2. Backend Endpoints
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/threads/me/accounts` | List connected accounts for workspace |
| GET | `/api/v1/threads/me/profile` | Get profile data |
| GET | `/api/v1/threads/me/posts` | Get posts with pagination |
| GET | `/api/v1/threads/me/insights/:mediaId` | Get post insights |
| POST | `/api/v1/threads/me/refresh` | Force refresh profile + media |
| GET | `/api/v1/threads/oauth/start` | Start Meta OAuth |
| GET | `/api/v1/threads/oauth/callback` | Handle OAuth callback |
| POST | `/api/v1/threads/disconnect/:accountId` | Disconnect account |

### 3. Frontend Pages
- [x] **Profile Page** (`(dashboard)/profile/page.tsx`)
  - List connected accounts (tab selector)
  - Display profile: avatar, display name, username, account ID
  - Refresh button (rate-limited)
  - Disconnect button with confirmation
  - Connect CTA when no accounts
  - Last synced timestamp
- [x] **Posts Page** (`(dashboard)/posts/page.tsx`)
  - Account selector dropdown
  - Date range filter (from/to)
  - Sortable columns: Views, Likes, Replies, Reposts, Date
  - Engagement total column
  - Post caption with truncate
  - Media type indicator
  - Permalink to open post on Threads
  - Empty state for no posts
  - Source label (Meta Threads API)
- [x] **Competitors Page** (`(dashboard)/competitors/page.tsx`)
  - Search competitor by username
  - Add to watchlist
  - Watchlist table with status
  - Created date display
- [x] **Keywords Page** (`(dashboard)/keywords/page.tsx`)
  - Search keyword/hashtag
  - Save keyword with sync frequency
  - Saved keywords list
  - Sync frequency selector (manual, 6h, daily, weekly)
- [x] **Dashboard Overview** (`(dashboard)/page.tsx`)
  - Stats cards: Connected Accounts, Posts, Keywords, Competitors
  - Get Started CTA when no accounts connected
  - Last updated timestamp

### 4. Data Flow
```
User clicks "Connect Threads Account"
  → Meta OAuth (Phase 1)
  → ThreadsAccount saved in MySQL
  → Profile page shows account
  → Click account → fetch profile from Meta API
  → Cache profile (15 min)
  → Posts page → fetch media list from Meta API
  → Auto-save posts + metrics to MySQL
  → Display sortable table
```

### 5. Caching Strategy
| Data | TTL | Key Pattern |
|---|---|---|
| Profile | 15 min | `threads:profile:{accountId}` |
| Media List | 15 min | `threads:media:{accountId}:{limit}:{before}:{after}` |

### 6. Error Handling
- Token expired → `THREADS_TOKEN_EXPIRED` error
- Account not connected → `BadRequestException`
- API failure → error message from Meta response
- Empty state → "No posts found for this date range"
- No accounts → "Connect a Threads account" CTA

## Files Created/Modified

### Backend
| File | Action |
|---|---|
| `apps/api/src/services/threads-api.service.ts` | Created |
| `apps/api/src/modules/threads/threads.module.ts` | Modified |
| `apps/api/src/modules/threads/threads.controller.ts` | Modified |

### Frontend
| File | Action |
|---|---|
| `apps/web/src/app/(dashboard)/profile/page.tsx` | Created |
| `apps/web/src/app/(dashboard)/posts/page.tsx` | Created |
| `apps/web/src/app/(dashboard)/competitors/page.tsx` | Created |
| `apps/web/src/app/(dashboard)/keywords/page.tsx` | Created |
| `apps/web/src/app/(dashboard)/page.tsx` | Modified |

## Build Status
- ✅ NestJS API builds successfully
- ✅ All TypeScript errors resolved
- ✅ Prisma Client generated

## Next Steps (Phase 3)
1. Implement actual Meta API calls with real credentials
2. Add loading skeletons for better UX
3. Implement pagination UI (prev/next buttons)
4. Add charts for engagement trends
5. Implement sentiment classification (Phase 2 - P2)
6. Add export functionality (Phase 2 - P2)

---

**Last Updated:** 19 Mei 2026
**Status:** Phase 2 Complete - Ready for Phase 3

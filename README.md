# 실버로그 소셜 (silverlog-social)

시니어 입주민을 위한 소셜 행사 매칭 PoC.
Senior living facility social event platform with AI-driven matching.

## Stack

- **Frontend**: Next.js 15 (App Router) + React 19 + Tailwind CSS
- **Backend**: Next.js API routes (serverless), MongoDB (Mongoose)
- **AI**: OpenAI API (`gpt-4o-mini` for matching)
- **Auth**: Phone + SMS OTP, JWT sliding session (access + refresh, rotated)
- **Push**: Firebase Cloud Messaging (via Flutter WebView host app)
- **SMS**: Aligo (알리고) — KR-native low-cost SMS
- **Hosting**: Vercel (`icn1` Seoul region) + MongoDB Atlas (`ap-northeast-2`)
- **Distribution**: Wrapped in existing Joosup Flutter WebView shell

## Quick start

```bash
# 1. Install
pnpm install      # or npm install

# 2. Configure
cp .env.example .env.local
# Fill in MONGODB_URI, JWT secrets, OpenAI key, Firebase, SMS keys

# 3. Seed (dev only)
pnpm seed

# 4. Run
pnpm dev
```

The app runs at http://localhost:3000. SMS codes are printed to the server console
when `SMS_PROVIDER=console` (the default in `.env.example`), so you can log in
without spending SMS credits during development.

## Architecture overview

```
┌──────────────────────────────────┐
│ Flutter WebView (Joosup-style)   │
│  - FCM token registration         │
│  - Camera bridge                  │
│  - Back button handling           │
└──────────────┬───────────────────┘
               │ loads
               ▼
┌──────────────────────────────────┐
│ Next.js App (Vercel icn1)         │
│  ┌─ (auth)   /login, /onboarding  │
│  ├─ (main)   /events, /my-events, │
│  │           /residents, /me      │
│  └─ /api/*   REST + cron          │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│ MongoDB Atlas (Seoul)             │
│  Users · Events · OTPs            │
│  Invitations                      │
└──────────────────────────────────┘
```

## The KEY FEATURE: AI-driven matching

Four trigger modes are wired up:

| Trigger       | Endpoint                                    | When                              |
|---------------|---------------------------------------------|-----------------------------------|
| On-demand     | `GET /api/suggestions`                      | User opens "둘러보기" tab         |
| Cron          | `GET /api/cron/daily-digest`                | KST 09:00 daily (Vercel Cron)     |
| Event-created | `POST /api/events`                          | Broadcast to matching residents   |
| Signup        | `POST /api/events/:id/signup`               | When any user signs up            |

### How it works

1. Each signup runs `deriveTagsFromEvent()` which extracts:
   - Explicit event tags
   - Category (`physical`, `religion`, `hobby`, `food`, `social`)
   - Time bucket (`오전`/`오후`/`저녁`)
   - Day of week (`월요일`...)
   - Title keywords (with Korean particle stripping)
2. These tags are appended to `User.derivedTags` via `$addToSet`.
3. The matcher (`src/lib/match.ts`) does a cheap MongoDB pre-filter for tag
   overlap, then hands the top candidates to GPT-4o-mini for ranking and
   reason generation. If the LLM call fails, we fall back to heuristic
   ranking by tag-overlap count.
4. The signup-triggered notification path (`findResidentsToNotify`) skips
   the LLM entirely — it's a pure heuristic by tag overlap, sorted, top 10.
   This keeps signup latency low and avoids LLM cost on every signup.

### Example: 김영자 signs up for "월요일 아침 요가 모임"

Derived tags added: `요가`, `physical`, `오전`, `월요일`, `초보환영`, `실내`

Notification fires to residents whose `derivedTags` or `interests` overlap.
Above threshold of 0 overlapping tags, ranked by overlap count, top 10 receive push.

## Social invitations

When a resident creates an event, they are walked through an AI-powered invite step
(`/events/:id/invite`) before landing on the event detail page.

### Invite flow

1. **Creator creates event** → broadcast push fires to all residents whose tags/interests
   overlap with the event (fire-and-forget, no extra latency).
2. **Invite page** (`src/lib/invite.ts` → `suggestInviteesForEvent()`) — MongoDB
   pre-filters by tag/category overlap, then GPT-4o-mini ranks the top 10 candidates
   and generates a one-sentence Korean reason per person.
3. **Creator selects residents** and taps "초대하기" →
   `POST /api/events/:id/invitations` creates `Invitation` documents and sends a
   personal FCM push to each invitee: *"○○님의 초대가 도착했어요"*.
4. **Invitee sees the invitation** in the 내 정보 (`/me`) page inbox.
   - **수락** → atomic `$addToSet` onto `Event.attendees` (respects capacity), status → `accepted`
   - **거절** → status → `declined`, removed from inbox

### Invitation model

```
Invitation {
  event:     ObjectId (ref Event)
  fromUser:  ObjectId (ref User)
  toUser:    ObjectId (ref User, indexed)
  status:    'pending' | 'accepted' | 'declined'
}
unique index: (event, toUser)   — prevents duplicate invites
```

## Project structure

```
src/
├── app/
│   ├── (auth)/                  # Public routes — minimal layout
│   │   ├── login/               # Phone + 6-digit OTP, 3-min timer
│   │   └── onboarding/          # 3 steps: interests → allergies → time
│   ├── (main)/                  # Authenticated routes — bottom nav
│   │   ├── events/              # List (open/closed/past tabs)
│   │   ├── events/[id]/         # Detail + signup
│   │   ├── events/new/          # Create form
│   │   ├── my-events/           # User's signups
│   │   ├── residents/           # All residents
│   │   └── me/                  # Profile + logout
│   └── api/
│       ├── auth/                # request-otp, verify-otp, refresh, logout
│       ├── me/                  # profile, onboarding, events, fcm-token
│       ├── events/              # CRUD + signup (KEY FEATURE)
│       ├── residents/
│       ├── suggestions/         # On-demand AI matching
│       └── cron/daily-digest/   # KST 09:00 push digest
├── components/
│   ├── BottomNav.tsx            # 4-tab navigator
│   └── EventCard.tsx
├── lib/
│   ├── db.ts                    # Mongoose singleton (serverless-safe)
│   ├── jwt.ts                   # Access + refresh, sliding rotation
│   ├── auth.ts                  # getSession / requireSession
│   ├── sms.ts                   # Aligo + dev console fallback
│   ├── push.ts                  # FCM with stub mode
│   ├── tags.ts                  # Event → user tag derivation
│   ├── match.ts                 # 3-mode AI matching
│   └── format.ts                # KST date formatting
├── models/
│   ├── User.ts                  # interests, allergies, derivedTags, fcmTokens
│   ├── Event.ts                 # tags, capacity, soft-cancel
│   └── Otp.ts                   # TTL-indexed
└── types/index.ts
```

## Senior UX principles applied

- **Base font 18px, not 16px** — `tailwind.config.ts` overrides defaults
- **56px minimum touch targets** — `min-h-touch` utility, exceeds Apple's 44px
- **High contrast warm palette** — deep green primary on warm off-white, no thin grays
- **No pinch-zoom, but readable defaults** — viewport locked, base size compensates
- **Pretendard variable font** — best Korean web legibility (ss10 hangul feature on)
- **0ms tap delay** — `touch-action: manipulation` globally
- **Generous whitespace** — `leading-relaxed` everywhere, 1.7 line-height base
- **Single-column max-width 28rem** — phone-first, no responsive complexity
- **Korean phone format** — auto-strips formatting, validates `01[016789]\d{7,8}`
- **Confirm dialogs on destructive actions** — `confirm()` before signup cancel / logout

## Deployment

### Vercel
1. Set env vars in dashboard (do NOT commit `.env.local`)
2. Region: `icn1` (Seoul) — set in `vercel.json`
3. Cron is auto-registered from `vercel.json` (Pro plan required for crons)
4. Add `CRON_SECRET` env var; Vercel will send it as `Authorization: Bearer <secret>`

### MongoDB Atlas
- Cluster region: `ap-northeast-2 (Seoul)`
- Whitelist Vercel IPs or use `0.0.0.0/0` for PoC
- Indexes are auto-created from the Mongoose schemas on first connection

### Flutter WebView shell (reuse from Joosup)
- Point WebView URL at `https://silverlog-social.vercel.app`
- Bridge: register FCM token via `POST /api/me/fcm-token`
- Deep links: `silverlog://event/<id>` → handle in Flutter, navigate WebView to `/events/<id>`

## Continuing in Claude Code

Suggested next milestones:

1. **FCM bridge end-to-end** — Add a `useFcmToken()` client hook that posts the
   token from the Flutter WebView channel to `/api/me/fcm-token`.
2. **PWA manifest + iOS Add-to-Home** — fallback for residents without the app.
3. **Admin tools** — port the silverlog-admin pattern; add an admin role to
   `User` and an `/admin` route group for facility staff to manage events.
4. **Event editing & cancellation** — currently only create/list/detail.
5. **Match suggestions tab** — currently the API exists; add a UI that surfaces
   `GET /api/suggestions` results on the home screen.
6. **Better Korean keyword extraction** — the current `extractKeywords` in
   `lib/tags.ts` is a naive particle stripper. Consider a small dictionary or a
   morpheme analyzer (mecab-ko in a separate service) once you see real data.
7. **Rate limiting** — OTP request route has a soft cap; add Redis-backed
   per-IP limiting before launch.
8. **Tests** — none yet. Vitest + supertest against the API routes is the
   highest-value place to start.

## License

Internal — QoL LABS, not for redistribution.

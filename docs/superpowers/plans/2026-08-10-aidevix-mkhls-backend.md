# Aidevix Backend — mkhls Integration Implementation Plan (Stages 3–5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Bunny Stream with mkhls throughout the Aidevix Node backend — a thin mkhls client, two new `Video` fields, a rewritten video controller, and the four data bugs the spec calls out — so that an admin can upload an mp4 through the API and a subscribed user gets a working, token-protected HLS URL back.

**Architecture:** One new module (`backend/utils/mkhls.js`) owns every fact about mkhls: its base URLs, its `{success, data}` envelope, its admin JWT lifecycle, and the `streamPath → id` conversion. Nothing outside that module knows mkhls exists as an HTTP service. Controllers deal only in `streamPath` (`aidevix/{videoId}.mp4`) and the four Aidevix statuses (`pending`/`processing`/`ready`/`failed`). One task is in the sibling `mkhls-streamer` repo, because Plan 2's playback design rests on a per-lesson token guarantee that mkhls does not currently keep.

**Tech Stack:** Node 20+, Express 5, Mongoose 8, axios 1.7 (present), `form-data` (new dependency), Jest 30 + `nock` (new dev dependency), Docker Compose (mkhls + MongoDB), Go 1.22 for Task 1 only.

## Global Constraints

From the spec (`docs/superpowers/specs/2026-08-05-video-streaming-mkhls-design.md`, **rev. 4** — read section 16 first) and the two repos' conventions:

- **Two repos, two commit conventions.** `aidevixBackend` commits end with `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`. **`mkhls-streamer` commits must NOT** — its `CLAUDE.md` forbids Claude attribution in commits and code comments. Task 1 is the only mkhls task; every other task is `aidevixBackend`.
- **Aidevix is mkhls's client, not its clone** (spec §1). No mkhls source enters `aidevixBackend`. The word "Aidevix" must not appear anywhere in mkhls source, tests, config, or commit messages — Task 1's fixture paths use `/vod/lesson-a`, not course names.
- **Branches.** `aidevixBackend`: stay on `docs/spec-video-streaming-rev2` (the name is a legacy misnomer — Plan 1 already committed `docker-compose.dev.yml` and `.gitignore` changes there; the whole effort merges to `main` as one unit). `mkhls-streamer`: stay on `feat/vod-local-pipeline`, never `main`. **Push is disabled** on the mkhls remote — commit locally only, do not add remotes.
- **`utils/mkhls.js` is the only place that knows mkhls's wire format.** No controller may read `res.data.data`, build a `/vod/...` URL, or convert a path to an ID.
- **The backend never writes video bytes to disk** (spec §4) — Railway's disk is ephemeral. Uploads stream through; this is why `knownLength` is mandatory (spec §16.7).
- **Bunny code stays, deprecated, for one release** (spec §16.6): `utils/bunny.js`, `adminController.bulkLinkBunny`, `scripts/link-bunny.js`, and the `bunnyVideoId`/`bunnyStatus` schema fields are annotated, not deleted. `fetch_bunny.html` is stage 8's problem, not this plan's.
- **Commit style:** `feat(scope): ...`, `fix(scope): ...`, `test: ...`, `docs: ...`
- After each mkhls task, append an entry to `mkhls-streamer/claude_usage_log.txt` (changed files, problem/solution, result) — required by its `CLAUDE.md`. This does **not** apply to `aidevixBackend`.
- **Every task ends with a real run against the live containers**, not just green tests. Stages 1–2 found eight serious defects this way and half of them were invisible to unit tests and code review.

## Deltas this plan applies to the spec

Two small things the spec's tables do not cover. Both are decided here; no further approval needed.

1. **`draft` is a sixth mkhls status.** `entity.VideoStatus` has `pending, processing, ready, error, unavailable, draft` (`internal/domain/entity/video.go:16-21`); the spec's §6 map lists five. `draft` maps to `pending`. An **unrecognised** status maps to `processing`, not `failed` — a status we do not know yet means "we cannot tell", and `processing` polls every 30s and self-heals, whereas `failed` tells the user to contact an administrator and never retries.
2. **`checkVideoStatus` keeps mirroring its answer into a legacy `bunnyStatus` key** for one release. The admin panel reads `bunnyStatus` until Plan 3 renames it, and that panel is the tool used to verify this plan by hand.

## File Map

| File | Responsibility | Task |
|---|---|---|
| `mkhls-streamer/pkg/jwt/jwt.go` | `Claims.AllowsPath`; `ValidateStreamToken` delegates to it | 1 |
| `mkhls-streamer/pkg/jwt/jwt_test.go` | Table test for `AllowsPath` | 1 |
| `mkhls-streamer/internal/interfaces/http/middleware/auth.go` | Cached-token fast path re-verifies the path | 1 |
| `mkhls-streamer/internal/interfaces/http/middleware/auth_test.go` | Regression test: cached token on another path | 1 |
| `docker-compose.dev.yml` | Add `mongo` service | 2 |
| `backend/.env` (untracked) | Local secrets, `MONGODB_URI`, `MKHLS_*` | 2 |
| `backend/.env.example` | Document `MKHLS_*`; mark `BUNNY_*` deprecated | 2 |
| `backend/scripts/seed-dev-user.js` | Seed admin + subscribed student + course, print Bearer tokens | 2 |
| `backend/utils/mkhls.js` | The entire mkhls client | 3, 4 |
| `backend/__tests__/unit/mkhls.test.js` | `nock`-based client tests | 3, 4 |
| `backend/scripts/mkhls-smoke.js` | Live client check against the running container | 5 |
| `backend/models/Video.js` | `streamPath`, `streamStatus`, index; deprecate `bunny*` | 6 |
| `backend/controllers/videoController.js` | create / link / upload / status / get / delete | 7, 8, 9, 10 |
| `backend/routes/videoRoutes.js` | `PATCH /:id/link-stream` | 7 |
| `backend/controllers/adminController.js` | `globalSearch` select rename | 10 |
| `backend/__tests__/integration/video.routes.test.js` | `getVideo` across all four mkhls states | 11 |
| `backend/utils/watchProgress.js` | `computeWatchDelta` — pure, unit-testable | 12 |
| `backend/__tests__/unit/watchProgress.test.js` | Delta / clamp / rewind tests | 12 |
| `backend/controllers/enrollmentController.js` | Position contract, delta, first-watch `viewCount` | 12 |

## Task ordering

```
1  mkhls: token cache path fix        (mkhls repo — unblocks the guarantee Task 9 sells)
2  Local harness: Mongo + env + seed  (every later task's manual step needs it)
3  mkhls client: auth core            ─┐
4  mkhls client: media operations     ─┤ 5 needs 3+4
5  Live smoke test of the client      ─┘
1b mkhls: persist probed metadata      (added mid-execution — see below; mkhls repo)
6  Video model fields                  (7-10 all write these fields)
7  createVideo + linkToStream + getCourseVideos leak
8  uploadVideoProxy + checkVideoStatus (needs 4: uploadVideo, startTranscode)
9  getVideo: token, HLS URL, progress  (needs 3: generateStreamToken, buildHlsUrl)
10 deleteVideo + admin search select
11 Controller integration tests        (spec §12; needs 7-10 in place)
12 viewCount + watch-progress delta    (independent of 3-11; can move earlier if blocked)
13 End-to-end verification + whole-branch review
```

Task 12 touches no mkhls code and depends on nothing above it — if any task stalls, it can be pulled forward. Everything else follows the numbering.

Task 13 is not optional paperwork. In stages 1–2 the whole-branch review found a data-loss bug that all nine per-task reviews missed, because every task was individually correct and the defect lived in their interaction.

---

### Task 1: mkhls — the token cache must re-verify the path

**Repo: `mkhls-streamer`, branch `feat/vod-local-pipeline`. No Claude attribution in this commit.**

`StreamAuth` has two paths to "this token is good": full JWT validation, and a 30-second in-memory cache. Full validation checks the token's `path` claim against the request path. **The cache path does not** — it re-checks only the IP:

```go
// internal/interfaces/http/middleware/auth.go:125-142
if cfg.TokenCache != nil {
    if cached := cfg.TokenCache.Get(token); cached != nil {
        if cached.IP == "" || cached.IP == clientIP {   // ← path never re-checked
            ...
            c.Next()
            return
        }
    }
}
```

The cache is live (`app.go:597`, TTL 30s, 10k entries). Spec §3 deliberately leaves `client_ip` empty so mobile users don't lose the player on an IP change, which makes `cached.IP == ""` always true. Net effect: **a subscriber's own token for lesson A opens lesson B for the next 30 seconds.** That voids spec §10.3 and the `allowed_path` restriction Task 9 depends on.

Note the existing IP branch *falls through* to full validation on mismatch rather than rejecting — that is the established pattern here and the fix keeps it: a path mismatch simply doesn't take the fast path, and full validation produces the correct 403.

`pathMatches` is unexported in package `jwt` and the middleware lives in package `middleware`, so the check needs an exported entry point. A method on `Claims` is the right one: it puts "does this token allow this path" next to the claim it interrogates, and both call sites then share one implementation.

**Files:**
- Modify: `pkg/jwt/jwt.go` (add `AllowsPath`, use it in `ValidateStreamToken`)
- Modify: `pkg/jwt/jwt_test.go` (add `TestClaimsAllowsPath`)
- Modify: `internal/interfaces/http/middleware/auth.go:125-142`
- Modify: `internal/interfaces/http/middleware/auth_test.go` (add regression test)
- Modify: `claude_usage_log.txt`

**Interfaces:**
- Consumes: nothing
- Produces: `func (c *Claims) AllowsPath(requestPath string) bool` in `pkg/jwt`. Nothing in `aidevixBackend` calls it; Task 9 relies on the behaviour it restores.

- [ ] **Step 1: Write the failing middleware test**

Append to `internal/interfaces/http/middleware/auth_test.go`. It is modelled on `TestStreamAuth_BlockedCachedToken` (line 780) — same two-request shape, because the first request is what populates the cache.

```go
func TestStreamAuth_CachedTokenRejectedOnOtherPath(t *testing.T) {
	jwtMgr := createTestJWTManager()
	tokenCache := NewTokenCache(30*time.Second, 100)
	defer tokenCache.Stop()

	cfg := DefaultAuthConfig(jwtMgr)
	cfg.TokenCache = tokenCache
	log := createTestLogger()

	// No client IP: the deployment deliberately leaves it empty, which is
	// exactly the case where the cache had nothing left to check.
	token, _, err := jwtMgr.GenerateStreamToken("/vod/lesson-a", "", time.Hour)
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	ok := func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) }
	router := gin.New()
	router.Use(StreamAuth(cfg, log))
	router.GET("/vod/lesson-a", ok)
	router.GET("/vod/lesson-b", ok)

	// First request: legitimate, and it seeds the token cache.
	req := httptest.NewRequest(http.MethodGet, "/vod/lesson-a?token="+token, nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("First request status = %v, want %v", w.Code, http.StatusOK)
	}

	// Same token, a video it was never issued for.
	req2 := httptest.NewRequest(http.MethodGet, "/vod/lesson-b?token="+token, nil)
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)
	if w2.Code != http.StatusForbidden {
		t.Errorf("Status = %v, want %v (cached token reused on another path)", w2.Code, http.StatusForbidden)
	}
}
```

- [ ] **Step 2: Run it and watch it fail**

```bash
cd mkhls-streamer
go test ./internal/interfaces/http/middleware/ -run TestStreamAuth_CachedTokenRejectedOnOtherPath -v
```

Expected: FAIL — `Status = 200, want 403`. A 403 here means the cache was not populated by the first request; check that `cfg.TokenCache` was actually assigned before debugging anything else.

- [ ] **Step 3: Add `AllowsPath` to `pkg/jwt/jwt.go`**

Place it directly below `pathMatches`:

```go
// AllowsPath reports whether these claims permit access to requestPath.
// A token carrying no path restriction allows every path.
//
// Both the full validation path and the token cache's fast path must ask
// this question; a fast path that skips it hands one resource's token
// authority over every other resource for the cache's lifetime.
func (c *Claims) AllowsPath(requestPath string) bool {
	return c.Path == "" || pathMatches(c.Path, requestPath)
}
```

- [ ] **Step 4: Add the table test for it**

Append to `pkg/jwt/jwt_test.go`, next to the existing `TestPathMatches` (line 319):

```go
func TestClaimsAllowsPath(t *testing.T) {
	tests := []struct {
		name        string
		tokenPath   string
		requestPath string
		want        bool
	}{
		{"unrestricted token allows anything", "", "/vod/ns/a.mp4/master.m3u8", true},
		{"exact match", "/vod/ns/a.mp4", "/vod/ns/a.mp4", true},
		{"segment below the allowed prefix", "/vod/ns/a.mp4", "/vod/ns/a.mp4/720p/seg_1.ts", true},
		{"sibling sharing a string prefix", "/vod/ns/a.mp4", "/vod/ns/a.mp4x/master.m3u8", false},
		{"a different video", "/vod/ns/a.mp4", "/vod/ns/b.mp4/master.m3u8", false},
		{"request path shorter than the grant", "/vod/ns/a.mp4", "/vod/ns", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := &Claims{Path: tt.tokenPath}
			if got := c.AllowsPath(tt.requestPath); got != tt.want {
				t.Errorf("AllowsPath(%q) with token path %q = %v, want %v",
					tt.requestPath, tt.tokenPath, got, tt.want)
			}
		})
	}
}
```

- [ ] **Step 5: Route `ValidateStreamToken` through it**

In `pkg/jwt/jwt.go`, replace the inline path check inside `ValidateStreamToken`:

```go
	// Validate path if specified
	if !claims.AllowsPath(requestPath) {
		return nil, fmt.Errorf("path mismatch: token not valid for this path")
	}
```

- [ ] **Step 6: Fix the cached fast path**

In `internal/interfaces/http/middleware/auth.go`, replace the condition at line ~127:

```go
		if cfg.TokenCache != nil {
			if cached := cfg.TokenCache.Get(token); cached != nil {
				// The fast path must apply every check full validation
				// applies. Re-verifying the IP but not the path let one
				// resource's token open any other for the cache TTL — and
				// with client_ip left empty (the normal deployment), the IP
				// check waves everything through. A mismatch here falls
				// through to full validation, which rejects it properly.
				ipOK := cached.IP == "" || cached.IP == clientIP
				if ipOK && cached.AllowsPath(requestPath) {
					// Check blacklist even for cached tokens
					if cfg.Blacklist != nil && cfg.Blacklist.IsBlocked(token, cached.UserID) {
```

Everything inside the block is unchanged — only the `if` condition and the comment above it.

- [ ] **Step 7: Run both suites**

```bash
go test ./pkg/jwt/... ./internal/interfaces/http/middleware/... -v
```

Expected: PASS, including the two new tests. `TestStreamAuth_ValidToken`, `TestStreamAuth_InvalidPath` and `TestStreamAuth_BlockedCachedToken` must still pass — if `TestStreamAuth_ValidToken` breaks, `AllowsPath` is rejecting an exact match and the bug is in the `c.Path == ""` short-circuit.

- [ ] **Step 8: Run the full test suite**

```bash
go test ./...
```

Expected: PASS. This is a change to a shared auth helper; a failure anywhere else is a real signal, not noise.

- [ ] **Step 9: Verify against the running container**

```bash
cd ../aidevixBackend
docker compose -f docker-compose.dev.yml up -d --build mkhls

TOKEN=$(curl -sS -X POST http://localhost:8080/admin/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

STREAM=$(curl -sS -X POST http://localhost:8080/admin/tokens/stream \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"allowed_path":"/vod/lesson-a","expires_in":3600}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Populate the cache with a legitimate request, then immediately try another path.
curl -s -o /dev/null -w 'first(lesson-a): %{http_code}\n'  "http://localhost:8080/vod/lesson-a/master.m3u8?token=$STREAM"
curl -s -o /dev/null -w 'second(lesson-b): %{http_code}\n' "http://localhost:8080/vod/lesson-b/master.m3u8?token=$STREAM"
```

Expected: the second line is **403**. (The first may be 404 — no such video exists — which still populates the cache, because auth runs before the handler.) Before this fix the second line was 404 or 200, i.e. it got past auth.

- [ ] **Step 10: Log and commit**

Append to `claude_usage_log.txt` in the existing format: files changed, the problem (cached fast path skipped the path check), the fix (`Claims.AllowsPath`, shared by both paths), the result (test + container verification).

```bash
cd ../mkhls-streamer
git add pkg/jwt/jwt.go pkg/jwt/jwt_test.go \
        internal/interfaces/http/middleware/auth.go \
        internal/interfaces/http/middleware/auth_test.go \
        claude_usage_log.txt
git commit -m "fix(auth): re-verify the path on the cached token fast path

The token cache short-circuited stream auth after checking only the client
IP, so a token issued for one path was accepted for any path for the cache
TTL. Deployments that leave client_ip empty had no remaining check at all.

Claims.AllowsPath now carries the rule and both the full validation and the
cache fast path call it. A mismatch falls through to full validation rather
than rejecting inline, matching how the existing IP check behaves."
```

No `Co-Authored-By` trailer in this repo.

---

### Task 2: Local harness — MongoDB, environment, seed data

Every remaining task's manual verification runs the Node backend against a real MongoDB and the real mkhls container. Without this the plan degrades into mock-only testing, which is precisely what missed half of stages 1–2's defects.

There is one non-obvious trap: `GET /api/videos/:id` runs through `checkSubscriptions`, and `performSubscriptionCheck` (`utils/checkSubscriptions.js:25`) leaves `instagramSubscribed = false` when the user has **no Instagram username at all**. A freshly created user therefore gets a 403 that looks like a bug in Task 9. The seed script sets both social subscriptions explicitly.

**Files:**
- Modify: `docker-compose.dev.yml` (add `mongo` service + named volume)
- Create: `backend/.env` (untracked — `.gitignore` already covers `.env`)
- Modify: `backend/.env.example`
- Create: `backend/scripts/seed-dev-user.js`

**Interfaces:**
- Consumes: nothing
- Produces: a MongoDB at `mongodb://localhost:27017/aidevix_dev`; `npm run dev` serving on `:5000`; and `node scripts/seed-dev-user.js` printing `ADMIN_TOKEN`, `USER_TOKEN` and `COURSE_ID` for use in every later manual step.

- [ ] **Step 1: Add MongoDB to the compose file**

Append to `docker-compose.dev.yml` (a sibling of the existing `mkhls` service), then add the `volumes:` block at the end of the file:

```yaml
  # Local database for the Aidevix backend. The backend itself runs on the
  # host (npm run dev) so it stays debuggable; only its dependencies are
  # containerised.
  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      # A named volume, not a bind mount: WiredTiger needs POSIX file locking
      # semantics that Windows bind mounts do not provide, and it fails at
      # startup on them.
      - mongo-data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--quiet", "--eval", "db.adminCommand('ping').ok"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  mongo-data:
```

- [ ] **Step 2: Bring it up and confirm both services are healthy**

```bash
cd aidevixBackend
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml ps
```

Expected: both `mkhls` and `mongo` show `healthy`. If mongo restarts in a loop, read its logs — that is the bind-mount failure the comment warns about, and the named volume is the fix.

- [ ] **Step 3: Create `backend/.env`**

Not tracked by git (`.gitignore` line `.env`). The four JWT secrets must be **distinct** — `config/jwt.js:50` refuses to boot otherwise.

```bash
cat > backend/.env <<'EOF'
PORT=5000
NODE_ENV=development
HOST=0.0.0.0
FRONTEND_URL=http://localhost:3000

MONGODB_URI=mongodb://localhost:27017/aidevix_dev

ACCESS_TOKEN_SECRET=dev-access-secret-unique-value-min-32-characters-long
REFRESH_TOKEN_SECRET=dev-refresh-secret-unique-value-min-32-characters-long
RESET_TOKEN_SECRET=dev-reset-secret-unique-value-min-32-characters-long!!
CSRF_SECRET=dev-csrf-secret-unique-value-min-32-characters-long!!!!
ACCESS_TOKEN_EXPIRE=15m
REFRESH_TOKEN_EXPIRE=7d

# mkhls-streamer (docker-compose.dev.yml)
MKHLS_BASE_URL=http://localhost:8080
MKHLS_PUBLIC_URL=http://localhost:8080
MKHLS_ADMIN_USERNAME=admin
MKHLS_ADMIN_PASSWORD=admin123
MKHLS_NAMESPACE=aidevix
MKHLS_STREAM_TOKEN_TTL=14400
# Must mirror the container's MKHLS_VOD_TRANSCODE_ON_UPLOAD. When true the
# backend does not queue a transcode itself (mkhls already did).
MKHLS_TRANSCODE_ON_UPLOAD=false

# Disable outbound integrations locally
NEWS_ENABLED=false
CHALLENGE_SCHEDULER_ENABLED=false
HIBP_ENABLED=false
TELEGRAM_BOT_TOKEN=
EOF
```

- [ ] **Step 4: Document the new variables in `.env.example`**

Insert directly above the existing `# ─── Bunny.net — VIDEO ...` block (line 62):

```bash
# ─── mkhls-streamer — VIDEO (HLS, backend mkhls.js bilan) ─────────────────────
# Aidevix mkhls'ning MIJOZI: video fayllar mkhls instance'ida turadi, uning
# admin API'si orqali yuklanadi va token bilan himoyalangan HLS sifatida
# tarqatiladi. Lokal muhit: docker-compose.dev.yml
#
# BASE_URL   — backend ↔ mkhls (prod'da ichki tarmoq)
# PUBLIC_URL — brauzer ko'radigan manzil (prod: https://stream.aidevix.uz)
MKHLS_BASE_URL=http://localhost:8080
MKHLS_PUBLIC_URL=http://localhost:8080
MKHLS_ADMIN_USERNAME=admin
MKHLS_ADMIN_PASSWORD=PASTE_MKHLS_ADMIN_PASSWORD_HERE
# Barcha video yo'llari shu namespace ostida: aidevix/{videoId}.mp4
MKHLS_NAMESPACE=aidevix
# Stream token muddati (soniya). 4 soat — eng uzun darsdan uzun.
MKHLS_STREAM_TOKEN_TTL=14400
# mkhls'ning vod.transcode_on_upload sozlamasi bilan BIR XIL bo'lishi kerak.
# true bo'lsa backend transcode'ni o'zi navbatga qo'ymaydi.
MKHLS_TRANSCODE_ON_UPLOAD=false
```

And mark the Bunny block deprecated by changing its header line to:

```bash
# ─── Bunny.net — VIDEO (DEPRECATED, mkhls bilan almashtirildi) ────────────────
# Bir reliz saqlanadi: eski videolarda hali bunnyVideoId bor. Yangi videolar
# MKHLS_* orqali ishlaydi. Keyingi relizda migration bilan o'chiriladi.
```

- [ ] **Step 5: Write the seed script**

Create `backend/scripts/seed-dev-user.js`:

```js
/**
 * Local development seed: one admin, one fully-subscribed student, one course.
 *
 * Prints ready-to-paste Bearer tokens. Bearer auth is accepted outside
 * production (middleware/auth.js) and requests without an auth cookie skip
 * CSRF entirely (middleware/csrfProtection.js), so curl needs nothing else.
 *
 * Usage: node scripts/seed-dev-user.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Course = require('../models/Course');
const { generateAccessToken } = require('../utils/jwt');

const SUBSCRIBED = {
  // performSubscriptionCheck leaves instagramSubscribed=false when username
  // is null, so a user with no Instagram handle is blocked from every video.
  instagram: { subscribed: true, username: 'dev_local', verifiedAt: new Date() },
  telegram: { subscribed: true, username: 'dev_local', verifiedAt: new Date() },
};

const upsertUser = async (email, username, role) => {
  const existing = await User.findOne({ email });
  if (existing) {
    existing.role = role;
    existing.isActive = true;
    existing.socialSubscriptions = SUBSCRIBED;
    await existing.save();
    return existing;
  }
  return User.create({
    username,
    email,
    password: 'DevPassword123!',
    role,
    isActive: true,
    socialSubscriptions: SUBSCRIBED,
  });
};

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const admin = await upsertUser('admin@dev.local', 'devadmin', 'admin');
  const student = await upsertUser('student@dev.local', 'devstudent', 'user');

  let course = await Course.findOne({ title: 'Dev — mkhls sinov kursi' });
  if (!course) {
    course = await Course.create({
      title: 'Dev — mkhls sinov kursi',
      description: 'Lokal video oqim tekshiruvi uchun.',
      price: 0,
      instructor: admin._id,
      category: 'general',
    });
  }

  console.log('ADMIN_TOKEN=' + generateAccessToken(admin));
  console.log('USER_TOKEN=' + generateAccessToken(student));
  console.log('COURSE_ID=' + course._id);

  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 6: Check `generateAccessToken`'s real signature before running**

```bash
grep -n "generateAccessToken" backend/utils/jwt.js
```

The script above assumes `generateAccessToken(userDocument)`. If it takes `(userId, tokenVersion)` or returns an object, adapt the two call sites — do not guess, and do not change `utils/jwt.js` to fit the script.

- [ ] **Step 7: Run the backend and the seed**

```bash
cd backend
npm run dev          # leave running in one terminal
```

In a second terminal:

```bash
cd backend
node scripts/seed-dev-user.js
curl -sS http://localhost:5000/health
```

Expected: three `NAME=value` lines from the seed, and a 200 JSON body from `/health`. Save the three values — every later manual step uses them.

- [ ] **Step 8: Confirm the seeded user actually passes the subscription gate**

```bash
curl -sS http://localhost:5000/api/videos/course/$COURSE_ID
```

Expected: `{"success":true,"data":{"videos":[],"count":0}}`. This endpoint needs no auth; it confirms the DB connection and the course exist. The subscription gate itself gets exercised for real in Task 9.

- [ ] **Step 9: Commit**

```bash
cd ..
git add docker-compose.dev.yml backend/.env.example backend/scripts/seed-dev-user.js
git commit -m "feat(dev): add local MongoDB and dev seed for the mkhls work

Plan 2's per-task verification runs the backend against a real database and
the real mkhls container, so the compose file gains mongo (named volume —
WiredTiger cannot start on a Windows bind mount) and a seed script.

The seed sets both social subscriptions explicitly: performSubscriptionCheck
treats a user with no Instagram username as unsubscribed, which would have
made every video request 403 and looked like a bug in the controller.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

`backend/.env` is intentionally not committed.

---

### Task 3: mkhls client — auth core, envelope, path rules

The half of `utils/mkhls.js` that has nothing to do with a specific video: configuration, the `{success, data}` envelope, the admin JWT lifecycle, path↔ID conversion, status mapping, and the two token/URL helpers Task 9 needs.

Three facts drive the design (spec §16):

- Every admin response is `{"success": true, "data": …}`; errors are `{"success": false, "error": {"code", "message"}}`. One `unwrap` at the boundary.
- `GET`/`DELETE /admin/videos/{id}` do **not** normalise the ID (only the transcode endpoint does), so `pathToId` is mandatory on every call, not a convenience.
- Environment variables are read **per call**, not at module load. Jest's `setup.js` runs before test files, and reading env at import time would freeze whatever was set at `require()` and make the tests order-dependent.

**Files:**
- Create: `backend/utils/mkhls.js`
- Create: `backend/__tests__/unit/mkhls.test.js`
- Modify: `backend/package.json` (add `form-data`, `nock`)

**Interfaces:**
- Consumes: nothing
- Produces, from `backend/utils/mkhls.js`:
  - `MkhlsError` — `Error` subclass with `.code` (string) and `.status` (number|undefined)
  - `pathToId(streamPath: string): string`
  - `buildStreamPath(videoId: string): string` → `"aidevix/{videoId}.mp4"`
  - `getAdminToken(opts?: {force?: boolean}): Promise<string>`
  - `parseStreamStatus(mkhlsStatus: string): 'pending'|'processing'|'ready'|'failed'`
  - `buildHlsUrl(streamPath: string, token: string): string`
  - `generateStreamToken(streamPath: string, ttlSeconds?: number): Promise<{token: string, expiresAt: Date}>`
  - `_resetAuthCache(): void` — tests only
  - Internal, used by Task 4: `authedRequest(config, opts?)`, `authedData(config)`

- [ ] **Step 1: Install the two dependencies**

```bash
cd backend
npm install form-data
npm install --save-dev nock
```

Expected: `form-data` under `dependencies`, `nock` under `devDependencies` in `package.json`.

- [ ] **Step 2: Write the failing tests**

Create `backend/__tests__/unit/mkhls.test.js`:

```js
const nock = require('nock');

const BASE = 'http://mkhls.test';

// Env is read per call inside the client, so setting it here is enough.
process.env.MKHLS_BASE_URL = BASE;
process.env.MKHLS_PUBLIC_URL = 'https://stream.example.test';
process.env.MKHLS_ADMIN_USERNAME = 'admin';
process.env.MKHLS_ADMIN_PASSWORD = 'admin123';
process.env.MKHLS_NAMESPACE = 'aidevix';
process.env.MKHLS_STREAM_TOKEN_TTL = '14400';

const mkhls = require('../../utils/mkhls');

// A login reply whose token expires an hour out.
const loginReply = (token = 'jwt-1') => ({
  success: true,
  data: {
    token,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: '1', username: 'admin', role: 'admin' },
  },
});

beforeEach(() => {
  mkhls._resetAuthCache();
  nock.cleanAll();
});

afterAll(() => {
  nock.restore();
});

describe('pathToId', () => {
  it('collapses separators the way mkhls NormalizeVideoID does', () => {
    expect(mkhls.pathToId('aidevix/68f.mp4')).toBe('aidevix_68f.mp4');
    expect(mkhls.pathToId('a/b/c.mp4')).toBe('a_b_c.mp4');
  });

  it('leaves a flat filename alone', () => {
    expect(mkhls.pathToId('movie.mp4')).toBe('movie.mp4');
  });

  it('normalises leading, trailing and doubled separators', () => {
    expect(mkhls.pathToId('/aidevix//68f.mp4/')).toBe('aidevix_68f.mp4');
    expect(mkhls.pathToId('aidevix\\68f.mp4')).toBe('aidevix_68f.mp4');
  });

  it('refuses traversal segments instead of silently cleaning them', () => {
    expect(() => mkhls.pathToId('aidevix/../etc/passwd')).toThrow(/unsafe/);
  });

  it('refuses an empty path', () => {
    expect(() => mkhls.pathToId('')).toThrow(/required/);
  });
});

describe('buildStreamPath', () => {
  it('places the video under the configured namespace', () => {
    expect(mkhls.buildStreamPath('68f0011223344556677889900')).toBe(
      'aidevix/68f0011223344556677889900.mp4'
    );
  });
});

describe('parseStreamStatus', () => {
  it('maps every mkhls status the entity defines', () => {
    expect(mkhls.parseStreamStatus('pending')).toBe('pending');
    expect(mkhls.parseStreamStatus('draft')).toBe('pending');
    expect(mkhls.parseStreamStatus('processing')).toBe('processing');
    expect(mkhls.parseStreamStatus('ready')).toBe('ready');
    expect(mkhls.parseStreamStatus('error')).toBe('failed');
    expect(mkhls.parseStreamStatus('unavailable')).toBe('failed');
  });

  it('treats an unknown status as still processing, not failed', () => {
    // A status we do not recognise means "we cannot tell". processing polls
    // and self-heals; failed tells the user to contact an administrator.
    expect(mkhls.parseStreamStatus('queued')).toBe('processing');
  });
});

describe('buildHlsUrl', () => {
  it('uses the public URL and encodes the token', () => {
    expect(mkhls.buildHlsUrl('aidevix/68f.mp4', 'a+b/c')).toBe(
      'https://stream.example.test/vod/aidevix/68f.mp4/master.m3u8?token=a%2Bb%2Fc'
    );
  });
});

describe('getAdminToken', () => {
  it('logs in once and reuses the cached token', async () => {
    const scope = nock(BASE).post('/admin/login').once().reply(200, loginReply('jwt-1'));

    expect(await mkhls.getAdminToken()).toBe('jwt-1');
    expect(await mkhls.getAdminToken()).toBe('jwt-1');
    expect(scope.isDone()).toBe(true);
  });

  it('re-logs in when the cached token is inside the 60s expiry margin', async () => {
    nock(BASE)
      .post('/admin/login')
      .reply(200, {
        success: true,
        data: { token: 'about-to-expire', expires_at: Math.floor(Date.now() / 1000) + 30 },
      });
    expect(await mkhls.getAdminToken()).toBe('about-to-expire');

    nock(BASE).post('/admin/login').reply(200, loginReply('fresh'));
    expect(await mkhls.getAdminToken()).toBe('fresh');
  });

  it('surfaces a rejected login as a MkhlsError with the mkhls code', async () => {
    nock(BASE)
      .post('/admin/login')
      .reply(401, { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'nope' } });

    await expect(mkhls.getAdminToken()).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });
});

describe('generateStreamToken', () => {
  it('requests a path-scoped token and returns an absolute expiry', async () => {
    const expires = Math.floor(Date.now() / 1000) + 14400;
    nock(BASE).post('/admin/login').reply(200, loginReply());
    nock(BASE)
      .post('/admin/tokens/stream', {
        allowed_path: '/vod/aidevix/68f.mp4',
        client_ip: '',
        expires_in: 14400,
      })
      .matchHeader('authorization', 'Bearer jwt-1')
      .reply(200, { success: true, data: { token: 'stream-tok', expires_at: expires } });

    const result = await mkhls.generateStreamToken('aidevix/68f.mp4');
    expect(result.token).toBe('stream-tok');
    expect(result.expiresAt.getTime()).toBe(expires * 1000);
  });

  it('re-authenticates once on 401 and retries', async () => {
    nock(BASE).post('/admin/login').reply(200, loginReply('stale'));
    nock(BASE)
      .post('/admin/tokens/stream')
      .matchHeader('authorization', 'Bearer stale')
      .reply(401, { success: false, error: { code: 'UNAUTHORIZED', message: 'expired' } });
    nock(BASE).post('/admin/login').reply(200, loginReply('renewed'));
    nock(BASE)
      .post('/admin/tokens/stream')
      .matchHeader('authorization', 'Bearer renewed')
      .reply(200, { success: true, data: { token: 'stream-tok', expires_at: 1 } });

    await expect(mkhls.generateStreamToken('aidevix/68f.mp4')).resolves.toMatchObject({
      token: 'stream-tok',
    });
  });

  it('gives up after one retry rather than looping on 401', async () => {
    nock(BASE).post('/admin/login').twice().reply(200, loginReply());
    nock(BASE)
      .post('/admin/tokens/stream')
      .twice()
      .reply(401, { success: false, error: { code: 'UNAUTHORIZED', message: 'expired' } });

    await expect(mkhls.generateStreamToken('aidevix/68f.mp4')).rejects.toMatchObject({
      status: 401,
    });
  });

  it('reports an unreachable mkhls with a distinct code', async () => {
    nock(BASE).post('/admin/login').replyWithError({ code: 'ECONNREFUSED' });

    await expect(mkhls.generateStreamToken('aidevix/68f.mp4')).rejects.toMatchObject({
      code: 'UNREACHABLE',
    });
  });
});
```

- [ ] **Step 3: Run them and watch them fail**

```bash
cd backend
npx jest __tests__/unit/mkhls.test.js
```

Expected: FAIL — `Cannot find module '../../utils/mkhls'`.

- [ ] **Step 4: Write the client core**

Create `backend/utils/mkhls.js`:

```js
/**
 * mkhls-streamer client.
 *
 * Aidevix is a CONSUMER of mkhls, not a fork of it: this module is the only
 * place that knows mkhls speaks HTTP, wraps everything in {success, data},
 * or identifies videos by an underscore-collapsed ID. Callers deal only in
 * streamPath ("aidevix/{videoId}.mp4") and the four Aidevix statuses.
 */
const axios = require('axios');

// Read env per call, never at import time: jest's setup.js runs before test
// files, and freezing config at require() makes tests order-dependent.
const BASE_URL   = () => (process.env.MKHLS_BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');
const PUBLIC_URL = () => (process.env.MKHLS_PUBLIC_URL || BASE_URL()).replace(/\/+$/, '');
const NAMESPACE  = () => process.env.MKHLS_NAMESPACE || 'aidevix';
const TOKEN_TTL  = () => Number(process.env.MKHLS_STREAM_TOKEN_TTL || 14400);

const REQUEST_TIMEOUT_MS = 15000;
// Re-login this long before the JWT actually expires, so a request never
// leaves with a token that dies in flight.
const TOKEN_EXPIRY_MARGIN_MS = 60000;

class MkhlsError extends Error {
  constructor(message, { code = 'REQUEST_FAILED', status } = {}) {
    super(message);
    this.name = 'MkhlsError';
    this.code = code;
    this.status = status;
  }
}

// ─── Path and status rules ───────────────────────────────────────────────────

/**
 * streamPath → mkhls video ID, mirroring entity.NormalizeVideoID.
 *
 * mkhls applies this itself on the transcode endpoint but NOT on GET or
 * DELETE /admin/videos/{id}, so the client must apply it on every call.
 */
const pathToId = (streamPath) => {
  const raw = String(streamPath || '').replace(/\\/g, '/');
  if (!raw.trim()) throw new MkhlsError('mkhls: streamPath required', { code: 'INVALID_PATH' });
  if (raw.split('/').some((seg) => seg === '..' || seg === '.')) {
    // mkhls's path.Clean would resolve these silently. Our paths are always
    // generated, never user-supplied, so a traversal segment means a bug.
    throw new MkhlsError(`mkhls: unsafe streamPath: ${raw}`, { code: 'INVALID_PATH' });
  }
  return raw.replace(/^\/+/, '').replace(/\/+$/, '').replace(/\/+/g, '_');
};

const buildStreamPath = (videoId) => `${NAMESPACE()}/${videoId}.mp4`;

const STATUS_MAP = {
  pending: 'pending',
  draft: 'pending',
  processing: 'processing',
  ready: 'ready',
  error: 'failed',
  unavailable: 'failed',
};

/**
 * mkhls status → Aidevix streamStatus.
 *
 * An unrecognised status maps to 'processing', not 'failed': it means "we
 * cannot tell yet". 'processing' keeps the 30s poll running and recovers on
 * its own; 'failed' tells the viewer to contact an administrator and stops.
 */
const parseStreamStatus = (mkhlsStatus) => {
  const mapped = STATUS_MAP[mkhlsStatus];
  if (mapped) return mapped;
  console.warn(`[mkhls] unknown video status: ${mkhlsStatus} — treating as processing`);
  return 'processing';
};

const buildHlsUrl = (streamPath, token) =>
  `${PUBLIC_URL()}/vod/${streamPath}/master.m3u8?token=${encodeURIComponent(token)}`;

// ─── Transport ───────────────────────────────────────────────────────────────

const unwrap = (body) => {
  if (!body || typeof body !== 'object' || body.success !== true) {
    throw new MkhlsError(
      `mkhls: ${body?.error?.code || 'UNKNOWN'}: ${body?.error?.message || 'unexpected response'}`,
      { code: body?.error?.code || 'UNKNOWN' }
    );
  }
  return body.data;
};

const toMkhlsError = (err) => {
  const status = err.response?.status;
  const body = err.response?.data;
  const code =
    body?.error?.code ||
    (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND'
      ? 'UNREACHABLE'
      : 'REQUEST_FAILED');
  return new MkhlsError(
    `mkhls ${status || err.code || 'error'}: ${body?.error?.message || err.message}`,
    { code, status }
  );
};

let cachedToken = null; // { token, expiresAt } — expiresAt in ms since epoch

const getAdminToken = async ({ force = false } = {}) => {
  if (!force && cachedToken && cachedToken.expiresAt - TOKEN_EXPIRY_MARGIN_MS > Date.now()) {
    return cachedToken.token;
  }
  let res;
  try {
    res = await axios.post(
      `${BASE_URL()}/admin/login`,
      {
        username: process.env.MKHLS_ADMIN_USERNAME,
        password: process.env.MKHLS_ADMIN_PASSWORD,
      },
      { timeout: REQUEST_TIMEOUT_MS }
    );
  } catch (err) {
    cachedToken = null;
    throw toMkhlsError(err);
  }
  const data = unwrap(res.data);
  cachedToken = { token: data.token, expiresAt: Number(data.expires_at) * 1000 };
  return cachedToken.token;
};

const _resetAuthCache = () => {
  cachedToken = null;
};

/**
 * Authenticated request returning the raw axios response, so callers that
 * care about the status code (transcode: 202 vs 409) can read it.
 * Retries exactly once on 401 with a fresh login.
 */
const authedRequest = async (config, { retryOn401 = true } = {}) => {
  const token = await getAdminToken();
  try {
    return await axios({
      baseURL: BASE_URL(),
      timeout: REQUEST_TIMEOUT_MS,
      ...config,
      headers: { Authorization: `Bearer ${token}`, ...(config.headers || {}) },
    });
  } catch (err) {
    if (err.response?.status === 401 && retryOn401) {
      _resetAuthCache();
      return authedRequest(config, { retryOn401: false });
    }
    throw toMkhlsError(err);
  }
};

const authedData = async (config, opts) => unwrap((await authedRequest(config, opts)).data);

// ─── Stream tokens ───────────────────────────────────────────────────────────

/**
 * A viewing token scoped to one lesson.
 *
 * client_ip is deliberately empty (spec §3): on mobile networks the IP
 * changes mid-lesson and an IP-bound token kills the player. The path
 * restriction plus a short TTL carries the protection.
 */
const generateStreamToken = async (streamPath, ttlSeconds = TOKEN_TTL()) => {
  const data = await authedData({
    method: 'post',
    url: '/admin/tokens/stream',
    data: {
      allowed_path: `/vod/${streamPath}`,
      client_ip: '',
      expires_in: ttlSeconds,
    },
  });
  return { token: data.token, expiresAt: new Date(Number(data.expires_at) * 1000) };
};

module.exports = {
  MkhlsError,
  pathToId,
  buildStreamPath,
  parseStreamStatus,
  buildHlsUrl,
  getAdminToken,
  generateStreamToken,
  authedRequest,
  authedData,
  _resetAuthCache,
};
```

- [ ] **Step 5: Run the tests until they pass**

```bash
npx jest __tests__/unit/mkhls.test.js
```

Expected: PASS, all cases. If "gives up after one retry" hangs or recurses, `retryOn401: false` is not being threaded through the recursive call.

- [ ] **Step 6: Run the whole suite for regressions**

```bash
npm test
```

Expected: the four pre-existing test files still pass.

- [ ] **Step 7: Commit**

```bash
git add backend/utils/mkhls.js backend/__tests__/unit/mkhls.test.js backend/package.json backend/package-lock.json
git commit -m "feat(mkhls): add the client's auth core, envelope and path rules

Every admin response is wrapped in {success, data} and GET/DELETE
/admin/videos/{id} do not normalise the ID the way the transcode endpoint
does, so unwrapping and pathToId belong at this boundary and nowhere else.

Config is read per call rather than at import: jest's setup.js runs before
test files, and freezing env at require() makes the suite order-dependent.

An unrecognised mkhls status maps to processing, not failed — it means we
cannot tell yet, and processing polls and recovers where failed dead-ends.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: mkhls client — upload, transcode, info, delete

The four video operations. Two carry real design decisions:

**Upload must stream.** `form-data` computes `Content-Length` up front; handed a stream of unknown length it buffers the whole file to produce one. On Railway's ephemeral disk with a 2 GB lesson that is fatal, so `knownLength` is required and a missing/zero `Content-Length` is rejected before any bytes move.

**Transcode ignores its response body.** The 202 body is a `TranscodingJob` Go struct with no json tags (spec §16.2). No `job_id` is needed anywhere — status is polled via `getVideoInfo` — so only the status code is read. 409 is not an error: it means a job is already running, which is the desired end state.

**Files:**
- Modify: `backend/utils/mkhls.js`
- Modify: `backend/__tests__/unit/mkhls.test.js`

**Interfaces:**
- Consumes: Task 3's `authedRequest`, `authedData`, `pathToId`, `parseStreamStatus`, `MkhlsError`
- Produces:
  - `uploadVideo(streamPath: string, sourceStream: Readable, contentLength: string|number): Promise<void>`
  - `startTranscode(streamPath: string, presets?: string[]): Promise<{queued: boolean, alreadyRunning: boolean}>`
  - `getVideoInfo(streamPath: string): Promise<{status, mkhlsStatus, duration, transcode}>` where `status` is an Aidevix status, `duration` is whole seconds, and `transcode` is `{presetsDone: string[], presetsTotal: number}` or `null`
  - `deleteVideo(streamPath: string): Promise<boolean>` — `false` when mkhls had no such video

- [ ] **Step 1: Write the failing tests**

Append to `backend/__tests__/unit/mkhls.test.js`:

```js
const { Readable } = require('stream');

describe('uploadVideo', () => {
  it('posts multipart with the path field and the declared length', async () => {
    nock(BASE).post('/admin/login').reply(200, loginReply());

    let seenBody = '';
    nock(BASE)
      .post('/admin/videos/upload', (body) => {
        seenBody = typeof body === 'string' ? body : JSON.stringify(body);
        return true;
      })
      .matchHeader('content-type', /multipart\/form-data/)
      .reply(201, { success: true, data: { id: 'aidevix_68f.mp4', status: 'processing' } });

    await mkhls.uploadVideo('aidevix/68f.mp4', Readable.from(['abc']), 3);

    // nock hands multipart bodies over hex-encoded; assert on the decoded form.
    const decoded = Buffer.from(seenBody.replace(/"/g, ''), 'hex').toString('utf8');
    expect(decoded).toContain('name="path"');
    expect(decoded).toContain('aidevix/68f.mp4');
    expect(decoded).toContain('name="file"');
  });

  it('refuses an upload with no usable Content-Length', async () => {
    await expect(
      mkhls.uploadVideo('aidevix/68f.mp4', Readable.from(['abc']), undefined)
    ).rejects.toMatchObject({ code: 'INVALID_LENGTH' });

    await expect(
      mkhls.uploadVideo('aidevix/68f.mp4', Readable.from(['abc']), '0')
    ).rejects.toMatchObject({ code: 'INVALID_LENGTH' });
  });
});

describe('startTranscode', () => {
  it('treats 202 as queued and never reads the body', async () => {
    nock(BASE).post('/admin/login').reply(200, loginReply());
    nock(BASE)
      .post('/admin/videos/aidevix_68f.mp4/transcode', {})
      .reply(202, { ID: 'job-1', InputPath: '/media/aidevix/68f.mp4' });

    await expect(mkhls.startTranscode('aidevix/68f.mp4')).resolves.toEqual({
      queued: true,
      alreadyRunning: false,
    });
  });

  it('sends explicit presets when given some', async () => {
    nock(BASE).post('/admin/login').reply(200, loginReply());
    nock(BASE)
      .post('/admin/videos/aidevix_68f.mp4/transcode', { presets: ['1080p', '720p'] })
      .reply(202, {});

    await expect(mkhls.startTranscode('aidevix/68f.mp4', ['1080p', '720p'])).resolves.toEqual({
      queued: true,
      alreadyRunning: false,
    });
  });

  it('treats 409 as already running, not as a failure', async () => {
    nock(BASE).post('/admin/login').reply(200, loginReply());
    nock(BASE)
      .post('/admin/videos/aidevix_68f.mp4/transcode')
      .reply(409, { success: false, error: { code: 'ALREADY_TRANSCODING', message: 'busy' } });

    await expect(mkhls.startTranscode('aidevix/68f.mp4')).resolves.toEqual({
      queued: false,
      alreadyRunning: true,
    });
  });

  it('propagates 404 and 503', async () => {
    nock(BASE).post('/admin/login').reply(200, loginReply());
    nock(BASE)
      .post('/admin/videos/aidevix_68f.mp4/transcode')
      .reply(404, { success: false, error: { code: 'NOT_FOUND', message: 'no' } });

    await expect(mkhls.startTranscode('aidevix/68f.mp4')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
  });
});

describe('getVideoInfo', () => {
  it('maps status, rounds duration and keeps only the honest progress fields', async () => {
    nock(BASE).post('/admin/login').reply(200, loginReply());
    nock(BASE)
      .get('/admin/videos/aidevix_68f.mp4')
      .reply(200, {
        success: true,
        data: {
          id: 'aidevix_68f.mp4',
          status: 'processing',
          duration: 2412.47,
          transcode: { progress_percent: 0, presets_done: ['480p'], presets_total: 3 },
        },
      });

    await expect(mkhls.getVideoInfo('aidevix/68f.mp4')).resolves.toEqual({
      status: 'processing',
      mkhlsStatus: 'processing',
      duration: 2412,
      transcode: { presetsDone: ['480p'], presetsTotal: 3 },
    });
  });

  it('returns null transcode when mkhls reports no job', async () => {
    nock(BASE).post('/admin/login').reply(200, loginReply());
    nock(BASE)
      .get('/admin/videos/aidevix_68f.mp4')
      .reply(200, { success: true, data: { id: 'aidevix_68f.mp4', status: 'ready', duration: 60 } });

    const info = await mkhls.getVideoInfo('aidevix/68f.mp4');
    expect(info.status).toBe('ready');
    expect(info.transcode).toBeNull();
  });
});

describe('deleteVideo', () => {
  it('reports true when mkhls deleted it', async () => {
    nock(BASE).post('/admin/login').reply(200, loginReply());
    nock(BASE)
      .delete('/admin/videos/aidevix_68f.mp4')
      .reply(200, { success: true, data: { deleted: true } });

    await expect(mkhls.deleteVideo('aidevix/68f.mp4')).resolves.toBe(true);
  });

  it('reports false when mkhls never had it, rather than throwing', async () => {
    nock(BASE).post('/admin/login').reply(200, loginReply());
    nock(BASE)
      .delete('/admin/videos/aidevix_68f.mp4')
      .reply(404, { success: false, error: { code: 'NOT_FOUND', message: 'no' } });

    await expect(mkhls.deleteVideo('aidevix/68f.mp4')).resolves.toBe(false);
  });
});
```

- [ ] **Step 2: Run and watch them fail**

```bash
npx jest __tests__/unit/mkhls.test.js
```

Expected: FAIL — `mkhls.uploadVideo is not a function`.

- [ ] **Step 3: Implement the four operations**

Add to `backend/utils/mkhls.js`, above `module.exports`, and add `const FormData = require('form-data');` next to the axios import:

```js
// ─── Video operations ────────────────────────────────────────────────────────

/**
 * Streams a video into mkhls. The bytes never touch the backend's disk.
 *
 * contentLength is mandatory: form-data computes Content-Length up front and,
 * given a stream of unknown length, buffers the entire file to do it. On an
 * ephemeral-disk host with a multi-GB lesson that is fatal, so a missing or
 * zero length is rejected here rather than discovered at OOM time.
 */
const uploadVideo = async (streamPath, sourceStream, contentLength) => {
  const size = Number(contentLength);
  if (!Number.isFinite(size) || size <= 0) {
    throw new MkhlsError('mkhls: upload requires a positive Content-Length', {
      code: 'INVALID_LENGTH',
    });
  }
  // Validates the path before a single byte is sent.
  pathToId(streamPath);

  const form = new FormData();
  form.append('path', streamPath);
  form.append('file', sourceStream, {
    filename: streamPath.split('/').pop(),
    contentType: 'video/mp4',
    knownLength: size,
  });

  await authedData({
    method: 'post',
    url: '/admin/videos/upload',
    data: form,
    headers: form.getHeaders(),
    timeout: 0, // large files: no timeout
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });
};

/**
 * Queues transcoding. The 202 body is an untagged Go struct (spec §16.2) and
 * is deliberately never read — status is polled through getVideoInfo, so no
 * job id is needed and no Go field name leaks into this codebase.
 *
 * 409 is a success shape: a job is already running, which is what the caller
 * wanted. That makes this call idempotent under retry.
 */
const startTranscode = async (streamPath, presets = []) => {
  const id = pathToId(streamPath);
  const res = await authedRequest({
    method: 'post',
    url: `/admin/videos/${encodeURIComponent(id)}/transcode`,
    data: presets.length ? { presets } : {},
    validateStatus: (s) => s === 202 || s === 409,
  });
  return { queued: res.status === 202, alreadyRunning: res.status === 409 };
};

/**
 * Current mkhls state for a video.
 *
 * transcode.progress_percent is dropped on purpose: mkhls never advances it
 * (it is 0 until the job ends, then 100). presets_done / presets_total are
 * real and monotonic, so those are the only progress numbers exposed.
 */
const getVideoInfo = async (streamPath) => {
  const data = await authedData({
    method: 'get',
    url: `/admin/videos/${encodeURIComponent(pathToId(streamPath))}`,
  });
  return {
    status: parseStreamStatus(data.status),
    mkhlsStatus: data.status,
    duration: Math.round(Number(data.duration) || 0),
    transcode: data.transcode
      ? {
          presetsDone: data.transcode.presets_done || [],
          presetsTotal: data.transcode.presets_total || 0,
        }
      : null,
  };
};

/**
 * Removes the video from mkhls. Returns false when mkhls had no such record —
 * a delete whose goal is already met is not an error for the caller.
 *
 * Note (spec §15.3): mkhls's DeleteVideo removes only the database row; the
 * HLS cache directory and the source file are left behind. Reclaiming that
 * disk is a stage-9 concern.
 */
const deleteVideo = async (streamPath) => {
  const res = await authedRequest({
    method: 'delete',
    url: `/admin/videos/${encodeURIComponent(pathToId(streamPath))}`,
    validateStatus: (s) => s === 200 || s === 404,
  });
  return res.status === 200;
};
```

Then extend the export list with `uploadVideo`, `startTranscode`, `getVideoInfo`, `deleteVideo`.

- [ ] **Step 4: Run the tests**

```bash
npx jest __tests__/unit/mkhls.test.js
```

Expected: PASS. If the multipart assertion fails on decoding, print `seenBody` — nock's representation of binary bodies varies by version, and the assertion, not the client, is what needs adjusting.

- [ ] **Step 5: Run the whole suite**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/utils/mkhls.js backend/__tests__/unit/mkhls.test.js
git commit -m "feat(mkhls): add upload, transcode, info and delete

Upload requires a positive Content-Length so form-data can set knownLength;
without it form-data buffers the whole file to compute the header, which
would put multi-GB lessons on an ephemeral disk.

startTranscode reads only the status code. The 202 body is an untagged Go
struct and nothing needs a job id — progress is polled — so no Go field name
enters this codebase. 409 resolves as alreadyRunning, making the call
idempotent under retry.

getVideoInfo drops progress_percent, which mkhls never advances, and exposes
presets_done/presets_total instead. deleteVideo maps 404 to false: a delete
whose goal is already met is not an error.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Live smoke test of the client

`nock` proves the client matches what we *believe* mkhls sends. This task proves it against what mkhls *actually* sends, before four controller tasks are built on top. Stages 1–2 kept finding exactly this class of gap.

**Files:**
- Create: `backend/scripts/mkhls-smoke.js`

**Interfaces:**
- Consumes: everything exported by `backend/utils/mkhls.js`
- Produces: a repeatable command that exercises the full client against a live container

- [ ] **Step 1: Write the script**

Create `backend/scripts/mkhls-smoke.js`:

```js
/**
 * Live check of utils/mkhls.js against a running mkhls container.
 *
 * Usage:
 *   docker compose -f ../docker-compose.dev.yml up -d mkhls
 *   node scripts/mkhls-smoke.js path/to/sample.mp4
 *
 * Uploads under a throwaway namespace, waits for transcoding, prints a
 * playable URL, then deletes the record.
 */
require('dotenv').config();
const fs = require('fs');
const mkhls = require('../utils/mkhls');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const file = process.argv[2];
  if (!file || !fs.existsSync(file)) {
    console.error('usage: node scripts/mkhls-smoke.js <path-to-mp4>');
    process.exit(1);
  }

  const size = fs.statSync(file).size;
  const streamPath = `smoke/${Date.now()}.mp4`;

  console.log(`login → ${mkhls.pathToId(streamPath)}`);
  await mkhls.getAdminToken();

  console.log(`upload ${size} bytes → ${streamPath}`);
  await mkhls.uploadVideo(streamPath, fs.createReadStream(file), size);

  console.log('transcode', await mkhls.startTranscode(streamPath));

  for (let i = 0; i < 60; i++) {
    const info = await mkhls.getVideoInfo(streamPath);
    console.log(
      `  [${i}] ${info.status} (mkhls: ${info.mkhlsStatus}) duration=${info.duration} ` +
        `presets=${info.transcode ? info.transcode.presetsDone.length : '-'}/` +
        `${info.transcode ? info.transcode.presetsTotal : '-'}`
    );
    if (info.status === 'ready' || info.status === 'failed') break;
    await sleep(5000);
  }

  const { token, expiresAt } = await mkhls.generateStreamToken(streamPath, 600);
  console.log('\nPLAY:', mkhls.buildHlsUrl(streamPath, token));
  console.log('expires:', expiresAt.toISOString());
  console.log('\nOpen the URL above, then press Enter to delete the record.');
  await new Promise((r) => process.stdin.once('data', r));

  console.log('deleted:', await mkhls.deleteVideo(streamPath));
  process.exit(0);
})().catch((err) => {
  console.error(`FAILED [${err.code}]`, err.message);
  process.exit(1);
});
```

- [ ] **Step 2: Run it against the container with a real mp4**

```bash
cd aidevixBackend
export MKHLS_VOD_TRANSCODE_ON_UPLOAD=true
docker compose -f docker-compose.dev.yml up -d mkhls
cd backend
node scripts/mkhls-smoke.js ../.data/media/<some-sample>.mp4
```

Use a short clip (10–30s) — this runs a real ffmpeg ladder. If `.data/media` has no sample, any small mp4 works.

Expected, in order: a login, an upload, `{queued: true, alreadyRunning: false}` **or** `{queued: false, alreadyRunning: true}` (both are correct — with `transcode_on_upload=true` mkhls may already have started), status progressing `processing → ready`, `presets` climbing to `3/3`, and a `PLAY:` URL.

- [ ] **Step 3: Play the URL and confirm the token restriction**

Open the `PLAY:` URL in a browser or `ffplay`. Then, with that same token, edit the URL to point at a different path and reload.

Expected: video plays; the tampered URL returns **403** — including on an immediate second attempt, which is what Task 1 fixed.

- [ ] **Step 4: Check the failure paths**

```bash
docker compose -f ../docker-compose.dev.yml stop mkhls
node scripts/mkhls-smoke.js ../.data/media/<same-sample>.mp4
docker compose -f ../docker-compose.dev.yml start mkhls
```

Expected: `FAILED [UNREACHABLE]`, not an unhandled rejection or a raw axios stack. The controllers depend on that code to return 503 rather than 500.

- [ ] **Step 5: Fix any mismatch in the client, not in the script**

If a field name, status code, or envelope differs from what Task 3/4's tests assume, correct `utils/mkhls.js` **and** the corresponding `nock` fixture so the unit test encodes the real shape. A mismatch found here that gets patched only in the script is a defect shipped into Tasks 8–10.

- [ ] **Step 6: Commit**

```bash
git add backend/scripts/mkhls-smoke.js
git commit -m "test(mkhls): add a live smoke script for the client

nock proves the client matches what we believe mkhls sends. This proves it
against what mkhls actually sends, before four controller tasks are built on
top of it — the gap that produced most of stages 1-2's defects.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 1b: mkhls — persist the probed metadata after a transcode

**Added mid-execution, after Task 5. Repo: `mkhls-streamer`, branch `feat/vod-local-pipeline`. No Claude attribution in this commit.**

Task 5's live run reported `duration: 0` on a video mkhls had marked `ready`. The clip is genuinely 3.0 s / 640×360 (ffprobe inside the container), so the file is fine. The cause:

`TranscodingService.UpdateVideoMetadata` (`transcoding_service.go:1180`) probes the source and writes `duration`, `size`, `width`, `height`, `bitrate`, `codec`, `audio_codec` and `format` through `VideoService.UpdateVideoMetadata` — and **nothing calls it.** `grep -rn UpdateVideoMetadata --include=*.go` returns only its own definition and the domain method it delegates to. Every uploaded video therefore keeps `duration: 0` forever, and `GET /admin/videos/{id}` reports it as such.

This is the same defect class Plan 1 found in `ffmpeg.presets`: a complete, correct feature that was parsed and then never wired. It is generic, it is upstream's bug, and no consumer-specific naming enters the fix.

Two ordering constraints make this less trivial than it looks:

- **The probe must run before `maybeDeleteSource`.** `GetMediaInfo` reads the source file; once `delete_source_after_transcode` removes it, there is nothing left to probe. In production that flag is on.
- **The probe must run before `MarkVideoReady`.** A client polling `GET /admin/videos/{id}` stops as soon as it sees `ready`; if status flips first, the poller can capture `ready` with `duration: 0` and never look again. Aidevix's `checkVideoStatus` reads both fields from the same response, so this window is directly observable.

`s.ffmpeg` is a concrete `*ffmpeg.FFmpeg`, not an interface, so it cannot be faked in a unit test — and `TestFinishJobDoesNotInvertLockOrder` constructs a `TranscodingService` with a **nil** `ffmpeg`. The call must therefore be nil-guarded, both so that test keeps passing and because `app.go` legitimately runs without a transcoder when the binary is missing. The real evidence for this task is the container check in Step 5.

**Files:**
- Modify: `internal/application/service/transcoding_service.go` (`finishJob`, the `JobStatusCompleted` non-HEVC branch, around line 588)
- Modify: `internal/application/service/transcoding_service_test.go`
- Modify: `claude_usage_log.txt`

**Interfaces:**
- Consumes: `TranscodingService.UpdateVideoMetadata(ctx, videoID) error` — already implemented, currently dead
- Produces: `GET /admin/videos/{id}` returns a real `duration` (and `width`/`height`/`codec`) for uploaded videos. Task 8's `checkVideoStatus` persists that into `Video.duration`; Plan 3's player and admin panel display it.

- [ ] **Step 1: Write the failing test**

Append to `internal/application/service/transcoding_service_test.go`. This test pins the nil-ffmpeg guard and the ordering, which is what a future edit is most likely to break. It uses the existing `stubVideoRepo` (defined at line 976 of that file) and a recording wrapper around it.

```go
// recordingVideoRepo records the order of repository writes so a test can
// assert that metadata is persisted before the status flips to ready.
type recordingVideoRepo struct {
	stubVideoRepo
	mu    sync.Mutex
	calls []string
}

func (r *recordingVideoRepo) Update(_ context.Context, _ *entity.Video) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.calls = append(r.calls, "update")
	return nil
}

func (r *recordingVideoRepo) UpdateStatus(_ context.Context, _ string, s entity.VideoStatus) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.calls = append(r.calls, "status:"+string(s))
	return nil
}

func (r *recordingVideoRepo) recorded() []string {
	r.mu.Lock()
	defer r.mu.Unlock()
	return append([]string(nil), r.calls...)
}

// A completed transcode must still mark the video ready when no ffmpeg is
// configured. s.ffmpeg is a concrete type and cannot be faked, and app.go
// leaves it nil when the binary is missing, so an unguarded probe call here
// would panic on a path that has nothing to do with probing.
func TestFinishJobWithoutFFmpegStillMarksReady(t *testing.T) {
	repo := &recordingVideoRepo{}
	s := &TranscodingService{
		outputPath:   t.TempDir(),
		logger:       &logger.NopLogger{},
		videoService: domainservice.NewVideoService(repo),
		jobs:         make(map[string]*TranscodingJob),
	}

	job := &TranscodingJob{
		ID:              "job-nometa",
		VideoID:         "ns_nometa.mp4",
		InputPath:       filepath.Join(t.TempDir(), "source.mp4"),
		Presets:         []string{"720p"},
		RequiredPresets: []string{"720p"},
		Status:          JobStatusCompleted,
		Progress:        100,
	}
	s.jobs[job.ID] = job

	s.finishJob(job, false, jobOutcome{status: JobStatusCompleted, progress: 100})

	got := repo.recorded()
	want := "status:" + string(entity.VideoStatusReady)
	found := false
	for _, c := range got {
		if c == want {
			found = true
		}
	}
	if !found {
		t.Errorf("finishJob calls = %v, want one of them to be %q", got, want)
	}
}
```

- [ ] **Step 2: Run it and confirm the current behaviour**

```bash
cd mkhls-streamer
go test ./internal/application/service/ -run TestFinishJobWithoutFFmpegStillMarksReady -v
```

Expected: PASS on the unmodified code — nothing probes yet, so nothing can panic. This test is a guard against the change you are about to make, not a red test. **Do not skip it**: run it again after Step 3 and confirm it still passes. If it panics after your edit, the nil guard is missing.

- [ ] **Step 3: Wire the probe into the completion path**

In `finishJob`'s `JobStatusCompleted` branch, in the `else` (non-HEVC) arm, replace the three statements that follow the "Transcoding job completed" log:

```go
			// Persist the probe before anything else touches the video.
			//
			// Ordering is load-bearing twice over: GetMediaInfo reads the
			// source file, so this must happen before maybeDeleteSource can
			// remove it; and a client polling GetVideo stops as soon as it
			// sees "ready", so the metadata has to be in place before the
			// status flips or the poller can capture duration 0 and never
			// look again.
			//
			// s.ffmpeg is nil when no transcoder binary was configured, and
			// a failed probe is not a reason to fail a transcode that
			// succeeded — log and carry on either way.
			if s.ffmpeg != nil {
				if err := s.UpdateVideoMetadata(context.Background(), job.VideoID); err != nil {
					s.logger.Warn("Failed to persist probed metadata after transcode",
						logger.String("video_id", job.VideoID),
						logger.Error(err),
					)
				}
			}

			// Mark video as ready
			s.videoService.MarkVideoReady(context.Background(), job.VideoID)

			// Delete the source file if every guard condition holds.
			s.maybeDeleteSource(job)

			// Queue H.265 background transcode if enabled
			s.queueHEVCIfNeeded(job.VideoID, job.InputPath)
```

Leave the HEVC arm alone: an H.265 job runs against a video that is already `ready` with metadata from its H.264 pass, so probing again would be redundant work on a background path.

- [ ] **Step 4: Run the package's tests**

```bash
go test ./internal/application/service/... -v
go test ./...
```

Expected: PASS throughout. `TestFinishJobDoesNotInvertLockOrder` is the one to watch — it builds a service with a nil `ffmpeg` and exercises exactly this code path, so a missing nil guard shows up there as a panic.

- [ ] **Step 5: Verify against the container — this is the real evidence**

```bash
cd ../aidevixBackend
docker compose -f docker-compose.dev.yml up -d --build mkhls
cd backend
echo "" | node scripts/mkhls-smoke.js ../.data/media/real_test.mp4
```

Expected: the polling lines now show a non-zero `duration` once the status reaches `ready` — `3` for `real_test.mp4`, whose true length is 3.0 s. Before this change the same run printed `duration=0` at every poll.

Confirm it directly as well, using the admin API:

```bash
TOKEN=$(curl -sS -X POST http://localhost:8080/admin/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
curl -sS "http://localhost:8080/admin/videos/<the smoke id>" -H "Authorization: Bearer $TOKEN"
```

Expected: `duration` is 3, and `width`/`height` are 640/360 rather than 0/0.

- [ ] **Step 6: Log and commit**

Append an entry to `claude_usage_log.txt` in its existing format — files changed, the problem (a complete probe-and-persist path that nothing called), the fix and its two ordering constraints, and the container result. Keep consumer names out of it.

```bash
cd ../../mkhls-streamer
git add internal/application/service/transcoding_service.go \
        internal/application/service/transcoding_service_test.go \
        claude_usage_log.txt
git commit -m "fix(vod): persist probed metadata when a transcode completes

UpdateVideoMetadata probes the source and writes duration, dimensions,
bitrate and codecs — and nothing called it. Every uploaded video kept
duration 0 forever, and the admin API reported it that way.

The call goes before MarkVideoReady and before maybeDeleteSource, and both
orderings matter: the probe reads the source file, which delete_source
removes, and a client polling for readiness stops at the first ready
response, so metadata written afterwards would never be seen.

Guarded on a nil ffmpeg: app.go runs without a transcoder when the binary
is missing, and a failed probe must not fail a transcode that succeeded."
```

No `Co-Authored-By` trailer in this repo.

---

### Task 6: `Video` model — `streamPath` and `streamStatus`

**Files:**
- Modify: `backend/models/Video.js`

**Interfaces:**
- Consumes: nothing
- Produces: `video.streamPath: string|null` (`"aidevix/{videoId}.mp4"`) and `video.streamStatus: 'pending'|'processing'|'ready'|'failed'` (default `'pending'`), plus an index on `streamStatus`. Tasks 7–10 read and write both.

- [ ] **Step 1: Add the fields**

In `backend/models/Video.js`, replace the Bunny block (lines 34-44) with:

```js
  // ─── mkhls-streamer ────────────────────────────────────────────────────────
  // Storage path inside mkhls AND the public URL path: "aidevix/{videoId}.mp4".
  // The namespace is deliberate — when mkhls becomes multi-tenant, Aidevix
  // moves without changing a single path.
  streamPath: {
    type: String,
    default: null,
  },
  streamStatus: {
    type: String,
    enum: ['pending', 'processing', 'ready', 'failed'],
    default: 'pending',
  },

  // ─── Bunny.net (DEPRECATED) ────────────────────────────────────────────────
  // Kept for one release: existing rows still carry these and the admin panel
  // still reads bunnyStatus until Plan 3 renames it. Removed by migration
  // afterwards. New videos never set them.
  bunnyVideoId: {
    type: String,
    default: null,
  },
  bunnyStatus: {
    type: String,
    enum: ['pending', 'processing', 'ready', 'failed'],
    default: 'pending',
  },
```

- [ ] **Step 2: Add the index**

Below the existing indexes (line 77-80):

```js
videoSchema.index({ streamStatus: 1 });
```

Leave `videoSchema.index({ bunnyStatus: 1 })` in place — it is dropped with the field.

- [ ] **Step 3: Verify the schema loads and the enum holds**

```bash
cd backend
node -e "
const m = require('mongoose');
const V = require('./models/Video');
const v = new V({ title: 't', course: new m.Types.ObjectId() });
console.log('default streamStatus:', v.streamStatus, '| streamPath:', v.streamPath);
v.streamStatus = 'bogus';
v.validate().then(() => console.log('BUG: enum not enforced')).catch(e => console.log('enum enforced:', !!e.errors.streamStatus));
"
```

Expected: `default streamStatus: pending | streamPath: null` then `enum enforced: true`.

- [ ] **Step 4: Commit**

```bash
git add backend/models/Video.js
git commit -m "feat(video): add streamPath and streamStatus for mkhls

bunnyVideoId and bunnyStatus stay for one release: existing rows carry them
and the admin panel still reads bunnyStatus until Plan 3 renames it.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: `createVideo`, `linkToStream`, and the provider-ID leak

Three related changes to the metadata surface. `createVideo` stops calling Bunny and computes a `streamPath` instead; `linkToStream` is the manual escape hatch for a video already sitting in mkhls; and `getCourseVideos` stops handing a provider identifier to an unauthenticated endpoint (spec §10.4).

`streamPath` needs the document's `_id`, which normally exists only after `create`. Pre-generating the ObjectId keeps it to a single write.

**Files:**
- Modify: `backend/controllers/videoController.js` (imports, `getCourseVideos` at :25-53, `createVideo` at :250-309, `linkToBunny` at :658-689)
- Modify: `backend/routes/videoRoutes.js` (add `PATCH /:id/link-stream`)

**Interfaces:**
- Consumes: `mkhls.buildStreamPath`, `mkhls.getVideoInfo` (Tasks 3, 4); `Video.streamPath`, `Video.streamStatus` (Task 6)
- Produces: `POST /api/videos` sets `streamPath` + `streamStatus: 'pending'` and always returns upload info; `PATCH /api/videos/:id/link-stream` accepting `{ streamPath }`

- [ ] **Step 1: Add the imports**

At the top of `backend/controllers/videoController.js`, keep the existing `../utils/bunny` import (Task 10 still needs `deleteBunnyVideo` for legacy rows) and add:

```js
const mongoose = require('mongoose');
const mkhls = require('../utils/mkhls');
```

- [ ] **Step 2: Rewrite `createVideo`**

Replace the Bunny slot block and the `Video.create` call (lines 269-302):

```js
    // mkhls needs no slot to be created up front — the storage path is
    // derived from the document id and the file arrives later via the
    // upload proxy. Pre-generating the id keeps this to one write.
    const _id = new mongoose.Types.ObjectId();
    const streamPath = mkhls.buildStreamPath(_id.toString());

    const video = await Video.create({
      _id,
      title,
      description,
      course: courseId,
      order: order || 0,
      duration: duration || 0,
      thumbnail,
      streamPath,
      streamStatus: 'pending',
    });

    // Kursga video qo'shish (atomic — race'da VersionError oldini oladi)
    await Course.updateOne({ _id: courseId }, { $push: { videos: video._id } });

    res.status(201).json({
      success: true,
      message: 'Video created successfully.',
      data: {
        video,
        // Always present now: unlike Bunny, mkhls needs no pre-created slot,
        // so there is no configuration under which upload is unavailable.
        upload: buildProxyUploadInfo(video._id),
      },
    });
```

- [ ] **Step 3: Replace `linkToBunny` with `linkToStream`**

Replace the whole `linkToBunny` function (lines 657-689). The handler is renamed, not duplicated: `utils/bunny.js` stays on disk, but a second link route that writes the dead field would give two ways to link a video that disagree with each other.

```js
// Mavjud mkhls yo'liga qo'lda bog'lash (Admin only).
// Eski yoki qo'lda yuklangan videolar uchun: fayl mkhls'da allaqachon bor.
const linkToStream = async (req, res) => {
  try {
    const { id } = req.params;
    const { streamPath } = req.body;

    if (!streamPath || typeof streamPath !== 'string') {
      return res.status(400).json({ success: false, message: 'streamPath majburiy.' });
    }

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found.' });
    }

    // mkhls'da haqiqatan bor-yo'qligini tekshiramiz — bo'lmagan yo'lni
    // bog'lash video'ni jimgina buzuq holatga olib keladi.
    let info;
    try {
      info = await mkhls.getVideoInfo(streamPath);
    } catch (err) {
      if (err.code === 'NOT_FOUND') {
        return res.status(404).json({
          success: false,
          message: `mkhls'da bunday video yo'q: ${streamPath}`,
        });
      }
      console.error('[video] linkToStream mkhls:', err.code, err.message);
      return res.status(502).json({ success: false, message: 'mkhls bilan bog\'lanib bo\'lmadi.' });
    }

    video.streamPath = streamPath;
    video.streamStatus = info.status;
    if (info.duration) video.duration = info.duration;
    await video.save();

    res.json({ success: true, message: 'Video mkhls ga ulandi.', data: { video } });
  } catch (error) {
    console.error('[videoController] linkToStream:', error.message);
    res.status(500).json({ success: false, message: 'Error linking video to stream.' });
  }
};
```

Update `module.exports`: replace `linkToBunny` with `linkToStream`.

- [ ] **Step 4: Route it**

In `backend/routes/videoRoutes.js`, change the import name `linkToBunny` → `linkToStream` and replace the route (line 63):

```js
router.patch('/:id/link-stream', validateObjectId(), authenticate, requireAdmin, linkToStream);
```

The `/:id/link-bunny` route is removed with it — the deprecated *code* stays in `utils/bunny.js`, but keeping a second route that writes the dead field would leave two ways to link a video that disagree.

- [ ] **Step 5: Close the provider-ID leak in `getCourseVideos`**

`GET /api/videos/course/:courseId` has no `authenticate` middleware (`videoRoutes.js:29`) and currently selects `bunnyVideoId`. Replace the `.select(...)` at line 35:

```js
      // streamPath is deliberately absent: this endpoint is unauthenticated
      // and a storage path is a provider identifier (spec §10.4). Only the
      // coarse status ships, which the admin list needs.
      .select('_id title description order duration thumbnail viewCount sectionId course streamStatus')
```

Update the comment two lines above it to match.

- [ ] **Step 6: Verify against the running stack**

With `npm run dev` and both containers up, using `ADMIN_TOKEN` and `COURSE_ID` from Task 2:

```bash
VIDEO=$(curl -sS -X POST http://localhost:5000/api/videos \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d "{\"title\":\"Dars 1\",\"courseId\":\"$COURSE_ID\"}")
echo "$VIDEO"
VIDEO_ID=$(echo "$VIDEO" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)

curl -sS http://localhost:5000/api/videos/course/$COURSE_ID
```

Expected: the create response carries `streamPath: "aidevix/<VIDEO_ID>.mp4"`, `streamStatus: "pending"`, and a non-null `upload` block. The course listing shows the video with `streamStatus` and **no** `streamPath`, `bunnyVideoId`, or `bunnyStatus`.

- [ ] **Step 7: Verify `link-stream` rejects a path mkhls does not have**

```bash
curl -sS -X PATCH http://localhost:5000/api/videos/$VIDEO_ID/link-stream \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"streamPath":"aidevix/does-not-exist.mp4"}'
```

Expected: **404** with the "mkhls'da bunday video yo'q" message — not a 200 that quietly stores a broken path.

- [ ] **Step 8: Commit**

```bash
git add backend/controllers/videoController.js backend/routes/videoRoutes.js
git commit -m "feat(video): create videos against mkhls and stop leaking provider ids

createVideo derives streamPath from a pre-generated ObjectId, so no provider
round-trip is needed to create a video and upload info is always available —
unlike Bunny, mkhls needs no slot created up front.

linkToStream replaces linkToBunny and verifies the path exists in mkhls
before storing it; the old route is removed rather than left as a second,
disagreeing way to link a video.

getCourseVideos no longer selects a provider identifier. The endpoint has no
authenticate middleware and was returning bunnyVideoId to anyone.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: `uploadVideoProxy` and `checkVideoStatus`

The ingest path. The upload streams `req` straight through to mkhls — `express.json` ignores `application/octet-stream`, so `req` is still an unread stream by the time the handler sees it, which is what made the Bunny proxy work and works identically here.

~~Transcoding is queued by exactly one side. `MKHLS_TRANSCODE_ON_UPLOAD` mirrors the container's `vod.transcode_on_upload`; when it is true mkhls already queued the job and a second call could start a **duplicate** transcode if the first finished in between (mkhls's duplicate guard only blocks jobs that are still pending or running).~~

**SUPERSEDED by the whole-branch review (finding 3).** The "exactly one side queues" rule is withdrawn and the `MKHLS_TRANSCODE_ON_UPLOAD` gate is removed from `uploadVideoProxy`; `startTranscode` is now called unconditionally and `{queued:false, alreadyRunning:true}` (mkhls's 409) is treated as the success it is.

The duplicate the rule guarded against needs mkhls's own job to *finish* between its queueing and Node's call landing — not reachable for a real lesson. The rule's own failure mode is both worse and observed live: when the two config values drift apart, **neither** side queues, mkhls leaves the upload stamped `ready` for JIT streaming, and the student gets a 404 behind a valid-looking player URL. Removing the gate removes that class of misconfiguration entirely.

Additionally, a `startTranscode` that throws now writes `streamStatus = 'failed'` and reports it, instead of being logged and swallowed behind a 200.

**Files:**
- Modify: `backend/controllers/videoController.js` (`uploadVideoProxy` at :594-608, `checkVideoStatus` at :611-655, `getUploadCredentialsForVideo` at :560-590)

**Interfaces:**
- Consumes: `mkhls.uploadVideo`, `mkhls.startTranscode`, `mkhls.getVideoInfo` (Task 4)
- Produces: `PUT /api/videos/:id/upload-proxy` leaving `streamStatus: 'processing'`; `GET /api/videos/:id/status` returning `{ videoId, streamStatus, bunnyStatus, isReady, duration, transcode }`

- [ ] **Step 1: Rewrite `uploadVideoProxy`**

```js
// Admin video binary'ni backend orqali mkhls'ga oqizadi.
// req — octet-stream (body-parser tegmaydi), to'g'ridan-to'g'ri pipe qilinadi:
// fayl backend diskiga hech qachon tushmaydi (Railway diski efemer).
const uploadVideoProxy = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id).select('streamPath streamStatus');
    if (!video) return res.status(404).json({ success: false, message: 'Video not found.' });
    if (!video.streamPath) {
      return res.status(400).json({ success: false, message: 'Bu video mkhls ga ulangan emas.' });
    }

    const contentLength = req.headers['content-length'];
    if (!contentLength) {
      // Without a length the multipart body cannot be framed without
      // buffering the whole file first — see utils/mkhls.js uploadVideo.
      return res.status(411).json({
        success: false,
        message: 'Content-Length majburiy (chunked upload qo\'llab-quvvatlanmaydi).',
      });
    }

    try {
      await mkhls.uploadVideo(video.streamPath, req, contentLength);
    } catch (err) {
      console.error('[video] upload proxy:', err.code, err.message);
      video.streamStatus = 'failed';
      await video.save();
      return res.status(502).json({ success: false, message: 'mkhls ga yuklashda xato.' });
    }

    video.streamStatus = 'processing';
    await video.save();

    // SUPERSEDED by the whole-branch review (finding 3) — the shipped code
    // has no gate and does not swallow the failure. See the note above.
    //
    //   try {
    //     await mkhls.startTranscode(video.streamPath);
    //   } catch (err) {
    //     console.error('[video] startTranscode after upload:', err.code, err.message);
    //     video.streamStatus = 'failed';
    //     await video.save();
    //     return res.status(502).json({ ... streamStatus: 'failed' });
    //   }
    if (process.env.MKHLS_TRANSCODE_ON_UPLOAD !== 'true') {
      try {
        await mkhls.startTranscode(video.streamPath);
      } catch (err) {
        // The bytes are safely in mkhls; report the upload as the success it
        // was and let the admin retry transcoding rather than lose the file.
        console.error('[video] startTranscode after upload:', err.code, err.message);
      }
    }

    res.json({
      success: true,
      message: 'Video mkhls ga yuklandi.',
      data: { videoId: video._id, streamStatus: video.streamStatus },
    });
  } catch (error) {
    console.error('[video] upload proxy xato:', error.message);
    res.status(502).json({ success: false, message: 'mkhls ga yuklashda xato.' });
  }
};
```

- [ ] **Step 2: Rewrite `checkVideoStatus`**

```js
// Video holati — transcode tugadimi? (Admin only)
const checkVideoStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found.' });
    }
    if (!video.streamPath) {
      return res.status(400).json({ success: false, message: 'Bu video mkhls ga ulangan emas.' });
    }

    let info;
    try {
      info = await mkhls.getVideoInfo(video.streamPath);
    } catch (err) {
      if (err.code === 'NOT_FOUND') {
        // Yaratilgan, lekin hali yuklanmagan — bu xato emas, kutilgan holat.
        return res.json({
          success: true,
          data: {
            videoId: video._id,
            streamStatus: video.streamStatus,
            bunnyStatus: video.streamStatus, // DEPRECATED — Plan 3 gacha admin panel uchun
            isReady: false,
            duration: video.duration,
            transcode: null,
          },
        });
      }
      console.error('[video] checkVideoStatus mkhls:', err.code, err.message);
      return res.status(502).json({ success: false, message: 'mkhls bilan bog\'lanib bo\'lmadi.' });
    }

    if (video.streamStatus !== info.status || (info.duration && video.duration !== info.duration)) {
      video.streamStatus = info.status;
      if (info.duration) video.duration = info.duration;
      await video.save();
    }

    res.json({
      success: true,
      data: {
        videoId: video._id,
        streamStatus: info.status,
        // DEPRECATED mirror: the admin panel reads bunnyStatus until Plan 3
        // renames it, and that panel is how this plan gets verified by hand.
        bunnyStatus: info.status,
        isReady: info.status === 'ready',
        duration: info.duration || video.duration,
        // progress_percent is deliberately absent — mkhls never advances it.
        transcode: info.transcode,
      },
    });
  } catch (error) {
    console.error('[videoController] checkVideoStatus:', error.message);
    res.status(500).json({ success: false, message: 'Error checking video status.' });
  }
};
```

- [ ] **Step 3: Update `getUploadCredentialsForVideo`**

It still gates on `bunnyVideoId` (line 569). Replace that check and the response body:

```js
    if (!video.streamPath) {
      return res.status(400).json({
        success: false,
        message: 'Bu video mkhls ga ulangan emas.',
      });
    }

    const uploadInfo = buildProxyUploadInfo(video._id);

    res.json({
      success: true,
      data: {
        videoId: video._id,
        streamPath: video.streamPath,
        ...uploadInfo,
        note: 'uploadUrl ga (backend proxy) PUT so\'rov yuboring, body = video fayl binary. mkhls admin paroli backend\'da qoladi.',
      },
    });
```

This endpoint is `requireAdmin`, so returning `streamPath` here is fine — unlike `getCourseVideos`.

- [ ] **Step 4: Upload a real file end to end**

With both containers up, `npm run dev` running, and `VIDEO_ID` from Task 7:

```bash
SAMPLE=../.data/media/sample.mp4     # any short mp4
curl -sS -X PUT "http://localhost:5000/api/videos/$VIDEO_ID/upload-proxy" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/octet-stream' \
  --data-binary "@$SAMPLE"
```

Expected: `{"success":true,...,"data":{"videoId":"...","streamStatus":"processing"}}`.

Then confirm the file actually landed where mkhls expects it:

```bash
ls -la .data/media/aidevix/
```

Expected: `<VIDEO_ID>.mp4` with the sample's byte size.

- [ ] **Step 5: Poll the status through to `ready`**

```bash
for i in $(seq 1 40); do
  curl -sS "http://localhost:5000/api/videos/$VIDEO_ID/status" -H "Authorization: Bearer $ADMIN_TOKEN"
  echo; sleep 5
done
```

Expected: `streamStatus` moves `processing → ready`; `transcode.presetsDone` grows to match `presetsTotal`; `duration` becomes the real clip length. Confirm the DB was updated too:

```bash
docker compose -f docker-compose.dev.yml exec mongo mongosh aidevix_dev \
  --quiet --eval 'db.videos.findOne({}, {title:1, streamPath:1, streamStatus:1, duration:1})'
```

- [ ] **Step 6: Check the backend never wrote the file to its own disk**

```bash
git status --short
ls backend/*.mp4 2>/dev/null || echo "no stray media in backend/"
```

Expected: no media files. If a temp file appeared, `knownLength` is not reaching `form-data` and the stream is being buffered.

- [ ] **Step 7: Check the failure path**

```bash
docker compose -f docker-compose.dev.yml stop mkhls
curl -sS -o /dev/null -w '%{http_code}\n' -X PUT \
  "http://localhost:5000/api/videos/$VIDEO_ID/upload-proxy" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/octet-stream' \
  --data-binary "@$SAMPLE"
docker compose -f docker-compose.dev.yml start mkhls
```

Expected: **502**, and the video's `streamStatus` is now `failed` in the DB (not stuck on `processing`).

- [ ] **Step 8: Commit**

```bash
git add backend/controllers/videoController.js
git commit -m "feat(video): stream uploads to mkhls and poll real transcode progress

The upload pipes req straight through: express.json ignores octet-stream, so
the request is still an unread stream and no bytes touch the backend disk. A
missing Content-Length is rejected with 411 rather than silently buffering
the file to compute one.

Only one side queues transcoding. MKHLS_TRANSCODE_ON_UPLOAD mirrors the
container's config; when it is true, mkhls already queued the job and a
second call could start a duplicate, because mkhls's guard only blocks jobs
that are still pending or running.

checkVideoStatus reports presets_done/presets_total and omits
progress_percent, which mkhls never advances. It mirrors the status into a
deprecated bunnyStatus key so the admin panel keeps working until Plan 3.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: `getVideo` — stream token, HLS URL, resume position

The playback path, and the largest behavioural change in the plan. Four things happen here: the signed Bunny embed becomes a path-scoped mkhls token, the response gains `progress` so the player can resume, the phantom `rating` field goes, and the `viewCount` increment leaves (Task 12 gives it a home where it means something).

The `player` contract from spec §6 is preserved exactly: `null` whenever the video is not playable, so the existing frontend "video tayyorlanmoqda" branch keeps working until Plan 3.

**Files:**
- Modify: `backend/controllers/videoController.js` (`getVideo` at :56-138)

**Interfaces:**
- Consumes: `mkhls.generateStreamToken`, `mkhls.buildHlsUrl` (Task 3); `Video.streamPath`, `Video.streamStatus` (Task 6)
- Produces: `GET /api/videos/:id` → `{ video, player: {type, hlsUrl, expiresAt} | null, progress: {lastPositionSeconds} | null, streamStatus }`

- [ ] **Step 1: Add the Enrollment import**

At the top of `backend/controllers/videoController.js`:

```js
const Enrollment = require('../models/Enrollment');
```

- [ ] **Step 2: Replace the player block**

Replace lines 91-111 (everything from `// Video Bunny.net da mavjudmi` through the `viewCount` increment):

```js
    // ─── Player ──────────────────────────────────────────────────────────────
    // player === null bo'lsa frontend "tayyorlanmoqda" ekranini ko'rsatadi —
    // bu shartnoma o'zgarmadi.
    let player = null;

    if (!video.streamPath) {
      console.warn(`[Video ${id}] streamPath yo'q — video hali yuklanmagan`);
    } else if (video.streamStatus !== 'ready') {
      console.warn(`[Video ${id}] streamStatus: ${video.streamStatus} — hali tayyor emas`);
    } else {
      try {
        const { token, expiresAt } = await mkhls.generateStreamToken(video.streamPath);
        player = {
          type: 'hls',
          hlsUrl: mkhls.buildHlsUrl(video.streamPath, token),
          expiresAt,
        };
      } catch (err) {
        console.error('[video] stream token:', err.code, err.message);
        // mkhls o'chgan bo'lsa video haqiqatan ham ko'rsatib bo'lmaydi —
        // 200 + player:null "tayyorlanmoqda" deb yolg'on aytardi (spec §11).
        return res.status(503).json({
          success: false,
          message: 'Video vaqtincha mavjud emas. Birozdan keyin urinib ko\'ring.',
        });
      }
    }

    // ─── Resume pozitsiyasi ──────────────────────────────────────────────────
    let progress = null;
    const enrollment = await Enrollment.findOne({
      userId: req.user._id,
      courseId: video.course?._id || video.course,
    })
      .select('watchedVideos')
      .lean();

    const watched = enrollment?.watchedVideos?.find(
      (w) => String(w.videoId) === String(video._id)
    );
    if (watched) {
      progress = { lastPositionSeconds: watched.watchedSeconds || 0 };
    }
```

Note there is no `Video.findByIdAndUpdate($inc: viewCount)` any more. It counted every page refresh and counted videos that never played.

- [ ] **Step 3: Replace the response body**

```js
    res.json({
      success: true,
      data: {
        video: {
          _id: video._id,
          title: video.title,
          description: video.description,
          duration: video.duration,
          order: video.order,
          thumbnail: video.thumbnail,
          materials: video.materials,
          course: video.course,
          views: video.viewCount,
          // `rating` olib tashlandi: models/Video.js da bunday field yo'q,
          // ya'ni u har doim undefined qaytardi.
        },
        player,
        progress,
        // Frontend "tayyorlanmoqda" ekranida nimani pollinq qilishni bilishi uchun.
        streamStatus: video.streamStatus,
      },
    });
```

- [ ] **Step 4: Play it as a real, subscribed user**

Using `USER_TOKEN` from Task 2 and the now-`ready` `VIDEO_ID` from Task 8:

```bash
curl -sS "http://localhost:5000/api/videos/$VIDEO_ID" -H "Authorization: Bearer $USER_TOKEN"
```

Expected: `player.type === "hls"`, an `hlsUrl` pointing at `http://localhost:8080/vod/aidevix/<VIDEO_ID>.mp4/master.m3u8?token=…`, a future `expiresAt`, `progress: null` (nothing watched yet), and **no** `rating` key.

A 403 here means the seeded user's subscriptions are missing — re-run the Task 2 seed; `subscriptionCache` also holds a negative result for 5 minutes, so restart `npm run dev` after re-seeding.

- [ ] **Step 5: Open the URL in a browser**

Paste the `hlsUrl` into a player (Safari plays HLS natively; elsewhere use `ffplay` or an HLS test page).

Expected: the clip plays and quality switching works. This is the first moment the whole chain — Aidevix auth → mkhls token → mkhls VOD → ffmpeg output — is proven end to end.

- [ ] **Step 6: Confirm the token really is scoped to this lesson**

Take the `token` query value from that URL and point it at a different path:

```bash
TOK='<token from hlsUrl>'
curl -s -o /dev/null -w '%{http_code}\n' \
  "http://localhost:8080/vod/aidevix/other.mp4/master.m3u8?token=$TOK"
```

Expected: **403**. Repeat immediately to cover the 30-second cache window Task 1 closed — still 403.

- [ ] **Step 7: Confirm the not-ready and unreachable paths**

```bash
# A video with no upload yet — create a second one via Task 7's command first.
curl -sS "http://localhost:5000/api/videos/$SECOND_VIDEO_ID" -H "Authorization: Bearer $USER_TOKEN"

docker compose -f docker-compose.dev.yml stop mkhls
curl -sS -o /dev/null -w '%{http_code}\n' "http://localhost:5000/api/videos/$VIDEO_ID" \
  -H "Authorization: Bearer $USER_TOKEN"
docker compose -f docker-compose.dev.yml start mkhls
```

Expected: the first is `200` with `player: null` and `streamStatus: "pending"`; the second is **503**.

- [ ] **Step 8: Commit**

```bash
git add backend/controllers/videoController.js
git commit -m "feat(video): serve HLS through a path-scoped mkhls token

getVideo mints a token restricted to /vod/{streamPath} with no client_ip —
mobile IPs change mid-lesson and an IP-bound token kills the player — and
returns the resume position so the player can pick up where the viewer left
off.

player stays null whenever the video is not playable, preserving the
contract the current frontend branches on. An unreachable mkhls returns 503
rather than a 200 that would claim the video is still processing.

Drops rating, which no schema field backs and which was always undefined,
and drops the viewCount increment: it counted every refresh, including
refreshes of videos that never played. Task 12 gives it a real trigger.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: `deleteVideo` and the admin search projection

**Files:**
- Modify: `backend/controllers/videoController.js` (`deleteVideo` at :352-386, `searchVideos` at :709)
- Modify: `backend/controllers/adminController.js` (`globalSearch` at :269)

**Interfaces:**
- Consumes: `mkhls.deleteVideo` (Task 4)
- Produces: no new interface — `DELETE /api/videos/:id` now also removes the mkhls record

- [ ] **Step 1: Rewrite the provider-delete block in `deleteVideo`**

Replace lines 365-372:

```js
    // mkhls'dan ham o'chiramiz. Xato bo'lsa ham davom etamiz: DB yozuvini
    // qoldirish foydalanuvchiga o'chirilgan darsni ko'rsatib turishdan yomonroq.
    if (video.streamPath) {
      try {
        const removed = await mkhls.deleteVideo(video.streamPath);
        if (!removed) {
          console.warn(`[video] mkhls'da yozuv topilmadi: ${video.streamPath}`);
        }
      } catch (err) {
        console.error('[video] mkhls delete:', err.code, err.message);
      }
    }

    // Eski Bunny videolari uchun (DEPRECATED — bir reliz).
    if (video.bunnyVideoId) {
      try {
        await deleteBunnyVideo(video.bunnyVideoId);
      } catch (bunnyErr) {
        console.error('Bunny delete error:', bunnyErr.message);
      }
    }
```

- [ ] **Step 2: Update the two remaining `bunnyStatus` projections**

`videoController.searchVideos` (line 709):

```js
        .select('title description order duration thumbnail course streamStatus')
```

`adminController.globalSearch` (line 269):

```js
        .select('title streamStatus course duration')
```

- [ ] **Step 3: Confirm nothing else still projects the dead field**

```bash
cd backend
grep -rn "bunnyStatus\|bunnyVideoId" controllers/ routes/ models/ utils/ | grep -v "utils/bunny.js"
```

Expected: only `models/Video.js` (the deprecated schema fields), `controllers/adminController.js`'s `bulkLinkBunny` (deprecated, spec §16.6), and the `bunnyStatus` mirror added in Task 8. Anything else is a projection that was missed.

- [ ] **Step 4: Delete a real video and watch both sides**

```bash
docker compose -f docker-compose.dev.yml exec mongo mongosh aidevix_dev \
  --quiet --eval 'db.videos.countDocuments()'

curl -sS -X DELETE "http://localhost:5000/api/videos/$VIDEO_ID" -H "Authorization: Bearer $ADMIN_TOKEN"

curl -sS "http://localhost:8080/admin/videos/aidevix_$VIDEO_ID.mp4" \
  -H "Authorization: Bearer $(curl -sS -X POST http://localhost:8080/admin/login \
     -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}' \
     | grep -o '"token":"[^"]*"' | cut -d'"' -f4)"
```

Expected: the delete returns success; the mkhls lookup returns `NOT_FOUND`. Note that the HLS cache directory and the source mp4 remain on disk — mkhls's `DeleteVideo` only removes the DB row (spec §15.3), and reclaiming that space is a stage-9 concern, not a bug in this task.

- [ ] **Step 5: Commit**

```bash
git add backend/controllers/videoController.js backend/controllers/adminController.js
git commit -m "feat(video): delete from mkhls and finish the bunnyStatus projections

Deleting is best-effort against mkhls: leaving the DB row behind would keep
showing a deleted lesson to users, which is worse than an orphaned record.
The legacy Bunny delete stays for rows that still carry bunnyVideoId.

searchVideos and adminController.globalSearch now project streamStatus.

Note: mkhls DeleteVideo removes only its DB row — the HLS cache directory
and the source file stay on disk. Reclaiming that is stage 9's work.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Controller integration tests for `getVideo`

Spec §12 asks for `getVideo` covered with mkhls mocked across ready / processing / failed / mkhls-down. Tasks 7–10 verified those by hand; this pins them so a later change cannot quietly undo one.

This repo already has a pattern for it (`__tests__/integration/auth.routes.test.js`): `jest.mock` the models, mount the real router on a bare Express app, drive it with `supertest`. No database is involved — that is deliberate, and it complements rather than replaces the live harness from Task 2.

**Files:**
- Create: `backend/__tests__/integration/video.routes.test.js`

**Interfaces:**
- Consumes: `routes/videoRoutes.js` and everything Tasks 7–10 changed
- Produces: no runtime interface

- [ ] **Step 1: Write the test file**

Create `backend/__tests__/integration/video.routes.test.js`:

```js
'use strict';

const express = require('express');
const request = require('supertest');

// Variables referenced inside a jest.mock factory must be prefixed `mock`.
const mockUserId = '507f1f77bcf86cd799439011';

jest.mock('../../models/Video');
jest.mock('../../models/Course');
jest.mock('../../models/Enrollment');
jest.mock('../../models/User');
jest.mock('../../models/VideoLink');
jest.mock('../../models/VideoQuestion');
jest.mock('../../utils/mkhls');
jest.mock('../../utils/bunny');
jest.mock('../../utils/checkSubscriptions', () => ({
  performSubscriptionCheck: jest.fn().mockResolvedValue({
    instagramSubscribed: true,
    telegramSubscribed: true,
    changed: false,
  }),
}));
jest.mock('../../middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { _id: mockUserId };
    next();
  },
  requireAdmin: (req, res, next) => next(),
}));
jest.mock('../../middleware/subscriptionCheck', () => ({
  checkSubscriptions: (req, res, next) => next(),
}));

const Video = require('../../models/Video');
const Enrollment = require('../../models/Enrollment');
const mkhls = require('../../utils/mkhls');

const VIDEO_ID = '68f00112233445566778899a';
const COURSE_ID = '68f00112233445566778899b';

const app = express();
app.use(express.json());
app.use('/api/videos', require('../../routes/videoRoutes'));

// getVideo does Video.findById(id).populate('course').lean()
const mockVideo = (overrides) => {
  Video.findById.mockReturnValue({
    populate: () => ({
      lean: async () => ({
        _id: VIDEO_ID,
        title: 'Dars 1',
        description: 'test',
        duration: 120,
        order: 1,
        thumbnail: null,
        materials: [],
        viewCount: 7,
        isActive: true,
        course: { _id: COURSE_ID, category: 'general', title: 'Kurs' },
        streamPath: `aidevix/${VIDEO_ID}.mp4`,
        streamStatus: 'ready',
        ...overrides,
      }),
    }),
  });
};

// getVideo does Enrollment.findOne(...).select(...).lean()
const mockEnrollment = (watchedVideos) => {
  Enrollment.findOne.mockReturnValue({
    select: () => ({ lean: async () => (watchedVideos ? { watchedVideos } : null) }),
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockEnrollment(null);
  mkhls.buildHlsUrl.mockImplementation(
    (streamPath, token) => `https://stream.test/vod/${streamPath}/master.m3u8?token=${token}`
  );
});

describe('GET /api/videos/:id', () => {
  it('returns an hls player when the video is ready', async () => {
    mockVideo();
    const expiresAt = new Date(Date.now() + 14400000);
    mkhls.generateStreamToken.mockResolvedValue({ token: 'tok-1', expiresAt });

    const res = await request(app).get(`/api/videos/${VIDEO_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.player).toEqual({
      type: 'hls',
      hlsUrl: `https://stream.test/vod/aidevix/${VIDEO_ID}.mp4/master.m3u8?token=tok-1`,
      expiresAt: expiresAt.toISOString(),
    });
    expect(mkhls.generateStreamToken).toHaveBeenCalledWith(`aidevix/${VIDEO_ID}.mp4`);
  });

  it('returns the resume position when the user has watched before', async () => {
    mockVideo();
    mkhls.generateStreamToken.mockResolvedValue({ token: 'tok-1', expiresAt: new Date() });
    mockEnrollment([{ videoId: VIDEO_ID, watchedSeconds: 734 }]);

    const res = await request(app).get(`/api/videos/${VIDEO_ID}`);

    expect(res.body.data.progress).toEqual({ lastPositionSeconds: 734 });
  });

  it('returns a null player while the video is still processing', async () => {
    mockVideo({ streamStatus: 'processing' });

    const res = await request(app).get(`/api/videos/${VIDEO_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.player).toBeNull();
    expect(res.body.data.streamStatus).toBe('processing');
    expect(mkhls.generateStreamToken).not.toHaveBeenCalled();
  });

  it('returns a null player when transcoding failed', async () => {
    mockVideo({ streamStatus: 'failed' });

    const res = await request(app).get(`/api/videos/${VIDEO_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.player).toBeNull();
    expect(res.body.data.streamStatus).toBe('failed');
  });

  it('returns a null player when the video was never uploaded', async () => {
    mockVideo({ streamPath: null, streamStatus: 'pending' });

    const res = await request(app).get(`/api/videos/${VIDEO_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.player).toBeNull();
  });

  it('returns 503 when mkhls is unreachable, not a 200 claiming it is processing', async () => {
    mockVideo();
    const err = new Error('mkhls unreachable');
    err.code = 'UNREACHABLE';
    mkhls.generateStreamToken.mockRejectedValue(err);

    const res = await request(app).get(`/api/videos/${VIDEO_ID}`);

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
  });

  it('does not expose a rating field that no schema backs', async () => {
    mockVideo();
    mkhls.generateStreamToken.mockResolvedValue({ token: 'tok-1', expiresAt: new Date() });

    const res = await request(app).get(`/api/videos/${VIDEO_ID}`);

    expect(res.body.data.video).not.toHaveProperty('rating');
  });

  it('does not increment viewCount on a page load', async () => {
    mockVideo();
    mkhls.generateStreamToken.mockResolvedValue({ token: 'tok-1', expiresAt: new Date() });

    await request(app).get(`/api/videos/${VIDEO_ID}`);

    expect(Video.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});

describe('GET /api/videos/course/:courseId', () => {
  it('never projects the storage path on the unauthenticated listing', async () => {
    let projection = '';
    Video.find.mockReturnValue({
      select: (fields) => {
        projection = fields;
        return { sort: () => ({ lean: async () => [] }) };
      },
    });

    await request(app).get(`/api/videos/course/${COURSE_ID}`);

    expect(projection).not.toMatch(/streamPath/);
    expect(projection).not.toMatch(/bunnyVideoId/);
    expect(projection).toMatch(/streamStatus/);
  });
});
```

`VIDEO_ID` and `COURSE_ID` are valid 24-character hex strings on purpose: the route runs the real `validateObjectId()` middleware, and anything else 404s before the controller is reached.

- [ ] **Step 2: Run them**

```bash
cd backend
npx jest __tests__/integration/video.routes.test.js
```

Expected: PASS. Two failure modes are worth naming:

- `Video.findById is not a function` — the auto-mock did not take; confirm the `jest.mock` calls sit above the `require`s (Babel hoists them, but an inline `require` inside a factory does not get the same treatment).
- A 404 on every request — `validateObjectId` rejected the ID, or the route path is wrong. Log `res.body`.

- [ ] **Step 3: Run the full suite**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/__tests__/integration/video.routes.test.js
git commit -m "test(video): pin getVideo across all four mkhls states

Tasks 7-10 verified these by hand against a live mkhls; this pins them so a
later change cannot quietly turn the unreachable case back into a 200 that
claims the video is still processing, or reintroduce the storage path on the
unauthenticated course listing.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Watch progress delta and a `viewCount` that means something

Two data bugs from spec §6, both in the enrollment path.

**The progress bug.** The frontend sends a **cumulative** value — `10, 20, 30, …` (`frontend/src/app/videos/[id]/page.tsx:147`, and again at `playground/page.tsx:217`) — and the backend *adds* it to a running total (`enrollmentController.js:89`). Five minutes of watching is recorded as `10+20+…+300 = 4650` seconds: 77 minutes. Every course-time statistic in the product is inflated by roughly the square of the real number.

The fix is to make the contract explicit: the client reports its **current position**, and the backend derives the delta. The delta is clamped to 120s so that seeking forward, or replaying the request by hand, cannot add hours.

Back-compat matters here: the two frontend call sites keep sending `watchedSeconds` until Plan 3. Both names are accepted for one release, and — critically — the old cumulative value still produces a *sane* number under the new logic, because a monotonically growing value clamped by delta is exactly what the new code expects.

**The `viewCount` bug.** `getVideo` incremented on every request (removed in Task 9). It now increments once, when a user's first watch record for that video appears.

The delta arithmetic goes in a pure function so it is testable without a database.

**Files:**
- Create: `backend/utils/watchProgress.js`
- Create: `backend/__tests__/unit/watchProgress.test.js`
- Modify: `backend/controllers/enrollmentController.js` (`markVideoWatched` at :57-111)

**Interfaces:**
- Consumes: nothing
- Produces: `computeWatchDelta(previousPosition: number, currentPosition: number): number` from `backend/utils/watchProgress.js`, plus `MAX_DELTA_SECONDS`

- [ ] **Step 1: Write the failing tests**

Create `backend/__tests__/unit/watchProgress.test.js`:

```js
const { computeWatchDelta, MAX_DELTA_SECONDS } = require('../../utils/watchProgress');

describe('computeWatchDelta', () => {
  it('credits the gap between two positions', () => {
    expect(computeWatchDelta(10, 20)).toBe(10);
    expect(computeWatchDelta(0, 10)).toBe(10);
  });

  it('credits nothing when the viewer seeks backwards', () => {
    expect(computeWatchDelta(300, 120)).toBe(0);
  });

  it('credits nothing when the position has not moved', () => {
    expect(computeWatchDelta(300, 300)).toBe(0);
  });

  it('caps a forward jump so seeking cannot manufacture watch time', () => {
    // A 10s reporting interval cannot legitimately advance by an hour.
    expect(computeWatchDelta(10, 3600)).toBe(MAX_DELTA_SECONDS);
  });

  it('caps the very first report too', () => {
    expect(computeWatchDelta(0, 5000)).toBe(MAX_DELTA_SECONDS);
  });

  it('treats missing or nonsense input as no progress', () => {
    expect(computeWatchDelta(undefined, undefined)).toBe(0);
    expect(computeWatchDelta(null, NaN)).toBe(0);
    expect(computeWatchDelta(0, -50)).toBe(0);
    expect(computeWatchDelta(0, 'abc')).toBe(0);
  });
});
```

- [ ] **Step 2: Run and watch them fail**

```bash
cd backend
npx jest __tests__/unit/watchProgress.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the helper**

Create `backend/utils/watchProgress.js`:

```js
/**
 * Watch-progress arithmetic.
 *
 * The client reports its CURRENT POSITION in the video; the server derives
 * how much new time that represents. The previous contract had the client
 * send a cumulative total which the server then added to a running sum, so
 * five minutes of watching was recorded as 4650 seconds.
 */

// A report arrives roughly every 10 seconds, so no honest report can advance
// by more than this. The cap is what stops a forward seek — or a replayed
// request — from adding hours to a user's totals.
const MAX_DELTA_SECONDS = 120;

const toSeconds = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/**
 * @param {number} previousPosition furthest position recorded so far
 * @param {number} currentPosition  position reported now
 * @returns {number} seconds to credit — never negative, never above the cap
 */
const computeWatchDelta = (previousPosition, currentPosition) => {
  const prev = toSeconds(previousPosition);
  const now = toSeconds(currentPosition);
  return Math.max(0, Math.min(now - prev, MAX_DELTA_SECONDS));
};

module.exports = { computeWatchDelta, MAX_DELTA_SECONDS };
```

- [ ] **Step 4: Run the tests**

```bash
npx jest __tests__/unit/watchProgress.test.js
```

Expected: PASS.

- [ ] **Step 5: Rewrite `markVideoWatched`**

In `backend/controllers/enrollmentController.js`, add the imports:

```js
const Video = require('../models/Video');
const { computeWatchDelta } = require('../utils/watchProgress');
```

(`Video` is currently required lazily inside `continueLearning` at line 179 — leave that alone; a second top-level require of the same model is harmless in Mongoose, but prefer moving the lazy one out later rather than as part of this task.)

Replace the body from line 59 through line 89:

```js
    const { courseId, videoId } = req.params;
    // Shartnoma: frontend JORIY POZITSIYAni yuboradi, delta emas.
    // `watchedSeconds` — eski nom, bir reliz qabul qilinadi (Plan 3 gacha).
    const { positionSeconds, watchedSeconds } = req.body;
    const position = Number(positionSeconds ?? watchedSeconds ?? 0);

    // PB-005: parallelize independent reads
    const [enrollment, course] = await Promise.all([
      Enrollment.findOne({ userId: req.user._id, courseId }),
      Course.findById(courseId).select('videos').lean(),
    ]);
    if (!enrollment)
      return res.status(404).json({ success: false, message: 'Siz bu kursga yozilmagansiz' });

    const alreadyWatched = enrollment.watchedVideos.find(w => w.videoId.toString() === videoId);
    const previousPosition = alreadyWatched ? alreadyWatched.watchedSeconds || 0 : 0;
    const delta = computeWatchDelta(previousPosition, position);

    if (!alreadyWatched) {
      enrollment.watchedVideos.push({ videoId, watchedSeconds: position });

      // viewCount shu yerda oshadi — foydalanuvchi videoni haqiqatan ko'ra
      // boshlaganda, bir marta. Ilgari u getVideo'da edi va har refresh'da,
      // hatto video umuman o'ynamaganda ham oshardi.
      Video.updateOne({ _id: videoId }, { $inc: { viewCount: 1 } })
        .exec()
        .catch(err => console.error('[enrollment] viewCount inc:', err.message));

      // ActivityLog: birinchi ko'rishni denormalized log'ga yoz (fire-and-forget)
      // getHomeStats aggregation'ini tezlashtirish uchun (PB-001)
      ActivityLog.create({
        userId: req.user._id,
        videoId,
        courseId,
      }).catch(err => console.error('[ActivityLog] yozishda xato:', err.message));
    } else {
      // Orqaga seek qilish eng uzoq ko'rilgan nuqtani kamaytirmaydi.
      alreadyWatched.watchedSeconds = Math.max(previousPosition, position);
    }

    // Progress hisoblash
    const totalVideos = course ? course.videos.length : 0;
    enrollment.progressPercent = totalVideos > 0
      ? Math.round((enrollment.watchedVideos.length / totalVideos) * 100)
      : 0;
    enrollment.totalWatchedSeconds += delta;
```

- [ ] **Step 6: Run the whole suite**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 7: Verify the arithmetic against the real database**

Enroll the seeded student, then simulate what the frontend actually does today — a cumulative sequence — and confirm the total is now sane:

```bash
curl -sS -X POST "http://localhost:5000/api/enrollments/$COURSE_ID" \
  -H "Authorization: Bearer $USER_TOKEN"

for POS in 10 20 30 40 50; do
  curl -sS -X POST "http://localhost:5000/api/enrollments/$COURSE_ID/watch/$VIDEO_ID" \
    -H "Authorization: Bearer $USER_TOKEN" -H 'Content-Type: application/json' \
    -d "{\"positionSeconds\":$POS}" > /dev/null
done

docker compose -f ../docker-compose.dev.yml exec mongo mongosh aidevix_dev --quiet \
  --eval 'db.enrollments.findOne({}, {totalWatchedSeconds:1, progressPercent:1, watchedVideos:1})'
```

Expected: `totalWatchedSeconds = 50`, and the video's `watchedSeconds = 50`. Under the old code this sequence produced `150`.

- [ ] **Step 8: Verify the clamp and the rewind**

```bash
# A forward jump of an hour credits at most 120s.
curl -sS -X POST "http://localhost:5000/api/enrollments/$COURSE_ID/watch/$VIDEO_ID" \
  -H "Authorization: Bearer $USER_TOKEN" -H 'Content-Type: application/json' \
  -d '{"positionSeconds":3600}' > /dev/null

# Rewinding credits nothing and does not lower the furthest point.
curl -sS -X POST "http://localhost:5000/api/enrollments/$COURSE_ID/watch/$VIDEO_ID" \
  -H "Authorization: Bearer $USER_TOKEN" -H 'Content-Type: application/json' \
  -d '{"positionSeconds":5}' > /dev/null

docker compose -f ../docker-compose.dev.yml exec mongo mongosh aidevix_dev --quiet \
  --eval 'db.enrollments.findOne({}, {totalWatchedSeconds:1, watchedVideos:1})'
```

Expected: `totalWatchedSeconds = 170` (50 + 120, not 50 + 3550) and `watchedSeconds = 3600` — the furthest point stands after the rewind.

- [ ] **Step 9: Verify the legacy field name still works**

```bash
curl -sS -X POST "http://localhost:5000/api/enrollments/$COURSE_ID/watch/$VIDEO_ID" \
  -H "Authorization: Bearer $USER_TOKEN" -H 'Content-Type: application/json' \
  -d '{"watchedSeconds":3650}'
```

Expected: success, `totalWatchedSeconds` grows by 50. The unmodified frontend must keep working until Plan 3.

- [ ] **Step 10: Verify `viewCount` counts watches, not refreshes**

```bash
curl -sS "http://localhost:5000/api/videos/$VIDEO_ID" -H "Authorization: Bearer $USER_TOKEN" > /dev/null
curl -sS "http://localhost:5000/api/videos/$VIDEO_ID" -H "Authorization: Bearer $USER_TOKEN" > /dev/null

docker compose -f ../docker-compose.dev.yml exec mongo mongosh aidevix_dev --quiet \
  --eval 'db.videos.findOne({}, {title:1, viewCount:1})'
```

Expected: `viewCount = 1` — one first-watch, unchanged by two page loads.

- [ ] **Step 11: Commit**

```bash
git add backend/utils/watchProgress.js backend/__tests__/unit/watchProgress.test.js backend/controllers/enrollmentController.js
git commit -m "fix(enrollment): derive watch time from position, count views on first watch

The client sent a cumulative total and the server added it to a running sum,
so five minutes of watching recorded as 4650 seconds. The contract is now
explicit — the client reports its current position and the server derives
the delta, clamped to 120s so a forward seek or a replayed request cannot
add hours. The old watchedSeconds field name is still accepted for one
release; a cumulative value produces a sane number under the new logic.

viewCount moves here from getVideo, where it incremented on every request
including refreshes of videos that never played. It now increments once,
when a user's first watch record for that video appears.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: End-to-end verification and whole-branch review

Every task above was verified in isolation. In stages 1–2 the defect that mattered most was invisible to all nine per-task reviews, because each task was individually correct and the bug lived in how they combined. This task exists to find that class of defect.

**Files:**
- Modify: whatever the review turns up
- Create: `docs/superpowers/HANDOFF.md` update (replace the stale Plan 2 handoff)

**Interfaces:**
- Consumes: everything
- Produces: a verified branch and a handoff for Plan 3

- [ ] **Step 1: Reset to a clean state and run the full chain once, unbroken**

```bash
cd aidevixBackend
docker compose -f docker-compose.dev.yml down -v
rm -rf .data/media/aidevix .data/cache/vod
export MKHLS_VOD_TRANSCODE_ON_UPLOAD=true
docker compose -f docker-compose.dev.yml up -d --build
cd backend && node scripts/seed-dev-user.js && npm run dev
```

Then, in order, with nothing skipped:

1. `POST /api/videos` → note `streamPath`
2. `PUT /api/videos/:id/upload-proxy` with a real mp4
3. Poll `GET /api/videos/:id/status` until `ready`
4. `GET /api/videos/:id` as the **student** → play `hlsUrl` in a browser
5. `POST /api/enrollments/:courseId/watch/:videoId` with a few positions
6. `GET /api/videos/:id` again → confirm `progress.lastPositionSeconds` matches
7. `DELETE /api/videos/:id` → confirm it is gone from both sides

Note: with `MKHLS_TRANSCODE_ON_UPLOAD=true` in the container, `backend/.env` must also say `true`, or both sides will queue the job. Verifying that the two agree is part of this step.

- [ ] **Step 2: Re-run the same chain with `transcode_on_upload=false` on both sides**

```bash
docker compose -f docker-compose.dev.yml down
export MKHLS_VOD_TRANSCODE_ON_UPLOAD=false
# set MKHLS_TRANSCODE_ON_UPLOAD=false in backend/.env too
docker compose -f docker-compose.dev.yml up -d
```

Expected: identical outcome — this time the backend queues the transcode. Both configurations must work; the spec's default is `false` and the local compose default is `false`.

- [ ] **Step 3: Confirm the source file survived**

```bash
ls -la .data/media/aidevix/
```

Expected: the source mp4 is still there. `delete_source_after_transcode` is deliberately off locally, and stages 1–2 found a data-loss bug in exactly this area — confirm it stays fixed.

- [ ] **Step 4: Read the entire branch diff in one sitting**

```bash
cd aidevixBackend
git diff main...HEAD --stat
git diff main...HEAD
cd ../mkhls-streamer
git diff 51dd410..HEAD --stat
```

Read it as a reviewer who did not write it. Specifically look for the failures a per-task review structurally cannot see:

- A field written in one task and read under a different name in another (`streamStatus` vs `bunnyStatus`, `watchedSeconds` vs `positionSeconds`)
- A status that one task can produce and another never handles
- Two tasks that both queue a transcode, or neither
- An error path that returns 200 with a null payload where the caller expects a failure
- Anything that writes to the backend's local disk
- `streamPath` reaching an unauthenticated response

- [ ] **Step 5: Run every test in both repos**

```bash
cd aidevixBackend/backend && npm test
cd ../../mkhls-streamer && go test ./...
```

Expected: PASS in both. Record the actual counts — do not claim success without reading the output.

- [ ] **Step 6: Confirm nothing calls Bunny on the new path**

```bash
cd aidevixBackend/backend
grep -rn "require('../utils/bunny')\|require(\"../utils/bunny\")" controllers/ routes/ scripts/
```

Expected: `videoController.js` (legacy delete only) and `adminController.js` (`bulkLinkBunny`, deprecated). If `createVideo`, `uploadVideoProxy`, `checkVideoStatus` or `getVideo` still reach into it, a task was left half-done.

- [ ] **Step 7: Fix what the review found, then re-verify**

Each fix gets its own commit with a message that says what the interaction was, not just what changed. If a fix touches a task's behaviour, re-run that task's manual verification — not just the test suite.

- [ ] **Step 8: Rewrite the handoff for Plan 3**

Replace `docs/superpowers/HANDOFF.md` with the Plan 3 entry point, following the existing structure: what is done, which repos and branches hold it, how to bring the environment up, the findings that contradict the spec, Plan 3's scope (spec stages 6–7: `LessonPlayer`, `page.tsx`, slice/types, admin panel renames), and the two practices worth keeping. Carry forward specifically:

- **Both** frontend progress call sites must move to `positionSeconds` (`videos/[id]/page.tsx:147` and `videos/[id]/playground/page.tsx:217`); the backend accepts the old name for one release only.
- The admin panel reads `bunnyStatus`, which `checkVideoStatus` mirrors deliberately — Plan 3 renames it and drops the mirror.
- Progress UI uses `transcode.presetsDone` / `presetsTotal`. There is no percentage; mkhls never advances one.
- `GET /api/videos/:id` now returns `progress.lastPositionSeconds` and `streamStatus` alongside `player`.

- [ ] **Step 9: Commit the handoff**

```bash
git add docs/superpowers/HANDOFF.md
git commit -m "docs: hand off to Plan 3 (frontend player and admin panel)

Stages 3-5 are complete and verified end to end against a live mkhls and a
real database. Records the contracts Plan 3 has to honour: both progress
call sites, the deliberate bunnyStatus mirror, presets-based progress with
no percentage, and the new getVideo response shape.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Notes for the implementer

**When a manual step disagrees with a unit test, the manual step is right.** Every fixture in this plan encodes a belief about mkhls. Task 5 exists precisely because those beliefs were wrong three times in stages 1–2. Correct the client *and* the fixture; never patch around a mismatch at the call site.

**Do not "improve" the Bunny code.** It is deprecated, it is scheduled for deletion, and touching it widens the diff that Task 13 has to review.

**`streamPath` is the only currency between controllers and the client.** If a controller ever computes an ID, builds a `/vod/` URL, or reads `res.data.data`, that logic belongs in `utils/mkhls.js` instead.

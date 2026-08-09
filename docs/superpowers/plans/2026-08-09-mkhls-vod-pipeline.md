# mkhls VOD Pipeline Implementation Plan (Stages 1–2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make mkhls-streamer serve a namespaced, pre-transcoded VOD path end-to-end on local disk — upload → transcode → HLS playback — with no S3 dependency.

**Architecture:** All work is in the `mkhls-streamer` Go repo and is **generic** — no consumer-specific naming. The VOD path is nested (`{namespace}/{id}.mp4`), which is what breaks today: the entity ID collapses separators to `_` while the VOD handler looks things up by the raw URL path. One shared normalization function fixes both the repository lookup and the HLS cache path. On top of that, upload gains a local-disk branch and an explicit storage path, transcoding gains a per-video trigger, progress reporting, and optional source deletion.

**Tech Stack:** Go 1.22+, Gin, GORM/SQLite, FFmpeg 5.0+, Docker Compose. Tests use the **standard library `testing` package only** — `testify` appears in `go.mod` as an *indirect* dependency, so do not import it and do not promote it to a direct dependency for this work.

## Global Constraints

Copied verbatim from the spec (`docs/superpowers/specs/2026-08-05-video-streaming-mkhls-design.md`, rev.2) and from `mkhls-streamer/CLAUDE.md`:

- **No Claude attribution in commits or code comments.** mkhls commits must NOT contain `Co-Authored-By: Claude`. (This differs from the `aidevixBackend` repo — do not copy that convention here.)
- **No consumer-specific naming.** The word "Aidevix" must not appear anywhere in mkhls source, tests, config, or commit messages. Use neutral fixtures like `tenant-a/`, `ns/`, `courses/`.
- **Working copy:** `C:\Users\ASUS\Documents\MyPros\AiDeVix\mkhls-streamer`, branch `main` @ `51dd410`.
- **Push is disabled** on `origin` (push URL is `PUSH-DISABLED--...`). Commit locally only. Do not re-enable push, do not add remotes.
- **Work on branch `feat/vod-local-pipeline`**, never on `main`.
- Commit style: `feat(scope): ...`, `fix(scope): ...`, `test: ...`, `docs: ...`
- After each task, append a short entry to `claude_usage_log.txt` (changed files, problem/solution, result) — required by `CLAUDE.md`.
- Go conventions from `CLAUDE.md`: `context.Context` first parameter, `error` last return, **table-driven tests**, wrap errors with `fmt.Errorf("...: %w", err)`, files `snake_case.go`.
- Domain layer has **no external dependencies** — `internal/domain/entity` may not import Gin, GORM, or infrastructure packages.
- Backward compatibility is mandatory: existing deployments use **flat** filenames (`movie.mp4`). Every change must be a no-op for flat paths. New behaviour is opt-in via config defaulting to `false`.

## File Map

| File | Responsibility | Task |
|---|---|---|
| `internal/domain/entity/video.go` | Export `NormalizeVideoID`; `generateVideoID` delegates to it | 2 |
| `internal/domain/entity/video_test.go` | Table-driven tests for normalization | 2 |
| `internal/interfaces/http/handler/vod_handler.go` | Normalize before repo lookup and cache-path joins | 2 |
| `internal/interfaces/http/handler/vod_handler_test.go` | Regression tests for nested paths | 2 |
| `internal/interfaces/http/handler/admin_handler.go` | Local-disk upload branch, `path` form field, transcode endpoint, progress in GET | 3,4,6 |
| `internal/interfaces/http/handler/admin_handler_test.go` | New file — path sanitization + upload branch tests | 3 |
| `internal/interfaces/http/router.go` | Register `POST /admin/videos/:id/transcode` | 4 |
| `internal/infrastructure/config/config.go` | `TranscodeOnUpload`, `DeleteSourceAfterTranscode` fields | 5,7 |
| `internal/application/service/transcoding_service.go` | Progress accessor; delete source on success | 6,7 |
| `configs/development/config.yaml` | Local dev values | 1 |
| `docker-compose.dev.yml` (in `aidevixBackend`) | Local environment, mkhls only | 1 |

**Ordering rationale:** Task 2 (the bug) comes first because every later task's manual verification depends on nested paths actually working.

Dependencies after that:

- Task 3 needs Task 2 (`entity.NormalizeVideoID`)
- Task 5 needs Task 3 (it edits the upload handler Task 3 rewrote) and Task 4 (the `StartTranscoding` call shape)
- **Task 7 needs Task 5** — `VODConfig.DeleteSourceAfterTranscode` is added there, so Task 7 cannot run standalone
- Task 4 and Task 6 are independent of each other
- Task 8 requires all of them

Follow the numbering unless you have a reason not to; the only genuinely free choice is swapping Task 4 and Task 6.

---

### Task 1: Local development environment

Bring up mkhls on local disk with no S3, and confirm the server answers. This task produces no Go changes — it is the harness every later task is verified against.

**Files:**
- Create: `aidevixBackend/docker-compose.dev.yml`
- Create: `aidevixBackend/.data/media/.gitkeep`, `aidevixBackend/.data/cache/.gitkeep`
- Modify: `aidevixBackend/.gitignore` (ignore `.data/` contents)

**Interfaces:**
- Consumes: nothing
- Produces: a running mkhls at `http://localhost:8080` with media root `/media` and cache root `/cache`, admin credentials `admin` / `admin123`. Every later task's manual step assumes this.

- [ ] **Step 1: Read the existing Docker assets before writing anything**

Run:
```bash
ls mkhls-streamer/deployments/docker/
cat mkhls-streamer/deployments/docker/Dockerfile
cat mkhls-streamer/configs/development/config.yaml
```

You need three facts before continuing: the image build context, the config file path the container expects, and the exact env-var prefix (`CLAUDE.md` documents `MKHLS_`, confirm it in `internal/infrastructure/config/`). Do not guess these — the compose file below assumes the Dockerfile lives at `deployments/docker/Dockerfile` with the repo root as build context, and you must correct it if that is wrong.

- [ ] **Step 2: Write the compose file**

Create `aidevixBackend/docker-compose.dev.yml`:

```yaml
# Local development environment for video streaming.
# mkhls-streamer is built from the sibling checkout; it is NOT vendored into this repo.
services:
  mkhls:
    build:
      context: ../mkhls-streamer
      dockerfile: deployments/docker/Dockerfile
    ports:
      - "8080:8080"
    environment:
      MKHLS_VOD_SOURCE_TYPE: "local"
      MKHLS_VOD_ROOT_PATH: "/media"
      MKHLS_VOD_CACHE_PATH: "/cache"
      MKHLS_VOD_PRE_TRANSCODE: "true"
      # Deliberately OFF locally: source files are reused across test runs.
      MKHLS_VOD_DELETE_SOURCE_AFTER_TRANSCODE: "false"
      MKHLS_AUTH_JWT_SECRET: "dev-only-not-a-real-secret"
    volumes:
      - ./.data/media:/media
      - ./.data/cache:/cache
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:8080/health"]
      interval: 10s
      timeout: 3s
      retries: 5
```

There is no MinIO service. Storage is the local disk in both dev and production, so the dev environment mirrors production (spec section 8).

- [ ] **Step 3: Create the data directories and ignore their contents**

```bash
cd aidevixBackend
mkdir -p .data/media .data/cache
touch .data/media/.gitkeep .data/cache/.gitkeep
```

Append to `aidevixBackend/.gitignore`:

```gitignore
# Local video streaming dev data (media files and HLS cache)
.data/*
!.data/media/.gitkeep
!.data/cache/.gitkeep
```

- [ ] **Step 4: Bring it up and verify health**

Run:
```bash
cd aidevixBackend
docker compose -f docker-compose.dev.yml up -d --build
docker compose -f docker-compose.dev.yml logs -f mkhls
```

Expected: startup logs with no fatal error, then in a second terminal:

```bash
curl -sS http://localhost:8080/health
```

Expected: HTTP 200 with a JSON body.

If the build fails on a missing Dockerfile path, fix the `build:` block using what you learned in Step 1 — do not work around it by running the binary outside Docker, because later tasks depend on the volume layout.

- [ ] **Step 5: Verify admin login works**

Run:
```bash
curl -sS -X POST http://localhost:8080/admin/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}'
```

Expected: JSON containing a JWT. Save it for later tasks:

```bash
export TOKEN=$(curl -sS -X POST http://localhost:8080/admin/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "$TOKEN"
```

If the default credentials are rejected, read `internal/infrastructure/database/migrations.go` for the seeded admin user rather than guessing.

- [ ] **Step 6: Commit**

```bash
cd aidevixBackend
git add docker-compose.dev.yml .gitignore .data/media/.gitkeep .data/cache/.gitkeep
git commit -m "feat(dev): add local mkhls compose environment without MinIO"
```

Note: this commit is in `aidevixBackend`, on branch `docs/spec-video-streaming-rev2`. All remaining tasks commit in `mkhls-streamer`.

---

### Task 2: Fix nested video ID normalization (spec A6)

**This is the highest-risk task and the reason it comes first.** Today, a nested VOD path is looked up two different ways and neither matches what was stored.

Concretely, for the URL `/vod/ns/abc.mp4/master.m3u8`:

| Site | Value used | Source |
|---|---|---|
| `HandleVOD` builds `videoID` | `ns/abc.mp4` | `vod_handler.go:104` — joins path parts with `/` |
| `checkVideoStreamable` queries the repo with | `ns/abc.mp4` | `vod_handler.go:160` |
| The DB row was actually stored as | `ns_abc.mp4` | `entity.generateVideoID`, `video.go:100-103` |
| Transcoder **writes** HLS to | `{cache}/vod/ns_abc.mp4/` | `transcoding_service.go:188` (uses the entity ID) |
| VOD handler **reads** HLS from | `{cache}/vod/ns/abc.mp4/` | `vod_handler.go:218` + `app.go:588` |

Two consequences: status checks silently pass for videos that are `processing` or `failed` (the `err != nil` branch at `vod_handler.go:161-163` means "not in DB → allow"), and **pre-transcoded output is never found**, so every viewer silently triggers JIT transcoding.

This is invisible today because flat filenames (`movie.mp4`) contain no separator, so both forms are identical. It only breaks for nested paths.

**Files:**
- Modify: `internal/domain/entity/video.go:99-103`
- Create: `internal/domain/entity/video_test.go` (check first — if it exists, append)
- Modify: `internal/interfaces/http/handler/vod_handler.go` (lines 159-169, and the cache joins at 207, 218, 289, 300, 367, 376, 594, 621, 722, 729, 748)
- Modify: `internal/interfaces/http/handler/vod_handler_test.go`

**Interfaces:**
- Consumes: nothing
- Produces: `entity.NormalizeVideoID(path string) string` — exported, pure, no dependencies. Tasks 3, 4, 6 and 7 all rely on "the entity ID is `NormalizeVideoID` of the storage path."

- [ ] **Step 1: Write the failing test for the exported normalizer**

Create (or append to) `internal/domain/entity/video_test.go`:

```go
package entity

import "testing"

func TestNormalizeVideoID(t *testing.T) {
	tests := []struct {
		name string
		path string
		want string
	}{
		{"flat filename is unchanged", "movie.mp4", "movie.mp4"},
		{"single nested level", "ns/abc.mp4", "ns_abc.mp4"},
		{"multiple nested levels", "a/b/c.mp4", "a_b_c.mp4"},
		{"leading slash is dropped", "/ns/abc.mp4", "ns_abc.mp4"},
		{"dot segments are cleaned", "ns/./abc.mp4", "ns_abc.mp4"},
		{"backslash separators normalize the same", `ns\abc.mp4`, "ns_abc.mp4"},
		{"already normalized is idempotent", "ns_abc.mp4", "ns_abc.mp4"},
		{"empty string", "", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := NormalizeVideoID(tt.path); got != tt.want {
				t.Errorf("NormalizeVideoID(%q) = %q, want %q", tt.path, got, tt.want)
			}
		})
	}
}

func TestNormalizeVideoIDIsIdempotent(t *testing.T) {
	for _, path := range []string{"movie.mp4", "ns/abc.mp4", "a/b/c.mp4"} {
		once := NormalizeVideoID(path)
		twice := NormalizeVideoID(once)
		if once != twice {
			t.Errorf("not idempotent for %q: %q then %q", path, once, twice)
		}
	}
}
```

Idempotency matters because callers cannot always tell whether the value they hold is already an ID or still a path. Making double-normalization safe removes a whole class of bug.

The leading-slash and backslash cases are the ones most likely to fail: `filepath.Clean` is OS-dependent, and on Linux it will not convert `\` to `/`. If the backslash case cannot be satisfied without OS-specific behaviour, replace **both** separators explicitly rather than relying on `filepath.Separator`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `go test ./internal/domain/entity/ -run TestNormalizeVideoID -v`
Expected: FAIL — `undefined: NormalizeVideoID`

- [ ] **Step 3: Implement the normalizer**

In `internal/domain/entity/video.go`, replace the existing `generateVideoID` (lines 99-103):

```go
// NormalizeVideoID converts a storage path into the canonical video ID.
// Path separators collapse to underscores so that a nested path such as
// "ns/abc.mp4" yields a single flat identifier usable as a DB key, a URL
// route parameter, and a cache directory name.
//
// It is idempotent: normalizing an already-normalized ID returns it unchanged.
// Both "/" and "\" are treated as separators regardless of host OS, so the
// same input yields the same ID on every platform.
func NormalizeVideoID(path string) string {
	if path == "" {
		return ""
	}
	unified := strings.ReplaceAll(path, "\\", "/")
	cleaned := gopath.Clean(unified)
	cleaned = strings.TrimPrefix(cleaned, "/")
	return strings.ReplaceAll(cleaned, "/", "_")
}

// generateVideoID generates a unique ID for a video based on its path.
func generateVideoID(path string) string {
	return NormalizeVideoID(path)
}
```

Add the import `gopath "path"` alongside the existing imports. Use `path` (slash-only, OS-independent), **not** `path/filepath` — the original used `filepath`, and that is precisely why behaviour differed between Windows and Linux. Verify `strings` and `filepath` are still needed by the rest of the file before removing either import.

- [ ] **Step 4: Run the test to verify it passes**

Run: `go test ./internal/domain/entity/ -run TestNormalizeVideoID -v`
Expected: PASS, all subtests.

Then confirm nothing else in the domain broke:

Run: `go test ./internal/domain/...`
Expected: PASS

- [ ] **Step 5: Write the failing regression test for the VOD handler**

Open `internal/interfaces/http/handler/vod_handler_test.go` and read the existing setup helpers before writing — reuse the fixture/mock style already there rather than introducing a new one. Add:

```go
// A video stored under a nested path must be found by the VOD handler.
// Before the normalization fix the repo lookup used the raw URL path
// ("ns/abc.mp4") while the record was stored under the entity ID
// ("ns_abc.mp4"), so the lookup always missed and status checks were skipped.
func TestCheckVideoStreamableFindsNestedVideo(t *testing.T) {
	tests := []struct {
		name        string
		storedPath  string
		status      entity.VideoStatus
		urlVideoID  string
		wantBlocked bool
		wantStatus  string
	}{
		{
			name:        "nested processing video is blocked",
			storedPath:  "ns/abc.mp4",
			status:      entity.VideoStatusProcessing,
			urlVideoID:  "ns/abc.mp4",
			wantBlocked: true,
			wantStatus:  string(entity.VideoStatusProcessing),
		},
		{
			name:        "nested ready video is allowed",
			storedPath:  "ns/abc.mp4",
			status:      entity.VideoStatusReady,
			urlVideoID:  "ns/abc.mp4",
			wantBlocked: false,
			wantStatus:  "",
		},
		{
			name:        "flat processing video is still blocked",
			storedPath:  "movie.mp4",
			status:      entity.VideoStatusProcessing,
			urlVideoID:  "movie.mp4",
			wantBlocked: true,
			wantStatus:  string(entity.VideoStatusProcessing),
		},
		{
			name:        "unknown video is still allowed (JIT backward compatibility)",
			storedPath:  "ns/abc.mp4",
			status:      entity.VideoStatusReady,
			urlVideoID:  "other/nothere.mp4",
			wantBlocked: false,
			wantStatus:  "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			video := entity.NewVideo(tt.storedPath)
			video.Status = tt.status

			h := newTestVODHandler(t, video) // see Step 6
			blocked, status := h.checkVideoStreamable(context.Background(), tt.urlVideoID)

			if blocked != tt.wantBlocked {
				t.Errorf("blocked = %v, want %v", blocked, tt.wantBlocked)
			}
			if status != tt.wantStatus {
				t.Errorf("status = %q, want %q", status, tt.wantStatus)
			}
		})
	}
}
```

The last case is deliberate: "not in the DB means allow" is existing intentional behaviour for JIT-only videos (`vod_handler.go:161-163`). The fix must not turn unknown videos into errors — that would break existing deployments.

- [ ] **Step 6: Provide the test handler constructor if one does not exist**

If `vod_handler_test.go` has no reusable constructor, add one backed by a fake repository. Match the `repository.VideoRepository` interface exactly — read `internal/domain/repository/` for the real method set and implement every method; return zero values from the ones the test does not exercise.

```go
type fakeVideoRepo struct {
	byID map[string]*entity.Video
}

func (f *fakeVideoRepo) GetByID(ctx context.Context, id string) (*entity.Video, error) {
	v, ok := f.byID[id]
	if !ok {
		return nil, errors.New("not found")
	}
	return v, nil
}

// ... implement the remaining repository.VideoRepository methods as no-ops.

func newTestVODHandler(t *testing.T, videos ...*entity.Video) *VODHandler {
	t.Helper()
	repo := &fakeVideoRepo{byID: make(map[string]*entity.Video)}
	for _, v := range videos {
		repo.byID[v.ID] = v
	}
	return NewVODHandler(repo, nil, VODConfig{HLSBasePath: t.TempDir()}, logger.NewNop())
}
```

**There is no no-op logger constructor.** `internal/infrastructure/logger/` exposes `NewZapLogger`, `NewDevelopmentLogger`, `NewProductionLogger`, and `NewLogger` — nothing silent. Use `NewDevelopmentLogger()` and ignore the error, or, if the test output is too noisy, add a small stub in the test file implementing the `logger.Logger` interface with empty method bodies. Do not add a no-op constructor to the logger package as part of this task — that is unrelated surface area.

- [ ] **Step 7: Run the test to verify it fails**

Run: `go test ./internal/interfaces/http/handler/ -run TestCheckVideoStreamableFindsNestedVideo -v`
Expected: FAIL on the two nested cases — the processing video is reported as not blocked, because the lookup misses.

- [ ] **Step 8: Fix the repository lookup**

In `internal/interfaces/http/handler/vod_handler.go`, change `checkVideoStreamable` (line 159-169):

```go
func (h *VODHandler) checkVideoStreamable(ctx context.Context, videoID string) (blocked bool, status string) {
	video, err := h.videoRepo.GetByID(ctx, entity.NormalizeVideoID(videoID))
	if err != nil {
		// Video not in DB — allow (backward compatible)
		return false, ""
	}
	if video.IsStreamable() {
		return false, ""
	}
	return true, string(video.Status)
}
```

Add the `entity` import if it is not already present.

- [ ] **Step 9: Run the test to verify it passes**

Run: `go test ./internal/interfaces/http/handler/ -run TestCheckVideoStreamableFindsNestedVideo -v`
Expected: PASS, all four subtests.

- [ ] **Step 10: Fix the cache path mismatch**

This is the second half of the bug and it has no unit test above — it is verified end-to-end in Task 8.

In `vod_handler.go` the HLS cache path is built from the raw URL `videoID` in ten places (lines 207, 218, 289, 300, 367, 376, 594, 621, 722, 729, 748), while `transcoding_service.go:188` writes using the entity ID. Normalize once at the top of each handler rather than editing ten `filepath.Join` calls individually.

Add a helper next to `getParam`:

```go
// cacheID returns the identifier under which HLS output for this video is
// stored in the cache. Transcoding writes output to {cache}/vod/{entity ID},
// so readers must use the same normalization or nested paths never resolve.
func cacheID(videoID string) string {
	return entity.NormalizeVideoID(videoID)
}
```

Then in each handler that reads from the cache — `GetMasterPlaylist`, `GetVariantPlaylist`, `GetSegment`, `GetThumbnail`, and the HEVC helpers around lines 722-748 — derive a local variable immediately after obtaining `videoID` and use it for every `h.hlsBasePath` join:

```go
videoID := getParam(c, "video_id")
cid := cacheID(videoID)
// ...
masterPath := filepath.Join(h.hlsBasePath, cid, "master.m3u8")
```

**Critical:** normalize only the *cache* and *repository* identifiers. Do **not** normalize any value used to locate the **source media file** on disk — the source genuinely lives at the nested path (`{media}/ns/abc.mp4`), and collapsing its separators would break JIT transcoding. Read each site before changing it and confirm whether it is a cache read or a source read. If a site resolves the source, leave `videoID` untouched there.

- [ ] **Step 11: Run the full handler and service test suites**

Run:
```bash
go test ./internal/... 2>&1 | tail -30
```
Expected: PASS. Any pre-existing failure unrelated to this change should be noted in the commit body, not fixed here.

Run: `go build ./...`
Expected: no output.

- [ ] **Step 12: Commit**

```bash
cd mkhls-streamer
git checkout -b feat/vod-local-pipeline
git add internal/domain/entity/video.go internal/domain/entity/video_test.go \
        internal/interfaces/http/handler/vod_handler.go \
        internal/interfaces/http/handler/vod_handler_test.go
git commit -m "fix(vod): normalize nested video IDs for repo and cache lookups

Nested VOD paths were resolved inconsistently. HandleVOD builds the video
ID by joining path segments with '/', but entity.generateVideoID collapses
separators to '_', so the repository lookup in checkVideoStreamable never
matched a stored record. Status checks were therefore skipped for any
nested path, letting processing and failed videos stream.

The same mismatch applied to the HLS cache: the transcoder writes output to
{cache}/vod/{entity ID} while the VOD handler read {cache}/vod/{URL path}.
Pre-transcoded renditions were never found, so every request silently fell
back to JIT transcoding.

Export NormalizeVideoID and use it at both sites. Normalization is now
OS-independent (path, not path/filepath) and idempotent. Flat filenames are
unaffected, so existing deployments see no behaviour change.

Source-file resolution deliberately keeps the raw nested path."
```

Then append to `claude_usage_log.txt` per `CLAUDE.md`.

---

### Task 3: Local-disk upload with client-specified path (spec A5)

`UploadVideo` hard-requires S3 (`admin_handler.go:624-627` returns `500 STORAGE_ERROR` when `h.s3Client == nil`) and uses `header.Filename` as the storage key, so a client cannot choose a namespace. Both must change for local-disk operation.

`AdminHandler` already carries `videoRootPath` (wired from `config.VOD.RootPath` at `app.go:621`), so no constructor change is needed.

**Files:**
- Modify: `internal/interfaces/http/handler/admin_handler.go:598-666`
- Create: `internal/interfaces/http/handler/admin_handler_test.go`

**Interfaces:**
- Consumes: `entity.NormalizeVideoID` (Task 2)
- Produces:
  - `sanitizeStoragePath(requested, fallbackFilename string) (string, error)` — package-private helper in `handler`
  - `POST /admin/videos/upload` accepts an optional `path` form field; response is the existing `AdminVideoItem`

- [ ] **Step 1: Write the failing test for path sanitization**

Create `internal/interfaces/http/handler/admin_handler_test.go`:

```go
package handler

import "testing"

func TestSanitizeStoragePath(t *testing.T) {
	tests := []struct {
		name      string
		requested string
		fallback  string
		want      string
		wantErr   bool
	}{
		{"empty request falls back to filename", "", "movie.mp4", "movie.mp4", false},
		{"simple nested path is kept", "ns/abc.mp4", "upload.mp4", "ns/abc.mp4", false},
		{"deep nested path is kept", "a/b/c.mp4", "upload.mp4", "a/b/c.mp4", false},
		{"leading slash is stripped", "/ns/abc.mp4", "upload.mp4", "ns/abc.mp4", false},
		{"backslashes normalize to slashes", `ns\abc.mp4`, "upload.mp4", "ns/abc.mp4", false},
		{"parent traversal is rejected", "../etc/passwd", "upload.mp4", "", true},
		{"embedded traversal is rejected", "ns/../../etc/passwd", "upload.mp4", "", true},
		{"absolute windows path is rejected", `C:\Windows\evil.mp4`, "upload.mp4", "", true},
		{"path resolving to nothing is rejected", "/", "upload.mp4", "", true},
		{"both empty is rejected", "", "", "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := sanitizeStoragePath(tt.requested, tt.fallback)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error for %q, got path %q", tt.requested, got)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error for %q: %v", tt.requested, err)
			}
			if got != tt.want {
				t.Errorf("sanitizeStoragePath(%q, %q) = %q, want %q", tt.requested, tt.fallback, got, tt.want)
			}
		})
	}
}
```

Traversal rejection is the security-critical case: this path is joined onto the media root and written to, so `..` must never survive.

- [ ] **Step 2: Run the test to verify it fails**

Run: `go test ./internal/interfaces/http/handler/ -run TestSanitizeStoragePath -v`
Expected: FAIL — `undefined: sanitizeStoragePath`

- [ ] **Step 3: Implement the sanitizer**

Add to `admin_handler.go` near the other helpers:

```go
// sanitizeStoragePath resolves the storage path for an upload. The client may
// specify a path (to place the object inside a namespace); if it does not, the
// original filename is used. The result is always relative, slash-separated,
// and free of parent-directory traversal, because it is joined onto the media
// root and written to.
func sanitizeStoragePath(requested, fallbackFilename string) (string, error) {
	candidate := requested
	if strings.TrimSpace(candidate) == "" {
		candidate = fallbackFilename
	}
	if strings.TrimSpace(candidate) == "" {
		return "", fmt.Errorf("no storage path and no filename provided")
	}

	unified := strings.ReplaceAll(candidate, "\\", "/")

	// Reject drive-letter absolute paths before cleaning, since path.Clean
	// treats "C:/..." as an ordinary relative segment.
	if len(unified) >= 2 && unified[1] == ':' {
		return "", fmt.Errorf("absolute path not allowed: %q", requested)
	}

	cleaned := gopath.Clean("/" + unified)
	cleaned = strings.TrimPrefix(cleaned, "/")

	if cleaned == "" || cleaned == "." {
		return "", fmt.Errorf("storage path resolves to empty: %q", requested)
	}
	if cleaned == ".." || strings.HasPrefix(cleaned, "../") {
		return "", fmt.Errorf("path traversal not allowed: %q", requested)
	}
	return cleaned, nil
}
```

Rooting at `/` before `Clean` is what neutralizes traversal: `path.Clean("/ns/../../etc")` yields `/etc`, and any attempt to escape is absorbed rather than producing a `../` prefix. The explicit `..` check afterwards is belt-and-braces for inputs that bypass rooting. Import `gopath "path"` if Task 2 did not already add it to this file.

- [ ] **Step 4: Run the test to verify it passes**

Run: `go test ./internal/interfaces/http/handler/ -run TestSanitizeStoragePath -v`
Expected: PASS, all ten subtests.

- [ ] **Step 5: Rewrite the upload handler body**

Replace `admin_handler.go` lines 620-652 (from `// Generate safe filename` through the `videoRepo.Create` block). Keep the extension validation above it and the response below it unchanged:

```go
	// Resolve where the object will be stored. The client may supply "path"
	// to place the upload inside a namespace; otherwise the filename is used.
	storagePath, err := sanitizeStoragePath(c.PostForm("path"), header.Filename)
	if err != nil {
		response.JSONError(c, http.StatusBadRequest, "INVALID_PATH", err.Error())
		return
	}

	switch {
	case h.s3Client != nil:
		if err := h.s3Client.Upload(ctx, storagePath, file, header.Size, header.Header.Get("Content-Type")); err != nil {
			h.logger.Error("Failed to upload video to S3",
				logger.String("path", storagePath),
				logger.Error(err),
			)
			response.JSONError(c, http.StatusInternalServerError, "UPLOAD_ERROR", "Failed to upload video: "+err.Error())
			return
		}

	case h.videoRootPath != "":
		if err := saveUploadToDisk(h.videoRootPath, storagePath, file); err != nil {
			h.logger.Error("Failed to write video to local storage",
				logger.String("path", storagePath),
				logger.Error(err),
			)
			response.JSONError(c, http.StatusInternalServerError, "UPLOAD_ERROR", "Failed to store video: "+err.Error())
			return
		}

	default:
		response.JSONError(c, http.StatusInternalServerError, "STORAGE_ERROR", "No storage configured: set vod.root_path or enable S3")
		return
	}

	// Create video entity
	video := entity.NewVideo(storagePath)
	video.Status = entity.VideoStatusReady // Ready for JIT streaming

	exists, _ := h.videoRepo.Exists(ctx, storagePath)
	if !exists {
		if err := h.videoRepo.Create(ctx, video); err != nil {
			h.logger.Error("Failed to create video record",
				logger.String("path", storagePath),
				logger.Error(err),
			)
		}
	}
```

Then update the two log fields below (`logger.String("filename", filename)` → `logger.String("path", storagePath)`) so the file compiles — `filename` no longer exists.

`entity.NewVideo(storagePath)` sets `ID = NormalizeVideoID(storagePath)` via Task 2, which is exactly what the transcoder and VOD handler now agree on.

- [ ] **Step 6: Implement the disk writer**

Add near `sanitizeStoragePath`:

```go
// saveUploadToDisk streams an uploaded file to {root}/{storagePath}, creating
// parent directories as needed. The body is streamed rather than buffered so
// that large media files do not have to fit in memory.
func saveUploadToDisk(root, storagePath string, src io.Reader) error {
	dst := filepath.Join(root, filepath.FromSlash(storagePath))

	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	f, err := os.Create(dst)
	if err != nil {
		return fmt.Errorf("failed to create file: %w", err)
	}
	defer f.Close()

	if _, err := io.Copy(f, src); err != nil {
		// Leave no truncated file behind for the transcoder to pick up.
		os.Remove(dst)
		return fmt.Errorf("failed to write file: %w", err)
	}
	return f.Sync()
}
```

Removing the partial file on a copy error matters: a truncated mp4 that survives would be registered and transcoded into broken output. Ensure `io` and `os` are imported.

- [ ] **Step 7: Write an integration test for the disk branch**

Append to `admin_handler_test.go`:

```go
func TestSaveUploadToDisk(t *testing.T) {
	root := t.TempDir()
	content := []byte("fake mp4 bytes")

	if err := saveUploadToDisk(root, "ns/abc.mp4", bytes.NewReader(content)); err != nil {
		t.Fatalf("saveUploadToDisk: %v", err)
	}

	got, err := os.ReadFile(filepath.Join(root, "ns", "abc.mp4"))
	if err != nil {
		t.Fatalf("reading written file: %v", err)
	}
	if !bytes.Equal(got, content) {
		t.Errorf("content = %q, want %q", got, content)
	}
}

func TestSaveUploadToDiskCreatesNestedDirectories(t *testing.T) {
	root := t.TempDir()
	if err := saveUploadToDisk(root, "a/b/c/deep.mp4", bytes.NewReader([]byte("x"))); err != nil {
		t.Fatalf("saveUploadToDisk: %v", err)
	}
	if _, err := os.Stat(filepath.Join(root, "a", "b", "c", "deep.mp4")); err != nil {
		t.Errorf("expected nested file to exist: %v", err)
	}
}
```

- [ ] **Step 8: Run the tests**

Run: `go test ./internal/interfaces/http/handler/ -v -run 'TestSanitizeStoragePath|TestSaveUploadToDisk'`
Expected: PASS

Run: `go build ./... && go test ./internal/...`
Expected: PASS

- [ ] **Step 9: Verify manually against the running container**

```bash
cd aidevixBackend
# Any small real mp4 works; generate one if you have ffmpeg locally.
curl -sS -X POST http://localhost:8080/admin/videos/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@sample.mp4" \
  -F "path=ns/abc.mp4"

ls -la .data/media/ns/
```

Expected: HTTP 201 with an `AdminVideoItem` whose `id` is `ns_abc.mp4`, and `abc.mp4` present under `.data/media/ns/`.

Then confirm traversal is refused:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' -X POST http://localhost:8080/admin/videos/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@sample.mp4" \
  -F "path=../../etc/evil.mp4"
```

Expected: `400`, and no file written outside `.data/media`.

- [ ] **Step 10: Commit**

```bash
git add internal/interfaces/http/handler/admin_handler.go \
        internal/interfaces/http/handler/admin_handler_test.go
git commit -m "feat(admin): support local-disk uploads and client-specified storage path

UploadVideo previously required an S3 client and returned 500 when none was
configured, so a local-disk deployment had no way to upload at all. It also
derived the storage key from the uploaded filename, leaving the client unable
to place objects inside a namespace.

Add a local-disk branch that streams the upload to {vod.root_path}/{path},
and an optional 'path' form field. Paths are sanitized: separators unified,
drive letters and parent traversal rejected, results always relative. S3
remains preferred when configured, so existing deployments are unaffected.

Partial files are removed if the copy fails, so a truncated upload is never
left for the transcoder to pick up."
```

Append to `claude_usage_log.txt`.

---

### Task 4: Per-video transcode endpoint (spec A2)

Transcoding can currently only be triggered by `POST /admin/videos/scan`, which walks a directory. A client that just uploaded one file needs to transcode exactly that file.

`TranscodingService.StartTranscoding(ctx, videoID string, presets []string) (any, error)` already exists (`transcoding_service.go:155`) and already returns an error containing `"already being transcoded"` when a job is in flight (line 168). The endpoint is a thin wrapper.

**Files:**
- Modify: `internal/interfaces/http/handler/admin_handler.go` (add handler)
- Modify: `internal/interfaces/http/router.go` (register route)
- Modify: `internal/interfaces/http/handler/admin_handler_test.go`

**Interfaces:**
- Consumes: `TranscodingStarter` (the existing `h.transcoder` field), `entity.NormalizeVideoID`
- Produces: `POST /admin/videos/:id/transcode` → `202` with `{"job_id","status","presets"}`; `404` unknown video; `409` already transcoding

- [ ] **Step 1: Read the interface and the route table**

Run:
```bash
grep -n "TranscodingStarter" -A 6 internal/interfaces/http/handler/admin_handler.go | head -20
grep -n "admin/videos" internal/interfaces/http/router.go
```

You need the exact `TranscodingStarter` method signature and the exact router group style (middleware, `RequireOperator`, path prefix) before writing either piece. The route must sit under the same operator-protected group as the other video mutations.

- [ ] **Step 2: Write the failing test**

Append to `admin_handler_test.go`:

```go
type fakeTranscoder struct {
	calledWithID      string
	calledWithPresets []string
	err               error
}

func (f *fakeTranscoder) StartTranscoding(ctx context.Context, videoID string, presets []string) (any, error) {
	f.calledWithID = videoID
	f.calledWithPresets = presets
	if f.err != nil {
		return nil, f.err
	}
	return map[string]any{"ID": "job-1", "Status": "pending", "Presets": presets}, nil
}

func TestTranscodeVideoRequestPresets(t *testing.T) {
	tests := []struct {
		name        string
		body        string
		wantPresets []string
	}{
		{"explicit presets are forwarded", `{"presets":["1080p","720p","480p"]}`, []string{"1080p", "720p", "480p"}},
		{"empty body means auto-select", ``, nil},
		{"empty presets array means auto-select", `{"presets":[]}`, nil},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var req TranscodeVideoRequest
			if tt.body != "" {
				if err := json.Unmarshal([]byte(tt.body), &req); err != nil {
					t.Fatalf("unmarshal: %v", err)
				}
			}
			got := req.Presets
			if len(got) == 0 {
				got = nil
			}
			if !reflect.DeepEqual(got, tt.wantPresets) {
				t.Errorf("presets = %v, want %v", got, tt.wantPresets)
			}
		})
	}
}
```

This tests the request contract only. Full HTTP wiring is covered by the manual step and by Task 8 — building a complete Gin test server here would require mocking the whole `AdminHandler` dependency set for little added confidence.

- [ ] **Step 3: Run the test to verify it fails**

Run: `go test ./internal/interfaces/http/handler/ -run TestTranscodeVideoRequestPresets -v`
Expected: FAIL — `undefined: TranscodeVideoRequest`

- [ ] **Step 4: Implement the handler**

Add to `admin_handler.go`:

```go
// TranscodeVideoRequest is the body of a transcode trigger.
type TranscodeVideoRequest struct {
	// Presets to generate. Empty means auto-select from source resolution.
	Presets []string `json:"presets"`
}

// TranscodeVideo starts transcoding for a single video.
//
//	@Summary		Start transcoding a video
//	@Description	Queues a transcoding job for one video
//	@Tags			Admin
//	@Accept			json
//	@Produce		json
//	@Param			id		path		string					true	"Video ID"
//	@Param			request	body		TranscodeVideoRequest	false	"Presets"
//	@Success		202		{object}	map[string]interface{}
//	@Failure		404		{object}	response.ErrorResponse
//	@Failure		409		{object}	response.ErrorResponse
//	@Router			/admin/videos/{id}/transcode [post]
func (h *AdminHandler) TranscodeVideo(c *gin.Context) {
	ctx := c.Request.Context()
	videoID := entity.NormalizeVideoID(c.Param("id"))

	var req TranscodeVideoRequest
	// A missing or empty body is valid: it means auto-select presets.
	_ = c.ShouldBindJSON(&req)

	if _, err := h.videoRepo.GetByID(ctx, videoID); err != nil {
		response.JSONError(c, http.StatusNotFound, "NOT_FOUND", "Video not found")
		return
	}

	job, err := h.transcoder.StartTranscoding(ctx, videoID, req.Presets)
	if err != nil {
		if strings.Contains(err.Error(), "already being transcoded") {
			response.JSONError(c, http.StatusConflict, "ALREADY_TRANSCODING", "Video is already being transcoded")
			return
		}
		h.logger.Error("Failed to start transcoding",
			logger.String("video_id", videoID),
			logger.Error(err),
		)
		response.JSONError(c, http.StatusInternalServerError, "TRANSCODE_ERROR", err.Error())
		return
	}

	h.logger.Info("Transcoding job queued via API",
		logger.String("video_id", videoID),
		logger.Any("presets", req.Presets),
	)

	response.JSON(c, http.StatusAccepted, job)
}
```

Matching on the error string is fragile but is what the current service exposes — it returns a plain `fmt.Errorf`. If `pkg/errors` already defines a sentinel for this, prefer `errors.Is`. Check `pkg/errors` before settling for string matching, and if you add a sentinel, do it in the service and use it here.

- [ ] **Step 5: Register the route**

In `internal/interfaces/http/router.go`, add alongside the existing video routes, inside the same operator-protected group:

```go
videos.POST("/:id/transcode", adminHandler.TranscodeVideo)
```

Match the surrounding group's naming and middleware exactly — copy the style of the adjacent `DELETE /:id` registration rather than inventing a new group.

Gin will reject conflicting wildcards if another route in the same position uses a different parameter name (e.g. `:video_id`). If registration panics at startup, reconcile the parameter names rather than moving the route.

- [ ] **Step 6: Run the tests**

Run: `go test ./internal/interfaces/http/handler/ -run TestTranscodeVideoRequestPresets -v`
Expected: PASS

Run: `go build ./... && go test ./internal/...`
Expected: PASS

- [ ] **Step 7: Verify manually**

```bash
cd aidevixBackend
docker compose -f docker-compose.dev.yml up -d --build

curl -sS -X POST http://localhost:8080/admin/videos/ns_abc.mp4/transcode \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"presets":["720p","480p"]}'
```

Expected: `202` with a job payload.

Immediately repeat the same call. Expected: `409 ALREADY_TRANSCODING`.

Then an unknown ID:
```bash
curl -sS -o /dev/null -w '%{http_code}\n' -X POST http://localhost:8080/admin/videos/nope.mp4/transcode \
  -H "Authorization: Bearer $TOKEN"
```
Expected: `404`.

- [ ] **Step 8: Commit**

```bash
git add internal/interfaces/http/handler/admin_handler.go \
        internal/interfaces/http/handler/admin_handler_test.go \
        internal/interfaces/http/router.go
git commit -m "feat(admin): add per-video transcode endpoint

Transcoding could only be triggered by scanning a directory, so a client that
uploaded a single file had no way to transcode just that file.

Add POST /admin/videos/{id}/transcode under the existing operator guard. An
empty body auto-selects presets from the source resolution. Returns 202 with
the queued job, 404 for an unknown video, and 409 when a job is already in
flight for it."
```

Append to `claude_usage_log.txt`.

---

### Task 5: Transcode on upload (spec A3)

`UploadVideo` marks a video `ready` immediately, leaving it to JIT. On a modest server JIT under concurrent viewers is exactly what pre-transcoding exists to avoid, so uploads should be able to queue a job instead.

**Files:**
- Modify: `internal/infrastructure/config/config.go` (VODConfig, defaults)
- Modify: `internal/interfaces/http/handler/admin_handler.go` (upload tail)
- Modify: `internal/application/app.go` (pass the flag through)

**Interfaces:**
- Consumes: `h.transcoder.StartTranscoding` (Task 4 established the call shape)
- Produces: `VODConfig.TranscodeOnUpload bool` (`mapstructure:"transcode_on_upload"`, default `false`); `AdminHandler.transcodeOnUpload bool`

- [ ] **Step 1: Add the config field**

In `internal/infrastructure/config/config.go`, add to `VODConfig` (after `PreTranscode`, line ~83):

```go
	// TranscodeOnUpload queues a transcoding job as soon as an upload
	// completes, instead of marking the video ready for JIT only.
	TranscodeOnUpload bool `mapstructure:"transcode_on_upload"`

	// DeleteSourceAfterTranscode removes the source media file once every
	// requested preset has completed successfully. Irreversible.
	DeleteSourceAfterTranscode bool `mapstructure:"delete_source_after_transcode"`
```

Both default to `false` via Go's zero value, which is the required backward-compatible behaviour. `DeleteSourceAfterTranscode` is added now so the config struct is touched once; it is wired in Task 7.

- [ ] **Step 2: Add the handler field and wire it**

In `admin_handler.go`, add to the `AdminHandler` struct (after `videoRootPath`):

```go
	transcodeOnUpload bool
```

Add a matching parameter to `NewAdminHandler` after `videoRootPath string`:

```go
	transcodeOnUpload bool,
```

and set it in the returned struct. Then update the single call site in `internal/application/app.go:612-625`, inserting `a.config.VOD.TranscodeOnUpload` immediately after `a.config.VOD.RootPath`.

Adding a positional parameter to a twelve-argument constructor is not lovely, but converting it to an options struct is a wider refactor than this plan should carry. Keep the parameter adjacent to `videoRootPath` so related values stay together.

- [ ] **Step 3: Queue the job after a successful upload**

In `UploadVideo`, replace the fixed status assignment from Task 3:

```go
	video := entity.NewVideo(storagePath)
	video.Status = entity.VideoStatusReady // Ready for JIT streaming
```

with:

```go
	video := entity.NewVideo(storagePath)
	if h.transcodeOnUpload {
		// The video is not streamable until transcoding finishes; the VOD
		// handler blocks non-ready videos, so status must reflect that.
		video.Status = entity.VideoStatusProcessing
	} else {
		video.Status = entity.VideoStatusReady // Ready for JIT streaming
	}
```

Then, after the `videoRepo.Create` block and before the success log, add:

```go
	if h.transcodeOnUpload && h.transcoder != nil {
		if _, err := h.transcoder.StartTranscoding(ctx, video.ID, nil); err != nil {
			// The upload itself succeeded; report that and let the client
			// retry transcoding explicitly rather than losing the file.
			h.logger.Error("Failed to queue transcoding after upload",
				logger.String("video_id", video.ID),
				logger.Error(err),
			)
		}
	}
```

The upload is deliberately **not** failed when queueing fails — the bytes are already on disk, and the client can call the Task 4 endpoint. Failing here would strand the file with no record.

- [ ] **Step 4: Verify the build and existing tests**

Run: `go build ./... && go test ./internal/...`
Expected: PASS. If any test constructs `NewAdminHandler` directly, add the new argument there.

- [ ] **Step 5: Verify manually with the flag on**

The compose file from Task 1 does not set this flag. Add it temporarily:

```bash
cd aidevixBackend
MKHLS_VOD_TRANSCODE_ON_UPLOAD=true docker compose -f docker-compose.dev.yml up -d --build
```

If that env var is not picked up, set `transcode_on_upload: true` under `vod:` in `configs/development/config.yaml` instead — Step 1 of Task 1 established which mechanism this build honours.

```bash
curl -sS -X POST http://localhost:8080/admin/videos/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@sample.mp4" -F "path=ns/auto.mp4"
```

Expected: `201` with `"status":"processing"`, and transcoding activity in the logs without any separate transcode call.

- [ ] **Step 6: Commit**

```bash
git add internal/infrastructure/config/config.go \
        internal/interfaces/http/handler/admin_handler.go \
        internal/application/app.go
git commit -m "feat(vod): add transcode_on_upload config

Uploads were marked ready immediately and left to just-in-time transcoding,
which does not hold up under concurrent viewers on a modest server.

When vod.transcode_on_upload is enabled, an upload is stored as processing
and a transcoding job is queued straight away. The flag defaults to false so
existing deployments keep the current behaviour.

A queueing failure does not fail the upload: the file is already stored, and
the client can trigger transcoding explicitly instead of losing it."
```

Append to `claude_usage_log.txt`.

---

### Task 6: Expose transcode progress (spec A4)

A client polling upload status needs to show progress, not just a status string. `GET /admin/videos/{id}` currently returns neither progress nor preset counts.

**Files:**
- Modify: `internal/application/service/transcoding_service.go` (add accessor)
- Modify: `internal/interfaces/http/handler/admin_handler.go:1284+` (GET handler)

**Interfaces:**
- Consumes: the internal `s.jobs` map (`transcoding_service.go:140`, guarded by `s.jobsMu`)
- Produces: `TranscodeProgress{ProgressPercent float64, PresetsDone []string, PresetsTotal int}` and `(*TranscodingService).GetVideoProgress(videoID string) (TranscodeProgress, bool)`

- [ ] **Step 1: Understand what the job does and does not track**

`TranscodingJob` (`transcoding_service.go:127-141`) has these fields — verified, do not assume others exist:

```go
ID, VideoID, InputPath, OutputPath string
Presets    []string
Codec      string
Status     JobStatus
Progress   float64      // note: float64, not int
StartedAt, FinishedAt time.Time
Error      string
cancel     context.CancelFunc
mu         sync.RWMutex
```

**There is no per-preset completion field.** Rather than adding one and populating it inside the job runner, derive completion from the filesystem: `GetAvailableQualities(videoID) []string` already exists (line 632) and returns exactly the preset names that have a `playlist.m3u8` on disk.

That is the better source anyway — it is ground truth about what was actually produced, rather than a counter that can drift from reality. It also keeps this task independent of Task 7, which needs the same information for a much more consequential decision.

- [ ] **Step 2: Write the failing test**

Append to `internal/application/service/transcoding_service_test.go` (create it if absent):

```go
// newProgressTestService builds a service whose HLS cache contains a
// playlist for each of donePresets, so GetAvailableQualities sees them.
func newProgressTestService(t *testing.T, videoID string, donePresets []string, jobs map[string]*TranscodingJob) *TranscodingService {
	t.Helper()
	root := t.TempDir()
	for _, p := range donePresets {
		dir := filepath.Join(root, "vod", videoID, p)
		if err := os.MkdirAll(dir, 0o755); err != nil {
			t.Fatalf("mkdir: %v", err)
		}
		if err := os.WriteFile(filepath.Join(dir, "playlist.m3u8"), []byte("#EXTM3U\n"), 0o644); err != nil {
			t.Fatalf("write playlist: %v", err)
		}
	}
	return &TranscodingService{outputPath: root, jobs: jobs}
}

func TestGetVideoProgress(t *testing.T) {
	jobs := map[string]*TranscodingJob{
		"job-1": {
			ID:       "job-1",
			VideoID:  "ns_abc.mp4",
			Presets:  []string{"1080p", "720p", "480p"},
			Status:   JobStatusRunning,
			Progress: 42.5,
		},
	}
	s := newProgressTestService(t, "ns_abc.mp4", []string{"480p"}, jobs)

	got, ok := s.GetVideoProgress("ns_abc.mp4")
	if !ok {
		t.Fatal("expected progress for a known video")
	}
	if got.PresetsTotal != 3 {
		t.Errorf("PresetsTotal = %d, want 3", got.PresetsTotal)
	}
	if len(got.PresetsDone) != 1 || got.PresetsDone[0] != "480p" {
		t.Errorf("PresetsDone = %v, want [480p]", got.PresetsDone)
	}
	if got.ProgressPercent != 42.5 {
		t.Errorf("ProgressPercent = %v, want 42.5", got.ProgressPercent)
	}
}

func TestGetVideoProgressUnknownVideo(t *testing.T) {
	s := newProgressTestService(t, "ns_abc.mp4", nil, map[string]*TranscodingJob{})
	if _, ok := s.GetVideoProgress("nope.mp4"); ok {
		t.Error("expected no progress for an unknown video")
	}
}

func TestGetVideoProgressIgnoresHEVCJob(t *testing.T) {
	jobs := map[string]*TranscodingJob{
		"job-h265": {
			ID: "job-h265", VideoID: "ns_abc.mp4", Codec: "h265",
			Presets: []string{"720p"}, Status: JobStatusRunning, Progress: 99,
		},
	}
	s := newProgressTestService(t, "ns_abc.mp4", nil, jobs)
	if _, ok := s.GetVideoProgress("ns_abc.mp4"); ok {
		t.Error("an H.265 background job must not be reported as progress")
	}
}
```

Constructing `TranscodingService` by literal only works from inside the package and only if the zero-valued mutex is usable — it is, since `sync.RWMutex`'s zero value is unlocked. If a required unexported field prevents this, use whatever constructor the package provides instead.

`GetAvailableQualities` filters through `ffmpeg.PresetExists`, so the preset names in the fixture must be real preset names. `480p` and `720p` are; an invented name like `999p` would be silently skipped and the test would fail confusingly.

- [ ] **Step 3: Run the test to verify it fails**

Run: `go test ./internal/application/service/ -run TestGetVideoProgress -v`
Expected: FAIL — `undefined: (*TranscodingService).GetVideoProgress`

- [ ] **Step 4: Implement the accessor**

Add to `transcoding_service.go`:

```go
// TranscodeProgress summarises transcoding state for one video.
type TranscodeProgress struct {
	ProgressPercent float64  `json:"progress_percent"`
	PresetsDone     []string `json:"presets_done"`
	PresetsTotal    int      `json:"presets_total"`
}

// GetVideoProgress returns transcoding progress for a video. The second
// return value is false when no H.264 job exists for it, which is the normal
// case for a video that was never transcoded or whose job has been reaped.
func (s *TranscodingService) GetVideoProgress(videoID string) (TranscodeProgress, bool) {
	// Copy what we need out of the job under the lock, then release it: the
	// completed-preset lookup touches the filesystem and must not hold jobsMu.
	var (
		found    bool
		percent  float64
		total    int
	)

	s.jobsMu.RLock()
	for _, job := range s.jobs {
		// H.265 runs as a background job alongside H.264 and would otherwise
		// report a second, conflicting progress value — same exclusion as
		// StartTranscoding applies at line 165.
		if job.VideoID != videoID || job.Codec == "h265" {
			continue
		}
		job.mu.RLock()
		percent = job.Progress
		total = len(job.Presets)
		job.mu.RUnlock()
		found = true
		break
	}
	s.jobsMu.RUnlock()

	if !found {
		return TranscodeProgress{}, false
	}

	return TranscodeProgress{
		ProgressPercent: percent,
		PresetsDone:     s.GetAvailableQualities(videoID),
		PresetsTotal:    total,
	}, true
}
```

Two details that are easy to get wrong:

- `Progress` is `float64`, so `TranscodeProgress.ProgressPercent` must be `float64` too. Declaring it `int` compiles only after a conversion that silently truncates.
- `TranscodingJob` has its own `mu sync.RWMutex` guarding mutable fields. Reading `Progress` without it races with the job runner, and `go test -race` will catch it. Take `job.mu.RLock()` for the read. If the runner turns out to update `Progress` without holding that mutex, fix the runner rather than dropping the lock here.

- [ ] **Step 5: Run the test to verify it passes**

Run: `go test ./internal/application/service/ -run TestGetVideoProgress -v`
Expected: PASS

- [ ] **Step 6: Surface it in the GET handler**

Read `admin_handler.go` around line 1284 (`@Router /admin/videos/{id} [get]`) to find the response struct it populates. Add an optional field:

```go
	Transcode *service.TranscodeProgress `json:"transcode,omitempty"`
```

and populate it in the handler:

```go
	if p, ok := h.transcodeProgress(videoID); ok {
		item.Transcode = &p
	}
```

`h.transcoder` is typed as the narrow `TranscodingStarter` interface, so it does not expose `GetVideoProgress`. Extend that interface with the new method **or** add a second optional interface and type-assert:

```go
// transcodeProgressReporter is implemented by transcoders that can report
// per-video progress. It is optional so that TranscodingStarter stays minimal.
type transcodeProgressReporter interface {
	GetVideoProgress(videoID string) (service.TranscodeProgress, bool)
}

func (h *AdminHandler) transcodeProgress(videoID string) (service.TranscodeProgress, bool) {
	r, ok := h.transcoder.(transcodeProgressReporter)
	if !ok {
		return service.TranscodeProgress{}, false
	}
	return r.GetVideoProgress(videoID)
}
```

Prefer the type assertion: it keeps `TranscodingStarter` minimal and avoids breaking any existing test fake that implements only the one method. Check whether importing `service` from `handler` creates an import cycle — if it does, move `TranscodeProgress` to a shared package rather than duplicating the type.

- [ ] **Step 7: Run everything and verify manually**

Run: `go build ./... && go test ./internal/...`
Expected: PASS

Upload a file with `transcode_on_upload` enabled, then poll while it runs:

```bash
curl -sS http://localhost:8080/admin/videos/ns_auto.mp4 -H "Authorization: Bearer $TOKEN"
```

Expected: `status` is `processing` and a `transcode` object is present with a rising `progress_percent`. After completion, `status` is `ready`.

- [ ] **Step 8: Commit**

```bash
git add internal/application/service/transcoding_service.go \
        internal/application/service/transcoding_service_test.go \
        internal/interfaces/http/handler/admin_handler.go
git commit -m "feat(admin): report transcode progress in video status

A client polling upload status could only see a status string, so it had no
way to show progress during a long transcode.

Add GetVideoProgress to the transcoding service and surface it as an optional
'transcode' object on GET /admin/videos/{id}. H.265 background jobs are
excluded so they do not report a conflicting second progress value.

The handler discovers the capability by type assertion, leaving the
TranscodingStarter interface unchanged."
```

Append to `claude_usage_log.txt`.

---

### Task 7: Delete source after successful transcode (spec A7)

On a disk-constrained server the source media file is larger than the HLS output and serves no purpose once every rendition exists. Deleting it is **irreversible**, so the guard conditions matter more than the deletion itself.

A search for `delete_source`, `remove_source`, and `cleanup_source` across the repo returns nothing — this capability does not exist.

**Files:**
- Modify: `internal/application/service/transcoding_service.go`
- Modify: `internal/application/app.go` (pass the flag)
- Modify: `internal/application/service/transcoding_service_test.go`

**Interfaces:**
- Consumes: `VODConfig.DeleteSourceAfterTranscode` (added in Task 5, Step 1)
- Produces: `TranscodingService.deleteSourceAfterTranscode bool`; source deletion on the success path only

- [ ] **Step 1: Write the failing test for the guard logic**

The decision is worth isolating from the filesystem so every branch is cheap to test. Append to `transcoding_service_test.go`:

`TranscodingJob` has no per-preset completion field (confirmed in Task 6, Step 1), so completion is established from the filesystem — which is the right source here regardless: before deleting the only copy of the source, you want proof that the output actually exists on disk, not a counter that claims it does.

```go
func TestShouldDeleteSource(t *testing.T) {
	tests := []struct {
		name      string
		enabled   bool
		job       *TranscodingJob
		done      []string
		masterOK  bool
		want      bool
	}{
		{
			name:     "all presets present and master exists",
			enabled:  true,
			job:      &TranscodingJob{Status: JobStatusCompleted, Presets: []string{"720p", "480p"}},
			done:     []string{"720p", "480p"},
			masterOK: true,
			want:     true,
		},
		{
			name:     "disabled by config",
			enabled:  false,
			job:      &TranscodingJob{Status: JobStatusCompleted, Presets: []string{"720p"}},
			done:     []string{"720p"},
			masterOK: true,
			want:     false,
		},
		{
			name:     "one preset missing on disk",
			enabled:  true,
			job:      &TranscodingJob{Status: JobStatusCompleted, Presets: []string{"720p", "480p"}},
			done:     []string{"720p"},
			masterOK: true,
			want:     false,
		},
		{
			name:     "job itself failed",
			enabled:  true,
			job:      &TranscodingJob{Status: JobStatusFailed, Presets: []string{"720p"}},
			done:     []string{"720p"},
			masterOK: true,
			want:     false,
		},
		{
			name:     "job cancelled",
			enabled:  true,
			job:      &TranscodingJob{Status: JobStatusCancelled, Presets: []string{"720p"}},
			done:     []string{"720p"},
			masterOK: true,
			want:     false,
		},
		{
			name:     "master playlist missing",
			enabled:  true,
			job:      &TranscodingJob{Status: JobStatusCompleted, Presets: []string{"720p"}},
			done:     []string{"720p"},
			masterOK: false,
			want:     false,
		},
		{
			name:     "no presets requested",
			enabled:  true,
			job:      &TranscodingJob{Status: JobStatusCompleted, Presets: nil},
			done:     nil,
			masterOK: true,
			want:     false,
		},
		{
			name:     "nil job",
			enabled:  true,
			job:      nil,
			done:     []string{"720p"},
			masterOK: true,
			want:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := &TranscodingService{deleteSourceAfterTranscode: tt.enabled}
			if got := s.shouldDeleteSource(tt.job, tt.done, tt.masterOK); got != tt.want {
				t.Errorf("shouldDeleteSource = %v, want %v", got, tt.want)
			}
		})
	}
}
```

"No presets requested" returning `false` is deliberate: an empty preset list means nothing was produced, so deleting the only copy of the source would destroy the video.

- [ ] **Step 2: Run the test to verify it fails**

Run: `go test ./internal/application/service/ -run TestShouldDeleteSource -v`
Expected: FAIL — `undefined: shouldDeleteSource`

- [ ] **Step 3: Implement the guard**

Add to `transcoding_service.go`:

```go
// shouldDeleteSource reports whether the source media file may be removed.
// Deletion is irreversible, so every condition must hold: the feature is
// enabled, the job completed, at least one preset was requested, every
// requested preset is present on disk, and the master playlist exists.
//
// completedPresets comes from GetAvailableQualities, i.e. the renditions that
// actually have a playlist on disk — not a counter that claims they do.
func (s *TranscodingService) shouldDeleteSource(job *TranscodingJob, completedPresets []string, masterExists bool) bool {
	if !s.deleteSourceAfterTranscode {
		return false
	}
	if job == nil || job.Status != JobStatusCompleted {
		return false
	}
	if len(job.Presets) == 0 {
		return false
	}
	if !masterExists {
		return false
	}

	// Every requested preset must be present. Compare as a set rather than by
	// length: leftover directories from an earlier run could otherwise make an
	// incomplete transcode look finished.
	done := make(map[string]struct{}, len(completedPresets))
	for _, p := range completedPresets {
		done[p] = struct{}{}
	}
	for _, want := range job.Presets {
		if _, ok := done[want]; !ok {
			return false
		}
	}
	return true
}
```

Add the field to the struct:

```go
	deleteSourceAfterTranscode bool
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `go test ./internal/application/service/ -run TestShouldDeleteSource -v`
Expected: PASS, all seven subtests.

- [ ] **Step 5: Call it on the completion path**

Find where a job transitions to `JobStatusCompleted` (search `JobStatusCompleted` in `processJobs` / the job runner). After the video is marked ready, add:

```go
	masterPath := filepath.Join(s.GetVideoHLSPath(job.VideoID), "master.m3u8")
	_, statErr := os.Stat(masterPath)
	completed := s.GetAvailableQualities(job.VideoID)

	if s.shouldDeleteSource(job, completed, statErr == nil) {
		if err := os.Remove(job.InputPath); err != nil {
			s.logger.Warn("Failed to delete source after transcode",
				logger.String("video_id", job.VideoID),
				logger.String("path", job.InputPath),
				logger.Error(err),
			)
		} else {
			s.logger.Info("Deleted source after successful transcode",
				logger.String("video_id", job.VideoID),
				logger.String("path", job.InputPath),
			)
		}
	}
```

`GetVideoHLSPath` already exists (line 500). The dedicated info log is required by the spec: an irreversible action must leave a trace.

A deletion failure is logged, not raised — the transcode itself succeeded and the video is playable; a leftover source is a disk-space problem, not a correctness one.

- [ ] **Step 6: Wire the config through**

In `app.go` around line 470 where `OutputPath: a.config.VOD.CachePath` is set for the transcoding service, add the new flag alongside it, following whatever construction pattern is used there (struct literal or constructor argument).

- [ ] **Step 7: Run everything**

Run: `go build ./... && go test ./internal/...`
Expected: PASS

- [ ] **Step 8: Verify manually — both directions**

First confirm the default is safe. With the compose file from Task 1 (`DELETE_SOURCE_AFTER_TRANSCODE: "false"`), upload and transcode a file, then:

```bash
ls -la aidevixBackend/.data/media/ns/
```
Expected: the source mp4 is **still present**.

Now enable it and repeat with a different path:

```bash
cd aidevixBackend
MKHLS_VOD_DELETE_SOURCE_AFTER_TRANSCODE=true docker compose -f docker-compose.dev.yml up -d --build
# upload to ns/deleteme.mp4, wait for status ready
ls -la .data/media/ns/
ls -la .data/cache/vod/ns_deleteme.mp4/
```
Expected: `deleteme.mp4` is gone from media; the HLS output directory exists with a `master.m3u8` and per-preset segment directories.

Then restore `false` in the compose file — local development must keep sources.

- [ ] **Step 9: Commit**

```bash
git add internal/application/service/transcoding_service.go \
        internal/application/service/transcoding_service_test.go \
        internal/application/app.go
git commit -m "feat(vod): optionally delete source after successful transcode

On a disk-constrained server the source file is larger than the HLS output
and serves no purpose once every rendition exists.

Add vod.delete_source_after_transcode, default false. Deletion is guarded:
the job must have completed, every requested preset must have finished, at
least one preset must have been requested, and the master playlist must exist
on disk. Any failed or partial transcode keeps the source.

The action is irreversible, so it emits a dedicated log line. A deletion
failure is logged rather than raised, since the transcode itself succeeded."
```

Append to `claude_usage_log.txt`.

---

### Task 8: End-to-end verification with screencast presets

Everything above is unit-tested in isolation. This task proves the pipeline works as one thing, on a real media file, through the real HTTP surface — which is the only way to confirm the Task 2 cache-path fix, since it has no unit test.

**Files:**
- Modify: `configs/development/config.yaml` (screencast preset values)
- Create: `tests/integration/vod_pipeline_test.go` (only if the existing integration harness supports it — see Step 5)

**Interfaces:**
- Consumes: everything from Tasks 1–7
- Produces: a verified pipeline and recorded preset values for the production config

- [ ] **Step 1: Set screencast preset values**

Presets are fully configurable (`config.go:127`, `Presets []PresetConfig`), so this is config, not code. In `configs/development/config.yaml`, replace the preset block with:

```yaml
ffmpeg:
  presets:
    - name: "1080p"
      width: 1920
      height: 1080
      video_bitrate: "1500k"
      audio_bitrate: "128k"
    - name: "720p"
      width: 1280
      height: 720
      video_bitrate: "900k"
      audio_bitrate: "96k"
    - name: "480p"
      width: 854
      height: 480
      video_bitrate: "500k"
      audio_bitrate: "64k"
```

These are roughly a third of the stock values because the target content is screen recording — a mostly static frame compresses far better than camera footage. 360p is intentionally absent: text is unreadable at that size, so it would consume disk and encode time for a rendition nobody can use.

Preserve the surrounding keys in the block exactly as they are; only the preset list changes.

- [ ] **Step 2: Produce a realistic test file**

A camera clip will not exercise the bitrates above. Generate a synthetic screencast-like source — high resolution, static content, sharp edges:

```bash
ffmpeg -f lavfi -i "testsrc=size=1920x1080:rate=30:duration=60" \
       -f lavfi -i "sine=frequency=440:duration=60" \
       -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
       -c:a aac -shortest \
       aidevixBackend/sample.mp4
```

If a real recorded lesson is available, prefer it — synthetic `testsrc` compresses unlike real screen content and will mislead the size numbers in Step 6.

- [ ] **Step 3: Run the full pipeline**

```bash
cd aidevixBackend
docker compose -f docker-compose.dev.yml down
MKHLS_VOD_TRANSCODE_ON_UPLOAD=true docker compose -f docker-compose.dev.yml up -d --build

export TOKEN=$(curl -sS -X POST http://localhost:8080/admin/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

curl -sS -X POST http://localhost:8080/admin/videos/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@sample.mp4" -F "path=ns/lesson.mp4"
```

Poll until ready:
```bash
until curl -sS http://localhost:8080/admin/videos/ns_lesson.mp4 \
        -H "Authorization: Bearer $TOKEN" | grep -q '"status":"ready"'; do
  curl -sS http://localhost:8080/admin/videos/ns_lesson.mp4 -H "Authorization: Bearer $TOKEN"
  echo; sleep 10
done
```

Expected: `transcode.progress_percent` climbs, then `status` becomes `ready`.

- [ ] **Step 4: Verify the cache path — the Task 2 fix**

```bash
ls -la .data/cache/vod/
```

Expected: a directory named **`ns_lesson.mp4`** (underscore) containing `master.m3u8` and `1080p/`, `720p/`, `480p/` subdirectories with `.ts` segments.

If you instead see a nested `ns/lesson.mp4/` directory, the Task 2 cache fix is incomplete — the transcoder and handler still disagree. Go back to Task 2 Step 10.

Now fetch through HTTP, which is what actually proves the two halves agree:

```bash
curl -sS -D - -o /dev/null http://localhost:8080/vod/ns/lesson.mp4/master.m3u8
curl -sS http://localhost:8080/vod/ns/lesson.mp4/master.m3u8
```

Expected: HTTP 200 and a master playlist listing three variants.

**This is the single most important check in the plan.** Before the fix this request either 404s or silently starts a JIT transcode. Confirm it is served from cache — watch the logs during the request and verify no ffmpeg process starts:

```bash
docker compose -f docker-compose.dev.yml logs --tail 50 mkhls
```

- [ ] **Step 5: Verify status blocking actually blocks**

The other half of Task 2 was that non-ready videos were streamable. Upload a file without transcoding and confirm it is refused while processing:

```bash
curl -sS -X POST http://localhost:8080/admin/videos/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@sample.mp4" -F "path=ns/blocked.mp4"

# immediately, while still processing:
curl -sS -o /dev/null -w '%{http_code}\n' http://localhost:8080/vod/ns/blocked.mp4/master.m3u8
```

Expected: a non-200 status while processing. Before the fix this returned 200 because the repository lookup missed and the handler fell through to "allow".

If the existing `tests/integration/` harness can drive the HTTP surface, encode Steps 4 and 5 as a Go integration test so the regression is caught automatically. Read `tests/integration/` first; if there is no harness, do not build one here — record these as manual acceptance steps in the commit body instead.

- [ ] **Step 6: Record actual output sizes**

```bash
du -sh .data/cache/vod/ns_lesson.mp4/
du -sh .data/cache/vod/ns_lesson.mp4/*/
du -sh .data/media/ns/lesson.mp4
```

The spec estimates roughly 1.3 GB per hour across three presets. Extrapolate from this 60-second sample and compare. If the real figure is materially higher, the disk-capacity estimate in spec section 9.3 (~170 lessons) is wrong and must be corrected — report the measured numbers rather than assuming the estimate holds.

- [ ] **Step 7: Play it in a browser**

Open the master playlist in a player that handles HLS natively (Safari) or via `hls.js`, or:

```bash
ffplay "http://localhost:8080/vod/ns/lesson.mp4/master.m3u8"
```

Confirm: playback starts, seeking works, and switching renditions works. Check that text in the 1080p rendition is legible — that is the whole reason for the bitrate choice, and a number that looks fine on paper can still be too low.

- [ ] **Step 8: Commit**

```bash
git add configs/development/config.yaml
# add the integration test too, if Step 5 produced one
git commit -m "feat(config): tune development presets for screencast content

Stock preset bitrates target camera footage. Screen recordings are mostly
static and compress far better, so 1080p at 1500k is visually equivalent to
the previous 5000k for this content while producing a third of the output.

Drop 360p: text is unreadable at that size, so it costs disk and encode time
for a rendition that cannot be used.

Verified end to end on a nested path: upload, transcode on upload, progress
polling, cached master playlist served without JIT fallback, and playback
with rendition switching."
```

Append to `claude_usage_log.txt`.

---

## Definition of Done

- [ ] `go build ./...` and `go test ./internal/...` pass in `mkhls-streamer`
- [ ] `GET /vod/ns/lesson.mp4/master.m3u8` returns a cached playlist with **no** JIT fallback
- [ ] HLS output lives at `{cache}/vod/ns_lesson.mp4/` (underscore form)
- [ ] A `processing` video is **not** streamable
- [ ] Upload works with no S3 configured, and rejects `../` traversal with 400
- [ ] `POST /admin/videos/{id}/transcode` returns 202, then 409 on repeat, 404 for unknown
- [ ] `GET /admin/videos/{id}` reports `transcode.progress_percent` while running
- [ ] Source deletion happens only with the flag on and every preset complete
- [ ] Flat filenames behave exactly as before (backward compatibility)
- [ ] No occurrence of "Aidevix" and no Claude attribution anywhere in `mkhls-streamer`
- [ ] `claude_usage_log.txt` has an entry per task
- [ ] All commits on `feat/vod-local-pipeline`; nothing pushed

## Deferred to later plans

| Item | Plan |
|---|---|
| `utils/mkhls.js`, `Video` model, controller, progress/viewCount bugs | Plan 2 (stages 3–5) |
| `LessonPlayer`, `page.tsx`, admin panel | Plan 3 (stages 6–7) |
| `fetch_bunny.html` removal, Bunny key revocation, Contabo deploy, nginx, monitoring | Plan 4 (stages 8–9) |
| A1 — S3 presigned transcode input | Only if storage moves to R2 (spec 9.7) |
| Dead `internal/interface/` directory removal | Separate upstream cleanup commit; it holds no `.go` files |

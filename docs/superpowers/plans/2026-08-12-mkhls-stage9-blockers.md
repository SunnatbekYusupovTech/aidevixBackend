# Plan 4 — mkhls §15.2 deploy blokatorlari Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Spec §15.2 ning uchta bandini yopish — `LocalVideoSource` kengaytma bug'i, production config'dagi ishlamaydigan `${VAR}` placeholder'lari, va `App.New` qattiq validatsiyasi uchun yozilmagan pre-flight ro'yxati.

**Architecture:** Uchta band bir-biridan mustaqil. 1-band — Go kodidagi bitta funksiyani xuddi shu fayldagi to'g'ri ishlaydigan egizagiga moslash. 2-band — faqat YAML: production config dev'da allaqachon ishlayotgan `MKHLS_*` env binding naqshiga keltiriladi, Go kodiga tegilmaydi. 3-band — kod o'zgarishi yo'q, faqat hujjat. Tartib ahamiyatsiz, lekin 1-band eng katta xavfni yopgani uchun birinchi turadi.

**Tech Stack:** Go 1.24.11, `github.com/mkhls-streamer` moduli, viper (config), standart `testing` paketi.

**Spec:** `aidevixBackend/docs/superpowers/specs/2026-08-12-mkhls-stage9-blockers-design.md`

## Global Constraints

Bu bandlar HAR bir taskka tegishli.

- **Ishchi repo `AiDeVix/mkhls-streamer`, `aidevixBackend` EMAS.** Barcha yo'llar shu repo ildizidan. Branch `feat/vod-local-pipeline`, boshlang'ich HEAD `bc97f80`.
- **Push BLOKLANGAN.** `origin` push URL — `PUSH-DISABLED--fork-qiling-spec-5-bolim` sentineli. Faqat lokal commit. `git push` urinmang.
- **Production `source_type: local`** — foydalanuvchi qarori. Aidevix S3 ishlatmaydi.
- **Config faylidan HECH QANDAY KALIT O'CHIRILMAYDI.** `internal/infrastructure/config/config.go:270-278` izohi: viper'ning `AutomaticEnv` i faqat o'zi "biladigan" kalitlarni override qiladi, va kalit config faylida turgani uchun biladigan bo'ladi. O'chirilgan kalitning `MKHLS_*` env o'zgaruvchisi **jimgina tashlab yuboriladi**. Faqat qiymatlar o'zgaradi. "Ishlatilmaydigan `s3.*` ni tozalash" istagi aynan shu tuzoq.
- **`configs/development/config.yaml` ga TEGILMAYDI.** Lokal dev stack undan yuklanadi; faqat `configs/production/config.yaml` o'zgaradi.
- **CORS ga TEGILMAYDI.** `configs/production/config.yaml:217-218` dagi `your-domain.com` placeholder'lari qamrovdan tashqari — foydalanuvchi `stream.aidevix.uz` ga ulangandan keyin qaytadi.
- **`expandEnvVars` kengaytirilmaydi va `${VAR:-default}` qo'llab-quvvatlash yozilmaydi.** Push bloklangan fork'ga upstream bilan sinxronlashni qiyinlashtiradigan yangi funksiya qo'shilmaydi.
- Har commit `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>` trailer bilan. Commit xabari heredoc orqali yoziladi (`git commit -F -`), `-m "...\n..."` EMAS — bash qo'sh tirnoq ichida `\n` ni kengaytirmaydi va trailer buziladi.

---

## Fayl tuzilishi

**Yaratiladigan:**
- `pkg/storage/video_source_test.go` — `LocalVideoSource.findVideoFile` uchun birinchi test fayli (Task 1)
- `deployments/PREFLIGHT.md` — deploy oldidan bajarilishi shart bo'lgan shartlar (Task 3)

**O'zgartiriladigan:**
- `pkg/storage/video_source.go:108-116` — `findVideoFile` (Task 1)
- `configs/production/config.yaml` — `vod.source_type`, `vod.cache_max_size`, `auth.*`, `s3.*` qiymatlari va izohlar (Task 2)
- `internal/infrastructure/config/config_test.go` — prod config yuklanishi testi qo'shiladi (Task 2)

---

### Task 1: `LocalVideoSource.findVideoFile` kengaytma bug'i

Bu §15.2 ning eng jiddiy bandi: cache'dan chiqib ketgan video doimiy 404 bo'lib qoladi va o'z-o'zini tuzatuvchi qayta transcode ham ishga tushmaydi.

**Files:**
- Create: `pkg/storage/video_source_test.go`
- Modify: `pkg/storage/video_source.go:108-116`

**Interfaces:**
- Consumes: hech narsa
- Produces: `findVideoFile` xatti-harakati o'zgaradi; ommaviy imzo (`GetVideoPath`, `GetVideoInfo`, `VideoExists`) **o'zgarmaydi**

**Kontekst — nima uchun bu muhim.** `findVideoFile` faqat JIT yo'lidan chaqiriladi (`internal/streaming/jit/transcoder.go:176, 283, 322`). `internal/interfaces/http/handler/vod_handler.go` avval cache'dagi `master.m3u8` ni o'qiydi (`:234-239`) va faqat u yo'q bo'lsa JIT'ga tushadi (`:242`). Ya'ni normal oqim bu kodga tegmaydi — lekin cache eviction yoki tozalangan volume'dan keyin tegadi. `triggerPreTranscode` (`:254`) faqat JIT muvaffaqiyatli bo'lsa ishlaydi, shuning uchun bug o'z-o'zini tuzatishni ham o'chiradi.

- [ ] **Step 1: Yiqiladigan testni yozing**

Yangi fayl `pkg/storage/video_source_test.go`:

```go
package storage

import (
	"context"
	"os"
	"path/filepath"
	"testing"
)

// TestLocalVideoSource_FindVideoFile_ExtensionHandling guards a real
// production failure: Aidevix stream ids already carry an extension
// (aidevix/<id>.mp4), and findVideoFile used to append another one, so it
// looked for aidevix/<id>.mp4.mp4 and found nothing. Only the JIT path
// reaches this code, so the normal upload->transcode->serve flow hid the
// bug; a cache eviction exposes it, and the self-healing re-transcode is
// gated behind JIT succeeding, so the video stays 404 forever.
//
// S3VideoSource.findS3Video already handles this correctly; this test pins
// the local source to the same behaviour.
func TestLocalVideoSource_FindVideoFile_ExtensionHandling(t *testing.T) {
	root := t.TempDir()

	// Two real files on disk. Nested dir mirrors the aidevix/<id> layout.
	if err := os.MkdirAll(filepath.Join(root, "aidevix"), 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	withExt := filepath.Join(root, "aidevix", "lesson1.mp4")
	if err := os.WriteFile(withExt, []byte("x"), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}
	bare := filepath.Join(root, "aidevix", "lesson2.mp4")
	if err := os.WriteFile(bare, []byte("x"), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}

	s := NewLocalVideoSource(root, nil)
	ctx := context.Background()

	t.Run("id that already carries a supported extension is used as-is", func(t *testing.T) {
		got, err := s.GetVideoPath(ctx, "aidevix/lesson1.mp4")
		if err != nil {
			t.Fatalf("GetVideoPath: %v", err)
		}
		if got != withExt {
			t.Errorf("GetVideoPath = %q, want %q (a second .mp4 must not be appended)", got, withExt)
		}
	})

	t.Run("id without an extension still gets one appended", func(t *testing.T) {
		got, err := s.GetVideoPath(ctx, "aidevix/lesson2")
		if err != nil {
			t.Fatalf("GetVideoPath: %v", err)
		}
		if got != bare {
			t.Errorf("GetVideoPath = %q, want %q", got, bare)
		}
	})

	t.Run("unsupported extension is treated as part of the name", func(t *testing.T) {
		// notes.txt is not in the supported list, so ".txt" is part of the
		// stem and the loader should look for notes.txt.mp4 and friends.
		target := filepath.Join(root, "aidevix", "notes.txt.mp4")
		if err := os.WriteFile(target, []byte("x"), 0o644); err != nil {
			t.Fatalf("write: %v", err)
		}
		got, err := s.GetVideoPath(ctx, "aidevix/notes.txt")
		if err != nil {
			t.Fatalf("GetVideoPath: %v", err)
		}
		if got != target {
			t.Errorf("GetVideoPath = %q, want %q", got, target)
		}
	})

	t.Run("missing video reports not found", func(t *testing.T) {
		if _, err := s.GetVideoPath(ctx, "aidevix/nope"); err == nil {
			t.Error("GetVideoPath returned nil error for a missing video")
		}
	})

	t.Run("VideoExists agrees with GetVideoPath", func(t *testing.T) {
		if !s.VideoExists(ctx, "aidevix/lesson1.mp4") {
			t.Error("VideoExists = false for an id that carries its extension")
		}
		if s.VideoExists(ctx, "aidevix/nope") {
			t.Error("VideoExists = true for a missing video")
		}
	})
}
```

- [ ] **Step 2: Testni ishga tushirib yiqilishini ko'ring**

```bash
cd mkhls-streamer && go test ./pkg/storage/ -run TestLocalVideoSource_FindVideoFile_ExtensionHandling -v
```

Expected: **FAIL**. Birinchi subtest (`id that already carries a supported extension is used as-is`) `GetVideoPath: video not found: aidevix/lesson1.mp4` bilan yiqiladi, chunki hozirgi kod `aidevix/lesson1.mp4.mp4` ni qidiradi. `VideoExists agrees` subtesti ham xuddi shu sababdan yiqiladi.

**Agar birinchi subtest o'tsa — TO'XTANG va xabar bering.** Bu test hech narsa isbotlamayotganini bildiradi.

- [ ] **Step 3: `findVideoFile` ni tuzating**

`pkg/storage/video_source.go:107-116` (izoh qatori 107, funksiya 108-116) — hozirgi kod:

```go
// findVideoFile finds video file with any supported extension.
func (s *LocalVideoSource) findVideoFile(streamID string) (string, error) {
	for _, ext := range s.extensions {
		path := filepath.Join(s.rootPath, streamID+ext)
		if _, err := os.Stat(path); err == nil {
			return path, nil
		}
	}
	return "", fmt.Errorf("video not found: %s", streamID)
}
```

Buni quyidagi bilan almashtiring. Mantiq `S3VideoSource.findS3Video` (xuddi shu faylda, `:253`) dan olingan — yangi naqsh o'ylab topilmaydi:

```go
// findVideoFile finds video file with any supported extension.
//
// A streamID may already carry its extension — Aidevix stores ids as
// "aidevix/<id>.mp4". Appending unconditionally would look for
// "<id>.mp4.mp4" and miss the file, which only shows up on the JIT path
// after a cache eviction. S3VideoSource.findS3Video handles this the same
// way.
func (s *LocalVideoSource) findVideoFile(streamID string) (string, error) {
	// If the id already ends in a supported extension, trust it as written.
	if ext := strings.ToLower(filepath.Ext(streamID)); ext != "" {
		for _, supportedExt := range s.extensions {
			if ext == supportedExt {
				path := filepath.Join(s.rootPath, streamID)
				if _, err := os.Stat(path); err == nil {
					return path, nil
				}
				break
			}
		}
	}

	// Otherwise try each supported extension in turn.
	for _, ext := range s.extensions {
		path := filepath.Join(s.rootPath, streamID+ext)
		if _, err := os.Stat(path); err == nil {
			return path, nil
		}
	}
	return "", fmt.Errorf("video not found: %s", streamID)
}
```

**Import kerak emas.** `strings` allaqachon `pkg/storage/video_source.go:8` da import qilingan (`findS3Video` uni ishlatadi) — import blokiga tegmang.

**Umumiy helper AJRATMANG.** Ikkala manba turli I/O qiladi (`os.Stat` va `s3Client.ObjectExists`); umumiylashtirish bu tuzatish uchun kerak emas (spec §3.3, YAGNI).

- [ ] **Step 4: Testni ishga tushirib o'tishini ko'ring**

```bash
cd mkhls-streamer && go test ./pkg/storage/ -run TestLocalVideoSource_FindVideoFile_ExtensionHandling -v
```

Expected: **PASS**, beshala subtest ham.

- [ ] **Step 5: Butun paketni va build'ni tekshiring**

```bash
cd mkhls-streamer && go build ./... && go test ./pkg/storage/
```

Expected: build xatosiz, testlar yashil.

- [ ] **Step 6: Commit**

```bash
cd mkhls-streamer
git add pkg/storage/video_source.go pkg/storage/video_source_test.go
git commit -F - <<'EOF'
fix(storage): stop appending a second extension to local video ids

findVideoFile appended a supported extension without checking whether the
id already ended in one. Aidevix stores ids as "aidevix/<id>.mp4", so the
local source looked for "<id>.mp4.mp4" and found nothing.

Only the JIT path reaches this code, which is why the normal
upload-transcode-serve flow never showed it. The VOD handler falls through
to JIT whenever the cached master playlist is missing - a cache eviction, a
wiped volume, a fresh server against an existing database. The re-transcode
that would heal the cache is gated behind JIT succeeding, so an evicted
video stayed 404 until someone intervened by hand.

S3VideoSource.findS3Video already did this correctly; the local source now
follows it rather than inventing a second pattern.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 2: Production config'dagi `${VAR}` placeholder'lari

**Files:**
- Modify: `configs/production/config.yaml`
- Modify: `internal/infrastructure/config/config_test.go`

**Interfaces:**
- Consumes: hech narsa
- Produces: hech narsa (config qiymatlari va test)

**Kontekst — bug'ning aniq shakli.** Go'da `${VAR:-default}` sintaksisi yo'q. `os.ExpandEnv` uni yaroqsiz nom deb bo'sh satrga aylantiradi, va `expandEnvVars` (`internal/infrastructure/config/config.go:508`) baribir `vod.*` va `s3.*` ga tegmaydi. Muhimi: `MKHLS_VOD_SOURCE_TYPE` **bugun ham ishlaydi**, chunki kalit config faylida bor. Buzilgan narsa — env qo'yilmasa fallback literal `"${VOD_SOURCE_TYPE:-s3}"` satri bo'lib qoladi, u na `s3`, na `local`, ya'ni jimgina `local`ga tushadi va Task 1 gacha hech narsa topilmasdi.

**Eng muhim qoida (Global Constraints'dan takror):** hech qanday kalit o'chirilmaydi. Ishlatilmaydigan `s3.*` ni olib tashlash uning `MKHLS_S3_*` env'ini jimgina o'ldiradi.

- [ ] **Step 1: Yiqiladigan testni yozing**

`internal/infrastructure/config/config_test.go` faylining OXIRIGA qo'shing:

```go
// TestLoad_ProductionConfig_NoUnexpandedPlaceholders pins the production
// config against a trap it used to contain. Go has no ${VAR:-default}
// syntax and expandEnvVars does not touch vod.* or s3.* at all, so a value
// written that way survived into the struct verbatim: vod.source_type was
// the literal string "${VOD_SOURCE_TYPE:-s3}", which is neither "s3" nor
// "local", so it silently fell back to local.
//
// The supported override mechanism is viper's env binding (MKHLS_ + the
// dotted key path), which is what docker-compose.dev.yml already uses.
func TestLoad_ProductionConfig_NoUnexpandedPlaceholders(t *testing.T) {
	cfgPath := filepath.Join("..", "..", "..", "configs", "production", "config.yaml")

	for _, k := range []string{
		"MKHLS_VOD_SOURCE_TYPE",
		"MKHLS_VOD_CACHE_MAX_SIZE",
		"MKHLS_AUTH_SECRET_KEY",
	} {
		os.Unsetenv(k)
	}

	m := NewManager()
	if err := m.Load(cfgPath); err != nil {
		t.Fatalf("Load production config: %v", err)
	}
	cfg := m.Get()

	t.Run("source_type is a real value, not a placeholder", func(t *testing.T) {
		if cfg.VOD.SourceType != "local" {
			t.Errorf("VOD.SourceType = %q, want \"local\"", cfg.VOD.SourceType)
		}
	})

	t.Run("no config string survives as an unexpanded placeholder", func(t *testing.T) {
		checks := map[string]string{
			"vod.source_type":    cfg.VOD.SourceType,
			"vod.cache_max_size": cfg.VOD.CacheMaxSize,
			"vod.root_path":      cfg.VOD.RootPath,
			"vod.cache_path":     cfg.VOD.CachePath,
			"auth.secret_key":    cfg.Auth.SecretKey,
			"auth.admin_username": cfg.Auth.AdminUsername,
			"auth.admin_password": cfg.Auth.AdminPassword,
			"s3.endpoint":        cfg.S3.Endpoint,
			"s3.access_key":      cfg.S3.AccessKey,
			"s3.secret_key":      cfg.S3.SecretKey,
			"s3.bucket":          cfg.S3.Bucket,
			"s3.region":          cfg.S3.Region,
		}
		for key, val := range checks {
			if strings.Contains(val, "${") {
				t.Errorf("%s = %q — an unexpanded ${...} placeholder reached the struct", key, val)
			}
		}
	})

	t.Run("env binding still overrides the file", func(t *testing.T) {
		os.Setenv("MKHLS_VOD_SOURCE_TYPE", "s3")
		defer os.Unsetenv("MKHLS_VOD_SOURCE_TYPE")

		m2 := NewManager()
		if err := m2.Load(cfgPath); err != nil {
			t.Fatalf("Load: %v", err)
		}
		if got := m2.Get().VOD.SourceType; got != "s3" {
			t.Errorf("VOD.SourceType = %q, want \"s3\" (MKHLS_VOD_SOURCE_TYPE should win)", got)
		}
	})
}
```

**Maydon nomlari tasdiqlangan** (`internal/infrastructure/config/config.go`): `VODConfig.SourceType/RootPath/CachePath/CacheMaxSize` (`:73-76`), `AuthConfig.SecretKey/AdminUsername/AdminPassword` (`:119,124,125`), `S3Config.Endpoint/AccessKey/SecretKey/Bucket/Region` (`:98-102`). Struct'larni O'ZGARTIRMANG.

Test faylining yo'li `internal/infrastructure/config/config_test.go`, shuning uchun `filepath.Join("..", "..", "..", "configs", ...)` repo ildiziga chiqadi. Fayl allaqachon `os`, `path/filepath`, `strings`, `testing` ni import qiladi — yangi import kerak emas.

- [ ] **Step 2: Testni ishga tushirib yiqilishini ko'ring**

```bash
cd mkhls-streamer && go test ./internal/infrastructure/config/ -run TestLoad_ProductionConfig_NoUnexpandedPlaceholders -v
```

Expected: **FAIL**. `source_type is a real value` subtesti `VOD.SourceType = "${VOD_SOURCE_TYPE:-s3}", want "local"` deb yiqiladi, va `no config string survives` subtesti kamida `vod.source_type`, `vod.cache_max_size`, `auth.secret_key`, `auth.admin_username`, `auth.admin_password`, `s3.endpoint`, `s3.access_key`, `s3.secret_key`, `s3.bucket`, `s3.region` ni sanaydi.

- [ ] **Step 3: `vod` bo'limini tuzating**

`configs/production/config.yaml`, `vod:` bo'limi. `source_type` va `cache_max_size` qatorlarini almashtiring:

```yaml
  # Source type: "local" or "s3" (use s3 for 100TB+ storage).
  # Override with MKHLS_VOD_SOURCE_TYPE.
  source_type: "local"
```

va

```yaml
  # Max cache size (adjust based on available SSD).
  # Override with MKHLS_VOD_CACHE_MAX_SIZE.
  cache_max_size: "100GB"
```

Qolgan `vod` kalitlariga (`root_path`, `cache_path`, `cleanup_interval`, `segment_duration`, `playlist_length`, `allowed_extensions`, `realtime_transcode`) tegmang.

- [ ] **Step 4: `auth` bo'limini tuzating**

`auth:` bo'limida uchta `${VAR}` bor. Ular bugun ishlaydi (`expandEnvVars` `auth.*` ni qamraydi), lekin config bir mexanizmga keltirilayotgani uchun ular ham `MKHLS_*` ga o'tadi:

```yaml
# Authentication — every value here comes from the environment.
# The container will refuse to start if secret_key is empty or shorter than
# 32 characters (see deployments/PREFLIGHT.md).
auth:
  # Override with MKHLS_AUTH_SECRET_KEY. Minimum 32 characters.
  secret_key: ""
  # Previous keys for graceful rotation (tokens signed with these remain valid)
  previous_keys: []
  token_expiry: 12h
  refresh_expiry: 72h
  algorithm: "HS256"
  # Override with MKHLS_AUTH_ADMIN_USERNAME / MKHLS_AUTH_ADMIN_PASSWORD.
  admin_username: ""
  admin_password: ""
```

- [ ] **Step 5: `s3` bo'limini tuzating — kalitlarni O'CHIRMASDAN**

Aidevix S3 ishlatmaydi, lekin kalitlar qolishi SHART (Global Constraints). `s3:` bo'limining `${VAR}` qiymatlarini bo'shatib, `${VAR:-default}` larni haqiqiy defaultga aylantiring:

```yaml
s3:
  # Aidevix runs with vod.source_type "local" and does not use S3. These keys
  # stay here on purpose: viper's AutomaticEnv only overrides keys it already
  # knows about, and a key becomes known by appearing in this file. Deleting
  # an unused key silently kills its MKHLS_S3_* environment variable for
  # anyone who later switches source_type to "s3".
  enabled: false
  # Override with MKHLS_S3_ENDPOINT / MKHLS_S3_ACCESS_KEY / MKHLS_S3_SECRET_KEY.
  endpoint: ""
  access_key: ""
  secret_key: ""
  bucket: "alloplay-media"
  region: "uz-tashkent"
  use_ssl: false  # override with MKHLS_S3_USE_SSL=true
  path_style: true
  direct_access: true
```

**`enabled: false`** — Aidevix S3 ishlatmaydi, va bo'sh `endpoint` bilan `enabled: true` qoldirish ilovani ulanmaydigan xotiraga urinishga majbur qiladi.

- [ ] **Step 6: `:63-72` dagi izohni yangilang**

Hozirgi izoh ikki xil mexanizmni tushuntiradi ("os.ExpandEnv faqat yo'l maydonlari va auth.* ga qo'llanadi"). Endi config'da bitta mexanizm qolgani uchun uni quyidagi bilan almashtiring:

```yaml
# S3/MinIO Storage Configuration (100TB+)
#
# HOW TO OVERRIDE ANYTHING IN THIS FILE: use viper's environment binding —
# MKHLS_ + the dotted key path in upper case, with dots replaced by
# underscores. MKHLS_S3_ENDPOINT, MKHLS_VOD_SOURCE_TYPE,
# MKHLS_AUTH_SECRET_KEY, and so on. This is the mechanism the Aidevix dev
# stack already uses (see docker-compose.dev.yml).
#
# Do NOT write ${VAR} or ${VAR:-default} in this file. Go has no :- syntax,
# and the loader expands ${VAR} only for path fields — a value written that
# way is used verbatim and silently becomes garbage.
#
# Do NOT delete keys you think are unused. AutomaticEnv only overrides keys
# viper already knows about, and a key becomes known by appearing here.
# Removing one silently discards its MKHLS_* variable.
#
# use_ssl in particular must stay a real YAML bool. Written unquoted as
# ${S3_USE_SSL:-false} it is a plain string and mapstructure fails to convert
# it, which aborts loading the whole file — including ffmpeg.presets, which
# this server now depends on.
```

- [ ] **Step 7: Testni ishga tushirib o'tishini ko'ring**

```bash
cd mkhls-streamer && go test ./internal/infrastructure/config/ -v
```

Expected: **PASS**, yangi test ham, mavjud testlar ham.

- [ ] **Step 8: Prod config hamon to'liq yuklanishini tasdiqlang**

```bash
cd mkhls-streamer && go build ./... && go test ./...
```

Expected: build xatosiz, butun to'plam yashil.

- [ ] **Step 9: Dev config tegilmaganini tasdiqlang**

```bash
cd mkhls-streamer && git status --short
```

Expected: `configs/development/config.yaml` ro'yxatda BO'LMASLIGI kerak. Faqat `configs/production/config.yaml` va `internal/infrastructure/config/config_test.go`.

- [ ] **Step 10: Commit**

```bash
cd mkhls-streamer
git add configs/production/config.yaml internal/infrastructure/config/config_test.go
git commit -F - <<'EOF'
config(prod): drop placeholders the loader never expanded

Go has no ${VAR:-default} syntax and expandEnvVars does not touch vod.* or
s3.*, so values written that way reached the struct verbatim. vod.source_type
was the literal string "${VOD_SOURCE_TYPE:-s3}" - neither s3 nor local - so
an operator who set no environment variable silently got local, which until
the previous commit could not find anything.

The env override itself always worked, because the keys are present in the
file. Only the fallback was broken. So the values become real ones and the
override mechanism stays what it already was: MKHLS_ + the dotted key path,
the same thing docker-compose.dev.yml uses.

auth.* moves to the same mechanism for consistency, even though its ${VAR}
form did expand.

The s3 keys stay, with empty values and enabled false. They are unused here,
but AutomaticEnv only overrides keys it knows about and a key becomes known
by appearing in this file - deleting one would silently kill its MKHLS_S3_*
variable for anyone who later switches to s3. The comment now says so.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 3: Deploy pre-flight ro'yxati

**Files:**
- Create: `deployments/PREFLIGHT.md`

**Interfaces:**
- Consumes: hech narsa
- Produces: hech narsa

**Kontekst.** `internal/application/app.go:146` sovuq startda `config.ValidateConfig` ni chaqiradi va xato bo'lsa ilova **umuman ko'tarilmaydi**. Bu ataylab qilingan va to'g'ri — ilgari "ishga tushadi-yu buzuq" deployment bo'lardi. **Kod o'zgartirilmaydi.** Yetishmayotgani — deploy qiluvchi odam konteyner qulaganda sababni topa oladigan yozma ro'yxat.

- [ ] **Step 1: Validator shartlarini kodda tasdiqlang**

```bash
cd mkhls-streamer && grep -n "addError" internal/infrastructure/config/validator.go | head -30
```

Quyidagi hujjat `validator.go` ning shu qatorlariga tayanadi: `:76-84` (`app.env`), `:119` (`vod.root_path`), `:180-195` (`auth.secret_key`), `:226-231` va `:237` (ffmpeg/ffprobe). Chiqishni o'qing va agar biror shart boshqacha bo'lsa hujjatni haqiqiy kodga moslang — **kodni hujjatga moslamang**.

> **TUZATISH (Task 3 review'i, kod bilan tasdiqlangan). Pastdagi hujjat matni
> uchta joyda XATO edi — shipped `deployments/PREFLIGHT.md` tuzatilgan versiya
> bilan yozildi. Bu blokni reja tarixiy yozuv sifatida saqlaydi, lekin quyidagi
> matnni manba sifatida ishlatmang:**
>
> 1. **To'rtta tekshiruvdan uchtasi faqat `app.env == "production"` da ishlaydi** —
>    `validator.go:120` (`vod.root_path`), `:179` (butun `auth.secret_key` bloki),
>    `:229` va `:238` (ffmpeg/ffprobe). Shartsiz ishlaydigani faqat `app.env`
>    ning o'zi (`:76-84`). Hujjatning dastlabki matni buni aytmagan.
> 2. **`vod.root_path` tekshiruvi ulanmagan volume'ni USHLAMAYDI.** `app.go:133`
>    `initInfrastructure` ni chaqiradi, u `app.go:182` da
>    `os.MkdirAll(VOD.RootPath)` qiladi; `ValidateConfig` esa undan KEYIN,
>    `app.go:146` da ishlaydi — `app.go:143-145` izohi buni ochiq aytadi.
>    Validatsiya paytida katalog doim mavjud. Ulanmagan volume hech qanday start
>    xatosi bermaydi va videolar doimiy bo'lmagan xotiraga yoziladi. Dastlabki
>    matn buning TESKARISINI da'vo qilgan edi.
> 3. **`${VAR}` faqat yo'l maydonlari uchun kengaytiriladi degani xato** —
>    spec'ning yuqoridagi tuzatishiga qarang; `expandEnvVars` `auth.*` va
>    `s3.endpoint/access_key/secret_key/bucket` ni ham qamraydi.
> 4. `auth.secret_key` ning "weak marker" tekshiruvi `:196` da, ya'ni
>    `:180-195` oralig'idan tashqarida.

- [ ] **Step 2: `deployments/PREFLIGHT.md` ni yarating**

```markdown
# Deploy pre-flight

`App.New` runs `config.ValidateConfig` on a cold start
(`internal/application/app.go:146`) and returns an error if anything below is
wrong. The process then exits instead of starting. This is deliberate: before
it, a deployment with a missing secret or no ffmpeg would start happily and
fail at the first transcode.

So a container that will not come up is usually one of these, not a crash.
Check them in order.

## 1. `auth.secret_key`

`validator.go:180-195`. Must be non-empty, **at least 32 characters**, and
must not contain any of the weak markers the validator rejects.

Set it with `MKHLS_AUTH_SECRET_KEY`. The config file ships it empty on
purpose — there is no default and there must not be one.

Generate one:

```bash
openssl rand -hex 32
```

## 2. `ffmpeg.binary_path` and `ffmpeg.ffprobe_path`

`validator.go:226-231` and `:237`. Both must resolve through `exec.LookPath`.
The production config points at `/usr/bin/ffmpeg` and `/usr/bin/ffprobe`.

Verify inside the image, not on the host:

```bash
docker run --rm --entrypoint sh <image> -c 'command -v ffmpeg ffprobe'
```

## 3. `vod.root_path`

`validator.go:119`. The directory must exist. Production config uses
`/data/videos`; mount the volume before the container starts. `App.New`
creates storage directories in `initInfrastructure` before validating, but a
volume that fails to mount is still a failure here.

## 4. `app.env`

`validator.go:76-84`. Must be exactly one of `development`, `production`,
`testing`, `staging`. Anything else — including an empty value from a typo'd
env var — aborts startup.

## 5. Overrides reach the process

Every key in `configs/production/config.yaml` can be overridden with
`MKHLS_` + the dotted key path, dots replaced by underscores:
`MKHLS_VOD_SOURCE_TYPE`, `MKHLS_AUTH_SECRET_KEY`, `MKHLS_S3_ENDPOINT`.

Two traps:

- A key **absent** from the config file is not overridable at all — viper's
  `AutomaticEnv` only touches keys it already knows about. If a
  `MKHLS_*` variable seems ignored, check the key is in the file.
- `${VAR}` and `${VAR:-default}` do **not** work in the config file. Go has
  no `:-` syntax, and the loader expands `${VAR}` only for path fields.

## Not covered here

`cors.allowed_origins` in `configs/production/config.yaml` still holds
`your-domain.com` placeholders. hls.js fetches playlists and segments
directly from the browser, so until the real origin is listed there the
browser blocks every request and video never plays — and this cannot be
reproduced against `localhost`. Intended value: `stream.aidevix.uz`.
```

- [ ] **Step 3: Havolalar to'g'riligini tasdiqlang**

```bash
cd mkhls-streamer && sed -n '146p' internal/application/app.go && sed -n '119p;180p;226p' internal/infrastructure/config/validator.go
```

Expected: 146-qator `config.ValidateConfig` chaqiruvi; validator qatorlari mos tekshiruvlarni ko'rsatadi. Farq bo'lsa hujjatdagi raqamlarni tuzating.

- [ ] **Step 4: Commit**

```bash
cd mkhls-streamer
git add deployments/PREFLIGHT.md
git commit -F - <<'EOF'
docs: write down what has to be true before the server starts

App.New validates the config on a cold start and exits if it fails, which is
right - it replaced a deployment that would start broken and fail at the
first transcode. But nothing said what it checks, so a container that refuses
to come up looked like a crash.

Lists the four conditions with the validator lines that enforce them, how to
satisfy each, and the two ways an MKHLS_ override silently does nothing.

Also records that the CORS origins are still placeholders, since that one
cannot be caught locally.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
```

---

## Bosqich tugagandan keyin

Bu reja HANDOFF'ni yangilashni o'z ichiga olmaydi. Bosqich tugagach `aidevixBackend/docs/superpowers/HANDOFF.md` ga yozing:

1. **§15.2 ning uchala bandi yopildi**, lekin **mkhls hamon push qilinmagan** — sentinel joyida, fork masalasi ochiq.
2. **CORS hamon bosqich 9 ni bloklaydi**, kutilayotgan qiymat `stream.aidevix.uz`.
3. **Yangi qoida:** `configs/production/config.yaml` dan kalit o'chirmaslik — sabab `deployments/PREFLIGHT.md` va config izohida yozilgan.
4. **Task 1 ochgan haqiqat:** normal oqim JIT'ga tegmaydi, shuning uchun jonli stack sinovi bu bug'ni ko'rsatmagan edi. Kelajakdagi "stack'da ishladi" degan dalil JIT yo'lini qamramasligini eslang.

# hls-sample-long fixture

40 seconds of H.264/AAC video, muxed as 4 MPEG-TS segments of 10s each (`seg0.bin`..`seg3.bin`,
named `.bin` not `.ts` because `frontend/tsconfig.json`'s `include: ["**/*.ts"]` would otherwise
feed the binary segments to `tsc`). Used by `e2e/videos-stream.spec.ts` to test the resume seek
and end-guard behaviour at a duration a 4-second fixture cannot express (see Task 7).

The exact command that generated the original files was not recorded and could not be recovered
from history. The command below was reconstructed by `ffprobe`-inspecting the checked-in segments
and matching every parameter it reports — codec, profile, resolution, frame rate, audio codec,
sample rate, channel count, and segment boundaries (`stream.m3u8`'s four `EXTINF:10.000000` entries,
`EXT-X-TARGETDURATION:10`). Running it reproduces a fixture with those same properties (verified:
identical codec/profile/resolution/fps output on the regenerated segments). File sizes will differ
slightly from the checked-in originals since the exact encoder quality setting used originally is
unknown — this does not matter for the tests, which only need valid, seekable HLS with the right
total duration and segment count.

```bash
ffmpeg -y \
  -f lavfi -i "testsrc=size=160x120:rate=15:duration=40" \
  -f lavfi -i "sine=frequency=440:sample_rate=44100:duration=40" \
  -c:v libx264 -profile:v baseline -pix_fmt yuv420p \
  -force_key_frames "expr:gte(t,n_forced*10)" \
  -c:a aac -ac 1 -ar 44100 -b:a 64k \
  -hls_time 10 -hls_playlist_type vod -hls_segment_filename "seg%d.bin" \
  stream.m3u8
```

`-force_key_frames` is required — without it, libx264's own scene-change keyframe placement does
not land on exact 10s boundaries and `-hls_time 10` produces segments of uneven length (measured:
16.7s/16.7s/6.7s instead of 10s/10s/10s/10s) that no longer match this fixture's assumptions.

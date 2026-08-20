# Audio (Vernacular Narration)

**Requirement:** Narrate the plain-language summary in a target language via `POST /api/v1/narrate`, returning a short-lived signed audio URL. Provider abstraction with fallback, language validation, caching, expiration, and privacy handling.

**Why:** Accessibility — users hear their contract summary in their language. The artifact is derived from the summary (already analysis output), never from raw contract text directly.

## 1. Endpoint

```
POST /api/v1/narrate
Auth: access token; session must be active and owned.

Request:
{
  "session_id": "<uuid7>",
  "language_code": "es",          // ISO 639-1 (see §2)
  "voice": "default" | "female" | "male"   // optional
}

Response 202: { "audio_request_id": "...", "status": "queued" }
```

Poll `GET /api/v1/narrate/{audio_request_id}` → when `ready`: `{ "url": "<signed>", "expires_at": "...", "duration_seconds": 42 }`. Signed URL: 5 min TTL, GET-only (`file-storage.md`).

## 2. Language Support

Launch set (10): `en, es, fr, de, it, pt, hi, ar, zh, ja`. `AUDIO_LANGUAGE_UNSUPPORTED` (422) for others. Voice mapping per language via provider config table in code (`audio/voices.py`); unsupported voice+language combos degrade to default voice.

## 3. Provider Abstraction

```python
class TTSProvider(Protocol):
    async def synthesize(self, text: str, language: str, voice: str) -> bytes: ...

class OpenAITTSProvider(TTSProvider): ...   # default (assumption A8)
class FallbackTTSProvider(TTSProvider): ... # edge-tts open-source fallback
```

- Primary: OpenAI-compatible TTS API (`TTS_PROVIDER` config). Fallback: `edge-tts` (no API key, runs in-container) — automatic on primary failure (key errors) or 503s; fallback result is flagged in `metadata.provider_used` for observability.
- Text sent to the provider: the **summary text only** (max 4000 chars, hard-truncated with "…" — summaries are designed short). Never raw contract text (privacy + cost).
- SSML/profanity filters per provider defaults; no modification of content.

## 4. Audio Celery Job (`workers/tasks/audio.py`)

Input: `audio_request_id`. Steps: fetch summary → synthesize → encrypt → store at `sessions/{sid}/audio/{request_id}.mp3` → set row `ready` + `expires_at = now + AUDIO_ARTIFACT_TTL` (config, default 24 h). Timeout 5 min. Retries 2 (then fallback provider, then fail → `AUDIO_FAILED`). Idempotent on `audio_request_id`. Progress: `audio.progress` event (queued → processing → ready).

## 5. Caching

Cache key: `(session_id, language_code, voice, summary_version)`. Cache in Redis (`audio_cache:{key}` → storage key, TTL = artifact TTL). Summary edits bust the cache (summary version increments on regeneration). Cache hit → return signed URL without re-synthesis.

## 6. Expiration and Privacy

- Artifact TTL 24 h max; signed URL 5 min. After expiry the binary is lifecycle-deleted (storage) and the row marked failed-on-access with a fresh-generation affordance.
- Summary text sent to the TTS provider is processor data; provider choice is documented in the privacy notice (`privacy.md` §4). `strict` privacy mode disables audio entirely (audio requires derived artifacts — document in privacy notice; config `AUDIO_ENABLED_IN_STRICT_MODE=false`).

## 7. Failure Modes

`AUDIO_FAILED` (all providers exhausted), `AUDIO_LANGUAGE_UNSUPPORTED`, `SESSION_EXPIRED`, `SERVICE_UNAVAILABLE` (storage). Rate limit: 10 narrations/hour/session (provider cost guard).

## Implementation Notes

- `edge-tts` fallback requires no key and supports the full launch set; its audio quality is acceptable for accessibility narration (spec decision, labeled).
- MP3 format fixed (v1); duration returned for the player UI.

## Security

Synthesis input is summary text (derived, not raw) — still untrusted data: input length-bounded, and provider responses are binary-only (no structured parsing needed). `TTS_API_KEY` secret per config rules.

## Testing

Unit: language/voice validation matrix; caching key derivation; truncation behavior. Integration with mocked provider: job → artifact stored → signed URL serves audio bytes → expiry honored (clock-frozen test). Fallback test: primary provider raising → edge-tts path taken, `provider_used=fallback` recorded. Cache bust test: summary regenerated → stale cache ignored.

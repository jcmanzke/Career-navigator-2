Career Navigator — Migration to Flutter/Dart

What I set up

- Created a new Flutter app in `flutter_app/` with:
  - Supabase initialization via `--dart-define` (see `flutter_app/lib/config.dart`).
  - Auth screens for login/signup mirroring your email + 4-digit PIN flow.
  - Home with Drawer (maps to your Sidebar) and a single main screen for the flow.
  - Career Navigator 5-step flow (Phase 1–5) functionally equivalent in structure:
    - Phase 1: add experiences (persists to Supabase).
    - Phase 2: reorder ranking + mark Top 7, then save.
    - Phase 3: context + impact text per experience, then save.
    - Phase 4: analysis stub (Markdown summary; plug your AI backend here).
    - Phase 5: background/current profile fields, then save.
  - Supabase data access layer (`lib/services/supabase_service.dart`).
  - Whisper transcription client stub (`lib/services/transcribe_service.dart`).

How to run

1) Install Flutter, set up an emulator/device.
2) In `flutter_app/`, run:
   flutter pub get
3) Start with your keys (from `.env.local`):
   flutter run \
     --dart-define=SUPABASE_URL=YOUR_URL \
     --dart-define=SUPABASE_ANON_KEY=YOUR_ANON_KEY \
     --dart-define=OPENAI_API_KEY=YOUR_OPENAI_KEY

Feature mapping and gaps

- Supabase auth: mirrors your web approach. No magic links; password = 4-digit PIN padded to 6.
- Data model: uses your `journeys`, `experiences`, `stories`, `context_profiles` tables.
- API / Transcription: the Next route `/api/transcribe` is replaced by a client call to OpenAI. If you prefer a backend proxy, add a Cloud Function or server and swap `TranscribeService` URL.
- UI/Design: basic Material UI. Port Tailwind styling/branding as a second pass.
- Voice capture: stubbed. In Flutter, add the `record` package (already in pubspec) and wire it to TranscribeService.

Next steps (suggested)

1) UI Polish: theme colors, typography, layout to match your brand.
2) Add validation, empty states, error toasts.
3) Port your background video/login visuals to Flutter (use a poster image/video in assets and `VideoPlayerController`).
4) Implement voice recording on Phase 3 textareas; send audio to `TranscribeService`.
5) Replace analysis stub with your real AI flow.
6) Add tests and CI for the Flutter app.


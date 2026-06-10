Fast PIN UX update.

Replace the GitHub files with this version.

Changes:
- Password checking no longer shows the skeleton overlay.
- If Supabase is slow, the PIN screen says "Still checking Supabase..."
- Once the PIN is accepted, the app opens immediately.
- Cloud data loads after the app opens so it feels faster.
- Service worker cache changed to v7 so phones refresh properly.

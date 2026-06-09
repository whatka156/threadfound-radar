Fixed sync version.

Upload/replace these files in the root of your GitHub repo:
- index.html
- manifest.json
- service-worker.js
- icon-180.png
- icon-192.png
- icon-512.png

This version loads Supabase data after PIN login before it uploads anything, so it should not wipe cloud data with an empty local save.

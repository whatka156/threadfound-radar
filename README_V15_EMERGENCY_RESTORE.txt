v15 emergency restore.

This rolls the app back to the stable v12 version and removes the broken v13/v14 edit-sheet changes.

Replace these files in GitHub:
- index.html
- service-worker.js

Then:
1. Open the app in Safari.
2. Refresh 2-3 times.
3. If it still shows the broken version, open the site with ?v=15 at the end once.
4. If needed, delete the Home Screen shortcut and add it again.

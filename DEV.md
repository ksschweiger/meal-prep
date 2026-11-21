# Dev and release process

**Naming (Nov 21, 2026):** this repo is **Dev** = Kaleb's family app (Google Sheet, Kroger cart, price checks). No sandbox; changes go straight to `index.html`. The future live app is **Prod** (separate project on Supabase + MCP server, grocery list only) and its test copy is **Sandbox**. The `dev/` folder here is a leftover test copy and can be removed if Kaleb agrees.

**Current mode (Nov 21, 2026): changes go straight to production (`index.html`).** Use Dev only when Kaleb asks to build in Dev; before starting, copy `index.html` into `dev/index.html` and re-add the DEV banner.

- **Production:** https://ksschweiger.github.io/meal-prep/ (`index.html`)
- **Dev:** https://ksschweiger.github.io/meal-prep/dev/ (`dev/index.html`, purple DEV banner)

Both use the same Google sign-in and the same Meal Prep Database sheet, so changes saved on Dev are real.

0. Before each Dev session, copy the Meal Prep Database sheet as "Meal Prep Database — Backup YYYY-MM-DD" in the same Drive folder.
1. Make every change in `dev/index.html` first.
2. Test it on the Dev link.
3. When it's approved, add a new entry to the top of `RELEASES` (date + 2–7 short bullets), copy `dev/index.html` into `index.html` (minus the DEV banner and title), bump `APP_VERSION`, and push. Each person sees the notice once on their next open; Dev and live track it separately.

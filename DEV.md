# Dev and release process

- **Production:** https://ksschweiger.github.io/meal-prep/ (`index.html`)
- **Dev:** https://ksschweiger.github.io/meal-prep/dev/ (`dev/index.html`, purple DEV banner)

Both use the same Google sign-in and the same Meal Prep Database sheet, so changes saved on Dev are real.

1. Make every change in `dev/index.html` first.
2. Test it on the Dev link.
3. When it's approved, copy the change into `index.html`, bump `APP_VERSION`, and push.

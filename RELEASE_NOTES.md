Release notes - Perceptual Branding and Admin Contrast (release/v0.3.1)

Highlights
- Perceptual brand variants: `brandLight` and `brandStrong` are now computed using Lab-like perceptual adjustments instead of naive RGB +/-20%.
- Admin UI: branding form now includes live WCAG contrast checks and a suggested accessible text color with an "Apply suggestion" button.
- Regeneration script: `scripts/regenerate-brand-variants.js` added/updated. Supports `--dry-run` and `--percent` flags.

Files changed
- `data/stores.js` — updated to include `brandLight` and `brandStrong` values for stores.
- `app.js` — admin branding form: added `textColor` input, preview wiring, and persistence.
- `public/branding-contrast.js` — client-side contrast checks and Lab-based suggestion algorithm.
- `scripts/regenerate-brand-variants.js` — regeneration script (dry-run / percent flags).
- `test/color-helpers.test.js`, `test/regenerate.test.js` — new tests added.

Notes
- Regeneration default uses a 20 L-point delta; tune via `--percent` when running the script.
- The Lab-based suggestion seeks to preserve perceived hue/chroma while finding an accessible lightness.

How to run
- Run tests: `npm test`
- Dry-run regeneration: `node scripts/regenerate-brand-variants.js --dry-run --percent 20`
- Apply regeneration: `node scripts/regenerate-brand-variants.js --percent 20`

If you'd like, I can create a git commit and tag this release. Let me know if you want me to commit now and what commit message to use (default: "chore: perceptual branding + admin contrast checks").

# MyPreLove (FYP) — Handoff Notes

Django REST Framework backend (`api` app, `core` settings, SQLite dev DB) + React Native/Expo mobile frontend (`mobile/`). Eco-conscious peer-to-peer secondhand marketplace with escrow-style Stripe payments, chat-based offers/counter-offers, trust scores, and admin moderation.

## 1) Goals

- Ship a feature-complete, diploma-level final year project: clean code, no errors, ready for the author's own testing pass and eventual demo/submission.
- Core product loop: browse/list items → chat and negotiate (offer/counter-offer) → buyer pays via Stripe (held in escrow) → buyer confirms receipt → funds released to seller → review left.
- This session's goal: close out the remaining technical-debt/testing roadmap from the prior handoff — (1) a regression test for the escrow double-payout race fixed last session, (2) move hardcoded Stripe keys out of source into `.env`, (3) gate the demo-only username-only password reset behind `DEBUG`, (4) a local execution checklist — then a general debugging pass and an over-engineering review of the diff and the wider repo.

## 2) Current state

- All four requested tasks are implemented as real file changes (not just chat snippets).
- A self-introduced bug was found and fixed the same session: the Task 3 view-level `DEBUG` guard referenced `settings` without it being imported in that file's module scope — would have thrown `NameError` on every call to that endpoint. Caught via `pyflakes`, fixed, re-verified clean.
- Verification is static only, same limitation as the prior session: this sandbox's system Python is 3.10.12; Django 6.0.6 requires 3.12+. `python -m py_compile` and `pyflakes` are clean across `api/` and `core/` (including migrations). `eslint` is clean across `mobile/src/`.
- A ponytail-mode review/audit pass surfaced 3 over-engineering findings in the current tree. **None of these have been applied** — reported only, pending a decision.
- One attempted fix (a gap in `mobile/eslint.config.mjs`) is blocked by a config-protection hook in this environment and was **not** applied.

## 3) Active files

Backend (`api/`, `core/`):
- `api/tests_concurrency.py` — **new**. `ReleaseFundsConcurrencyTests(TransactionTestCase)`. Tests the `release-funds` double-payout race fixed last session. Because `select_for_update()` is a documented no-op on SQLite (this project's DB), the test doesn't rely on real DB locking — it patches `Transaction.objects.select_for_update` so a second thread's row read blocks until the first thread's request fully commits, deterministically reproducing what a real Postgres/MySQL row lock guarantees. Asserts `stripe.Transfer.create` fires exactly once under a simulated double-tap, plus a sanity test that a non-`PAID` transaction is never transferable.
- `core/settings.py` — loads `.env` via `python-dotenv` (`load_dotenv(BASE_DIR / '.env')`, called right after `BASE_DIR` is defined). `STRIPE_PUBLIC_KEY`/`STRIPE_SECRET_KEY` no longer have hardcoded literal fallbacks — now `os.environ.get(...)` only, with a warn-in-DEBUG / hard-fail-in-production guard mirroring the existing `DJANGO_SECRET_KEY` pattern.
- `requirements.txt` — added `python-dotenv==1.0.1`.
- `.env.example` — **new**. Template for `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `STRIPE_PUBLIC_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. `.env` itself was already gitignored.
- `api/urls.py` — `password-reset/direct/` is now appended to `urlpatterns` only `if settings.DEBUG:`. Outside DEBUG the route doesn't exist in the URLconf at all (404, not a permission check).
- `api/views/profile_views.py` — `PasswordResetDirectView.post()` independently checks `settings.DEBUG` too (defense-in-depth layer #2), and the module now imports `from django.conf import settings` at the top (this was the missing import causing the `NameError` bug, now fixed).

Flagged, not touched:
- `mobile/eslint.config.mjs` — has a real gap (`files: ["src/**/*.js"]` excludes root `App.js`, so `App.js` fails to lint with a JSX parse error; `src/` alone lints 100% clean). A one-line fix (`files: ["src/**/*.js", "App.js"]`) was attempted and blocked by a config-protection hook in this Claude Code setup. Needs a manual edit locally.

Project root:
- `handoff.md` — this file, regenerated this session.

## 4) Changes made (chronological, this session)

1. Read `transaction_views.py`, `core/settings.py`, `api/urls.py`, `api/models.py`, `api/views/profile_views.py`, `api/tests_logic.py`, and `api/test_stripe.py` in full to ground every change in the real code rather than generic templates.
2. **Task 1** — wrote `api/tests_concurrency.py` (see Section 3 for the SQLite-locking caveat and how the test works around it).
3. **Task 2** — added `load_dotenv()` + removed hardcoded Stripe key literals in `core/settings.py`; added `python-dotenv` to `requirements.txt`; created `.env.example`.
4. **Task 3** — gated `password-reset/direct/` behind `settings.DEBUG` in `api/urls.py` (route not registered at all outside DEBUG) and added a second, independent `DEBUG` check inside `PasswordResetDirectView.post()` itself.
5. **Task 4** — produced a local execution checklist grounded in the actual repo state (checked via the mounted folder, not assumed): confirmed a Python 3.14 `venv/` already exists locally; confirmed a real, currently-present stale `.git/index.lock` file; confirmed a large pre-existing uncommitted diff (128 changed paths) unrelated to this session, including full deletions of `price_predictor/`, the old `api/views.py`, `mobile/src/components/WalletModal.js`, and `simulate_activity.py`.
6. **Debugging pass** ("look through everything and make sure it's all working"): ran `pyflakes` across `api/` + `core/`, found the `NameError` bug in step 4's edit (missing `settings` import), fixed it, re-verified clean. Ran `python -m py_compile` across all backend `.py` files including migrations — clean. Ran `eslint` on `mobile/src/` — clean; discovered (but, per the guardrail, could not fix) the `App.js` lint-config gap described in Section 3.
7. **Ponytail review** (diff) and **ponytail audit** (whole repo) — both report-only, no changes applied. Findings:
   - `mobile/src/context/ThemeContext.js` (33 lines) — full Context/Provider/hook built for dark mode that doesn't exist (`isDarkMode` hardcoded `false`, `toggleTheme` is a no-op with a `TODO`). Candidate for deletion; consumers would `import { COLORS }` directly.
   - `api/throttles.py` — `LoginThrottle` and `RegisterThrottle` duplicate an identical `get_cache_key` override; candidate for a shared base class.
   - `api/views/profile_views.py`'s view-level `DEBUG` check (step 4) duplicates the `urls.py`-level gate for a regression that hasn't happened; candidate for deletion since the URLconf omission alone already makes the route unreachable.
8. **Ponytail debt** — grepped the repo for `ponytail:` markers; none found (nothing deferred under that convention).

## 5) Failed attempts

- **Could not fix `mobile/eslint.config.mjs`** — a config-protection hook in this Claude Code environment hard-blocks edits to that file ("Modifying eslint.config.mjs is not allowed"). The fix is one line — add `"App.js"` to the `files` array — but needs to be done locally by the user, or the hook needs an explicit exception granted.
- **Could not run `manage.py check` or the new test suite live** — same root cause as the prior session: this sandbox's system Python is 3.10.12, and Django 6.0.6 requires 3.12+. Tried installing Python 3.12 via `apt-get`; not available in this image's package sources (`apt-cache policy python3.12` returned nothing — would need a PPA and network access beyond what's available here). The project's own `venv/` does have Python 3.14 installed, but its interpreter is a symlink to a macOS-only path and doesn't resolve inside this Linux sandbox, so it couldn't be used to verify from here either. **This remains the top-priority verification gap** — see Next Steps.
- **Not a failure, but flagged in case it reads as one**: the three ponytail-review/audit findings above (`ThemeContext.js`, `throttles.py` duplication, the redundant `profile_views.py` guard) were deliberately left unapplied — those slash commands are scoped to reporting only, by design, not to editing.

## 6) Next steps

- **Run the real backend test gate locally** (top priority, carried over):
  ```
  cd ~/Desktop/FYP && source venv/bin/activate
  pip install -r requirements.txt
  cp .env.example .env   # then fill in real Stripe test keys
  python manage.py check
  python manage.py test api.tests_concurrency -v 2
  ```
- **Fix the stale `.git/index.lock`** locally: `ps aux | grep git` (confirm nothing's actually running), then `rm -f .git/index.lock`.
- **Review the large pre-existing uncommitted diff** (128 paths, `git status --short` for the full list) before committing anything from this session — confirm the `price_predictor/` / old `api/views.py` / `WalletModal.js` deletions etc. are intentional.
- **Decide on the 3 ponytail findings** and say so if you want them applied: delete `ThemeContext.js` (~2 consumers to update), dedupe `LoginThrottle`/`RegisterThrottle`'s `get_cache_key`, and/or drop the redundant `DEBUG` check in `PasswordResetDirectView.post()`.
- **Manually patch `mobile/eslint.config.mjs`** (`files: ["src/**/*.js", "App.js"]`) — blocked here by a config-protection hook.
- **New finding worth a look, not yet investigated**: `grep -rl wallet api mobile/src` still turns up live references in `api/views/profile_views.py`, `mobile/src/hooks/useProfileData.js`, `mobile/src/screens/main/ProfileScreen.js`, and `ProfileScreenStyles.js`, despite the `WalletTransaction` model and `Profile.wallet_balance` field having been removed (per migration `0031_remove_profile_wallet_balance_and_more.py` and the comment in `tests_logic.py`). Worth checking these aren't dead/broken references to a removed field — out of scope for this session's ponytail commands, which exclude correctness bugs.
- Carried over from earlier sessions, still open: `STRIPE_WEBHOOK_SECRET` is still the placeholder `whsec_dummy`; the reserved ngrok static domain is hardcoded in both `mobile/src/utils/constants.js` and `start.sh`.

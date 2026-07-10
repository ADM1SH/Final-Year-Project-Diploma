# MyPreLove: Eco-Conscious Secondhand Marketplace

## Project Overview
**MyPreLove** is a secure, trust-focused secondhand marketplace mobile app. It aims to eliminate fraud and subjective condition grading that are prevalent in platforms like Carousell and Facebook Marketplace, with an objective A-D grading system, an escrow-style Stripe payment flow, and an automated trust score.

This repository holds both halves of the project:
- **`api/` + `core/`** — a Django 6 REST API backend (JWT auth, SQLite in dev).
- **`mobile/`** — a React Native / Expo client.

Core product loop: browse/list items → chat and negotiate (offer/counter-offer) → buyer pays via Stripe (held in escrow) → buyer confirms receipt → funds released to seller → review left.

---

## 1) Prerequisites

Install these before you start, on either OS:

- **Python 3.12 or newer** — Django 6 requires it. ([python.org/downloads](https://www.python.org/downloads/))
- **Node.js 20 LTS or newer** (includes `npm`) — required by Expo SDK 54 / React Native 0.81. ([nodejs.org](https://nodejs.org/))
- **Git**
- **Expo Go** app on your phone — [iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent) — the easiest way to run the mobile client without a simulator.
- **ngrok** (optional but recommended) — [ngrok.com/download](https://ngrok.com/download). The project is set up to reach the backend through a tunnel so your phone doesn't need to be on the same Wi-Fi as your computer. See [Networking](#4-networking-phone--backend) below for the no-ngrok alternative.
- **Stripe account** (free) — [dashboard.stripe.com/register](https://dashboard.stripe.com/register) — for test-mode API keys. Payments won't work without these, everything else will.

---

## 2) Clone & configure environment variables

```bash
git clone <your-repo-link>
cd FYP
```

Both the backend and mobile app read secrets from a single `.env` file at the project root (git-ignored — never commit it).

```bash
cp .env.example .env        # macOS/Linux
copy .env.example .env      # Windows
```

Open `.env` and fill in:
- `DJANGO_SECRET_KEY` — any long random string. Generate one:
  ```bash
  python -c "import secrets,string; print(''.join(secrets.choice(string.ascii_letters+string.digits+'!@#$%^&*(-_=+)') for _ in range(50)))"
  ```
- `STRIPE_PUBLIC_KEY` / `STRIPE_SECRET_KEY` — from your Stripe dashboard's [test-mode API keys page](https://dashboard.stripe.com/test/apikeys).
- Everything else has a sensible local-dev default already filled in.

**Without a real `DJANGO_SECRET_KEY` in `.env`, the server falls back to an insecure fixed key on every restart** — if that key ever changes, every logged-in session on every device breaks with `401 Unauthorized` and everyone has to log in again. Set it once and leave it alone.

---

## 3) Backend setup (Django)

### macOS / Linux
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser   # optional — admin dashboard access
python manage.py runserver 0.0.0.0:8000
```

### Windows (PowerShell)
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser   # optional — admin dashboard access
python manage.py runserver 0.0.0.0:8000
```
> If PowerShell refuses to run the activation script (`running scripts is disabled on this system`), run this once per machine: `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`

### Windows (Command Prompt)
```cmd
python -m venv venv
venv\Scripts\activate.bat
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8000
```

Once running:
- API: `http://127.0.0.1:8000/api/`
- Admin dashboard: `http://127.0.0.1:8000/admin/`

---

## 4) Networking (phone ↔ backend)

The mobile app needs a URL it can actually reach from your phone. `mobile/src/utils/constants.js` currently hardcodes an ngrok tunnel URL (`NGROK_URL`) and always uses it — the local-IP fallback further down that file is dead code as long as `NGROK_URL` is set to a non-empty string.

**Option A — ngrok tunnel (recommended, works over cellular data too):**
```bash
ngrok http 8000
```
Copy the `https://...ngrok-free.app` forwarding URL it prints, then paste it into the `NGROK_URL` constant in `mobile/src/utils/constants.js`. A free ngrok account gives you a new random URL every time you restart the tunnel, so you'll need to update this constant each session unless you reserve a static domain on your ngrok account (the project's `start.sh` assumes a reserved static domain — see below).

**Option B — same Wi-Fi, no tunnel:**
Comment out or delete the `NGROK_URL` line in `mobile/src/utils/constants.js` so the code falls through to the `MACHINE_IP` branch, then set `MACHINE_IP` to your computer's local network IP (`ipconfig` on Windows, `ifconfig`/`ipconfig getifaddr en0` on macOS). Your phone must be on the same Wi-Fi network.

**One-command startup (macOS/Linux only):** `start.sh` runs Django + a static-domain ngrok tunnel + Expo together and shuts all three down on `Ctrl+C`:
```bash
chmod +x start.sh   # one-time
./start.sh
```
This requires a **reserved ngrok static domain** matching the `NGROK_DOMAIN` variable inside `start.sh` and the `NGROK_URL` constant in `constants.js` — it's tied to whoever set up this project's ngrok account. If you don't have access to that reserved domain, use Option A or B above instead, or edit `NGROK_DOMAIN`/`NGROK_URL` to your own. `start.sh` is a bash script — on Windows, run it via WSL or Git Bash, or just follow the manual steps in this guide instead.

---

## 5) Mobile app setup (Expo)

```bash
cd mobile
npm install
npx expo start
```

Same commands on Windows and macOS — Expo/Node tooling doesn't differ by OS here.

Then, with your phone on the network config from step 4 and Expo Go installed:
- **Android:** open Expo Go → "Scan QR Code".
- **iOS:** scan the QR code with the system Camera app.

---

## 6) Quick start checklist (after first-time setup above)

1. `source venv/bin/activate` (macOS/Linux) or `.\venv\Scripts\Activate.ps1` (Windows), then `python manage.py runserver 0.0.0.0:8000`
2. Start your tunnel (`ngrok http 8000`, or skip if using same-Wi-Fi/local IP)
3. `cd mobile && npx expo start`
4. Scan the QR code in Expo Go

---

## 🔑 Demo Credentials

Accounts that currently exist in the dev database (`db.sqlite3`) for exploring the prototype. Password is `password123` for all of them unless you've changed it locally.

| Username | Role |
| :--- | :--- |
| **`superadmin`** | Platform superuser — Django admin dashboard access |
| **`adamanwar`** | Primary user (buyer/seller) |
| **`ahmadzaki`** | Seller — vintage satchels |
| **`farhanrosli`** | Seller — tech & cameras |
| **`sitiaminah`** | Seller — luxury & designer |
| **`nurulizzah`** | Seller — fashion & denim |

---

## 🛠️ Major Project Features

1. **ABI Trust Model** — automated seller reputation score from **Integrity** (verification), **Ability** (completed sales), and **Benevolence** (buyer ratings), recalculated via Django signals.
2. **Weight-Based Carbon Calculation** — CO2-saved estimate per listing computed from weight (kg × 2.5), not price.
3. **Escrow Payments** — Stripe payment is held after checkout and only transferred to the seller once the buyer confirms receipt (`api/tests_concurrency.py` covers the double-payout race on this path).
4. **Objective A-D Grading** — condition survey (functionality, cosmetic, completeness) auto-calculates a grade on save, rather than a free-text seller claim.
5. **Real-Time-ish UX** — Django signals + frontend polling drive notification badges and chat updates without a websocket layer.
6. **Recovery-word password reset** — instead of email, `PasswordResetRequestView`/`PasswordResetVerifyView` challenge the user with 3 of their 9 saved recovery words.

---

## 📡 API Reference

Base URL: `http://127.0.0.1:8000/api/` (or your ngrok tunnel + `/api/`)

**Auth**
- `POST /register/`, `POST /login/` — returns a JWT access + refresh token pair.
- `POST /token/refresh/` — exchange a refresh token for a new access token (rotates and blacklists the old refresh token).
- `POST /logout/` — blacklists the current refresh token.
- `POST /change-password/` — authenticated password change.
- `POST /password-reset/request/`, `POST /password-reset/verify/` — 3-of-9 recovery-word reset flow.
- `POST /password-reset/direct/` — **DEBUG-only** username-only reset bypass; not registered in the URLconf when `DJANGO_DEBUG=False`.

**Core resources** (standard `ModelViewSet` REST verbs unless noted)
- `/categories/`, `/profiles/`, `/users/`
- `/items/` — filters: `?category=1`, `?calculated_grade=A`, `?min_price=10`, `?search=phone`
- `/items/suggest_price/` — heuristic price suggestion (authenticated)
- `/transactions/` — escrow-style Stripe payment lifecycle
- `/messages/` — buyer/seller chat, including offers & counter-offers
- `/notifications/` — read-only; badge counts and chat/offer alerts
- `/favorites/`, `/bundles/`, `/price-alerts/`, `/blocks/`
- `/scam-reports/`, `/reviews/`

---

*Project submitted to the Faculty of Computing and Informatics, Multimedia University (CPT4212).*

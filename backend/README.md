# Behavior Tracker — backend API

The Express + MongoDB API for the ABA Behavior Tracker. The React web app and the mobile app both talk to it with JSON over HTTPS.

Built the same way as the COP 4331C MERN tutorial (step 3, *Users and Authentication*): Express 5, Mongoose, bcrypt password hashing, JWT login tokens, and routes → controllers → models. It runs against the team's MongoDB Atlas database (`BehaviorTracker`), whose collections, validators and indexes come from the database developer's `seed.mongodb.js`.

- **Swagger / SwaggerHub:** `openapi.yaml` documents every endpoint (import it into SwaggerHub).
- **Bruno:** `api-tests/` runs the whole flow, from login to student, behavior, session, events and chart.
- **Tests:** `npm test` (unit tests, no database) and `npm run smoke -- <url>` (every endpoint, live).

## How the data fits together

```text
User (teacher or parent)
 └── Student                     GET/POST /api/students
      ├── Behavior (code "V")    GET/POST /api/students/:studentId/behaviors
      └── Session (2-min intervals)
           └── BehaviorEvent     POST /api/sessions/:sessionId/events  ← one tap
```

Every route below `/api/students`, `/api/behaviors`, `/api/sessions` and `/api/events` needs a token. Each user only ever sees their own data; someone else's id gets a 404.

## Endpoints

Request bodies use camelCase (`firstName`). Responses use the database's field names (`FirstName`, `_id`).

### Accounts (no token needed)

| Method | Path | Body | Success |
| --- | --- | --- | --- |
| GET | `/api/ping` | — | 200 `{ message }` |
| POST | `/api/users` (register) | `firstName, lastName, email, login, password, role?` | 201 `{ message, token, user }` · 409 taken |
| POST | `/api/auth/login` | `login, password` | 200 `{ token, user }` · 401 wrong password |
| POST | `/api/auth/verify-email` | `token` (also `GET ?token=`) | 200 `{ message }` |
| POST | `/api/auth/resend-verification` | `email` | 200 always |
| POST | `/api/auth/forgot-password` | `email` | 200 always |
| POST | `/api/auth/reset-password` | `token, password` | 200 · 400 bad/expired token |

### Your account (token)

| Method | Path | Body | Success |
| --- | --- | --- | --- |
| GET | `/api/auth/me` | — | 200 user |
| GET | `/api/users/:userId` | — | 200 user (403 if not you) |
| PATCH | `/api/users/:userId` | `firstName?, lastName?, email?` or `currentPassword + newPassword` | 200 user |

### Tracking (token)

| Method | Path | Body / query | Success |
| --- | --- | --- | --- |
| GET | `/api/students` | `?search=` | 200 `[student]` |
| POST | `/api/students` | `firstName, lastName, gradeLevel?, notes?` | 201 student |
| GET / PATCH / DELETE | `/api/students/:studentId` | PATCH: any student field | 200 (DELETE also removes its behaviors, sessions, events) |
| GET | `/api/students/:studentId/summary` | `?from=&to=` | 200 per-session counts and rate per hour |
| GET | `/api/students/:studentId/behaviors` | `?includeArchived=true` | 200 `[behavior]` |
| POST | `/api/students/:studentId/behaviors` | `name, code, description?, color?` | 201 · 409 code in use |
| GET / PATCH / DELETE | `/api/behaviors/:behaviorId` | PATCH: any behavior field or `isArchived` | 200 (DELETE archives it if it has events) |
| GET | `/api/students/:studentId/sessions` | `?status=&from=&to=&limit=` | 200 `[session]` newest first |
| POST | `/api/students/:studentId/sessions` | `intervalSeconds? (120), notes?` | 201 · 409 one already active |
| GET | `/api/sessions/:sessionId` | — | 200 session + `events` |
| PATCH | `/api/sessions/:sessionId` | `status: "ended"`, `notes?` | 200 |
| DELETE | `/api/sessions/:sessionId` | — | 200 (and its events) |
| GET | `/api/sessions/:sessionId/chart` | — | 200 interval chart + totals |
| GET | `/api/sessions/:sessionId/events` | — | 200 `[event]` |
| POST | `/api/sessions/:sessionId/events` | `behaviorId, timestamp?` | 201 · 409 session ended |
| GET / DELETE | `/api/events/:eventId` | — | 200 (DELETE = undo a tap) |

Errors always look like `{ "error": "message" }`.

## For the front-end and mobile developers

- Send `Content-Type: application/json`, and after login, `Authorization: Bearer <token>`. Save the token (localStorage / secure storage); `GET /api/auth/me` turns a saved token back into the user. Tokens last `JWT_EXPIRES_IN` (1 hour by default), then any call returns 401 and the app should go back to login.
- A typical screen flow: login → list students → pick one → start session → `POST .../events` on each tap (`DELETE /api/events/:id` to undo) → end session (`PATCH status: "ended"`) → show `/chart` → show `/summary` for trends.
- Email links go to `APP_URL/verify-email?token=...` and `APP_URL/reset-password?token=...`. Those two web pages read `token` from the URL and POST it to `/api/auth/verify-email` or `/api/auth/reset-password`.

## Files

```text
server.js                         connects to Atlas, sets up Express, starts HTTPS
routes/                           URL → controller, one file per resource
  index.js  auth.js  users.js  students.js  behaviors.js  sessions.js  events.js
controllers/                      what each endpoint does (in / out / db comments on each)
models/                           Mongoose models matching the Atlas validators
middleware/
  auth.js                         makes and checks JWTs (requireAuth, requireSelf)
  loadOwned.js                    loads :studentId etc. only if it belongs to you
  errorHandler.js                 404 + one place that turns errors into JSON
  validateObjectId.js
utils/
  chart.js                        interval chart + summary math
  body.js  tokens.js  email.js
config/auth.js                    JWT settings
test/                             unit tests (npm test)
scripts/smoke.js             live test of every endpoint (npm run smoke)
api-tests/                        Bruno collection
openapi.yaml                      Swagger / OpenAPI spec
```

## Setup on the droplet

```bash
# Node via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.8/install.sh | bash
source ~/.bashrc
nvm install --lts

cd behavior-tracker-backend
npm install
cp .env.example .env
vi .env      # Atlas URI, JWT_SECRET, SSL paths for your domain (email settings optional)

ufw allow 5000/tcp
npm install -g pm2
pm2 start server.js --name api
pm2 save
```

- **Atlas:** add the droplet's IP under Network Access.
- **JWT_SECRET:** `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
- **HTTPS:** `certbot certonly --apache -d YOUR-DOMAIN` (or `--standalone` without Apache), then point `SSL_KEY_PATH` / `SSL_CERT_PATH` at `/etc/letsencrypt/live/YOUR-DOMAIN/`. After certbot renews (every ~60 days), run `pm2 restart api`.
- **Email:** without `SMTP_HOST`, verification and reset emails are printed to `pm2 logs api` instead of sent. Any SMTP service works; set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`.

## Testing

```bash
npm test                                         # unit tests for the chart math
npm run smoke -- https://YOUR-DOMAIN:5000        # every endpoint against the live API
```

The smoke test registers a throwaway `smoke<number>` user, creates a student with behaviors, runs a session, records events, checks the chart and summary, then deletes the student. It prints PASS/FAIL per step.

**Bruno:** Open Collection → `api-tests`, pick the **Production** environment and set `baseURL`. Run the requests in order (1–19): Login saves the token, and Create Student, Create Behavior and Start Session save their ids for the requests after them. Delete Student cleans up.

## SwaggerHub

Create New → Import and Document API → upload `openapi.yaml` → change `YOUR-DOMAIN` in `servers`. Try **POST /auth/login** (pre-filled), copy the token into **Authorize**, then any endpoint works from the page.

Demo accounts from the seed data: `jrivera`, `achen` (teachers), `spatel` (parent, unverified). Password: `Password123!`.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `JWT_SECRET is not set` on start | Missing from `.env` |
| `MongoDB connection error` / requests hang | Droplet IP not in the Atlas allowlist, or wrong URI |
| Connection refused / timeout | Server not running (`pm2 status`), or port 5000 closed |
| Certificate error | Calling the IP instead of the domain, or wrong cert paths |
| 400 "Document failed database validation" | A collection's validator differs from `models/`; compare with `seed.mongodb.js` |
| 409 on a new behavior | That letter is already used by an active behavior for this student |
| 409 on an event | The session has ended |

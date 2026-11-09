# Wasla Web: Running the Project Locally

Wasla Web has three parts that run at the same time:

| Part | Technology | Folder | Address |
|---|---|---|---|
| Database | MongoDB 6+ | – | `mongodb://localhost:27017` |
| Backend API | Python 3.11 + FastAPI | `backend/` | http://localhost:8001 (API docs: http://localhost:8001/docs) |
| Frontend | React 19 + Vite + Tailwind | `frontend/` | http://localhost:3000 |

The frontend calls `/api/...`, and Vite forwards those calls to the backend on port 8001. You open only http://localhost:3000 in the browser.

## 1. Install the tools (one time)

| Tool | Version | Check with |
|---|---|---|
| Git | any | `git --version` |
| Python | 3.11 (3.10 to 3.12 should work) | `python3 --version` |
| Node.js | 20 or newer (built with 24) | `node --version` |
| Yarn 1 | 1.22.x | `yarn --version`. Install it with `npm install -g yarn` |
| MongoDB | 6 or newer, or Docker | `mongod --version` or `docker --version` |

Download links: Python https://www.python.org/downloads/ · Node.js https://nodejs.org/ · MongoDB Community https://www.mongodb.com/try/download/community · Docker https://www.docker.com/products/docker-desktop/

## 2. Get the code from GitHub

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
```

## 3. Start MongoDB

Pick one option.

**Option A: Docker (easiest)**

```bash
docker run -d --name wasla-mongo -p 27017:27017 -v wasla-mongo-data:/data/db mongo:7
```

After a restart, start it again with `docker start wasla-mongo`.

**Option B: MongoDB installed on your computer**

- macOS (Homebrew): `brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community`
- Ubuntu/Debian: follow https://www.mongodb.com/docs/manual/administration/install-on-linux/ then run `sudo systemctl start mongod`
- Windows: run the installer with "Install MongoDB as a Service" ticked. It then starts on its own.

Check that it is running: `mongosh --eval "db.runCommand({ ping: 1 })"` should print `ok: 1`.

## 4. Set up the backend (terminal 1)

```bash
cd backend

# 4.1 Create and turn on a virtual environment
python3 -m venv .venv
source .venv/bin/activate            # Windows PowerShell:  .venv\Scripts\Activate.ps1
                                     # Windows cmd:         .venv\Scripts\activate.bat

# 4.2 Install the packages
#     emergentintegrations (used for the AI CV) comes from an extra package index:
pip install --upgrade pip
pip install -r requirements.txt --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/

# 4.3 Create your settings file
cp .env.example .env                 # Windows:  copy .env.example .env
```

Open `backend/.env` and fill in the values:

- `MONGO_URL=mongodb://localhost:27017` and `DB_NAME=wasla`. You can keep these as they are.
- `JWT_SECRET`: generate one with `python -c "import secrets; print(secrets.token_hex(32))"`
- `EMERGENT_LLM_KEY` (optional): copy it from your Emergent account. Without it, the CV is built from the template only.
- `EMERGENT_EMAIL_KEY` (optional): copy it from your Emergent account. Without it, emails are skipped. In-app notifications still work.

Your real keys are not in GitHub on purpose. `.env` files are never pushed.

```bash
# 4.4 Fill the database with demo accounts and sample data (safe to run more than once)
python seed.py

# 4.5 Start the API (it restarts on its own when you change code)
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

Check it: open http://localhost:8001/api/. You should see `{"message":"Wasla Web API"}`.

## 5. Set up the frontend (terminal 2)

```bash
cd frontend
yarn install          # first time only (use yarn, not npm)
yarn dev              # starts http://localhost:3000
```

Open http://localhost:3000.

If `yarn install` cannot download the `@emergentbase/...` packages (they are dev tools for the Emergent editor), remove those two lines from `frontend/package.json`. Then run `yarn install` again and start with `DISABLE_VISUAL_EDITS=true yarn dev`. On Windows PowerShell, use `$env:DISABLE_VISUAL_EDITS="true"; yarn dev`.

## 6. Log in with the demo accounts

The login page has buttons that fill these in for you.

| Role | Email | Password |
|---|---|---|
| Student | ahmad@wasla.edu | Student@123 |
| Company (approved) | recruiter@techventures.jo | Company@123 |
| University admin | admin@wasla.edu | Admin@123 |
| Company waiting for approval | info@aqabalogistics.jo | Company@123 |

More generated students: `student1@wasla.edu` … `student7@wasla.edu` (password `Student@123`).

All sample data is generated from templates and marked "Generated sample". Sample accounts never receive real emails. To test email alerts, register a new account with your own email address.

## 7. Everyday commands

| Task | Command (folder) |
|---|---|
| Start the backend | `source .venv/bin/activate && uvicorn server:app --port 8001 --reload` (backend/) |
| Start the frontend | `yarn dev` (frontend/) |
| Reset the sample data | `python seed.py` (backend/). This only adds missing records and never deletes |
| Check frontend types | `yarn typecheck` (frontend/) |
| Lint the frontend | `yarn lint` (frontend/) |
| Production build of the frontend | `yarn build` (frontend/). Output goes to `frontend/dist/` |
| Run backend tests | `pytest` (backend/) |
| Interactive API docs | http://localhost:8001/docs |

Run the weekly digest by hand. It runs on its own every Sunday at 09:00 Jordan time only on Emergent. Locally, trigger it yourself:

```bash
curl -X POST http://localhost:8001/api/cron/weekly-digest \
  -H "Authorization: Bearer <WEBHOOK_CRON_SECRET from backend/.env>" \
  -H "X-Webhook-Id: local-run-1" -H "Content-Type: application/json" -d '{}'
```

Use a new `X-Webhook-Id` value each time. Each student gets at most one digest per day.

## 8. Troubleshooting

| Problem | Fix |
|---|---|
| `ServerSelectionTimeoutError` / backend can't connect | MongoDB isn't running. Do step 3 again and check `MONGO_URL` in `backend/.env` |
| `KeyError: 'MONGO_URL'` | `backend/.env` is missing. Run `cp .env.example .env` and fill it in |
| `No matching distribution found for emergentintegrations` | Add `--extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/` to the pip install command |
| Frontend loads but every page says "Request failed" | The backend isn't running on port 8001. Start it (step 4.5) |
| Login works but you get sent back to the login page | Open the site at http://localhost:3000, not 127.0.0.1, so the session cookie matches |
| Port 3000 or 8001 already in use | Stop the other program, or change the port: `uvicorn ... --port 8002`. Then update `target` in `frontend/vite.config.ts` |
| CV says "Template only" | `EMERGENT_LLM_KEY` is empty or invalid. The CV still works without AI wording |
| Emails show "failed" | `EMERGENT_EMAIL_KEY` is missing or your Emergent credits are used up |

## Project layout

```
backend/
  server.py            FastAPI app (all routes under /api)
  seed.py              demo accounts + generated sample data
  lib/                 auth, matching formula + gap analysis, CV AI, email, digest
  models/schemas.py    request/response models
  routers/             auth, student, company, admin, shared, cron endpoints
frontend/
  src/pages/           Landing, Auth, student/*, company/*, admin/*, Notifications
  src/components/      AppShell, Match (score + breakdown), shared UI
  src/lib/             api client, types, i18n (English/Arabic)
memory/SPEC.md         full functional spec (data model,
```
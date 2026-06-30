# Interview Prep AI — FastAPI Backend

Standalone async Python backend for the Interview Prep AI platform.  
Owns auth, room templates, session lifecycle, realtime interview WebSocket, AI scoring, and feedback reports.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | FastAPI 0.111 + Uvicorn |
| Database | PostgreSQL via async SQLAlchemy 2.0 + asyncpg |
| Migrations | Alembic (async) |
| Cache / state | Redis (async via redis-py) |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| AI — questions | Google Gemini 1.5 Flash / Pro |
| AI — STT | Deepgram nova-2 |
| AI — classifier | HuggingFace `facebook/bart-large-mnli` |
| TTS | Azure Cognitive Services Speech (REST) |
| Realtime | LiveKit (token generation via livekit-api) |
| Email | aiosmtplib (SMTP) |

---

## Project structure

```
backendfastapi/
├── alembic/                   Alembic migrations
│   └── versions/
│       ├── 24d61180ed72_initial_migration.py   users + user_profiles
│       ├── 0002_rooms_and_sessions.py           room templates, sessions, turns, reports
│       └── 0003_add_is_admin.py                 is_admin flag on users
├── app/
│   ├── api/routes/
│   │   ├── auth.py            POST /api/auth/register|login|refresh|verify-email
│   │   ├── rooms.py           GET  /api/rooms, /api/rooms/{id}
│   │   ├── sessions.py        CRUD /api/sessions + /report + /report/status
│   │   └── admin.py           POST /api/admin/rooms, PATCH, DELETE, seed + user promote/demote
│   ├── core/
│   │   ├── config.py          Pydantic Settings — all env vars
│   │   ├── database.py        Async SQLAlchemy engine + get_db dependency
│   │   ├── redis.py           Redis pool + get_redis dependency
│   │   ├── security.py        JWT helpers + bcrypt
│   │   ├── dependencies.py    get_current_user (Bearer JWT)
│   │   └── admin_deps.py      get_admin_user (is_admin gate)
│   ├── integrations/
│   │   ├── livekit_client.py  Token generation
│   │   ├── gemini_client.py   Question generation + feedback scoring
│   │   ├── deepgram_client.py STT transcription
│   │   ├── tts_client.py      Azure TTS → MP3 bytes
│   │   ├── huggingface_client.py Zero-shot answer classification
│   │   └── smtp.py            Async email (verification)
│   ├── models/
│   │   ├── user.py            User, UserProfile
│   │   ├── room.py            InterviewRoomTemplate
│   │   └── session.py         InterviewSession, InterviewTurn, FeedbackReport
│   ├── repositories/
│   │   ├── user_repository.py
│   │   ├── room_repository.py
│   │   └── session_repository.py
│   ├── schemas/
│   │   ├── auth.py
│   │   ├── rooms.py
│   │   └── sessions.py
│   ├── services/
│   │   ├── auth_service.py
│   │   ├── room_service.py
│   │   ├── session_service.py
│   │   ├── report_service.py
│   │   └── interview_orchestrator.py   WS business logic
│   ├── tasks/
│   │   └── report_tasks.py    Async report generation (Gemini + HF)
│   ├── websocket/
│   │   ├── interview_ws.py    WS endpoint + thin conductor
│   │   ├── connection_manager.py
│   │   ├── session_state.py   Redis state + audio buffer
│   │   ├── schemas.py         WS message types
│   │   └── ws_auth.py         JWT from ?token= query param
│   └── main.py                App factory + lifespan
├── .env                       Local secrets (not committed)
├── .env.example               Safe template
├── alembic.ini
└── requirements.txt
```

---

## Setup

### 1. Prerequisites

- Python 3.11+
- PostgreSQL 15+
- Redis 7+

### 2. Install dependencies

```bash
cd backendfastapi
python -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env — fill in DATABASE_URL, SECRET_KEY, and any provider keys you want active
```

Minimum required keys to boot:
```
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/interview_db
SECRET_KEY=<any-long-random-string>
REDIS_URL=redis://localhost:6379/0
```

### 4. Run migrations

```bash
alembic upgrade head
```

### 5. Seed room templates (optional)

After booting, promote yourself to admin first:
```bash
# Direct DB approach — set is_admin=true for your user row
# Then use the admin API:
```
Or use the API once running:
```
POST /api/admin/rooms/seed
Authorization: Bearer <admin_token>
```

### 6. Start the server

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

API docs available at: `http://localhost:8001/docs`

---

## API reference

### Auth (`/api/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | — | Create account, send verification email |
| POST | `/login` | — | Email + password → JWT token pair |
| POST | `/refresh` | — | Refresh token → new token pair |
| POST | `/verify-email` | — | Verify email with token from link |
| POST | `/resend-verification` | — | Re-send verification email |
| GET | `/me` | Bearer | Current user + profile |
| PATCH | `/me` | Bearer | Update name / profile fields |

### Rooms (`/api/rooms`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `` | Bearer | List active templates; filter by round_type, difficulty, company; free-text search |
| GET | `/{id}` | Bearer | Full detail incl. persona + rubric |

### Sessions (`/api/sessions`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `` | Bearer | User's session history |
| POST | `` | Bearer | Create session from room_template_id |
| GET | `/{id}` | Bearer | Full detail with turns + report |
| POST | `/{id}/start` | Bearer | Start → in_progress, issue LiveKit token |
| POST | `/{id}/complete` | Bearer | Complete → fires report generation |
| POST | `/{id}/cancel` | Bearer | Cancel |
| GET | `/{id}/report` | Bearer | Get completed feedback report |
| GET | `/{id}/report/status` | Bearer | Poll: pending / running / done / failed |
| POST | `/{id}/report/generate` | Bearer | Trigger / re-trigger report (idempotent, 202) |
| POST | `/{id}/report` | Bearer | Manually submit report payload |

### Admin (`/api/admin`) — requires is_admin=True

| Method | Path | Description |
|---|---|---|
| POST | `/rooms` | Create room template |
| PATCH | `/rooms/{id}` | Partial update room template |
| DELETE | `/rooms/{id}` | Soft-deactivate room template |
| POST | `/rooms/seed` | Bulk insert 5 canonical rooms (idempotent) |
| GET | `/users` | List all users |
| PATCH | `/users/{id}/promote` | Grant admin |
| PATCH | `/users/{id}/demote` | Revoke admin |

### WebSocket

```
WS /ws/interview/{session_id}?token=<access_jwt>
```

Session must be `in_progress`. See `app/websocket/schemas.py` for full message protocol.

---

## WebSocket message protocol

### Client → Server

| type | Fields | Description |
|---|---|---|
| `answer` | `text: str` | Submit text answer |
| `audio_chunk` | `audio_data: str (b64)`, `mime_type`, `chunk_final: bool` | Stream audio; flush on chunk_final |
| `audio_answer` | `audio_data: str (b64)`, `mime_type` | Complete audio blob |
| `ping` | — | Keep-alive |
| `end_session` | — | Request graceful end |

### Server → Client

| type | Fields | Description |
|---|---|---|
| `connected` | `session_id`, `turn_number`, `total_turns` | Handshake confirmed |
| `thinking` | — | Server generating question (show spinner) |
| `question` | `turn_number`, `question_text`, `total_turns` | AI interviewer question |
| `transcript_final` | `text`, `confidence` | Confirmed transcript before saving |
| `turn_saved` | `turn_number` | Answer persisted |
| `session_ended` | `session_id`, `message` | Interview complete |
| `error` | `detail`, `recoverable` | Non-fatal error |
| `pong` | — | Keep-alive reply |

---

## Background tasks

Report generation runs as a fire-and-forget `asyncio.Task` after session completion:

1. Gemini 1.5 Pro scores all turns against the rubric
2. HuggingFace zero-shot classifier enriches per-competency confidence scores (optional — skipped if unconfigured)
3. `FeedbackReport` written to DB
4. Redis `report_status:{session_id}` updated: `running → done | failed`

Poll `GET /api/sessions/{id}/report/status` to track progress.

---

## Environment variables

See `.env.example` for all keys. Mandatory:

```
DATABASE_URL        postgresql+asyncpg://...
SECRET_KEY          long random string
REDIS_URL           redis://...
```

Provider keys (all optional — graceful fallback if absent):

```
GOOGLE_API_KEY          Gemini question generation + feedback
DEEPGRAM_API_KEY        Audio STT
AZURE_SPEECH_KEY        TTS audio
AZURE_SPEECH_REGION
AZURE_TTS_VOICE
LIVEKIT_URL             LiveKit server
LIVEKIT_API_KEY
LIVEKIT_API_SECRET
HUGGING_FACE_API_KEY    Zero-shot classifier enrichment
SMTP_USERNAME           Email verification
SMTP_PASSWORD
BEYOND_PRESENCE_API_KEY Avatar (future)
```

---

## Django backend (`backend-django`)

The Django backend (`backend-django/`) is the **legacy backend** that was superseded by this FastAPI service.  
It is retained for reference only — do not run both simultaneously against the same database.  
All data models, auth, sessions, and WebSocket logic now live exclusively in this FastAPI service.

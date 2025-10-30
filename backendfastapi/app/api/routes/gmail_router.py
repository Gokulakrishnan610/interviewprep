from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from app.core.config import settings
from app.services.ai import AIService
import os
import json
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

router = APIRouter()

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly"
]

def _token_path() -> str:
    return settings.GMAIL_TOKEN_FILE

def _build_credentials() -> Optional[Credentials]:
    token_file = _token_path()
    if os.path.exists(token_file):
        return Credentials.from_authorized_user_file(token_file, SCOPES)
    return None

@router.get("/auth-url")
async def get_auth_url():
    if not settings.GMAIL_CLIENT_ID or not settings.GMAIL_CLIENT_SECRET:
        raise HTTPException(status_code=400, detail="Gmail OAuth not configured")
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GMAIL_CLIENT_ID,
                "client_secret": settings.GMAIL_CLIENT_SECRET,
                "redirect_uris": [settings.GMAIL_REDIRECT_URI],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=SCOPES,
    )
    flow.redirect_uri = settings.GMAIL_REDIRECT_URI
    authorization_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent"
    )
    return {"auth_url": authorization_url, "state": state}

@router.get("/oauth-callback")
async def oauth_callback(request: Request):
    params = dict(request.query_params)
    code = params.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GMAIL_CLIENT_ID,
                "client_secret": settings.GMAIL_CLIENT_SECRET,
                "redirect_uris": [settings.GMAIL_REDIRECT_URI],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=SCOPES,
    )
    flow.redirect_uri = settings.GMAIL_REDIRECT_URI
    flow.fetch_token(code=code)
    creds = flow.credentials
    with open(_token_path(), "w") as f:
        f.write(creds.to_json())
    return {"success": True}

class FetchResult(BaseModel):
    subject: Optional[str] = None
    from_email: Optional[str] = None
    received_at: Optional[str] = None
    analysis: Optional[dict] = None

def _parse_beyond_presence_email(snippet: str, body_text: str) -> str:
    # Simple parser: return full text for scoring; a smarter parser can be added
    if body_text:
        return body_text
    return snippet or ""

@router.get("/fetch-latest", response_model=FetchResult)
async def fetch_latest_and_score():
    creds = _build_credentials()
    if not creds or not creds.valid:
        raise HTTPException(status_code=401, detail="Not authorized for Gmail. Start OAuth flow.")
    service = build("gmail", "v1", credentials=creds)
    results = service.users().messages().list(
        userId="me",
        q="from:support@beyondpresence.ai",
        maxResults=1,
    ).execute()
    messages = results.get("messages", [])
    if not messages:
        raise HTTPException(status_code=404, detail="No Beyond Presence emails found")
    msg_id = messages[0]["id"]
    msg = service.users().messages().get(userId="me", id=msg_id, format="full").execute()
    headers = {h["name"].lower(): h["value"] for h in msg.get("payload", {}).get("headers", [])}
    subject = headers.get("subject")
    from_email = headers.get("from")
    snippet = msg.get("snippet")

    # Extract plain text body
    def get_body(payload):
        if payload.get("mimeType") == "text/plain" and payload.get("body", {}).get("data"):
            import base64
            return base64.urlsafe_b64decode(payload["body"]["data"]).decode("utf-8", errors="ignore")
        for part in payload.get("parts", []) or []:
            text = get_body(part)
            if text:
                return text
        return ""

    body_text = get_body(msg.get("payload", {}))
    full_text = _parse_beyond_presence_email(snippet, body_text)

    ai = AIService()
    analysis = await ai.analyze_interview(full_text)

    return FetchResult(
        subject=subject,
        from_email=from_email,
        received_at=str(msg.get("internalDate")),
        analysis=analysis,
    )



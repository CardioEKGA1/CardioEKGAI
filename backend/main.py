from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from anthropic import Anthropic
from sqlalchemy.orm import Session
from database import get_db, User
from auth import verify_password, hash_password, create_token, decode_token
from pydantic import BaseModel
import base64
import os
import json
import re
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="EKGScan")
client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class UserCreate(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    if not payload:
        return None
    user = db.query(User).filter(User.email == payload.get("sub")).first()
    return user

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/auth/register")
def register(data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(email=data.email, hashed_password=hash_password(data.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_token({"sub": user.email})
    return {"access_token": token, "scan_count": user.scan_count, "is_subscribed": user.is_subscribed}

@app.post("/auth/login")
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token({"sub": user.email})
    return {"access_token": token, "scan_count": user.scan_count, "is_subscribed": user.is_subscribed}

@app.get("/auth/me")
def me(current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"email": current_user.email, "scan_count": current_user.scan_count, "is_subscribed": current_user.is_subscribed}

@app.post("/analyze")
async def analyze_ekg(file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Please sign in to analyze EKGs")
    if not current_user.is_subscribed and current_user.scan_count >= 1:
        raise HTTPException(status_code=402, detail="Free scan used. Please upgrade to continue.")
    contents = await file.read()
    b64 = base64.standard_b64encode(contents).decode("utf-8")
    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2000,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": file.content_type or "image/jpeg", "data": b64}},
                {"type": "text", "text": "You are an expert cardiologist. Analyze this EKG image. You MUST respond with ONLY a JSON object, no other text before or after. Use this exact format: {\"rhythm\": \"value\", \"rate\": \"value\", \"pr_interval\": \"value\", \"qrs_duration\": \"value\", \"qt_interval\": \"value\", \"qtc\": \"value\", \"axis\": \"value\", \"impression\": \"value\", \"urgent_flags\": [], \"recommendation\": \"value\"}"}
            ]
        }]
    )
    text = response.content[0].text.strip()
    match = re.search(r'\{.*\}', text, re.DOTALL)
    result = json.loads(match.group() if match else text)
    current_user.scan_count += 1
    db.commit()
    return result

@app.post("/chat")
async def chat(data: dict, current_user: User = Depends(get_current_
cd ~/Desktop/CardioEKGAI/backend
cat > main.py << 'ENDOFFILE'
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from anthropic import Anthropic
from sqlalchemy.orm import Session
from database import get_db, User
from auth import verify_password, hash_password, create_token, decode_token
from pydantic import BaseModel
import base64
import os
import json
import re
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="EKGScan")
client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class UserCreate(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    if not payload:
        return None
    user = db.query(User).filter(User.email == payload.get("sub")).first()
    return user

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/auth/register")
def register(data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(email=data.email, hashed_password=hash_password(data.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_token({"sub": user.email})
    return {"access_token": token, "scan_count": user.scan_count, "is_subscribed": user.is_subscribed}

@app.post("/auth/login")
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token({"sub": user.email})
    return {"access_token": token, "scan_count": user.scan_count, "is_subscribed": user.is_subscribed}

@app.get("/auth/me")
def me(current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"email": current_user.email, "scan_count": current_user.scan_count, "is_subscribed": current_user.is_subscribed}

@app.post("/analyze")
async def analyze_ekg(file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Please sign in to analyze EKGs")
    if not current_user.is_subscribed and current_user.scan_count >= 1:
        raise HTTPException(status_code=402, detail="Free scan used. Please upgrade to continue.")
    contents = await file.read()
    b64 = base64.standard_b64encode(contents).decode("utf-8")
    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2000,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": file.content_type or "image/jpeg", "data": b64}},
                {"type": "text", "text": "You are an expert cardiologist. Analyze this EKG image. You MUST respond with ONLY a JSON object, no other text before or after. Use this exact format: {\"rhythm\": \"value\", \"rate\": \"value\", \"pr_interval\": \"value\", \"qrs_duration\": \"value\", \"qt_interval\": \"value\", \"qtc\": \"value\", \"axis\": \"value\", \"impression\": \"value\", \"urgent_flags\": [], \"recommendation\": \"value\"}"}
            ]
        }]
    )
    text = response.content[0].text.strip()
    match = re.search(r'\{.*\}', text, re.DOTALL)
    result = json.loads(match.group() if match else text)
    current_user.scan_count += 1
    db.commit()
    return result

@app.post("/chat")
async def chat(data: dict, current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Please sign in to use chat")
    if not current_user.is_subscribed and current_user.scan_count > 1:
        raise HTTPException(status_code=402, detail="Please upgrade to use chat")
    messages = data.get("messages", [])
    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1000,
        system="You are Dr. SoulMD, an expert cardiologist providing clinical decision support. Be concise and clinically precise.",
        messages=messages
    )
    return {"message": response.content[0].text}

_build = os.path.join(os.path.dirname(__file__), "build")
if os.path.exists(_build):
    app.mount("/static", StaticFiles(directory=os.path.join(_build, "static")), name="static")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        return FileResponse(os.path.join(_build, "index.html"))

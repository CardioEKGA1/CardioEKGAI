from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from anthropic import Anthropic
import base64
import os
import json
import re
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="CardioEKGAI")
client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/analyze")
async def analyze_ekg(file: UploadFile = File(...)):
    contents = await file.read()
    b64 = base64.standard_b64encode(contents).decode("utf-8")
    
    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2000,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": file.content_type or "image/jpeg",
                        "data": b64
                    }
                },
                {
                    "type": "text",
                    "text": "You are an expert cardiologist. Analyze this EKG image. You MUST respond with ONLY a JSON object, no other text before or after. Use this exact format: {\"rhythm\": \"value\", \"rate\": \"value\", \"pr_interval\": \"value\", \"qrs_duration\": \"value\", \"qt_interval\": \"value\", \"qtc\": \"value\", \"axis\": \"value\", \"impression\": \"value\", \"urgent_flags\": [], \"recommendation\": \"value\"}"
                }
            ]
        }]
    )
    
    text = response.content[0].text.strip()
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        result = json.loads(match.group())
    else:
        result = json.loads(text)
    return result

@app.post("/chat")
async def chat(data: dict):
    messages = data.get("messages", [])
    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1000,
        system="You are Dr. CardioEKGAI, an expert cardiologist providing clinical decision support. Be concise and clinically precise.",
        messages=messages
    )
    return {"message": response.content[0].text}

FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*
COPY backend/requirements.txt .
RUN pip install -r requirements.txt aiofiles
COPY backend/ .
COPY frontend/build ./build
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}

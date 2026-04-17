FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install -r requirements.txt aiofiles
COPY backend/ .
COPY frontend/build ./build
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}

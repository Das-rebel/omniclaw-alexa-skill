FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc g++ git ffmpeg libsndfile1 wget curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir fastapi uvicorn pydantic requests python-multipart

# Install TTS (lazy load models)
RUN pip install --no-cache-dir TTS==0.22.0

# Copy application code
COPY main.py .

# Create directories
RUN mkdir -p /app/voice_samples /tmp/xtts_models

# Cloud Run expects port 8080
ENV PORT=8080
EXPOSE 8080

CMD ["python", "main.py"]

FROM python:3.10.12-slim

RUN apt-get update && apt-get install -y \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN ls -la vosk-model-small-pt-0.3/ || echo "Model directory not found"

EXPOSE 8765

ENV PYTHONUNBUFFERED=1

CMD ["python", "server.py"]

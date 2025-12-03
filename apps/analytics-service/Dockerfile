FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY apps/analytics-service/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY apps/analytics-service .

# Create non-root user
RUN useradd -m -u 1001 analytics && chown -R analytics:analytics /app
USER analytics

EXPOSE 3002

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3002"]

FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends libpq-dev gcc libc6-dev && rm -rf /var/lib/apt/lists/*
RUN pip install uv

WORKDIR /app/backend

# Install dependencies first (cached layer)
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --no-dev --frozen

# Copy application code
COPY backend/app/ app/
COPY backend/lumen_agents/ lumen_agents/
COPY backend/seed.py .
COPY backend/entrypoint.sh .
RUN chmod +x entrypoint.sh

# Copy data directory (GeoJSON for licensing checks)
COPY data/ /app/data/

EXPOSE 8080

CMD ["./entrypoint.sh"]

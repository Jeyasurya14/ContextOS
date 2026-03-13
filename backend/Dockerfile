FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    curl \
    cargo \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
ENV CARGO_HOME=/tmp/cargo
ENV CARGO_TARGET_DIR=/tmp/cargo_target
RUN pip install --no-cache-dir -r requirements.txt && rm -rf /tmp/cargo /tmp/cargo_target

COPY . .
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

RUN adduser --disabled-password --gecos '' appuser
RUN chown -R appuser:appuser /app
USER appuser

ENV PORT=8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:$PORT/health/ready || exit 1

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["web"]
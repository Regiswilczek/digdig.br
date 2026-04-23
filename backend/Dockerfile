FROM python:3.12-slim

# Non-root user
RUN groupadd -r digdig && useradd -r -g digdig digdig

WORKDIR /app

# Install system deps for pdfplumber + asyncpg
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Don't run as root
RUN chown -R digdig:digdig /app
USER digdig

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

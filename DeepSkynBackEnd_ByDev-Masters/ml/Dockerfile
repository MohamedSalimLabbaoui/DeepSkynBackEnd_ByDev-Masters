# Dockerfile pour le microservice FastAPI LSF
# À placer dans le dossier de la racine du projet Python

FROM python:3.10-slim

WORKDIR /app

# Installer les dépendances système
RUN apt-get update && apt-get install -y \
    git \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copier les requirements
COPY requirements.txt .

# Installer les dépendances Python
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Cloner le repo sign-language-processing
RUN git clone https://github.com/sign-language-processing/spoken-to-signed-translation.git /app/sls && \
    cd /app/sls && \
    pip install .

# Copier le code application
COPY app.py .

# Expose le port
EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Commande de démarrage
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]

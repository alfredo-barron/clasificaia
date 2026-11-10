# ClasificaIA — proyecto base de Cómputo en la Nube

Aplicación de IA sencilla (KNN sobre Iris) para practicar el despliegue en la nube.
Cada equipo la reemplaza por **su propio algoritmo y datos** (ver diapositivas "Proyecto de la materia").

| Carpeta | Uso | Unidad |
|---|---|---|
| `modelo/entrenar.py` | Entrena y guarda `modelo.joblib` | 3.1 |
| `app/` | API FastAPI + panel web (`index.html`, `static/estilos.css`, `static/app.js`) | 3.2 |
| `Dockerfile`, `k8s/` | Contenedor, Kubernetes y HPA | 3.3, 3.4 |
| `serverless/` | Variante AWS Lambda (imagen de contenedor) | 3.5 |
| `infra/main.tf` | EC2 + grupo de seguridad con Terraform | 3.6, Lab. 5 |
| `.github/workflows/ci.yml` | Pruebas y publicación de la imagen en GHCR | 3.2 |

## Local
    pip install -r requirements.txt pytest httpx
    python modelo/entrenar.py
    pytest -q
    uvicorn app.main:app --reload        # http://localhost:8000  y  /docs

## Panel web y API
El panel (`/`) muestra el estado del servicio, las métricas del modelo (exactitud, validación
cruzada, precisión/recall/F1 por clase y matriz de confusión), un formulario para clasificar con
ejemplos de cada especie, las probabilidades por clase y el historial de la sesión.

| Ruta | Qué devuelve |
|---|---|
| `GET /health` | Estado y versión del modelo |
| `POST /predict` | Clase, confianza y probabilidad de cada clase |
| `GET /metrics` | Métricas calculadas en `entrenar.py` sobre el conjunto de prueba |

Al cambiar de algoritmo o de datos, mantengan las llaves de `metricas` en `entrenar.py`
para que el panel siga funcionando.

## Docker Compose (despliegue local)
    docker compose up -d --build         # http://localhost:8000  y  /docs
    docker compose ps                    # debe decir (healthy)
    docker compose logs -f api
    docker compose down                  # detener al terminar

Para usar otro puerto: `PUERTO=8080 docker compose up -d`. El modelo se entrena al construir
la imagen, así que no hace falta correr `entrenar.py` antes.

## Docker (sin Compose)
    docker build -t clasificaia .
    docker run -p 8000:8000 clasificaia

## Nube (Terraform)
    cd infra
    terraform init
    terraform apply -var="imagen=ghcr.io/<usuario>/<repo>:latest" -var="mi_ip=<tu-ip>/32"
    terraform destroy                    # ¡al terminar!

> La imagen de GHCR debe ser pública (Packages → Settings → Change visibility) para que la VM pueda descargarla.

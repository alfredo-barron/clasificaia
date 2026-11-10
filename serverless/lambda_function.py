"""Variante serverless: AWS Lambda + URL de función (o API Gateway)."""
import json

import joblib

ART = joblib.load("modelo.joblib")          # fuera del handler: se reutiliza entre invocaciones
CAMPOS = ["largo_sepalo", "ancho_sepalo", "largo_petalo", "ancho_petalo"]


def lambda_handler(event, context):
    try:
        datos = json.loads(event.get("body") or "{}")
        x = [[float(datos[c]) for c in CAMPOS]]
    except (KeyError, ValueError, TypeError):
        return {"statusCode": 400, "body": json.dumps({"error": "faltan campos numéricos"})}
    probs = ART["modelo"].predict_proba(x)[0]
    i = int(probs.argmax())
    return {"statusCode": 200, "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"clase": ART["clases"][i], "confianza": round(float(probs[i]), 3)})}

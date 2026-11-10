"""ClasificaIA: API de clasificación de flores Iris con panel web."""
from pathlib import Path

import joblib
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

AQUI = Path(__file__).parent
ART = joblib.load(AQUI / "modelo.joblib")   # se carga una vez
app = FastAPI(title="ClasificaIA", version=ART["version"])

# CSS y JavaScript del panel: app/static/estilos.css y app/static/app.js
app.mount("/static", StaticFiles(directory=AQUI / "static"), name="static")


class Flor(BaseModel):
    largo_sepalo: float = Field(gt=0, lt=10)
    ancho_sepalo: float = Field(gt=0, lt=10)
    largo_petalo: float = Field(gt=0, lt=10)
    ancho_petalo: float = Field(gt=0, lt=10)


@app.get("/health")
def salud():
    return {"status": "ok", "version": ART["version"]}


@app.post("/predict")
def predecir(f: Flor):
    x = [[f.largo_sepalo, f.ancho_sepalo, f.largo_petalo, f.ancho_petalo]]
    probs = ART["modelo"].predict_proba(x)[0]
    i = int(probs.argmax())
    return {
        "clase": ART["clases"][i],
        "confianza": round(float(probs[i]), 3),
        # Probabilidad de cada clase: el panel las dibuja como barras
        "probabilidades": {c: round(float(p), 3) for c, p in zip(ART["clases"], probs)},
    }


@app.get("/metrics")
def metricas():
    """Métricas del modelo calculadas al entrenar (conjunto de prueba)."""
    m = ART.get("metricas") or {"exactitud": ART.get("exactitud")}   # modelos viejos sin métricas
    return {"version": ART["version"], "clases": ART["clases"], **m}


@app.get("/", response_class=HTMLResponse)
def inicio():
    return (AQUI / "index.html").read_text(encoding="utf-8")

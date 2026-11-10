from fastapi.testclient import TestClient

from app.main import app

c = TestClient(app)


def test_health():
    assert c.get("/health").json()["status"] == "ok"


def test_predict_setosa():
    r = c.post("/predict", json={"largo_sepalo": 5.1, "ancho_sepalo": 3.5,
                                 "largo_petalo": 1.4, "ancho_petalo": 0.2})
    assert r.status_code == 200 and r.json()["clase"] == "setosa"


def test_predict_invalido():
    r = c.post("/predict", json={"largo_sepalo": -1, "ancho_sepalo": 3.5,
                                 "largo_petalo": 1.4, "ancho_petalo": 0.2})
    assert r.status_code == 422


def test_probabilidades_suman_uno():
    r = c.post("/predict", json={"largo_sepalo": 6.0, "ancho_sepalo": 2.8,
                                 "largo_petalo": 4.5, "ancho_petalo": 1.4})
    probs = r.json()["probabilidades"]
    assert set(probs) == {"setosa", "versicolor", "virginica"}
    assert abs(sum(probs.values()) - 1) < 0.01


def test_metricas():
    m = c.get("/metrics").json()
    assert 0 <= m["exactitud"] <= 1
    assert len(m["matriz_confusion"]) == len(m["clases"])


def test_panel_y_estaticos():
    assert "ClasificaIA" in c.get("/").text
    assert c.get("/static/estilos.css").status_code == 200
    assert c.get("/static/app.js").status_code == 200

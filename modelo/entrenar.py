"""Entrena el modelo de ClasificaIA.  Uso: python modelo/entrenar.py [salida]

Además del modelo guarda sus métricas de evaluación (exactitud, precisión,
recall, F1 y matriz de confusión) para que el panel web las muestre.
"""
import sys
from datetime import datetime, timezone

import joblib
from sklearn.datasets import load_iris
from sklearn.metrics import (accuracy_score, confusion_matrix,
                             precision_recall_fscore_support)
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

SALIDA = sys.argv[1] if len(sys.argv) > 1 else "app/modelo.joblib"
K = 5

iris = load_iris()
X, y = iris.data, iris.target
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.3, random_state=42, stratify=y)

modelo = make_pipeline(StandardScaler(), KNeighborsClassifier(n_neighbors=K))
modelo.fit(X_tr, y_tr)
y_pred = modelo.predict(X_te)

# --- Métricas sobre el conjunto de prueba (datos que el modelo no vio) ---
exactitud = accuracy_score(y_te, y_pred)
prec, rec, f1, soporte = precision_recall_fscore_support(y_te, y_pred, zero_division=0)
# Validación cruzada de 5 pliegues: qué tan estable es la exactitud
cv = cross_val_score(make_pipeline(StandardScaler(), KNeighborsClassifier(n_neighbors=K)), X, y, cv=5)

clases = list(iris.target_names)
campos = ["largo_sepalo", "ancho_sepalo", "largo_petalo", "ancho_petalo"]
metricas = {
    "algoritmo": f"KNN (k={K}) con StandardScaler",
    "dataset": "Iris (scikit-learn)",
    "n_entrenamiento": int(len(X_tr)),
    "n_prueba": int(len(X_te)),
    "exactitud": round(float(exactitud), 4),
    "validacion_cruzada": {"media": round(float(cv.mean()), 4), "desv": round(float(cv.std()), 4), "pliegues": 5},
    "por_clase": [
        {"clase": c, "precision": round(float(p), 4), "recall": round(float(r), 4),
         "f1": round(float(f), 4), "soporte": int(s)}
        for c, p, r, f, s in zip(clases, prec, rec, f1, soporte)
    ],
    "matriz_confusion": confusion_matrix(y_te, y_pred).tolist(),   # filas = real, columnas = predicho
    # Rangos observados de cada variable: orientan al usuario en el formulario
    "rangos": {c: [round(float(X[:, i].min()), 1), round(float(X[:, i].max()), 1)]
               for i, c in enumerate(campos)},
}

joblib.dump({
    "modelo": modelo,
    "clases": clases,
    "exactitud": metricas["exactitud"],
    "metricas": metricas,
    "version": datetime.now(timezone.utc).strftime("%Y%m%d%H%M"),
}, SALIDA)
print(f"exactitud={exactitud:.3f}  validación cruzada={cv.mean():.3f}±{cv.std():.3f}  guardado en {SALIDA}")

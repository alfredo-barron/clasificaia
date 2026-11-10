// ClasificaIA · lógica del panel: estado del servicio, métricas, clasificación e historial.
const $ = (sel) => document.querySelector(sel);

// Color de cada clase (definidos en estilos.css)
const color = (clase) =>
  getComputedStyle(document.documentElement).getPropertyValue(`--${clase}`).trim() || "#3f5bd9";

// Valores típicos de cada especie para probar rápido
const EJEMPLOS = {
  setosa:     { largo_sepalo: 5.1, ancho_sepalo: 3.5, largo_petalo: 1.4, ancho_petalo: 0.2 },
  versicolor: { largo_sepalo: 6.0, ancho_sepalo: 2.8, largo_petalo: 4.5, ancho_petalo: 1.4 },
  virginica:  { largo_sepalo: 6.7, ancho_sepalo: 3.1, largo_petalo: 5.8, ancho_petalo: 2.2 },
};

const historial = [];   // solo en memoria: se pierde al recargar la página

// ---------------------------------------------------------------- Estado
async function revisarEstado() {
  const caja = $("#estado"), texto = $("#estado-texto");
  try {
    const r = await fetch("/health");
    const j = await r.json();
    caja.className = "estado ok";
    texto.textContent = `En línea · v${j.version}`;
  } catch {
    caja.className = "estado caido";
    texto.textContent = "Sin conexión";
  }
}

// ---------------------------------------------------------------- Métricas
async function cargarMetricas() {
  const r = await fetch("/metrics");
  const m = await r.json();

  $("#kpi-exactitud").textContent = pct(m.exactitud);
  $("#kpi-cv").textContent = m.validacion_cruzada
    ? `${pct(m.validacion_cruzada.media)} ± ${pct(m.validacion_cruzada.desv, 1)}` : "—";
  $("#kpi-datos").textContent = m.n_entrenamiento ? `${m.n_entrenamiento} / ${m.n_prueba}` : "—";
  $("#kpi-version").textContent = m.version;
  $("#algoritmo").textContent = m.algoritmo ? `${m.algoritmo} · ${m.dataset}` : "";

  // Rangos observados en el dataset, debajo de cada campo
  if (m.rangos) {
    document.querySelectorAll("[data-rango]").forEach((el) => {
      const [min, max] = m.rangos[el.dataset.rango];
      el.textContent = `En los datos: ${min} a ${max} cm`;
    });
  }

  // Tabla por clase
  const cuerpo = $("#tabla-metricas tbody");
  cuerpo.innerHTML = "";
  (m.por_clase || []).forEach((c) => {
    cuerpo.insertAdjacentHTML("beforeend", `
      <tr>
        <td>${etiqueta(c.clase)}</td>
        <td>${c.precision.toFixed(2)}</td>
        <td>${c.recall.toFixed(2)}</td>
        <td>${c.f1.toFixed(2)}</td>
        <td>${c.soporte}</td>
      </tr>`);
  });

  if (m.matriz_confusion) dibujarMatriz(m.clases, m.matriz_confusion);
}

function dibujarMatriz(clases, matriz) {
  const cont = $("#matriz");
  const n = clases.length;
  const max = Math.max(...matriz.flat());
  cont.style.gridTemplateColumns = `90px repeat(${n}, minmax(0, 1fr))`;
  let html = `<div></div>` + clases.map((c) => `<div class="celda encabezado">${c}</div>`).join("");
  matriz.forEach((fila, i) => {
    html += `<div class="celda encabezado">${clases[i]}</div>`;
    fila.forEach((v, j) => {
      // Diagonal = aciertos (color de la clase); fuera de la diagonal = errores (rojo)
      const base = i === j ? color(clases[i]) : "#c8433b";
      const alfa = v === 0 ? 0.06 : 0.25 + 0.75 * (v / max);
      const texto = alfa > 0.55 ? "var(--sobre-acento)" : "inherit";
      html += `<div class="celda" style="background:${mezcla(base, alfa)};color:${texto}" title="Real: ${clases[i]} · Predicha: ${clases[j]}">${v}</div>`;
    });
  });
  cont.innerHTML = html;
}

// ---------------------------------------------------------------- Clasificar
async function clasificar(e) {
  e.preventDefault();
  const form = e.target;
  if (!form.reportValidity()) return;
  const datos = Object.fromEntries([...new FormData(form)].map(([k, v]) => [k, parseFloat(v)]));
  const boton = $("#btn-clasificar");
  boton.disabled = true; boton.textContent = "Clasificando…";

  const inicio = performance.now();
  try {
    const r = await fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });
    const ms = Math.round(performance.now() - inicio);
    const j = await r.json();
    if (!r.ok) throw new Error(j.detail?.[0]?.msg || "Datos inválidos");
    mostrarResultado(j, ms);
    agregarHistorial(datos, j, ms);
  } catch (err) {
    $("#resultado").className = "error";
    $("#resultado").textContent = `No se pudo clasificar: ${err.message}`;
    $("#probabilidades").innerHTML = "";
  } finally {
    boton.disabled = false; boton.textContent = "Clasificar";
  }
}

function mostrarResultado(j, ms) {
  $("#resultado").className = "";
  $("#resultado").innerHTML = `
    <div class="prediccion">
      <span class="clase" style="color:${color(j.clase)}">${j.clase}</span>
      <span class="conf">confianza ${pct(j.confianza)} · ${ms} ms</span>
    </div>`;
  const probs = j.probabilidades || { [j.clase]: j.confianza };
  $("#probabilidades").innerHTML = Object.entries(probs).map(([c, p]) => `
    <div class="barra-fila">
      <span class="nombre">${c}</span>
      <div class="pista"><div class="relleno" style="width:${p * 100}%;background:${color(c)}"></div></div>
      <span class="valor">${pct(p)}</span>
    </div>`).join("");
}

function agregarHistorial(d, j, ms) {
  historial.unshift({ hora: new Date().toLocaleTimeString(), d, j, ms });
  const cuerpo = $("#tabla-historial tbody");
  cuerpo.innerHTML = historial.slice(0, 15).map(({ hora, d, j, ms }) => `
    <tr>
      <td>${hora}</td>
      <td>${d.largo_sepalo} × ${d.ancho_sepalo}</td>
      <td>${d.largo_petalo} × ${d.ancho_petalo}</td>
      <td>${etiqueta(j.clase)}</td>
      <td>${pct(j.confianza)}</td>
      <td>${ms} ms</td>
    </tr>`).join("");
}

function limpiarHistorial() {
  historial.length = 0;
  $("#tabla-historial tbody").innerHTML = `<tr class="sin-datos"><td colspan="6">Aún no hay predicciones.</td></tr>`;
}

// ---------------------------------------------------------------- Utilidades
function pct(x, dec = 1) { return x == null ? "—" : `${(x * 100).toFixed(dec)} %`; }
function etiqueta(c) { return `<span class="etiqueta" style="background:${color(c)}">${c}</span>`; }
function mezcla(hex, alfa) {   // color hex + transparencia
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alfa.toFixed(2)})`;
}

// ---------------------------------------------------------------- Inicio
$("#form").addEventListener("submit", clasificar);
$("#btn-limpiar").addEventListener("click", limpiarHistorial);
document.querySelectorAll("[data-ej]").forEach((b) =>
  b.addEventListener("click", () => {
    const ej = EJEMPLOS[b.dataset.ej];
    Object.entries(ej).forEach(([k, v]) => { $(`[name=${k}]`).value = v; });
    $("#form").requestSubmit();
  }));

revisarEstado();
setInterval(revisarEstado, 15000);
cargarMetricas().catch(() => { $("#algoritmo").textContent = "No se pudieron cargar las métricas."; });

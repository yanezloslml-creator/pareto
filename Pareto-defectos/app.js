// ====== Datasets por proceso ======
const DATASETS = {
  tejido: [
    { nombre: 'Malla corrida', frecuencia: 45 },
    { nombre: 'Hilo flojo', frecuencia: 32 },
    { nombre: 'Nudo visible', frecuencia: 18 },
    { nombre: 'Tensión irregular', frecuencia: 12 },
    { nombre: 'Hueco en malla', frecuencia: 7 },
    { nombre: 'Color disparejo', frecuencia: 4 }
  ],
  remallado: [
    { nombre: 'Costura abierta', frecuencia: 38 },
    { nombre: 'Puntada saltada', frecuencia: 27 },
    { nombre: 'Desalineación de piezas', frecuencia: 20 },
    { nombre: 'Hilo sobrante', frecuencia: 10 },
    { nombre: 'Costura torcida', frecuencia: 6 }
  ],
  acabado: [
    { nombre: 'Satinado o brillo por plancha', frecuencia: 40 },
    { nombre: 'Planchado disparejo', frecuencia: 25 },
    { nombre: 'Pelusa excesiva', frecuencia: 18 },
    { nombre: 'Olor a humedad', frecuencia: 10 },
    { nombre: 'Marca de plancha', frecuencia: 5 }
  ],
  empaque: [
    { nombre: 'Etiqueta mal puesta', frecuencia: 30 },
    { nombre: 'Codigo de barras incorrecto', frecuencia: 25 },
    { nombre: 'Bolsa rota', frecuencia: 20 },
    { nombre: 'Suéter/abrigo arrugado', frecuencia: 14 },
    { nombre: 'Suéter/abrigo empacado incorrectamente', frecuencia: 8 }
  ],
  custom: []
};

const NOMBRES_PROCESO = {
  tejido: 'Tejido',
  remallado: 'Costura',
  acabado: 'Acabado y planchado',
  empaque: 'Empaque y etiquetado',
  custom: 'Proceso personalizado'
};

// ====== Estado ======
let defectos = [];
let chart = null;
let procesoActual = 'tejido';

// ====== Referencias ======
const form = document.getElementById('form-defecto');
const inputNombre = document.getElementById('nombre');
const inputFrecuencia = document.getElementById('frecuencia');
const tbodyEntrada = document.querySelector('#tabla-entrada tbody');
const tbodyResultado = document.querySelector('#tabla-resultado tbody');
const resumen = document.getElementById('resumen');
const canvas = document.getElementById('grafico');
const selectProceso = document.getElementById('select-proceso');
const kpiTotal = document.getElementById('kpi-total');
const kpiTipos = document.getElementById('kpi-tipos');
const kpiVitales = document.getElementById('kpi-vitales');
const kpiTop3 = document.getElementById('kpi-top3');
const toast = document.getElementById('toast');

// ====== Toast ======
function mostrarToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), 2200);
}

// ====== Tema ======
const btnTema = document.getElementById('btn-tema');
btnTema.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  btnTema.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
});

// ====== Proceso ======
selectProceso.addEventListener('change', () => {
  procesoActual = selectProceso.value;
  defectos = [];
  renderEntrada();
  limpiarResultados();
});

document.getElementById('btn-ejemplo').addEventListener('click', () => {
  if (procesoActual === 'custom') {
    mostrarToast('En proceso personalizado debes ingresar tus propios defectos.');
    return;
  }
  defectos = DATASETS[procesoActual].map(d => ({ ...d }));
  renderEntrada();
  mostrarToast('Defectos típicos cargados.');
});

document.getElementById('btn-limpiar').addEventListener('click', () => {
  defectos = [];
  renderEntrada();
  limpiarResultados();
  mostrarToast('Datos borrados.');
});

// ====== Formulario ======
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const nombre = inputNombre.value.trim();
  const frecuencia = parseInt(inputFrecuencia.value, 10);
  if (!nombre || !frecuencia || frecuencia <= 0) return;
  defectos.push({ nombre, frecuencia });
  inputNombre.value = '';
  inputFrecuencia.value = '';
  inputNombre.focus();
  renderEntrada();
});

// ====== Render entrada ======
function renderEntrada() {
  tbodyEntrada.innerHTML = '';
  defectos.forEach((d, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${d.nombre}</td>
      <td>${d.frecuencia}</td>
      <td><button class="eliminar" data-i="${i}">Eliminar</button></td>
    `;
    tbodyEntrada.appendChild(tr);
  });
  document.querySelectorAll('.eliminar').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const i = +e.target.dataset.i;
      defectos.splice(i, 1);
      renderEntrada();
    });
  });
  actualizarKPIsEntrada();
}

function actualizarKPIsEntrada() {
  const total = defectos.reduce((s, d) => s + d.frecuencia, 0);
  kpiTotal.textContent = total;
  kpiTipos.textContent = defectos.length;
}

function limpiarResultados() {
  tbodyResultado.innerHTML = '';
  resumen.innerHTML = '';
  kpiVitales.textContent = '0';
  kpiTop3.textContent = '0%';
  if (chart) { chart.destroy(); chart = null; }
}

// ====== Calcular ======
document.getElementById('btn-calcular').addEventListener('click', () => {
  if (defectos.length === 0) {
    mostrarToast('Agrega al menos un defecto.');
    return;
  }
  const ordenados = [...defectos].sort((a, b) => b.frecuencia - a.frecuencia);
  const total = ordenados.reduce((s, d) => s + d.frecuencia, 0);

  let acumulado = 0;
  const datos = ordenados.map(d => {
    const pct = (d.frecuencia / total) * 100;
    acumulado += pct;
    return {
      nombre: d.nombre,
      frecuencia: d.frecuencia,
      pct: +pct.toFixed(2),
      acumulado: +acumulado.toFixed(2),
      vital: false
    };
  });

  const idxCruce = datos.findIndex(d => d.acumulado >= 80);
  if (idxCruce !== -1) {
    for (let i = 0; i <= idxCruce; i++) datos[i].vital = true;
  } else {
    datos.forEach(d => d.vital = true);
  }

  renderResultado(datos, total);
  renderGrafico(datos);
  actualizarKPIsResultado(datos);
});

function actualizarKPIsResultado(datos) {
  const vitales = datos.filter(d => d.vital);
  kpiVitales.textContent = vitales.length;
  const top3 = datos.slice(0, 3).reduce((s, d) => s + d.pct, 0);
  kpiTop3.textContent = top3.toFixed(1) + '%';
}

// ====== Render resultado ======
function renderResultado(datos, total) {
  tbodyResultado.innerHTML = '';
  datos.forEach(d => {
    const tr = document.createElement('tr');
    if (d.vital) tr.classList.add('vital');
    tr.innerHTML = `
      <td>${d.nombre}</td>
      <td>${d.frecuencia}</td>
      <td>${d.pct}%</td>
      <td>${d.acumulado}%</td>
      <td><span class="badge ${d.vital ? 'vital' : 'no-vital'}">${d.vital ? 'Vital' : 'No vital'}</span></td>
    `;
    tbodyResultado.appendChild(tr);
  });

  const vitales = datos.filter(d => d.vital);
  const pctVitales = ((vitales.length / datos.length) * 100).toFixed(1);
  resumen.innerHTML = `
    <strong>Proceso:</strong> ${NOMBRES_PROCESO[procesoActual]}<br>
    <strong>Total de defectos:</strong> ${total}<br>
    <strong>Causas vitales:</strong> ${vitales.length} de ${datos.length} (${pctVitales}% de las causas explican ~80% de los problemas)<br>
    <strong>Prioridad de acción:</strong> ${vitales.map(v => v.nombre).join(', ')}
  `;
}

// ====== Gráfico ======
function renderGrafico(datos) {
  if (chart) chart.destroy();
  const labels = datos.map(d => d.nombre);
  const frecuencias = datos.map(d => d.frecuencia);
  const acumulados = datos.map(d => d.acumulado);
  const isDark = document.body.classList.contains('dark');
  const gridColor = isDark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.08)';
  const textColor = isDark ? '#e2e8f0' : '#1f2937';

  chart = new Chart(canvas, {
    data: {
      labels,
      datasets: [
        {
          type: 'bar',
          label: 'Frecuencia',
          data: frecuencias,
          backgroundColor: datos.map(d => d.vital ? '#f59e0b' : '#93c5fd'),
          borderRadius: 6,
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: '% Acumulado',
          data: acumulados,
          borderColor: '#dc2626',
          backgroundColor: '#dc2626',
          tension: 0.2,
          pointRadius: 4,
          yAxisID: 'y1'
        },
        {
          type: 'line',
          label: 'Umbral 80%',
          data: acumulados.map(() => 80),
          borderColor: 'rgba(16, 185, 129, .8)',
          borderDash: [6, 6],
          pointRadius: 0,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: textColor } },
        title: {
          display: true,
          text: `Diagrama de Pareto · ${NOMBRES_PROCESO[procesoActual]}`,
          color: textColor,
          font: { size: 14 }
        }
      },
      scales: {
        x: { ticks: { color: textColor }, grid: { color: gridColor } },
        y: {
          beginAtZero: true,
          position: 'left',
          title: { display: true, text: 'Frecuencia', color: textColor },
          ticks: { color: textColor },
          grid: { color: gridColor }
        },
        y1: {
          beginAtZero: true,
          max: 100,
          position: 'right',
          title: { display: true, text: '% Acumulado', color: textColor },
          ticks: { color: textColor },
          grid: { drawOnChartArea: false }
        }
      }
    }
  });
}

// ====== Imprimir ======
document.getElementById('btn-imprimir').addEventListener('click', () => window.print());

// ====== Init ======
renderEntrada();
const APPS_SCRIPT_BASE_URL = 'PEGAR_URL_DE_WEB_APP';
const PRODUCTION_PANEL_URL = 'PEGAR_URL_PANEL_PRODUCCION';

const SCAN_DEBOUNCE_MS = 2500;

let scanner = null;
let scannerRunning = false;
let lastScanValue = '';
let lastScanAt = 0;

const elements = {};

document.addEventListener('DOMContentLoaded', init);

function init() {
  elements.statusBox = document.getElementById('statusBox');
  elements.statusTitle = document.getElementById('statusTitle');
  elements.statusText = document.getElementById('statusText');
  elements.reader = document.getElementById('reader');
  elements.readerPlaceholder = document.getElementById('readerPlaceholder');
  elements.startButton = document.getElementById('startButton');
  elements.stopButton = document.getElementById('stopButton');
  elements.manualInput = document.getElementById('manualInput');
  elements.manualButton = document.getElementById('manualButton');
  elements.clearButton = document.getElementById('clearButton');
  elements.panelButton = document.getElementById('panelButton');

  elements.startButton.addEventListener('click', startScanner);
  elements.stopButton.addEventListener('click', stopScanner);
  elements.manualButton.addEventListener('click', validateManual);
  elements.clearButton.addEventListener('click', clearManual);
  elements.panelButton.addEventListener('click', openProductionPanel);

  if (!window.isSecureContext) {
    setStatus('error', 'HTTPS requerido', 'La cámara solo funciona en sitios HTTPS. GitHub Pages ya usa HTTPS.');
    elements.startButton.disabled = true;
    return;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setStatus('error', 'Navegador no compatible', 'Este navegador no permite acceder a la cámara desde la web.');
    elements.startButton.disabled = true;
    return;
  }

  setStatus('ready', 'Listo para escanear', 'Tocá iniciar y permití el acceso a la cámara.');
}

async function startScanner() {
  if (scannerRunning) return;

  if (typeof Html5Qrcode === 'undefined') {
    setStatus('error', 'Librería no disponible', 'No se pudo cargar html5-qrcode. Revisá tu conexión.');
    return;
  }

  if (!isConfigured(APPS_SCRIPT_BASE_URL)) {
    setStatus('error', 'Falta configurar', 'Editá app.js y pegá APPS_SCRIPT_BASE_URL.');
    return;
  }

  try {
    setStatus('scanning', 'Solicitando cámara', 'Si el navegador pregunta, tocá Permitir.');
    elements.readerPlaceholder.style.display = 'none';

    scanner = scanner || new Html5Qrcode('reader');

    await scanner.start(
      { facingMode: 'environment' },
      {
        fps: 10,
        qrbox: getQrBoxSize(),
        aspectRatio: 1
      },
      handleScanSuccess,
      handleScanFailure
    );

    scannerRunning = true;
    elements.startButton.disabled = true;
    elements.stopButton.disabled = false;
    setStatus('scanning', 'Escaneando', 'Apuntá la cámara al QR de la entrada.');
    console.log('Scanner iniciado');
  } catch (error) {
    scannerRunning = false;
    elements.readerPlaceholder.style.display = 'grid';
    elements.startButton.disabled = false;
    elements.stopButton.disabled = true;
    setStatus('error', 'No se pudo abrir la cámara', formatCameraError(error));
    console.error('Error iniciando scanner', error);
  }
}

async function stopScanner() {
  if (!scanner || !scannerRunning) {
    elements.readerPlaceholder.style.display = 'grid';
    elements.startButton.disabled = false;
    elements.stopButton.disabled = true;
    return;
  }

  try {
    await scanner.stop();
    console.log('Scanner detenido');
  } catch (error) {
    console.warn('Error deteniendo scanner', error);
  } finally {
    scannerRunning = false;
    elements.readerPlaceholder.style.display = 'grid';
    elements.startButton.disabled = false;
    elements.stopButton.disabled = true;
    setStatus('ready', 'Scanner detenido', 'Podés volver a iniciar cuando quieras.');
  }
}

function handleScanSuccess(decodedText) {
  const value = String(decodedText || '').trim();
  const now = Date.now();

  if (!value) return;
  if (value === lastScanValue && now - lastScanAt < SCAN_DEBOUNCE_MS) return;

  lastScanValue = value;
  lastScanAt = now;

  console.log('QR detectado', value);
  processQrValue(value, true);
}

function handleScanFailure() {
  // html5-qrcode llama muchas veces a este callback; no conviene ensuciar la UI.
}

async function processQrValue(rawValue, stopBeforeRedirect) {
  const result = buildValidationUrl(rawValue);

  if (!result.ok) {
    setStatus('error', 'QR inválido', result.error);
    return;
  }

  setStatus('redirecting', 'Redirigiendo', 'Abriendo validación de entrada...');

  if (stopBeforeRedirect) {
    await stopScanner();
    setStatus('redirecting', 'Redirigiendo', 'Abriendo validación de entrada...');
  }

  console.log('Redirigiendo a', result.url);
  window.location.href = result.url;
}

function validateManual() {
  const value = elements.manualInput.value.trim();

  if (!value) {
    setStatus('error', 'Campo vacío', 'Pegá un token o link de validación.');
    elements.manualInput.focus();
    return;
  }

  processQrValue(value, false);
}

function clearManual() {
  elements.manualInput.value = '';
  setStatus('ready', 'Listo para escanear', 'Tocá iniciar o pegá un token manualmente.');
}

function openProductionPanel() {
  if (!isConfigured(PRODUCTION_PANEL_URL)) {
    setStatus('error', 'Falta configurar', 'Editá app.js y pegá PRODUCTION_PANEL_URL.');
    return;
  }

  window.open(PRODUCTION_PANEL_URL, '_blank', 'noopener,noreferrer');
}

function buildValidationUrl(rawValue) {
  const value = String(rawValue || '').trim();

  if (!value) {
    return { ok: false, error: 'No se recibió contenido.' };
  }

  if (looksLikeUrl(value)) {
    try {
      const url = new URL(value);
      const token = url.searchParams.get('token');

      if (token) {
        return { ok: true, url: value, token };
      }

      return { ok: false, error: 'La URL no contiene el parámetro ?token=.' };
    } catch (error) {
      return { ok: false, error: 'La URL no es válida.' };
    }
  }

  const token = sanitizeToken(value);

  if (!token) {
    return { ok: false, error: 'El token contiene caracteres inválidos.' };
  }

  if (!isConfigured(APPS_SCRIPT_BASE_URL)) {
    return { ok: false, error: 'Falta configurar APPS_SCRIPT_BASE_URL.' };
  }

  return {
    ok: true,
    token,
    url: APPS_SCRIPT_BASE_URL.replace(/\/$/, '') + '?token=' + encodeURIComponent(token)
  };
}

function sanitizeToken(value) {
  const token = String(value || '').trim();

  if (!/^[A-Za-z0-9._~:-]{6,300}$/.test(token)) {
    return '';
  }

  return token;
}

function looksLikeUrl(value) {
  return /^https?:\/\//i.test(value);
}

function setStatus(type, title, text) {
  elements.statusBox.className = 'status ' + type;
  elements.statusTitle.textContent = title;
  elements.statusText.textContent = text;
}

function formatCameraError(error) {
  const message = error && (error.message || error.name) ? String(error.message || error.name) : String(error);

  if (/NotAllowed|Permission|denied/i.test(message)) {
    return 'Permiso denegado. Activá la cámara para este sitio desde la configuración del navegador.';
  }

  if (/NotFound|DevicesNotFound|Overconstrained/i.test(message)) {
    return 'No se encontró una cámara disponible.';
  }

  if (/NotReadable|TrackStart/i.test(message)) {
    return 'La cámara está siendo usada por otra app o el navegador no pudo iniciarla.';
  }

  return message;
}

function getQrBoxSize() {
  const width = Math.min(window.innerWidth - 80, 300);
  return { width, height: width };
}

function isConfigured(value) {
  return value && !String(value).startsWith('PEGAR_');
}

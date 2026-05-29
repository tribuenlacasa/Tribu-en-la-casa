# Scanner QR Tribu

App estática para escanear entradas QR desde celular o computadora, pensada para GitHub Pages.

## Configuración

Editá `app.js` y reemplazá:

```js
const APPS_SCRIPT_BASE_URL = 'PEGAR_URL_DE_WEB_APP';
const PRODUCTION_PANEL_URL = 'PEGAR_URL_PANEL_PRODUCCION';
```

Ejemplo:

```js
const APPS_SCRIPT_BASE_URL = 'https://script.google.com/macros/s/MI_WEB_APP_ID/exec';
const PRODUCTION_PANEL_URL = 'https://script.google.com/macros/s/MI_WEB_APP_ID/exec?admin=tribu';
```

## Publicar en GitHub Pages

1. Crear cuenta en GitHub.
2. Crear un repositorio nuevo llamado `tribu-qr-scanner`.
3. Subir estos archivos a la raíz del repositorio:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `README.md`
4. Hacer commit en la rama `main`.
5. Entrar a `Settings`.
6. Entrar a `Pages`.
7. En `Source`, elegir `Deploy from branch`.
8. En `Branch`, elegir `main`.
9. En `Folder`, elegir `/root`.
10. Guardar.
11. Esperar la publicación.
12. Abrir la URL final:

```text
https://USUARIO.github.io/tribu-qr-scanner/
```

## Cómo funciona

- Si el QR contiene una URL completa con `?token=`, redirige a esa URL.
- Si el QR contiene solo un token, construye:

```text
APPS_SCRIPT_BASE_URL?token=TOKEN
```

- También permite pegar token o link manualmente.

## Checklist de prueba en iPhone

- Abrir el sitio desde Safari.
- Confirmar que la URL usa `https://`.
- Tocar `Iniciar escaneo`.
- Permitir cámara.
- Probar con un QR real del sistema.
- Confirmar que redirige a Apps Script.
- Confirmar que el primer escaneo marca entrada válida.
- Confirmar que el segundo escaneo muestra QR ya usado.

## Notas

La app no tiene backend propio ni base de datos. Solo escanea y redirige a la Web App de Google Apps Script, donde ya vive la lógica real de validación.

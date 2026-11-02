# 🚀 Arranque y despliegue

Guía para levantar el backend (`harmony_serve`, paquete `lehaim`) en local y desplegarlo.

> Está escrita a partir de la lectura del código. Los comandos no se han ejecutado al redactarla: si algo no coincide, corrige este documento.

## Requisitos

- **Node.js 16.x** (campo `engines` de `package.json`; Next 9.4.4 y Node 16 están fuera de soporte). No hay compatibilidad probada con versiones más nuevas, ver [errores frecuentes](#errores-frecuentes).
- **npm**.
- **MongoDB** accesible: local (`mongodb://localhost:27017`) o Atlas.
- Opcional: cuenta de Gmail con App Password (emails), cuenta ImageKit (imágenes), API de IA en Python (`PYTHON_API_URL`).

## Arranque en local

```bash
git clone https://github.com/JordyMontalvo/harmony_serve.git
cd harmony_serve
npm install
cp ENV_TEMPLATE.txt .env      # edita los valores; .env está en .gitignore
npm run dev                   # http://localhost:3000
```

Comprobación rápida (con Mongo levantado): `curl -i -X POST http://localhost:3000/api/auth/login` debe responder desde la API (aunque sea con error de credenciales).

### Modo producción en local

```bash
npm run build
NODE_ENV=production npm start   # node server.js
```

Debe imprimir `> Ready on http://0.0.0.0:3000`.

| Comando | Qué hace |
|---|---|
| `npm run dev` | `next dev`. Usa el servidor propio de Next, **no pasa por `server.js`**. |
| `npm run build` | `next build`. Obligatorio antes de `npm start`. |
| `npm start` | `node server.js`: carga `.env` (dotenv), escucha en `0.0.0.0:PORT` y asume `production` si falta `NODE_ENV`. |
| `npm run test:closure` | Ejecuta `scripts/closure-preview-test.js` (usa `CLOSURE_TEST_URL`, `CLOSURE_TEST_VERBOSE`, `CLOSURE_TEST_AUDIT`). |

No existen scripts `test` ni `lint` en `package.json`.

## Variables de entorno

Plantilla: `ENV_TEMPLATE.txt`. **Nunca subas valores reales al repositorio.** La columna «Requerida» indica lo que se deduce del código; confírmalo con el equipo.

| Variable | Requerida | Para qué | Ejemplo |
|---|---|---|---|
| `DB_URL` | Sí | Conexión Mongo de la mayoría de endpoints (`components/db.js`, `db-connect.js`) | `mongodb://localhost:27017` |
| `DB_NAME` | Sí* | Nombre de la BD (*`db-connect.js` usa `sifrah` por defecto, `db.js` no) | `sifrah` |
| `MONGODB_URI` | Sí | La usan `delivery`, `delivery-management`, `activation` y `validate-email`, y `config-heroku.js` | `mongodb://localhost:27017` |
| `NODE_ENV` | No | `production` en servidor | `production` |
| `PORT` | No | Puerto (defecto 3000; Heroku lo asigna) | `3000` |
| `EMAIL_USER` | Para emails | Cuenta Gmail emisora | `tu-email@gmail.com` |
| `EMAIL_PASS` | Para emails | App Password de 16 caracteres | `abcdefghijklmnop` |
| `ADMIN_EMAIL` | Para emails | Destino de mensajes de contacto | `admin@ejemplo.com` |
| `FRONTEND_URL` | Para emails | URL del frontend en los enlaces | `https://tu-frontend.vercel.app` |
| `ADMIN_PANEL_USER` | Recomendada | Usuario del panel admin | `usuario-admin` |
| `ADMIN_PANEL_PASSWORD_HASH` | **Sí en producción** | Hash bcrypt de la clave del panel | ver abajo |
| `ADMIN_PANEL_PASSWORD` | Alternativa | Clave en texto plano (menos segura) | — |
| `ADMIN_PASSWORD` | Sí | Contraseña maestra en `login`, `transfer` y `password` | — |
| `IMAGEKIT_PUBLIC` / `IMAGEKIT_PRIVATE` | Si se suben imágenes | `pages/api/auxi/imagekit.js` | — |
| `VUE_APP_URL` | No | Destino de `/api/auth/bridge` (tiene valor por defecto en código) | `http://localhost:8080` |
| `PYTHON_API_URL` | Si se usa IA | `components/mlm-ai-service.js` | `http://localhost:5001` |
| `CORS_ORIGINS` | Producción | Orígenes separados por coma (`middleware/middleware-cors.js`) | `https://app.ejemplo.com` |
| `CORS_ORIGIN` | No | Lo lee `config/config-heroku.js` (defecto `*`) | — |
| `MP_ACCESS_TOKEN` | No | Solo en código comentado de `mercadopay.js` | — |
| `MAILGUN_KEY`, `MAILGUN_DOMAIN`, `DOMAIN` | No | `components/mail.js`, posible código en desuso | — |

### Contraseña del panel admin

```bash
node scripts/generate-admin-hash.js              # genera una clave aleatoria y su hash
node scripts/generate-admin-hash.js "una-clave-de-12+-caracteres"
```

Guarda la clave en un gestor de contraseñas y pon el hash en `ADMIN_PANEL_PASSWORD_HASH`. Si no defines ni hash ni `ADMIN_PANEL_PASSWORD`, `components/auth.js` usa una credencial de respaldo incluida en el código: **sobrescríbela siempre en producción**.

## Despliegue (Heroku)

Heroku se deduce del `Procfile` (`web: npm start`) y de `config/config-heroku.js`. Confirma con el equipo el entorno real.

```bash
heroku login
heroku git:remote -a TU-APP
heroku config:set NODE_ENV=production DB_URL='...' DB_NAME=sifrah MONGODB_URI='...' --app TU-APP
heroku config:set EMAIL_USER='...' EMAIL_PASS='...' ADMIN_EMAIL='...' FRONTEND_URL='...' --app TU-APP
heroku config:set ADMIN_PASSWORD='...' ADMIN_PANEL_PASSWORD_HASH='...' CORS_ORIGINS='...' --app TU-APP
git push heroku master          # la rama base es master
heroku logs --tail --app TU-APP
```

Heroku ejecuta `npm install` y `npm run build` (script `build` de `package.json`) y luego `web: npm start`. Usa un Node 16.x compatible con `engines`.

### CI/CD

`.github/workflows/ci-cd.yml` hoy **no despliega nada**: los jobs de despliegue solo hacen `echo`, y están ligados a las ramas `main` y `develop` (la base es `master`). Además ejecuta `npm test` y `npm run lint`, que no existen, por lo que el job `test` falla. Es el estado actual; no se ha corregido aquí.

## Errores frecuentes

| Síntoma | Causa y solución |
|---|---|
| `Error de conexión a la base de datos` | Timeout de 5 s en `components/db-connect.js`. Comprueba que Mongo esté levantado y que `DB_URL`/`DB_NAME` sean correctos (defecto `mongodb://localhost:27017`). En Atlas, revisa la lista de IPs permitidas. |
| Unos endpoints funcionan y otros fallan con la BD | Hay dos variables: `DB_URL` y `MONGODB_URI`. Configura las dos. |
| `npm start` falla al arrancar | Falta `npm run build` previo. |
| En `dev` no veo los logs de peticiones o `NODE_ENV` se comporta distinto | `npm run dev` no usa `server.js`; los logs de peticiones y el host `0.0.0.0` solo existen con `npm start`. |
| `cp: env.example: No such file` | Ese archivo no existe; usa `ENV_TEMPLATE.txt`. |
| Los emails no se envían (Gmail) | Usa un App Password de 16 caracteres (https://myaccount.google.com/apppasswords), no la clave normal. Prueba con `node scripts/test-email-config.js`. |
| Error CORS en producción | `middleware-cors.js` lee `CORS_ORIGINS` y `config-heroku.js` lee `CORS_ORIGIN`. Define `CORS_ORIGINS` con el dominio exacto del frontend. |
| Entras al panel admin con la clave por defecto | No hay `ADMIN_PANEL_PASSWORD_HASH` ni `ADMIN_PANEL_PASSWORD`. Defínelos. |
| Error de OpenSSL (`ERR_OSSL_EVP_UNSUPPORTED`) en `npm run build` | *Hipótesis, sin probar:* Next 9.4.4 con Node 17+ . Usa Node 16.x. |
| `git push heroku main` falla | La rama es `master`. |

## Otros documentos

Hay guías sueltas en la raíz (`CAMBIAR_EMAIL_RAPIDO.md`, `GUIA_CAMBIAR_EMAIL.md`, `ORGANIZACION_COMPLETADA.md`) que no se han revisado para esta guía; si se contradicen, prevalece este documento tras verificarlo.

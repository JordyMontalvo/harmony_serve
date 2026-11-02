# 🚀 Servidor Sifrah - Plataforma MLM

Este es el backend de la plataforma MLM Sifrah, construido con [Next.js](https://nextjs.org/) y MongoDB.

## 📁 Estructura del Proyecto

```
server/
├── 📚 docs/                    # Documentación técnica
│   ├── DOCUMENTACION_SISTEMA_EMAIL.md
│   ├── RESUMEN_SISTEMA_EMAIL.md
│   └── README.md
├── 🔧 middleware/              # Middlewares del servidor
│   ├── middleware.js           # Middleware principal Next.js
│   └── middleware-cors.js      # CORS configurable
├── 🛠️ scripts/                # Scripts y utilidades
│   ├── test-email-config.js    # Prueba configuración email
│   └── server-mercadopago.js   # Servidor alternativo MP
├── 📧 templates/               # Templates HTML
│   └── welcome.html            # Template de bienvenida
├── ⚙️ config/                  # Configuraciones
│   ├── email.js                # Configuración de email
│   └── config-heroku.js        # Configuración Heroku
├── 🧩 components/              # Componentes del servidor
│   ├── db.js                   # Conexión MongoDB
│   ├── email-service.js        # Servicio de email
│   ├── mlm-ai-service.js       # Cliente de la API de IA (Python)
│   └── ...
└── 🌐 pages/api/               # Endpoints de la API
    ├── admin/                  # Endpoints de administración
    ├── app/                    # Endpoints de la aplicación
    ├── auth/                   # Endpoints de autenticación
    ├── email/                  # Endpoints de email
    └── ...
```

## 🚀 Inicio Rápido

**Requisitos:** Node.js 16.x (ver `engines` en `package.json`), npm y un MongoDB accesible (local o Atlas).

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno (la plantilla es ENV_TEMPLATE.txt)
cp ENV_TEMPLATE.txt .env
# Editar .env con tus credenciales

# Ejecutar en desarrollo (servidor de desarrollo de Next.js, puerto 3000)
npm run dev

# Ejecutar en producción (primero compilar)
npm run build
NODE_ENV=production npm start   # node server.js, escucha en 0.0.0.0:PORT
```

📖 **Guía completa de arranque, despliegue y errores frecuentes:** [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md)

## 🌐 Endpoints Principales

### 🔐 Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/validate-email` - Validar email

### 📧 Sistema de Email
- `POST /api/email/welcome` - Email de bienvenida
- `POST /api/email/activation` - Email de activación
- `POST /api/email/password-reset` - Recuperación de contraseña
- `POST /api/email/contact` - Email de contacto
- `POST /api/email/commission` - Notificación de comisión

### 👥 Gestión de Usuarios
- `GET /api/admin/users` - Listar usuarios
- `GET /api/admin/activations` - Gestionar activaciones
- `GET /api/admin/affiliations` - Gestionar afiliaciones

### 🤖 Predicciones de IA
- `GET /api/admin/ai-leadership-predictions` - Predicciones con IA
- `POST /api/admin/ai-leadership-predictions-update` - Actualizar predicciones

## 🔑 Variables de Entorno

```bash
# Servidor
NODE_ENV=production
PORT=3000

# Base de datos (se necesitan DB_URL y MONGODB_URI, ver docs/DESPLIEGUE.md)
DB_URL=mongodb://localhost:27017
DB_NAME=sifrah
MONGODB_URI=mongodb://localhost:27017

# Email (Gmail)
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu-app-password
ADMIN_EMAIL=admin@sifrah.com

# Frontend
FRONTEND_URL=

# IA/ML
PYTHON_API_URL=http://localhost:5001
```

La lista completa (con cuáles son obligatorias) está en [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md#variables-de-entorno).

## 🛠️ Scripts Disponibles

```bash
npm run dev      # Desarrollo
npm run build    # Build para producción
npm start        # Servidor de producción (node server.js; requiere npm run build)
npm run test:closure  # Prueba de vista previa de cierre (scripts/closure-preview-test.js)

# Scripts de utilidad
node scripts/generate-admin-hash.js  # Hash bcrypt para ADMIN_PANEL_PASSWORD_HASH
node scripts/change-email-sender.js  # Cambiar email de envío
node scripts/test-email-config.js    # Probar configuración de email
```

## 📧 Configurar Email de Envío

### Cambiar el email que envía los correos (recuperación, bienvenida, etc.)

**Opción 1: Script automático (Recomendado)**
```bash
node scripts/change-email-sender.js
```

**Opción 2: Manual**
1. Obtén un **App Password** de Gmail en: https://myaccount.google.com/apppasswords
2. Crea el archivo `.env` en `/server/` con:
   ```env
   EMAIL_USER=tu-nuevo-email@gmail.com
   EMAIL_PASS=tu-app-password-de-16-caracteres
   ADMIN_EMAIL=admin@sifrah.com
   FRONTEND_URL=http://localhost:8080
   ```
3. Prueba: `node scripts/test-email-config.js`

**Para producción (Heroku):**
```bash
heroku config:set EMAIL_USER="tu-email@gmail.com" --app tu-app
heroku config:set EMAIL_PASS="tu-app-password" --app tu-app
```

📖 **Guía detallada:** `CAMBIAR_EMAIL_RAPIDO.md` o `GUIA_CAMBIAR_EMAIL.md`

## 📦 Tecnologías

- **Next.js 9.4.4** - Framework React para backend
- **MongoDB 3.5.9** - Base de datos NoSQL
- **Nodemailer 7.0.5** - Envío de emails
- **Express 4.21.2** - Servidor HTTP
- **bcrypt 5.0.0** - Encriptación de contraseñas
- **Joi 17.13.3** - Validación de datos

## 🚀 Despliegue

### Heroku
El `Procfile` define `web: npm start`. La rama base es `master`:
```bash
git push heroku master
```

### Variables de entorno en Heroku
- Configurar las variables de `ENV_TEMPLATE.txt` con `heroku config:set`
- Especial atención a `DB_URL`, `MONGODB_URI`, `EMAIL_USER`, `EMAIL_PASS` y `ADMIN_PANEL_PASSWORD_HASH`

> El job de despliegue de `.github/workflows/ci-cd.yml` es un placeholder (solo hace `echo`); hoy el despliegue es manual.
> Detalles y errores frecuentes: [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md)

## 📞 Soporte

- **Documentación completa:** `docs/DOCUMENTACION_SISTEMA_EMAIL.md`
- **Scripts de prueba:** `scripts/`
- **Configuración:** `config/`

---

**Versión:** 1.0.0  
**Estado:** ✅ Producción  
**Mantenimiento:** Equipo de Desarrollo Sifrah

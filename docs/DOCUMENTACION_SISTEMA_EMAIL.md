# 📧 DOCUMENTACIÓN DEL SISTEMA DE ENVÍO DE EMAIL - SIFRAH

## 📋 ÍNDICE
1. [Descripción General](#descripción-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Configuración](#configuración)
4. [Componentes](#componentes)
5. [API Endpoints](#api-endpoints)
6. [Templates de Email](#templates-de-email)
7. [Variables de Entorno](#variables-de-entorno)
8. [Despliegue](#despliegue)
9. [Troubleshooting](#troubleshooting)
10. [Ejemplos de Uso](#ejemplos-de-uso)


---

## 🎯 DESCRIPCIÓN GENERAL

El sistema de envío de email de Sifrah es una solución completa que permite enviar diferentes tipos de emails automáticamente desde la aplicación. Está construido con **Node.js**, **Nodemailer**, **Next.js** y **MongoDB**.

### ✨ Características Principales
- ✅ Envío automático de emails
- ✅ Múltiples tipos de email (bienvenida, activación, recuperación, etc.)
- ✅ Validación de emails en tiempo real
- ✅ Sistema de notificaciones flotantes
- ✅ Configuración centralizada
- ✅ Manejo de errores robusto
- ✅ Compatible con Gmail y otros proveedores SMTP

---

## 🏗️ ARQUITECTURA DEL SISTEMA

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend        │    │   Email         │
│   (Vue.js)      │───▶│   (Next.js)      │───▶│   (Nodemailer)  │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   MongoDB        │
                       │   (Base de       │
                       │    Datos)        │
                       └──────────────────┘
```

### 🔄 Flujo de Funcionamiento
1. **Usuario** interactúa con el frontend
2. **Frontend** envía request al backend
3. **Backend** valida datos y llama al servicio de email
4. **Servicio de Email** envía el email usando Nodemailer
5. **Respuesta** se envía de vuelta al frontend

---

## ⚙️ CONFIGURACIÓN

### 📁 Estructura de Archivos
```
server/
├── components/
│   ├── email-service.js          # Servicio principal de email
│   └── db-connect.js             # Conexión a base de datos
├── config/
│   └── email.js                  # Configuración centralizada
├── pages/api/
│   ├── email/                    # Endpoints de email
│   │   ├── password-reset.js     # Recuperación de contraseña
│   │   ├── welcome.js            # Email de bienvenida
│   │   ├── activation.js         # Email de activación
│   │   ├── contact.js            # Email de contacto
│   │   ├── commission.js         # Email de comisiones
│   │   └── test.js               # Prueba del servicio
│   └── auth/
│       └── validate-email.js     # Validación de email
├── middleware-cors.js             # Middleware CORS
└── config-heroku.js              # Configuración para Heroku
```

---

## 🔧 COMPONENTES

### 1. **EmailService** (`components/email-service.js`)
Clase principal que maneja todo el envío de emails.

#### Métodos Principales:
- `sendWelcomeEmail(userData)` - Email de bienvenida
- `sendActivationEmail(userData)` - Email de activación
- `sendPasswordResetEmail(userData)` - Email de recuperación
- `sendContactEmail(userData)` - Email de contacto
- `sendCommissionEmail(userData)` - Email de comisiones

#### Ejemplo de Uso:
```javascript
const emailService = require('./components/email-service');

// Enviar email de recuperación
const result = await emailService.sendPasswordResetEmail({
  email: 'usuario@email.com',
  name: 'Juan Pérez',
  resetToken: 'abc123def456'
});
```

### 2. **Configuración de Email** (`config/email.js`)
Archivo centralizado para toda la configuración del sistema de email.

#### Configuración SMTP:
```javascript
smtp: {
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
}
```

---

## 🌐 API ENDPOINTS

### **Base URL:** `/api`

#### 1. **Validación de Email**
```
POST /api/auth/validate-email
```
**Propósito:** Validar si un email existe en el sistema
**Body:**
```json
{
  "email": "usuario@email.com"
}
```
**Respuesta:**
```json
{
  "success": true,
  "exists": true,
  "message": "Email válido"
}
```

#### 2. **Recuperación de Contraseña**
```
POST /api/email/password-reset
```
**Propósito:** Enviar email de recuperación de contraseña
**Body:**
```json
{
  "email": "usuario@email.com",
  "name": "Juan Pérez",
  "resetToken": "abc123def456"
}
```

#### 3. **Email de Bienvenida**
```
POST /api/email/welcome
```
**Propósito:** Enviar email de bienvenida a nuevos usuarios

#### 4. **Email de Activación**
```
POST /api/email/activation
```
**Propósito:** Enviar email de activación de cuenta

#### 5. **Email de Contacto**
```
POST /api/email/contact
```
**Propósito:** Enviar email de contacto desde formulario

#### 6. **Email de Comisiones**
```
POST /api/email/commission
```
**Propósito:** Enviar email de comisiones

#### 7. **Prueba del Servicio**
```
GET /api/email/test
```
**Propósito:** Probar que el servicio de email funcione

---

## 📧 TEMPLATES DE EMAIL

### 1. **Email de Recuperación de Contraseña**
- **Asunto:** "Recupera tu contraseña Sifrah 🔑"
- **Contenido:** Formulario con enlace para restablecer contraseña
- **Enlace:** `${frontendUrl}/reset-password?token=${resetToken}`

### 2. **Email de Bienvenida**
- **Asunto:** "¡Bienvenido a Sifrah! 🎉"
- **Contenido:** Mensaje de bienvenida personalizado

### 3. **Email de Activación**
- **Asunto:** "Activa tu cuenta Sifrah 🔐"
- **Contenido:** Código de activación y instrucciones

### 4. **Email de Contacto**
- **Asunto:** "Nuevo mensaje de contacto desde Sifrah 📬"
- **Contenido:** Detalles del mensaje del usuario

### 5. **Email de Comisiones**
- **Asunto:** "Nueva comisión disponible en Sifrah 💰"
- **Contenido:** Detalles de la comisión ganada

---

## 🔑 VARIABLES DE ENTORNO

### **Variables OBLIGATORIAS:**

#### **Backend (Heroku):**
```bash
# Configuración básica
NODE_ENV=production
PORT=3000

# Base de datos
DB_URL=mongodb://127.0.0.1:27017/sifrah?directConnection=true

# Email (Gmail)
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu-app-password-de-gmail
ADMIN_EMAIL=admin@sifrah.com

# URLs
FRONTEND_URL=
```

#### **Frontend (Vercel):**
```bash
VUE_APP_SERVER=
BASE_URL=
NODE_ENV=production
```

### **Variables OPCIONALES:**
```bash
# CORS (si quieres restringir orígenes)
CORS_ORIGINS=

# Límites de email
MAX_EMAILS_PER_HOUR=100
MAX_EMAILS_PER_DAY=1000
```

---

## 🚀 DESPLIEGUE

### **1. Backend (Heroku):**

#### **Configurar variables de entorno:**
```bash
# Desde el dashboard de Heroku
Settings → Config Vars → Reveal Config Vars

# Agregar todas las variables obligatorias
```

#### **Desplegar código:**
```bash
cd server/
git add .
git commit -m "Sistema de email implementado"
git push heroku main
```

### **2. Frontend (Vercel):**

#### **Configurar variables de entorno:**
```bash
# Desde el dashboard de Vercel
Settings → Environment Variables

# Agregar todas las variables necesarias
```

#### **Hacer build y desplegar:**
```bash
cd app/
npm run build
# Subir carpeta dist/ a Vercel
```

---

## 🔍 TROUBLESHOOTING

### **Problemas Comunes:**

#### 1. **Error CORS:**
```
Access to XMLHttpRequest blocked by CORS policy
```
**Solución:** Verificar que `CORS_ORIGINS` esté configurado correctamente en Heroku.

#### 2. **Error de Conexión MongoDB:**
```
MongoNetworkError: failed to connect to server [localhost:27017]
```
**Solución:** Verificar que `DB_URL` esté configurado en Heroku.

#### 3. **Error de Autenticación Gmail:**
```
Invalid login: 534-5.7.9 Application-specific password required
```
**Solución:** Usar App Password de Gmail, no la contraseña normal.

#### 4. **URLs con localhost:**
```
http://localhost:8080/reset-password?token=...
```
**Solución:** Verificar que `FRONTEND_URL` esté configurado en Heroku.

### **Logs de Debug:**
```bash
# En Heroku
heroku logs --tail

# Buscar estos mensajes:
✅ Configuración de email válida
✅ Transporter configurado correctamente
✅ Email de recuperación enviado
```

---

## 💡 EJEMPLOS DE USO

### **1. Implementar en un Componente Vue:**

```javascript
// En tu componente Vue
import api from '@/api';

export default {
  methods: {
    async sendPasswordReset() {
      try {
        const response = await api.sendPasswordReset({
          email: this.email,
          name: this.name,
          resetToken: this.generateToken()
        });
        
        if (response.data.success) {
          this.showSuccess('Email enviado correctamente');
        }
      } catch (error) {
        this.showError('Error al enviar email');
      }
    }
  }
}
```

### **2. Validar Email Antes de Enviar:**

```javascript
async submitForm() {
  // Primero validar que el email existe
  const validation = await api.validateEmail(this.email);
  
  if (!validation.data.exists) {
    this.showError('Email no registrado');
    return;
  }
  
  // Si existe, proceder con el envío
  await this.sendPasswordReset();
}
```

### **3. Personalizar Templates:**

```javascript
// En email-service.js
getCustomTemplate(data) {
  return `
    <div style="font-family: Arial, sans-serif;">
      <h1>${data.title}</h1>
      <p>${data.message}</p>
      <a href="${data.link}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none;">
        ${data.buttonText}
      </a>
    </div>
  `;
}
```

---

## 📊 MONITOREO Y MÉTRICAS

### **Logs Importantes:**
- ✅ Emails enviados exitosamente
- ❌ Errores de envío
- 🔍 Intentos de validación
- 📈 Volumen de emails por día

### **Métricas Recomendadas:**
- Tasa de entrega de emails
- Tiempo de respuesta del servicio
- Errores por tipo de email
- Uso de la API por endpoint

---

## 🔒 SEGURIDAD

### **Medidas Implementadas:**
- ✅ Validación de emails en base de datos
- ✅ Rate limiting para prevenir spam
- ✅ Tokens únicos para recuperación
- ✅ CORS configurado correctamente
- ✅ Variables de entorno para credenciales

### **Recomendaciones Adicionales:**
- 🔐 Implementar autenticación JWT
- 🛡️ Agregar captcha para formularios
- 📝 Logging de intentos de acceso
- 🚫 Blacklist de emails maliciosos

---

## 📚 RECURSOS ADICIONALES

### **Documentación Oficial:**
- [Nodemailer Documentation](https://nodemailer.com/)
- [Gmail SMTP Settings](https://support.google.com/mail/answer/7126229)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)

### **Herramientas de Testing:**
- [Mailtrap](https://mailtrap.io/) - Para testing de emails
- [SendGrid](https://sendgrid.com/) - Alternativa a Gmail
- [Postman](https://www.postman.com/) - Para probar endpoints

---

## 📞 SOPORTE

### **Para Reportar Problemas:**
1. Revisar logs en Heroku
2. Verificar variables de entorno
3. Probar endpoints individualmente
4. Verificar conectividad de servicios

### **Contacto:**
- **Desarrollador:** Equipo de Desarrollo Sifrah
- **Documentación:** Este archivo
- **Repositorio:** Git del proyecto

---

## 📝 NOTAS DE VERSIÓN

### **v1.0.0 (Actual)**
- ✅ Sistema básico de envío de emails
- ✅ 5 tipos de email implementados
- ✅ Validación de emails en tiempo real
- ✅ Configuración para Heroku y Vercel
- ✅ Manejo de errores robusto

### **Próximas Versiones:**
- 🔄 Sistema de plantillas personalizables
- 📊 Dashboard de métricas
- 🔐 Autenticación JWT
- 📱 Notificaciones push
- 🌐 Multiidioma

---

**Última actualización:** Agosto 2025  
**Versión:** 1.0.0  
**Estado:** ✅ PRODUCCIÓN 
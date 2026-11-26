# 🚀 Guía de Despliegue en Producción: Pokémon TCG
**UVAQ — Programación Web**  
**Alumna:** Arantza Venegas Valencia (Matrícula: 20010164)  
**Profesor:** Nicolás Zamora Ramos  
**Fecha:** Noviembre 2026

---

## 📋 Arquitectura de Despliegue

| Servicio | Rol | Plan Recomendado | Tecnologías |
| :--- | :--- | :--- | :--- |
| **Neon** | Base de Datos PostgreSQL en la Nube | Free Tier Serverless | PostgreSQL 16 con SSL |
| **Render** | Backend API REST | Free Web Service | Node.js 20+, Express, pg |
| **Vercel** | Frontend SPA | Free Hobby | React 19, Vite, Tailwind CSS |

---

## Paso 1: Configurar la Base de Datos en Neon (PostgreSQL)

1. Ingresa a [https://neon.tech](https://neon.tech) e inicia sesión con GitHub o Google.
2. Haz clic en **Create Project**:
   - **Project Name:** `pokemon-tcg-db`
   - **Postgres version:** 16 (o default)
   - **Region:** Selecciona la más cercana (ej. `US East / Ohio` o `US East / N. Virginia`).
3. Una vez creado el proyecto, ve al **Dashboard** y localiza la sección **Connection Details**.
4. Selecciona el formato **`postgres`** (o **`Node.js`**) y copia tu cadena de conexión completa (`DATABASE_URL`). Tendrá un formato similar a:
   ```text
   postgresql://alex:AbCd1234@ep-young-water-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
5. **Inicializar la base de datos (Tablas + 151 Pokémon + Mazos):**
   Abre una terminal en tu computadora (dentro de la carpeta `pokemon-tcg`) y ejecuta:
   ```bash
   cd backend
   # En Windows PowerShell:
   $env:DATABASE_URL="tu_cadena_de_neon_aqui"
   npm run init-db
   ```
   Verás en la consola la confirmación:
   - `✅ Esquema y tablas creadas exitosamente.`
   - `✅ 151 Cartas de Pokémon insertadas y relaciones de evolución configuradas.`
   - `✅ Usuarios de prueba creados (Ash_MX, Arantza, Gary_Oak, Misty_01).`

---

## Paso 2: Desplegar el Backend en Render

1. Sube los cambios más recientes de tu proyecto a tu repositorio de **GitHub**.
2. Ingresa a [https://dashboard.render.com](https://dashboard.render.com) e inicia sesión con tu cuenta de GitHub.
3. Haz clic en **New +** > **Web Service**.
4. Conecta tu repositorio de GitHub `pokemon-tcg`.
5. Configura los siguientes campos:
   - **Name:** `pokemon-tcg-backend` (o el nombre que elijas)
   - **Region:** Elige la misma que Neon (ej. `Ohio (US East)`)
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`
6. En la sección **Environment Variables**, añade las siguientes variables:

   | Variable | Valor | Nota |
   | :--- | :--- | :--- |
   | `NODE_ENV` | `production` | Modo producción |
   | `PORT` | `10000` | Puerto asignado por Render |
   | `DATABASE_URL` | `postgresql://...neon.tech/neondb?sslmode=require` | Tu URL de Neon copiada en el Paso 1 |
   | `JWT_SECRET` | *(Genera una clave segura de 32+ caracteres)* | Token de autenticación |
   | `MODO_DEMO` | `true` | Permite abrir sobres cada 4 min (cámbialo a `false` para 4 horas) |
   | `FRONTEND_URL` | `https://tu-app.vercel.app` | URL exacta de tu frontend en Vercel (Stripe Checkout exige `https://`, no usar `*`) |
   | `RESEND_API_KEY` | *(Opcional)* `re_...` | Para correos reales de verificación |
   | `STRIPE_SECRET_KEY`| *(Opcional)* `sk_test_...` | Clave secreta de tu Sandbox / Modo prueba de Stripe |
   | `STRIPE_PUBLISHABLE_KEY`| *(Opcional)* `pk_test_...` | Clave publicable de Stripe para mantener el modal oscuro integrado (Stripe Elements) |
   | `STRIPE_WEBHOOK_SECRET`| *(Opcional)* `whsec_...` | Secreto de firma del destino Webhook en Stripe |

7. Haz clic en **Create Web Service**.
8. Render iniciará la construcción. Al finalizar, te mostrará la URL pública de tu API (ej. `https://pokemon-tcg-backend.onrender.com`).
9. **Verificación:** Abre en tu navegador `https://pokemon-tcg-backend.onrender.com/api/health`. Deberás ver `status: "online"`.

---

## Paso 3: Desplegar el Frontend en Vercel

1. Ingresa a [https://vercel.com](https://vercel.com) e inicia sesión con GitHub.
2. Haz clic en **Add New...** > **Project**.
3. Selecciona tu repositorio de GitHub `pokemon-tcg` y haz clic en **Import**.
4. En la pantalla de configuración del proyecto:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Haz clic en **Edit** y selecciona la carpeta **`frontend`**.
   - **Build and Output Settings:** Dejar las predeterminadas (`npm run build` y directorio `dist`).
5. En la sección **Environment Variables**, añade:
   - **Key:** `VITE_API_URL`
   - **Value:** `https://pokemon-tcg-backend.onrender.com` *(la URL de tu Web Service de Render sin la barra final)*
6. Haz clic en **Deploy**.
7. Vercel compilará la aplicación en aproximadamente 1 minuto y generará una URL pública (ej. `https://pokemon-tcg-frontend.vercel.app`).

---

## 🛠️ Comandos de Mantenimiento Rápido

Si necesitas reiniciar la base de datos en Neon desde tu máquina local en cualquier momento:
```bash
# Windows PowerShell
$env:DATABASE_URL="postgres://tu_usuario:tu_contraseña@tu_host.neon.tech/neondb?sslmode=require"
node backend/src/db/init.js
```

---

## 💳 Configurar Nuevo Entorno de Prueba (Sandbox) en Stripe

El backend crea los productos (`pass_premium`, `gems_1000`, `gems_3000`) dinámicamente con `price_data`, por lo que **no necesitas dar de alta productos ni precios en el panel de Stripe**. Solo sigue estos pasos:

1. **Crear Sandbox / Modo Prueba:**
   - Entra a [https://dashboard.stripe.com](https://dashboard.stripe.com), activa **Modo prueba** (Test mode) o abre el menú superior izquierdo y elige **Sandboxes > Crear sandbox** (por ejemplo: `pokemon-tcg-pruebas`).
2. **Obtener Claves de API (`STRIPE_SECRET_KEY` y `STRIPE_PUBLISHABLE_KEY`):**
   - Ve a **Desarrolladores > Claves de API**.
   - Copia la **Clave secreta** (`sk_test_...`) en `STRIPE_SECRET_KEY` y la **Clave publicable** (`pk_test_...`) en `STRIPE_PUBLISHABLE_KEY` (así el modal mantiene tu diseño oscuro dentro de la app mediante Stripe Elements sin redirigir).
3. **Crear Destino de Eventos (Webhook para Render):**
   - Ve a **Desarrolladores > Webhooks > + Agregar destino** (Create event destination):
     - **Eventos de:** `Tu cuenta` (*Your account*)
     - **Estilo de carga útil (Payload style):** `Snapshot` (no *Thin*)
     - **Eventos para enviar:** `payment_intent.succeeded` y `checkout.session.completed`
     - **Tipo de destino:** `Webhook endpoint`
     - **Nombre del destino:** `pokemon-tcg-render-webhook`
     - **URL del punto de conexión:** `https://<tu-backend>.onrender.com/api/payments/webhook`
   - Al crear el destino, haz clic en **Revelar** en **Secreto de firma** y copia el valor `whsec_...` para `STRIPE_WEBHOOK_SECRET`.
4. **En Local (`backend/.env`):**
   - Pon `STRIPE_SECRET_KEY=sk_test_...`, `STRIPE_PUBLISHABLE_KEY=pk_test_...`, `FRONTEND_URL=http://localhost:5173` y (si usas `stripe listen --forward-to localhost:5000/api/payments/webhook`) el `whsec_...` que imprima la CLI. El modal confirma el pago en Stripe Elements y acredita inmediatamente mediante `/api/payments/confirm-payment-intent`.

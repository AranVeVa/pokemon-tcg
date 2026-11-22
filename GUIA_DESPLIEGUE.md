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
   | `FRONTEND_URL` | `*` (o la URL de Vercel que obtendrás en el Paso 3) | Origen permitido |
   | `RESEND_API_KEY` | *(Opcional)* `re_...` | Para correos reales de verificación |
   | `STRIPE_SECRET_KEY`| *(Opcional)* `sk_test_...` | Para pagos reales con Stripe |

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

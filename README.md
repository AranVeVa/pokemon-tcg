# Pokémon TCG · Proyecto Web de Cartas Coleccionables

**Materia:** Programación Web  
**Profesor:** Nicolás Zamora Ramos  
**Alumna:** Arantza Venegas Valencia (Matrícula: 20010164)  
**Institución:** Universidad Vasco de Quiroga (UVAQ)  
**Fecha de entrega:** 8 de noviembre de 2026  

---

## 🌟 Descripción del Proyecto

Aplicación web interactiva para coleccionar cartas de Pokémon, abrir sobres periódicos, completar la Pokédex de Kanto (151 Pokémon), subir de nivel y evolucionar criaturas con copias repetidas, intercambiar cartas con amigos mediante transacciones atómicas seguras en PostgreSQL, avanzar en un Pase de Batalla temático (gratuito y premium) y librar combates por turnos con mochila de objetos para curar y revivir.

---

## 🛠️ Tecnologías Utilizadas

- **FrontEnd:** React 19, Vite, Tailwind CSS, Lucide React, Canvas Confetti. Animaciones CSS personalizadas (`float`, `jump`, `shine`).
- **BackEnd:** Node.js, Express, PostgreSQL (`pg` pool con transacciones ACID), JSON Web Tokens (JWT), Bcrypt.js.
- **Base de Datos:** PostgreSQL 18 (`pokemon_tcg`).
- **Integraciones:**
  - **PokéAPI:** Generación e importación automática de estadísticas oficiales, sprites, artwork oficial en alta resolución y tipos elementales.
  - **Stripe Checkout:** Pasarela de pagos en entorno de pruebas para PokéGemas y Pase de Batalla Premium con soporte para webhooks.

---

## 📦 Estructura del Proyecto

```
pokemon-tcg/
├── backend/
│   ├── src/
│   │   ├── config.js              # Configuración (MODO_DEMO: 4 min vs 4 horas)
│   │   ├── server.js              # Servidor Express y montaje de rutas
│   │   ├── db/
│   │   │   ├── index.js           # Pool de conexión a PostgreSQL
│   │   │   ├── schema.sql         # DDL de tablas y restricciones
│   │   │   └── init.js            # Script de inicialización y seeders
│   │   ├── data/
│   │   │   └── pokemonList.js     # Metadatos de los 151 Pokémon y evoluciones
│   │   ├── services/
│   │   │   └── pokeApiService.js  # Integración y sincronización con PokéAPI
│   │   ├── middlewares/
│   │   │   └── auth.js            # Validación de JWT y control de roles RBAC
│   │   └── routes/
│   │       ├── auth.js            # Registro, login, verificación de correo y perfil
│   │       ├── packs.js           # Sobre gratis con reloj, compra y canje de gemas
│   │       ├── cards.js           # Pokédex (87/151), mejora Nv 1-5 y evolución
│   │       ├── trades.js          # Intercambios atómicos en 1 sola transacción
│   │       ├── battlePass.js      # Pase de 50 niveles (gratuito y premium)
│   │       ├── friends.js         # Lista de amigos y búsqueda
│   │       ├── battles.js         # Reto amistoso y normal con mochila de items
│   │       ├── items.js           # Uso de pociones y revividores
│   │       ├── payments.js        # Stripe Checkout y simulador de pruebas
│   │       └── admin.js           # Módulo exclusivo de Super Administrador
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx         # Barra superior con monedas, gemas y avatar
│   │   │   └── Sidebar.jsx        # Menú lateral con acceso según rol
│   │   ├── views/
│   │   │   ├── LandingView.jsx    # Mockup 1: Pantalla de presentación y beneficios
│   │   │   ├── AuthModal.jsx      # Mockup 4: Login, registro y verificación
│   │   │   ├── PacksShopView.jsx  # Mockup 2: Sobres y tienda con reloj sobre el sobre
│   │   │   ├── PokedexView.jsx    # Mockup 3: Pokédex a color vs siluetas oscuras ???
│   │   │   ├── UpgradeEvolveView.jsx # Mockup 6: Squirtle > Wartortle > Blastoise EX
│   │   │   ├── TradesView.jsx     # Mockup 7: Intercambio Eevee <-> Lapras
│   │   │   ├── BattlePassView.jsx # Mockup 8: Pase de Batalla Nivel 18 y Blastoise EX
│   │   │   ├── FriendsBattlesView.jsx # Mockup 9: Amigos y retos
│   │   │   ├── BattleArenaModal.jsx   # Mockup 10: Combate con mochila de items
│   │   │   ├── AdminPanel.jsx     # Mockup 5: Panel de Super Administrador
│   │   │   └── StripeCheckoutModal.jsx # Mockup 11: Pago Stripe en entorno de prueba
│   │   ├── context/AuthContext.jsx
│   │   └── api.js
│   └── package.json
└── README.md
```

---

## 🚀 Puesta en Marcha

### 1. Inicializar la Base de Datos
```bash
cd backend
npm run init-db
```
El script creará las tablas, sincronizará las 151 cartas de PokéAPI, generará los 50 niveles del Pase de Batalla, creará los usuarios de prueba e insertará los registros iniciales idénticos a los mockups.

### 2. Iniciar el Servidor BackEnd
```bash
cd backend
npm run dev
# Servidor escuchando en http://localhost:5000
```

### 3. Iniciar la Aplicación FrontEnd
```bash
cd frontend
npm run dev
# Aplicación lista en http://localhost:5173
```

---

## 👥 Cuentas de Prueba Pre-configuradas

En la pantalla de Login existen botones de **acceso rápido** con un solo clic:

| Usuario | Correo | Contraseña | Rol | Características / Estado |
|---|---|---|---|---|
| **Ash_MX** | ash@correo.com | `password123` | **Premium** | 4,850 Monedas, 1,200 Gemas, 87 Pokémon registrados, Squirtle Nv. 5 listo para evolucionar, Eevee x4 listo para intercambiar por Lapras con Misty. |
| **Arantza** | arantza@correo.com | `20010164` | **Admin** | Cuenta de alumna con rol Administrador para acceso completo al Super Admin. |
| **Gary_Oak** | gary@correo.com | `password123` | **Admin** | Super Administrador con acceso al panel de gestión de roles, cartas y Stripe. |
| **Misty_01** | misty@correo.com | `password123` | **Normal** | Amiga con Lapras disponible para intercambiar y retar a combate. |

---

## 📋 Módulos y Funcionalidades Desarrolladas

1. **Presentación del Juego (Mockup 1):**
   - Propuesta de valor clara, animación de cartas flotantes (Pikachu, Squirtle, Eevee, Charmander) y tarjetas de Jugador Gratuito, PokéGemas y Pase de Batalla Premium.
2. **Sobres y Tienda con Reloj Incorporado (Mockup 2):**
   - Contador de tiempo regresivo situado directamente **sobre el sobre gratuito**.
   - En `backend/src/config.js`, `MODO_DEMO = true` entrega un sobre cada 4 minutos (o 4 horas en producción).
   - Catálogo de sobres: Normal (1,200 PokéMonedas), Especial (8,000 monedas o 150 gemas) y Legendario (400 gemas con carta legendaria asegurada).
   - Canje de gemas por monedas (100 gemas = 5,000 monedas) y compra de gemas con dinero real.
   - Animación interactiva de apertura con saltos y destellos de cartas.
3. **Pokédex Completa de Kanto (Mockup 3):**
   - Registro dinámico (ej. *"87 de 151 Pokémon registrados"*).
   - Cartas obtenidas en color con número, tipos elementales y cantidad de copias (`x1`, `x2`, `x3`).
   - Cartas faltantes como silueta oscura con el texto `"???"` y `"No registrado"`.
   - Filtro por tipos elementales y búsqueda instantánea por nombre o número.
4. **Inicio de Sesión y Verificación (Mockup 4):**
   - Autenticación con JWT y contraseñas cifradas con bcrypt.
   - Paso de verificación con código de 6 dígitos enviado por correo.
5. **Panel de Super Administrador (Mockup 5):**
   - Protegido por middleware en BackEnd: solo usuarios con rol `Admin` pueden visualizarlo o invocar sus endpoints.
   - Pestañas funcionales: Usuarios y Roles (modificación de rol en tiempo real con botón Guardar), Cartas e Imágenes, Probabilidades de sobres, Temporadas temáticas y Auditoría de Pagos Stripe.
6. **Mejorar y Evolucionar (Mockup 6):**
   - Subida de cartas del Nivel 1 al Nivel 5 con PokéMonedas.
   - Al llegar a Nivel 5 con 3 copias repetidas, la carta evoluciona a su siguiente forma (ej. Squirtle Nv. 5 > Wartortle Nv. 1 > Blastoise EX con 330 HP y 190 ATQ) con animación de destello.
7. **Intercambio Seguro de Cartas (Mockup 7):**
   - Interfaz de comparación directa: *"Tú ofreces Eevee (Copia repetida x4)"* vs *"Recibes de Misty_01 Lapras (Te falta en tu Pokédex)"*.
   - Ejecutado en una **sola transacción de PostgreSQL (`BEGIN; ... COMMIT;`)** para garantizar atomicidad y evitar pérdidas o duplicaciones de cartas.
8. **Pase de Batalla Gratuito y Premium (Mockup 8):**
   - 50 niveles con progreso de XP.
   - Carril Gratuito con monedas y sobres básicos; Carril Premium con candado para usuarios Normales y recompensas exclusivas para Premium.
   - Nivel 50 otorga a los usuarios Premium la carta garantizada de Blastoise EX con estadísticas mejoradas.
   - Sobre premium diario para usuarios Premium.
9. **Amigos y Retos (Mockup 9):**
   - Lista de amigos con indicador de conexión En línea / Desconectado.
   - Dos modalidades de partida:
     - **Reto amistoso:** menos XP, sin bajas permanentes.
     - **Reto normal:** mayor XP e items, pero los Pokémon pueden ser debilitados.
10. **Combate por Turnos y Mochila de Items (Mockup 10):**
    - Arena de combate con barras de vida dinámicas, ataques y turnos.
    - Panel de equipo con estados: Activo, Debilitado y Listo.
    - Mochila de items (Poción +30 HP, Cura total, Revivir 10%, Revivir 50%, Revivir Máximo) que pueden aplicarse en tiempo real sobre los Pokémon del equipo.
11. **Pasarela de Pagos Stripe Checkout (Mockup 11):**
    - Entorno de prueba Stripe para adquirir el Pase Premium ($149 MXN), 1,000 PokéGemas ($99 MXN) y 3,000 PokéGemas ($249 MXN).
    - Webhook y simulación automática que actualiza el rol en PostgreSQL o incrementa el saldo de gemas al instante.

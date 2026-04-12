# Hosting PingPongZS — Vercel + Railway

Guía paso a paso para deployar la app de forma **gratuita**:
- **Frontend** → Vercel (build estático de React/Vite)
- **Backend + Base de datos** → Railway (Express + SQLite con volumen persistente)

---

## Prerrequisitos

- Cuenta en **GitHub** — el repositorio debe estar subido y ser accesible
- Cuenta en **Vercel** — [vercel.com](https://vercel.com) (gratis)
- Cuenta en **Railway** — [railway.app](https://railway.app) (gratis, ~$5 USD de crédito/mes, más que suficiente)

---

## Paso 1 — Subir el repositorio a GitHub

Si todavía no está en GitHub:

```bash
# Desde la raíz del proyecto
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/ping-pong-app.git
git push -u origin main
```

> El `.gitignore` ya excluye `node_modules/`, `dist/`, archivos `.db` y `.env`.

---

## Paso 2 — Deployar el Backend en Railway

> Hacemos esto primero para obtener la URL del backend que necesita Vercel.

1. Ir a [railway.app](https://railway.app) → **New Project**
2. Elegir **Deploy from GitHub repo** → seleccionar `ping-pong-app`
3. En la configuración del servicio:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Una vez creado el servicio, ir a la pestaña **Variables** y agregar:

   | Variable | Valor |
   |---|---|
   | `DATABASE_PATH` | `/data/pingpong.db` |

   > `PORT` lo asigna Railway automáticamente — no hace falta configurarlo.

5. Ir a la pestaña **Volumes** → **New Volume**:
   - **Mount Path:** `/data`

6. Railway va a redeployar. Esperar a que el deploy diga ✅ **Active**.

7. Ir a **Settings → Networking → Generate Domain** para obtener la URL pública.
   - Ejemplo: `https://ping-pong-app-production.up.railway.app`
   - **Guardar esta URL** — la necesitás en el siguiente paso.

---

## Paso 3 — Deployar el Frontend en Vercel

1. Ir a [vercel.com](https://vercel.com) → **Add New → Project**
2. Importar el repositorio `ping-pong-app` desde GitHub
3. Configurar el proyecto:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite (se detecta automáticamente)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Antes de deployar, ir a **Environment Variables** y agregar:

   | Variable | Valor |
   |---|---|
   | `VITE_API_URL` | `https://TU-URL.up.railway.app` ← la URL de Railway del paso anterior |

5. Hacer click en **Deploy**.
6. Una vez terminado, Vercel te da la URL del frontend.
   - Ejemplo: `https://pingpongzs.vercel.app`

---

## Paso 4 — Verificar que todo funciona

Abrir la URL de Vercel y verificar:

- [ ] La página de Rankings carga sin errores
- [ ] Se puede agregar un jugador (Players → Add Player)
- [ ] Se puede registrar un partido (New Match)
- [ ] El MMR se actualiza correctamente en el ranking
- [ ] Al **refrescar la página**, los datos siguen ahí (confirma que el volumen de Railway persiste la base de datos)
- [ ] Head-to-Head funciona entre dos jugadores

---

## Actualizaciones futuras

Cada vez que hagas `git push` a `main`, Railway y Vercel van a **redeployar automáticamente**. Los datos en SQLite se mantienen intactos porque están en el volumen (`/data/pingpong.db`), que es independiente del código.

---

## Solución de problemas comunes

| Problema | Causa probable | Solución |
|---|---|---|
| La app carga pero las llamadas a la API dan error 404/CORS | `VITE_API_URL` mal configurado en Vercel | Verificar que no tenga `/` al final y que sea la URL exacta de Railway |
| Los datos se pierden al redeployar | El volumen no está configurado | Ir a Railway → Volumes y confirmar que esté montado en `/data` y que `DATABASE_PATH=/data/pingpong.db` esté en Variables |
| El backend no arranca | Error de dependencias nativas | Railway usa Linux x64 — las dependencias se reinstalan en el servidor automáticamente con `npm install` |
| Las rutas de React dan 404 al recargar | Sin rewrites para SPA | El archivo `frontend/vercel.json` ya lo resuelve automáticamente |

# ITAEB · Reserves

Aplicació de reserva de material audiovisual i espais de l'Institut de Tècniques Audiovisuals i de l'Espectacle de Barcelona.

---

## Qué es esto y qué hago con ello

Esta carpeta es **el código de la web**, ya montado y compilado. No hace falta entender el código: solo hay que publicarlo en Cloudflare.

Tienes **dos caminos**. Empieza por el A para verlo funcionando hoy; pasa al B cuando quieras que se actualice solo.

### Camino A · Publicar en 2 minutos (subida directa, sin GitHub)

1. Descomprime esta carpeta en tu ordenador.
2. Entra en el **panel de Cloudflare** → menú lateral **Workers & Pages** → **Create** → pestaña **Pages** → **Upload assets**.
3. Ponle nombre: `itaeb-reserves`.
4. Arrastra la carpeta **`dist`** (ya viene compilada) y pulsa **Deploy site**.

En un minuto tienes la web en `https://itaeb-reserves.pages.dev`.

Limitación: cada cambio hay que volver a arrastrar la carpeta a mano.

### Camino B · Con GitHub (recomendado para el uso real)

GitHub es **el almacén del código**. Sirve para que Cloudflare lo coja de ahí y **republique la web sola** cada vez que se cambie algo, y para tener histórico por si hay que volver atrás.

**Paso 1 · Subir el código a GitHub**

1. Crea una cuenta gratuita en [github.com](https://github.com).
2. Botón **+** (arriba a la derecha) → **New repository**.
3. Nombre: `itaeb-reserves`. Márcalo **Private** → **Create repository**.
4. En la página que sale, pulsa **uploading an existing file**.
5. Arrastra todos los archivos y carpetas **EXCEPTO `node_modules` y `dist`**. Es decir: `src`, `public`, `index.html`, `package.json`, `package-lock.json`, `vite.config.js`, `wrangler.jsonc`, `.gitignore` y `README.md`.
6. Abajo, **Commit changes**.

**Paso 2 · Conectar Cloudflare**

Cloudflare ha unificado Pages y Workers, así que **verás una de estas dos pantallas**. Las dos funcionan; usa la que te salga.

*Opción 1 — Si te pide "Framework preset" y "Build output directory" (flujo Pages):*

- **Framework preset:** `Vite`
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- Pulsa **Save and Deploy**.

*Opción 2 — Si te pide "Build command" y "Deploy command" (flujo Workers, el nuevo):*

- **Build command:** `npm run build`
- **Deploy command:** `npx wrangler deploy`
- Pulsa **Create and deploy**.

No hace falta indicar la carpeta de salida: ya está en el archivo `wrangler.jsonc` del proyecto, junto con la configuración para que las rutas internas funcionen al recargar.

**Paso 3 · Dominio del centro**

En el proyecto → **Custom domains** → **Set up a custom domain** → `reserves.itaeb.cat`. Si el dominio `itaeb.cat` ya está en Cloudflare, el registro DNS se crea solo; si no, quien administre el dominio tendrá que crear el CNAME que Cloudflare indique.

### ¿Pages o Workers?

Cloudflare recomienda **Workers** para proyectos nuevos, pero **Pages sigue funcionando y está soportado**, y es bastante más sencillo (conectas Git y ya está). Para este proyecto, que es una web estática, **empieza con Pages**.

Si en algún momento prefieres Workers, el proyecto ya viene preparado: existe el archivo `wrangler.jsonc` y solo hay que ejecutar `npx wrangler deploy`.

## Cuando conectemos la base de datos

Cuando la aplicación se conecte a Supabase, harán falta dos datos privados. **No se ponen en el código**: se configuran en Cloudflare, en el proyecto → *Settings → Variables and Secrets* (para el entorno de *Production*):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Los dos salen de Supabase → *Project Settings → API*.

---

## Estructura del proyecto

| Archivo | Qué es |
|---|---|
| `src/App.jsx` | Toda la aplicación (pantallas, lógica, inventario) |
| `src/main.jsx` | Punto de arranque |
| `index.html` | Página contenedora |
| `package.json` | Lista de librerías que usa |
| `vite.config.js` | Configuración de compilación |
| `public/_redirects` | Hace que las rutas internas funcionen al recargar |
| `public/_headers` | Cacheo y cabeceras de seguridad |
| `wrangler.jsonc` | Solo si despliegas con Workers en vez de Pages |
| `dist/` | La web ya compilada (se regenera; no hace falta subirla a GitHub) |

## Para trabajar en local (opcional)

Solo si alguien quiere modificar el código en su ordenador. Requiere tener [Node.js](https://nodejs.org) instalado.

```bash
npm install     # instala las librerías (una sola vez)
npm run dev     # abre la web en http://localhost:5173
npm run build   # genera la carpeta dist lista para publicar
```

## Estado actual

Funciona todo el flujo (reservas, cistella, escaneo, devoluciones, reparaciones, calendario del curso), pero **los datos están en memoria**: al recargar la página se reinician. El selector de rol de la cabecera es una simulación para poder probar los permisos.

El paso pendiente es conectar la aplicación a Supabase para tener datos reales, login con `@itaeb.cat` y roles de verdad.

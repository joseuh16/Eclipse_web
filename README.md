# Eclipse Tech

Tienda de licencias digitales (streaming, IA, productividad) con **Firebase
Realtime Database**, **Firebase Authentication** y **Firebase Storage**.
Sin Docker, sin MySQL y sin API .NET para operar.

| App | URL local | Build |
| --- | --- | --- |
| Tienda | <http://localhost:5173> | `storefront/dist` |
| Panel admin | <http://localhost:5174> | `admin/dist` |

## Funcionalidad

### Tienda
- Catálogo desde RTDB (`catalogo`) con categorías, búsqueda, filtros y orden.
- Banners y promociones desde `promociones`.
- Tema de temporada activo desde `themes` (se refresca al volver a la pestaña).
- Combos con descuento progresivo, cupones y compra rápida.
- Carrito lateral y checkout con BBVA/SPEI, Mercado Pago y OXXO.
- Confirmación de pedido + espejo a RTDB `orders`.
- Sección `+18` con aviso de verificación: el checkout pide foto de credencial
  (INE/pasaporte) y selfie opcional.
- Cuenta del cliente en el navegador (`#/cuenta`), noticias y FAQ.
- Iconos de Facebook, Instagram y YouTube en el footer.
- Asistente flotante (chat) con respuestas de compra, pagos, pedidos, +18 y
  acceso directo a WhatsApp.

### Panel administrativo
- Login aislado con Firebase Auth (correos autorizados).
- Dashboard calculado 100% sobre RTDB (caché de 15 s y escrituras que invalidan
  la caché para ver cambios al instante).
- CRUD de productos, banners, combos y cupones.
- Temas: 8 presets de temporada + editor de colores/tipografía/CSS. Al aplicar,
  guarda `themes/<clave>` con `isActive: true` para la tienda.
- Órdenes: filtros por estado, búsqueda, detalle y cambio de estado.
- **Apartado +18 en Órdenes**: filtro `+18`, insignias, visor de credencial y
  selfie, y botón **Verificar +18**.
- Configuración de pagos/WhatsApp/soporte y contenido (hero + noticias).
- Subida de imágenes a Firebase Storage.

## Estructura

```text
Eclipse/
├── storefront/            # React 18 + Vite + Tailwind (tienda)
├── admin/                 # React 18 + Vite + Tailwind (panel)
├── database.rules.json    # Reglas de Realtime Database (publicar)
├── storage.rules          # Reglas de Storage (publicar)
├── firebase.json          # Configuración CLI de Firebase
├── DEPLOY_HOSTINGER.md    # Guía de despliegue en Hostinger
├── scripts/dev.mjs        # Arranque conjunto en desarrollo
└── FIREBASE_SETUP.md      # Activación de RTDB, Auth y Storage
```

## Inicio rápido

```bash
npm run install:all
npm run dev:all
```

- Tienda: <http://localhost:5173>
- Panel: <http://localhost:5174>

### Login del panel

| Campo | Valor |
| --- | --- |
| Usuario | `admin` |
| Contraseña | `Eclipse2026!` |

El usuario corto se traduce a `admin@eclipse.tech`. También pueden entrar
`jjaimej7@gmail.com` y `marisolestradaaguir@gmail.com` (las reglas de RTDB y
Storage usan esa lista).

## Configuración de Firebase (obligatoria)

Proyecto: **my-admin-f0d0f**.

1. **Authentication → Email/Password**: habilitado.
2. **Realtime Database → Reglas**: pega el contenido de
   [`database.rules.json`](database.rules.json) y publica.
   - Es la versión **combinada**: conserva las reglas anteriores y agrega los
     nodos de Eclipse Tech. La versión limpia queda en
     [`database.rules.clean.json`](database.rules.clean.json) para cuando retires
     la app vieja.
   - Lectura pública: catálogo, promociones, combos, temas, settings, cupones y
     contenido.
   - `orders`: el cliente anónimo puede **crear** un pedido nuevo; leer y
     editar solo administradores.
   - Resto de nodos: solo administradores.
3. **Storage → Get started → Reglas**: pega el contenido de
   [`storage.rules`](storage.rules) y publica.
   - Imágenes públicas y escritura solo para administradores.
   - `verifications/*`: el checkout anónimo puede subir fotos +18 (máx. 3 MB).
4. **Authentication → Authorized domains**: agrega el dominio de la tienda y el
   del panel cuando los tengas.

> **Importante:** sin publicar las reglas de RTDB, Firebase rechaza todas las
> escrituras (temas, productos, banners, pedidos). El panel muestra el error
> "permiso denegado" con esta indicación.

También puedes publicarlas con la CLI:

```bash
npm i -g firebase-tools
firebase login   # con la cuenta dueña del proyecto my-admin-f0d0f
npm run deploy:rules
npm run deploy:storage
```

**Atajo sin consola:** doble clic en `PUBLICAR_REGLAS.cmd` (copia las reglas y
abre la página exacta) y luego en `PUBLICAR_REGLAS_STORAGE.cmd`. Verifica con:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\verificar-reglas.ps1
```

## Scripts útiles

| Directorio | Comando | Descripción |
| --- | --- | --- |
| raíz | `npm run install:all` | Instala dependencias de tienda y panel |
| raíz | `npm run dev:all` | Tienda + panel en una terminal |
| raíz | `npm run dev:store` | Solo tienda |
| raíz | `npm run dev:admin` | Solo panel |
| raíz | `npm run build` | Build de producción de ambas apps |
| raíz | `npm run deploy:rules` | Publica reglas de RTDB y Storage |
| `storefront` | `npm run build` | Type-check + build de la tienda |
| `admin` | `npm run build` | Type-check + build del panel |

## Despliegue

Sigue **[DEPLOY_HOSTINGER.md](DEPLOY_HOSTINGER.md)**. Resumen:

1. `npm run build`.
2. Sube `storefront/dist` al dominio principal.
3. Sube `admin/dist` al subdominio del panel (recomendado).
4. Publica reglas de Firebase, activa SSL y prueba el checklist.

Las dos apps usan rutas con hash (`#/cuenta`, `#/orders`), así que funcionan en
hosting estático sin rewrites especiales. Cada `dist` incluye `.htaccess` con
fallback, caché y compresión.

## Seguridad

- La configuración web de Firebase es pública por diseño; no coloques llaves de
  servicio en el frontend.
- Las reglas limitan escrituras a los correos administradores.
- Las fotos +18 se guardan en `verifications/` (URL no listada) o, si Storage
  no está disponible, comprimidas dentro del pedido.
- Los pagos se validan manualmente; no se almacenan datos de tarjetas.

## Documentación

- `FIREBASE_SETUP.md` — activación de Realtime Database, Auth y Storage.
- `DEPLOY_HOSTINGER.md` — despliegue estático de la tienda y el panel.
- Docker, MySQL y la API .NET fueron retirados: la operación es 100% Firebase.

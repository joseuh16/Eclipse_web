<<<<<<< HEAD
# Eclipse Tech

Tienda de licencias digitales y streaming con backend propio, storefront público y panel administrativo privado. Todo el stack está contenedorizado y listo para desplegar en Docker o Coolify.

| Servicio | Tecnología | Dominio previsto |
| --- | --- | --- |
| `backend-api` | .NET 9 · ASP.NET Core · EF Core · MySQL | interno (`:8080`) |
| `frontend-store` | React 18 · Vite · Tailwind · Nginx | `eclipse.techyuc.com` |
| `frontend-admin` | React 18 · Vite · Tailwind · Nginx | `panel-eclipse.techyuc.com` |
| `mysql` | MySQL 8.0 | interno (`:3306`) |

## Funcionalidad

### Storefront
- Tema de temporada dinámico (`base`, `autumn`, `halloween`, `christmas`, `reyes`) con colores y CSS personalizados.
- Header con barra de anuncios, búsqueda predictiva y contador animado del carrito.
- Carrusel de banners, riel de destacados y catálogo con filtros por categoría.
- Categoría `+18` protegida con modal de verificación de edad.
- Constructor de combos con descuento progresivo (2, 3 y 4+ perfiles).
- Compra rápida, carrito lateral y checkout con cupones.
- Pagos por BBVA, Mercado Pago y OXXO con copiado en un clic.
- Confirmación de pedido con enlace prellenado a WhatsApp.

### Panel administrativo
- Login JWT con rol `Admin` y sesión persistente opcional.
- Dashboard con ventas pendientes, productos activos, órdenes de hoy, ingresos y actividad de 7 días.
- CRUD de productos con activar/desactivar, destacados y restricción `+18`.
- Motor de temas con presets de un clic, selector de color, tipografía, CSS propio y vista previa.
- Gestión de cupones, niveles de combo y banners con vigencia y orden.
- Órdenes con filtros, búsqueda, paginación, detalle y cambio de estado.
- Configuración de datos bancarios, WhatsApp y soporte.

## Estructura

```text
Eclipse/
├── backend/Eclipse.Api/     # API .NET 9
├── storefront/              # React storefront (Vite)
├── admin/                   # React admin CMS (Vite)
├── docs/                    # Despliegue y referencia de API
├── scripts/dev.mjs          # Arranque conjunto en desarrollo
├── docker-compose.yml       # MySQL local (puerto 3307)
└── .env.example
```

## Inicio rápido con Firebase

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com) y activa **Firestore** y **Authentication**.
2. Copia `.env.example` a `.env` y completa las variables `VITE_FIREBASE_*` con los datos de tu app web.
3. Instala dependencias:
   ```bash
   npm run install:all
   ```
4. Arranca el desarrollo:
   ```bash
   npm run dev:all
   ```
   - Tienda: <http://localhost:5173>
   - Panel: <http://localhost:5174>
   - API: <http://localhost:8090>

> La tienda y el panel usan la API .NET en `:8090`, que a su vez usa MySQL en
> `127.0.0.1:3307`. Los servicios de Firestore (`storefront/src/services/firestore.ts`
> y `admin/src/lib/firebase.ts`) están preparados pero todavía no están conectados
> al panel ni a la tienda.

## Desarrollo local

Requisitos: .NET 9 SDK, Node 20+, MySQL 8 (o Docker).

### Todo en uno

```bash
docker compose up -d mysql      # en .env usa MYSQL_PASSWORD=eclipse_dev_password
npm run install:all             # solo la primera vez
npm run dev:all                 # API + storefront + panel
```

| Servicio | URL |
| --- | --- |
| Storefront | <http://localhost:5173> |
| Panel | <http://localhost:5174> |
| API | <http://localhost:8090> · Swagger en <http://localhost:8090/swagger> |

`Ctrl+C` detiene los tres procesos. Si solo necesitas los frontends usa `npm run dev:apps`; también existen `dev:api`, `dev:store` y `dev:admin`.

Al arrancar, `npm run dev` libera automáticamente instancias previas del propio
proyecto que se hayan quedado ocupando los puertos 5173, 5174 o 8090. Si el
puerto lo ocupa otro programa, se muestra un aviso y no se toca ese proceso.

### Acceso al panel

Abre <http://localhost:5174> e inicia sesión con las credenciales configuradas
en `.env` / `appsettings.json`:

| Campo | Valor por defecto |
| --- | --- |
| Usuario | `admin` |
| Contraseña | `Eclipse2026!` |

`ADMIN_USERNAME` y `ADMIN_PASSWORD` (o `Seed__AdminUsername` y
`Seed__AdminPassword`) son la fuente de verdad: al reiniciar la API, el usuario
administrador se crea si no existe o se actualiza si la contraseña configurada
ya no coincide con la guardada en la base de datos. Cambia el valor por defecto
antes de publicar el sitio.

### Por separado

```bash
# 1. Base de datos (en .env usa MYSQL_PASSWORD=eclipse_dev_password)
docker compose up -d mysql

# 2. API
cd backend/Eclipse.Api
dotnet run
# http://localhost:8090 · Swagger en /swagger

# 3. Storefront (otra terminal)
cd storefront
npm install
npm run dev
# http://localhost:5173

# 4. Admin (otra terminal)
cd admin
npm install
npm run dev
# http://localhost:5174
```

Vite proxya `/api` hacia `http://localhost:8090` en desarrollo. Para apuntar a otra API usa `VITE_DEV_API_PROXY` o `VITE_API_URL`. Si usas un MySQL local en `:3306`, sobrescribe la cadena con la variable `ConnectionStrings__DefaultConnection`.

## Scripts útiles

| Directorio | Comando | Descripción |
| --- | --- | --- |
| raíz | `npm run install:all` | Instala dependencias de storefront y admin |
| raíz | `npm run dev:all` | API + storefront + panel en una terminal |
| raíz | `npm run dev:apps` | Solo storefront y panel |
| raíz | `npm run build` | Build de producción de ambos frontends |
| `backend/Eclipse.Api` | `dotnet build` | Compila la API (opcional) |
| `backend/Eclipse.Api` | `dotnet run` | Inicia la API en `:8090` (opcional) |
| `storefront` | `npm run build` | Type-check + build de producción |
| `admin` | `npm run build` | Type-check + build de producción |

## Problemas frecuentes

**«Usuario o contraseña incorrectos» en el panel**

1. Confirma las credenciales de la tabla de acceso (`admin` / `Eclipse2026!`).
2. Si cambiaste `ADMIN_PASSWORD`, reinicia la API para que se aplique.
3. Verifica que MySQL esté arriba y con datos: <http://localhost:8090/api/health>
   debe responder `{"status":"ok","database":"up"}`.

**«No pudimos conectar con el servidor»**

- La API no está escuchando en `:8090`. Ejecuta `npm run dev:api` o revisa la
  consola de `npm run dev:all`.
- Si el puerto estaba ocupado, la nueva instancia no arrancó; vuelve a lanzar
  `npm run dev` (libera instancias previas del proyecto automáticamente).
- Comprueba la base de datos: `docker compose up -d mysql` y
  `docker compose ps`.

**La API no conecta con MySQL**

En desarrollo la cadena apunta a `127.0.0.1:3307`. Ese es el puerto que expone
`docker-compose.yml`. Si usas otro puerto, define
`ConnectionStrings__DefaultConnection` antes de `dotnet run`, por ejemplo:

```bash
# PowerShell
$env:ConnectionStrings__DefaultConnection="Server=localhost;Port=3306;Database=eclipse;User=root;Password=tu_password;"
dotnet run --project backend/Eclipse.Api
```

## Documentación

- [Guía de despliegue](docs/DEPLOYMENT.md)
- [Referencia de la API](docs/API.md)

## Notas de seguridad

- `JWT_KEY` debe tener al menos 32 caracteres; la API no arranca sin él.
- Cambia las contraseñas de MySQL y del administrador antes de exponer el sitio.
- Swagger está deshabilitado por defecto en producción (`SWAGGER_ENABLED=false`).
- El panel administrativo envía `X-Robots-Tag: noindex` y su `robots.txt` bloquea indexación.
- Los pagos se validan manualmente desde el panel; no se almacenan datos de tarjetas.
=======
# Eclipse_web
>>>>>>> 5364e4fc0593ac0991c3aeca3784075a4e22a633

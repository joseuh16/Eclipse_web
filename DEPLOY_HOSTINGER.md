# Eclipse Tech · despliegue en Hostinger

Guía para publicar la tienda y el panel cuando pasemos a producción (enero).
Todo funciona **solo con Firebase**: Realtime Database, Authentication y Storage.
No se necesita Docker, MySQL ni la API .NET.

---

## 1. Qué se publica

| App | URL sugerida | Carpeta a subir |
| --- | --- | --- |
| Tienda | `https://eclipsetech.com` | contenido de `storefront/dist` |
| Panel admin | `https://panel.eclipsetech.com` | contenido de `admin/dist` |

Recomendación: **subdominio para el panel**. Así cada app vive en su propia raíz
(`/`) y no hay que tocar rutas de assets.

> Ambas apps usan rutas con hash (`/#/cuenta`, `/#/orders`), por lo que los
> enlaces profundos funcionan sin reglas especiales de servidor.

---

## 2. Antes de compilar (local)

```bash
# En la raíz del proyecto
npm run install:all
npm run build
```

`npm run build` genera:

- `storefront/dist/` → tienda
- `admin/dist/` → panel

Las variables de Firebase ya están en:

- `storefront/.env.local`
- `admin/.env.local`

Vite las incrusta **en tiempo de build**. Si cambias de proyecto Firebase,
edita esos archivos y vuelve a compilar. La configuración web de Firebase es
pública por diseño: no pongas llaves de servicio ni contraseñas ahí.

---

## 3. Firebase Console (una sola vez)

Proyecto: **my-admin-f0d0f**

### 3.1 Authentication

1. Authentication → Sign-in method → **Email/Password** → Habilitar.
2. Authentication → Settings → **Authorized domains** → agrega:
   - `eclipsetech.com`
   - `www.eclipsetech.com`
   - `panel.eclipsetech.com`
   - `localhost` (desarrollo)

Usuarios autorizados del panel:

- `admin@eclipse.tech`
- `jjaimej7@gmail.com`
- `marisolestradaaguir@gmail.com`

### 3.2 Realtime Database — reglas

Copia el contenido de **`database.rules.json`** (raíz del repo) en:

Firebase Console → Realtime Database → Reglas → Publicar.

> `database.rules.json` es la versión **combinada**: conserva las reglas
> anteriores y agrega los nodos de Eclipse Tech. La versión limpia está en
> `database.rules.clean.json` para cuando retires la app vieja.

Resumen de permisos:

- `catalogo`, `promociones`, `combos`, `themes`, `settings`, `coupons`,
  `content` → lectura pública; escritura solo administradores.
- `orders` → el cliente puede **crear** un pedido nuevo; leer/editar solo admin.
- `usuarios`, `clientes`, `cuentas`, `Costos` → solo admin.
- `usuarios_clientes/<uid>` → el cliente autenticado puede crear/actualizar **su propio**
  perfil (email, nombre, credencial de estudiante). El campo `studentApproved`
  solo lo puede cambiar el panel; el cliente **no** puede aprobarse solo.

> Sin estas reglas, los pedidos de la tienda no llegan al panel y el dashboard
> se queda sin datos nuevos.

También puedes publicarlas con Firebase CLI:

```bash
npm i -g firebase-tools
firebase login          # con la cuenta dueña del proyecto my-admin-f0d0f
firebase use my-admin-f0d0f
firebase deploy --only database
# o desde la raíz del repo:
npm run deploy:rules
```

> La sesión de Firebase CLI que está en esta computadora pertenece a otra cuenta
> (`mariouh1172@gmail.com`) y **no ve** el proyecto `my-admin-f0d0f`. Hay que
> iniciar sesión con la cuenta dueña o publicar las reglas desde la consola web.

### Atajo para publicar las reglas

- Doble clic en **`PUBLICAR_REGLAS.cmd`**: copia `database.rules.json` al
  portapapeles y abre la página exacta de reglas de RTDB.
- Pega con `Ctrl+V`, pulsa **Publicar** y espera la confirmación.
- Después ejecuta:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\verificar-reglas.ps1
```

Si imprime `TODO LISTO`, el panel ya puede guardar temas, pedidos y configuración.

### 3.3 Storage — reglas

Firebase Console → Storage → **Get started** (si aún no está activo) → Reglas.

El archivo **`storage.rules`** permite lectura pública y escritura solo a los
correos administradores, con imágenes menores a 5 MB:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null
        && (request.auth.token.email == 'admin@eclipse.tech'
          || request.auth.token.email == 'jjaimej7@gmail.com'
          || request.auth.token.email == 'marisolestradaaguir@gmail.com')
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
    // Fotos +18 subidas desde el checkout anónimo (máx. 3 MB, solo imágenes).
    match /verifications/{verificationId}/{fileName} {
      allow write: if request.resource.size < 3 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
    // Credencial de estudiante: solo el dueño del uid puede subirla.
    match /student-verifications/{uid}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == uid
        && request.resource.size < 3 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
  }
}
```

> El panel sube las imágenes a Storage (`productos/`, `banners/`, `hero/`,
> `noticias/`). La tienda sube las fotos +18 y las credenciales de estudiante.

> **Importante:** después de esta actualización vuelve a publicar **ambos**
> archivos: `database.rules.json` y `storage.rules`. Las reglas anteriores
> todavía no permitían el perfil de estudiante ni su credencial.

---

## 4. Publicar en Hostinger (hPanel)

### 4.1 Tienda (dominio principal)

1. hPanel → **Sitios web** → Administrar → **Archivos** → Administrador de archivos.
2. Entra a `public_html` y borra el `index.html` de ejemplo.
3. Sube el **contenido** de `storefront/dist` (no la carpeta `dist`, sino lo que
   está dentro: `index.html`, `assets/`, `favicon.svg`, `robots.txt`, `.htaccess`).
4. Activa **SSL** (gratis) y fuerza HTTPS.
5. Limpia caché de Hostinger si aplica.

### 4.2 Panel (subdominio)

1. hPanel → **Dominios** → Subdominios → crea `panel.eclipsetech.com`.
2. Sube el contenido de `admin/dist` dentro de la carpeta del subdominio
   (`public_html/panel.eclipsetech.com` o la que asigne hPanel).
3. Activa SSL para el subdominio.

### 4.3 .htaccess

Cada `dist` ya incluye un `.htaccess` (está en `storefront/public` y
`admin/public`) con:

- Fallback a `index.html` para rutas del cliente.
- Caché larga para assets con hash.
- Sin caché para `index.html`.
- Compresión gzip.

Si Hostinger no copia archivos ocultos desde el ZIP, crea el `.htaccess` a mano
con el contenido de esos archivos.

---

## 5. Checklist de salida a producción

- [ ] Email/Password habilitado en Firebase Auth.
- [ ] Dominio y subdominio en Authorized domains.
- [ ] Reglas de RTDB publicadas (`database.rules.json`).
- [ ] Storage activo y reglas publicadas.
- [ ] `npm run build` sin errores.
- [ ] Tienda abre y muestra catálogo, banners y tema activo.
- [ ] Login del panel funciona con un correo autorizado.
- [ ] Dashboard carga rápido (datos desde RTDB).
- [ ] Se activa un tema en el panel y la tienda lo refleja al recargar o volver
      a la pestaña.
- [ ] Se sube imagen en producto/banner/hero/noticia y se ve bien.
- [ ] Sin sesión iniciada, **Finalizar compra** abre Cuenta en vez del checkout.
- [ ] Sin sesión, el header dice **Iniciar sesión** y el carrito muestra
      **Crear cuenta / Iniciar sesión**. Con sesión, el header dice
      **Hola, [nombre]**, aparece **Cerrar sesión** y el carrito ya no muestra
      la opción de crear cuenta.
- [ ] Cada cuenta ve solo sus pedidos en **Mi cuenta** (historial por UID).
- [ ] Botón **Crear combo** (al lado de las categorías y en el hero) abre el
      constructor en pantalla; el cliente arma su combo y lo ve en el carrito.
- [ ] Pedido de prueba creado con cuenta de cliente y visible en Órdenes.
- [ ] Comprobante: botón **Adjuntar PDF y mensaje** abre WhatsApp (en celular
      comparte el PDF directo; en PC adjuntas el archivo desde el clip).
- [ ] Pedido +18: la tienda pide credencial y el panel muestra la foto en
      Órdenes → filtro **+18** → **Verificar +18**.
- [ ] Cupón de prueba aplicado en la tienda.
- [ ] Cuenta de cliente creada con correo y contraseña (mayúscula + símbolo).
- [ ] Estudiante adjunta credencial, aparece en Panel → **Clientes** y se aprueba.
- [ ] Panel → **Clientes** filtra por estudiante / no estudiante y permite ver
      los pedidos y cuentas de cada cliente.
- [ ] Pedido aprobado: en Órdenes → **Cuentas entregadas** se guardan correo,
      contraseña y vigencia; el botón **Enviar por correo** abre el mail al cliente.
- [ ] Descuento de estudiante configurado en Panel → Configuración y el checkout
      muestra el porcentaje solo al estudiante aprobado.
- [ ] Nombre de empresa y logo cambiados desde el panel y reflejados en la tienda.
- [ ] Temas Día de Muertos, Grito y Amor y Amistad probados desde el panel.
- [ ] Botones sociales (Facebook y YouTube con los links reales) y asistente
      (chat) visibles en la tienda.
- [ ] Panel → **Base de datos** muestra las 7 pestañas de nodos legacy y permite
      editarlos sin borrar los existentes.
- [ ] Cliente logueado puede opinar y ve sus códigos/cuentas en **Mi cuenta**.

---

## 6. Notas rápidas

- **Temas**: el panel guarda en RTDB `themes/<clave>` con `isActive: true`.
  La tienda lee ese nodo al cargar y al volver a la pestaña.
- **Pedidos**: la tienda guarda una copia local y espeja el pedido a
  `orders/<id>` en RTDB. El panel lo lee desde ahí. Solo se puede finalizar la
  compra con sesión de cliente activa.
- **Combos**: ya no hay página propia. El botón **Crear combo** abre un modal
  con el constructor; el descuento se calcula en tiempo real y se guarda en el
  carrito/pedido.
- **Comprobantes**: en la confirmación del pedido o en **Mi cuenta** puedes
  adjuntar un PDF y escribir un mensaje. En móvil se usa el compartir nativo
  (WhatsApp recibe el archivo); en escritorio se abre el chat para adjuntarlo.
- **Entrega**: el panel guarda en el pedido `deliveredAccounts` (correo,
  contraseña, vigencia) y `deliveryEmailSent`. El botón de correo arma un
  `mailto:` con esos datos; no se necesita servicio de correo externo.
- **+18**: el checkout sube la foto de credencial a Storage
  (`verifications/`) y guarda la URL en el pedido; si Storage no está
  disponible, adjunta una versión comprimida. El panel la muestra en Órdenes y
  marca la verificación con `adultVerification.verified`.
- **Chat**: es un asistente informativo local (sin costo ni API externa) con
  accesos a WhatsApp, catálogo, pagos y cuenta.
- **Clientes de Authentication**: los usuarios que ya existen en Firebase Auth
  no aparecen solos en el panel, porque **Clientes** lee `usuarios_clientes` en
  RTDB. Para traer los 227 actuales:
  1. Entra a la consola con la cuenta **dueña** de `my-admin-f0d0f`.
  2. En esta carpeta ejecuta `firebase login --reauth` si la CLI muestra otra cuenta.
  3. Doble clic en `IMPORTAR_CLIENTES.cmd` (o
     `powershell -ExecutionPolicy Bypass -File scripts\importar-clientes-auth.ps1`).
  4. El script exporta Auth, lee los perfiles actuales y genera
     `clientes-para-subir.json`. Si aceptas, hace `database:update` a
     `/usuarios_clientes` **sin borrar** aprobaciones de estudiante ni pedidos.
  5. Recarga el panel → **Clientes**. Los nuevos clientes se crean solos al
     iniciar sesión en la tienda; este paso es solo para los históricos.
  > Los archivos `auth-users.json`, `clientes-actuales.json` y
  > `clientes-para-subir.json` contienen correos: están ignorados por Git.
- **Cuentas**: las cuentas de streaming se ven en el detalle del pedido, en
  **Órdenes → Cuentas entregadas** (o desde el modal del cliente en **Clientes**).
  Si tus cuentas antiguas están en otro nodo de RTDB, pásame un ejemplo de ese
  nodo para mapearlo también.
- **Todos los nodos RTDB**: además de catálogo/promociones/themes/pedidos, el
  panel tiene **Base de datos** con pestañas para `Costos`, `clientes` (legacy),
  `codigos_streaming` (y `códigos_streaming`), `estadisticas`, `limites_codigos`,
  `opiniones` y `usuarios` (roles). Los campos se editan como JSON porque esos
  nodos no tenían un esquema definido en el código.
- **Opiniones**: la tienda lee y escribe `opiniones`; solo un usuario autenticado
  puede publicar su estrellas/comentario.
- **Códigos del cliente**: **Mi cuenta** consulta `codigos_streaming`,
  `códigos_streaming`, `cuentas de streaming` y `cuentas`, y filtra por UID o
  correo del usuario.
- **Redes**: Facebook y YouTube ya tienen los links reales en
  `storefront/src/components/Footer.tsx` (`socialLinks`). Falta el de Instagram.

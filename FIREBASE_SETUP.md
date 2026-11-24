# Eclipse Tech — Activación de Firebase (una sola vez)

El código ya está conectado a Firebase. La base de datos activa es **Firebase
Realtime Database (RTDB)** — no Firestore. Para que panel y tienda funcionen sin
Docker/MySQL/.NET solo falta habilitar los servicios en Firebase Console:

Proyecto: **my-admin-f0d0f**

## 1. Realtime Database (obligatorio — fuente de datos principal)

1. Firebase Console → **Realtime Database** → *Crear base de datos*.
2. Ubicación: la que prefieras (la ya configurada en el código es
   `https://my-admin-f0d0f-default-rtdb.firebaseio.com/`).
3. Modo: **Producción**.
4. Pestaña **Rules** → pega el contenido de `database.rules.json` (o el archivo
   que uses) → *Publicar*.

Nodos que consume la app:

| Nodo | Uso |
| --- | --- |
| `catalogo` | Catálogo de productos (lectura pública en tienda, escritura admin) |
| `promociones` | Banners/promociones destacadas (lectura pública en tienda, escritura admin) |
| `combos` | Combos por perfiles (fallback: niveles base en código) |
| `themes` | Temas visuales activos |
| `settings` | Configuración de pago / contenido |
| `coupons` | Cupones de descuento |
| `content/news` | Noticias del sitio |
| `orders` | Pedidos del panel |

## 2. Authentication (obligatorio)

1. Firebase Console → **Authentication** → *Comenzar*.
2. Pestaña **Sign-in method** → habilita **Correo electrónico/contraseña**.
3. Crea el administrador:
   - **Users** → *Add user* → correo y contraseña.
   - Correos autorizados por defecto en `database.rules.json`:
     - `admin@eclipse.tech`
     - `jjaimej7@gmail.com`
     - `marisolestradaaguir@gmail.com`
   - En el login puedes escribir el correo completo o solo `admin`
     (se convierte a `admin@eclipse.tech`).
4. Si el usuario no existe, el primer login con las credenciales definidas en
   código intenta crearlo automáticamente en Firebase Auth.

## 3. Storage (obligatorio para subir imágenes)

1. Firebase Console → **Storage** → *Comenzar*.
2. Pestaña **Rules** → pega el contenido de `storage.rules` → *Publicar*.
3. El panel sube imágenes a las carpetas que configures (p. ej. `site/`) y guarda
   la URL pública en la tienda.

## 4. Realtime Database — ejemplo de lectura del nodo `catalogo`

```ts
import { getDatabase, ref, get } from 'firebase/database'
import { rtdb } from './firebase'

const snapshot = await get(ref(rtdb, 'catalogo'))
const catalogo = snapshot.val() // { <plataforma>: { <plan>: { info: {...}, recursos: {...}, ... } } }

// Lectura pública del catálogo (tienda) y lectura con auth de admin (panel):
const products = await get(ref(rtdb, 'catalogo/<plataforma>/<plan>'))
```

## 5. Ejecutar

```powershell
npm run dev
```

- Tienda: http://localhost:5173
- Panel: http://localhost:5174
- Login: `admin` / `Eclipse2026!` (o tu usuario de Firebase Auth)

## 6. Notas

- **No hace falta crear Firestore** para que el flujo actual funcione: panel y
  tienda leen/escriben en **Realtime Database** (`getDatabase` + `get/ref/set`).
- Si algún día se quiere volver a usar Firestore, el código conserva los
  módulos con fallback (`firestoreApi` / `firestoreStore`).
- Si ves errores de red en `firestore.googleapis.com/.../Listen/channel`,
  revisa que no haya bloqueadores (AdBlock/uBlock) del navegador.

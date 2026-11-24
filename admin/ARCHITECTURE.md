# Eclipse Tech — Arquitectura del panel (Firebase)

Separación estricta entre **autenticación** y **panel**, con Firebase como backend.

## 1. Estructura de carpetas

```
admin/src/
├─ main.tsx                     # Providers globales (Toast + Auth) y montaje
├─ App.tsx                      # Define el árbol de rutas/protección
├─ modules/
│  └─ auth/
│     ├─ index.ts               # API pública del módulo de auth
│     └─ ProtectedRoute.tsx     # Guard de sesión (Firebase Auth)
├─ pages/
│  ├─ LoginPage.tsx             # MÓDULO DE LOGIN (aislado, sin Layout)
│  ├─ DashboardPage.tsx
│  ├─ OrdersPage.tsx
│  ├─ ProductsPage.tsx
│  ├─ BannersPage.tsx
│  └─ …
├─ components/
│  └─ Layout.tsx                # Shell del panel (sidebar, header)
├─ context/
│  ├─ AuthContext.tsx           # Estado de sesión (única fuente: onAuthStateChanged)
│  └─ ToastContext.tsx
└─ lib/
   ├─ firebase.ts               # initializeApp → auth, db, rtdb, storage
   ├─ firebaseAuth.ts           # login/logout/reset/observador + errores legibles
   ├─ upload.ts                 # subida de imágenes a Firebase Storage
   ├─ firestoreApi.ts          # respaldo Firestore (no usado por defecto)
   └─ rtdb.ts                   # cliente principal sobre Realtime Database
   └─ api.ts                    # fachada: RTDB primero, Firestore como fallback
```

Regla de oro: **solo `lib/firebaseAuth.ts` y `context/AuthContext.tsx` conocen Firebase Auth**.
Las páginas nunca llaman a `signInWithEmailAndPassword` directamente; consumen `useAuth()`.

## 2. Rutas

Router por hash (sin dependencia extra):

| Ruta | Acceso | Render |
| --- | --- | --- |
| `#/login` | Público | `LoginPage` (pantalla completa, sin Layout) |
| `#/dashboard` | Protegido | `Layout` + `DashboardPage` |
| `#/orders` | Protegido | `Layout` + `OrdersPage` |
| `#/products` | Protegido | `Layout` + `ProductsPage` |
| `#/banners` | Protegido | `Layout` + `BannersPage` |
| `#/theme`, `#/coupons`, `#/combos`, `#/settings` | Protegido | Páginas del panel |

`App.tsx` envuelve **todo el panel** con `ProtectedRoute`; `LoginPage` queda fuera del panel.

## 3. Protección de sesión

Flujo:

1. `AuthProvider` se suscribe a `onAuthStateChanged(auth)`.
2. Mientras resuelve → pantalla “Verificando sesión…” (`booting`).
3. Sin usuario → `ProtectedRoute` fuerza `#/login` y renderiza solo el login.
4. Con usuario → se renderiza el panel.
5. Logout → `signOutAdmin()` y limpieza de estado; el guard redirige a `#/login`.

```tsx
// modules/auth/ProtectedRoute.tsx (resumen)
if (booting) return <AuthSplash />
if (!user) return <LoginPage />
return <>{children}</>
```

`AuthContext` además normaliza el usuario de Firebase (`uid`, `email`) al tipo `AdminUser`
y guarda el `idToken` para peticiones autenticadas.

## 4. Login aislado

- Pantalla independiente sin `Layout`, sin navegación del panel.
- Soporta **correo completo** (`tu@correo.com`) o **usuario corto** (`admin` →
  `admin@eclipse.tech`, configurable en `ADMIN_EMAIL_DOMAIN`).
- “Mantener sesión” elige `browserLocalPersistence` / `browserSessionPersistence`.
- Recuperación de contraseña con `sendPasswordResetEmail`.
- Errores de Firebase traducidos (`auth/invalid-credential`, `auth/too-many-requests`, etc.).
- **Contingencia local**: si Firebase Auth rechaza las credenciales, se aceptan los accesos
  definidos en código (`CODED_ADMINS`). Elimínalos cuando los usuarios existan en Firebase.

## 5. Firebase Storage

`lib/upload.ts` sube archivos a `banners/`, `products/` y `site/` y devuelve la URL pública
(`getDownloadURL`). Se usa en los formularios de Banners, Productos, Contenido (hero) y Noticias.

Reglas sugeridas:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.resource.size < 5 * 1024 * 1024;
    }
  }
}
```

## 6. Base de datos (Firestore)

Ya migrado a Firestore (ver `firestoreApi.ts`).

| Colección / documento | Uso |
| --- | --- |
| `products` | Catálogo |
| `banners` | Promociones |
| `coupons` | Cupones |
| `combos` | Niveles de descuento |
| `themes` | Presets de tema |
| `settings/main` | Pagos, WhatsApp y soporte |
| `settings/site` | Portada del hero (`heroImageUrl`, `heroTitle`, `heroDescription`) |
| `settings/theme` | Apunta al tema activo (`activeKey`) |
| `news` | Noticias / publicaciones |
| `orders` | Pedidos |

El dashboard calcula estadísticas desde Firestore. La tienda lee Firestore primero y cae a la RTDB.

Reglas sugeridas:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.resource.size < 5 * 1024 * 1024;
    }
  }
}
```

## 7. Navegación y páginas

El sidebar agrupa la operación:

| Grupo | Páginas |
| --- | --- |
| Operación | Dashboard, Órdenes |
| Catálogo | Productos, Banners, Cupones, Combos |
| Apariencia | Temas, Contenido (imágenes y noticias) |
| Configuración | Pagos y contacto |

El punto de entrada de datos es `lib/firestoreApi.ts` (Firestore) y las páginas no conocen el transport.

| Colección | Uso |
| --- | --- |
| `products` | Catálogo |
| `banners` | Promociones |
| `coupons` | Cupones |
| `combos` | Niveles de descuento |
| `themes` | Temas visuales |
| `settings/main` | Pagos, WhatsApp y soporte |
| `orders` | Pedidos (la tienda los crea; el panel los gestiona) |

La fuente principal es Realtime Database (`catalogo`, `promociones`, `orders`,
`settings`…). Firestore solo se conserva como respaldo opcional.

Requisito único: habilitar Realtime Database, Auth y Storage en Firebase y
publicar sus reglas (ver `FIREBASE_SETUP.md`). No requiere Docker, MySQL ni API .NET.


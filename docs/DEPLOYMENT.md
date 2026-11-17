# Despliegue (Firebase)

Guía para publicar Eclipse Tech con Firebase (Firestore + Hosting).

## 1. Requisitos
- Node 20+ y npm 10+.
- Una cuenta de Firebase y un proyecto creado en https://console.firebase.google.com
- Firebase CLI: `npm install -g firebase-tools`

## 2. Variables de entorno
```bash
cp .env.example .env
```
Completa las variables `VITE_FIREBASE_*` con los datos de tu app web (Configuración del proyecto > Tus apps).

## 3. Inicializar Firebase
```bash
firebase login
firebase init hosting
```
Selecciona el proyecto y configura `storefront/dist` como directorio público. Repite para el panel si usas un segundo sitio.

## 4. Construir y desplegar
```bash
npm run build
firebase deploy --only hosting
```

## 5. Firestore
Crea las colecciones: `products`, `themes`, `banners`, `coupons`, `combos`, `settings`, `orders`.
Los servicios de acceso están en `storefront/src/services/firestore.ts`.

## 6. Seguridad
- Configura reglas de Firestore para proteger escrituras del panel (solo admins).
- Usa Firebase Auth para el panel administrativo.
- No commitees `.env`.

## 7. Backend .NET (opcional)
La API .NET sigue disponible como backend propio. Si la mantienes, configura `VITE_API_URL` y despliégala por separado (sin Docker).
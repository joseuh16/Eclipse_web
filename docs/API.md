# Referencia de la API

Base local: `http://localhost:8090/api` · Producción: `https://eclipse.techyuc.com/api` y `https://panel-eclipse.techyuc.com/api` (ambos frontends proxyan al mismo backend).

Los enums se serializan como strings (`Video`, `Pending`, `BBVA`, …). Las fechas son ISO 8601 UTC.

## Autenticación

El panel usa JWT Bearer con rol `Admin`.

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "Eclipse2026!"
}
```

Respuesta:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresAtUtc": "2026-11-13T02:00:00Z",
  "user": { "id": 1, "username": "admin", "role": "Admin", "lastLoginAt": "2026-11-12T18:00:00Z" }
}
```

En las rutas protegidas:

```http
Authorization: Bearer <token>
```

`GET /api/auth/me` valida el token y devuelve el perfil. El token expira según `Jwt:ExpiryMinutes` (480 por defecto).

## Endpoints públicos

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/health` | Estado del servicio y MySQL. `200` ok · `503` degradado. |
| `GET` | `/api/products` | Catálogo activo paginado. |
| `GET` | `/api/products/{id}` | Detalle de un producto activo. |
| `GET` | `/api/theme` | Tema activo + lista de temas. |
| `GET` | `/api/banners/active` | Banners activos y vigentes. |
| `GET` | `/api/combos/active` | Niveles de combo activos. |
| `GET` | `/api/settings` | Datos de pago y contacto. |
| `POST` | `/api/coupons/validate` | Valida un código sin consumirlo. |
| `POST` | `/api/orders` | Crea una orden y devuelve la confirmación. |

### `GET /api/products`

Parámetros opcionales:

| Parámetro | Tipo | Notas |
| --- | --- | --- |
| `category` | enum | `Video`, `IA`, `Edicion`, `Escolar`, `Musica`, `Deportes`, `Lifelong`, `AdultPlus`. |
| `search` | string | Búsqueda por nombre. |
| `minPrice`, `maxPrice` | decimal | Filtran por precio base. |
| `sort` | string | `newest`, `price_asc`, `price_desc`, `name`, `discount`. |
| `featured` | bool | Solo destacados. |
| `includeAdult` | bool | Incluye productos `+18` (default `false`). |
| `page`, `pageSize` | int | `pageSize` máximo 48. Default `1` y `12`. |

Respuesta:

```json
{
  "items": [
    {
      "id": 1,
      "name": "Netflix Premium 4K",
      "category": "Video",
      "basePrice": 199,
      "finalPrice": 159.20,
      "discountPercent": 20,
      "durationMonths": 1,
      "imageUrl": "https://…",
      "isActive": true,
      "isAdultOnly": false,
      "isFeatured": true,
      "createdAt": "2026-11-01T12:00:00Z"
    }
  ],
  "page": 1,
  "pageSize": 12,
  "total": 24,
  "totalPages": 2
}
```

### `POST /api/coupons/validate`

```json
{ "code": "ECLIPSE10" }
```

```json
{
  "valid": true,
  "code": "ECLIPSE10",
  "discountPercent": 10,
  "message": "Cupón aplicado: 10% de descuento."
}
```

Un cupón inválido responde `200` con `valid: false` y un mensaje. Los cupones no se consumen al validar; se incrementa `usedCount` al crear la orden.

### `POST /api/orders`

```json
{
  "customerName": "María López",
  "customerEmail": "maria@example.com",
  "customerPhone": "5512345678",
  "paymentMethod": "BBVA",
  "couponCode": "ECLIPSE10",
  "adultConsent": false,
  "notes": "Entrega por WhatsApp",
  "items": [
    { "productId": 1, "durationMonths": 3, "quantity": 1 },
    { "productIds": [2, 5, 9], "durationMonths": 6, "quantity": 1 }
  ]
}
```

Reglas:

- `items` entre 1 y 20 líneas.
- `durationMonths` solo `1`, `3`, `6` o `12`.
- `quantity` entre `1` y `10`.
- Una línea con `productIds` de 2+ IDs se cotiza como combo.
- Si hay productos `+18`, `adultConsent` debe ser `true`.
- Todos los productos deben existir y estar activos.
- El precio **siempre** se recalcula en el servidor.
- La orden se crea en estado `Pending`.

Respuesta `201`:

```json
{
  "orderId": 42,
  "orderNumber": "ECL-261112-4821",
  "customerName": "María López",
  "subtotal": 1428.30,
  "discountAmount": 142.83,
  "totalAmount": 1285.47,
  "paymentMethod": "BBVA",
  "items": [
    {
      "name": "Combo Eclipse: Netflix + Spotify",
      "category": "Combo",
      "productId": null,
      "productIds": [2, 5],
      "durationMonths": 6,
      "quantity": 1,
      "originalUnitPrice": 900,
      "unitPrice": 810,
      "lineTotal": 810,
      "comboDiscountPercent": 10,
      "imageUrl": "https://…",
      "isAdultOnly": false
    }
  ],
  "settings": { "bankName": "BBVA México", "clabeNumber": "…", "whatsAppNumber": "…" },
  "whatsAppUrl": "https://wa.me/5215512345678?text=…",
  "createdAt": "2026-11-12T18:00:00Z"
}
```

## Endpoints administrativos

Requieren `Authorization: Bearer <token>` con rol `Admin`.

### Dashboard

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/dashboard/stats` | Pendientes, órdenes de hoy, ingresos, serie de 7 días, top productos y órdenes recientes. |

### Productos

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/products/manage?search=&category=` | Lista completa (incluye inactivos y `+18`). |
| `POST` | `/api/products` | Crea un producto. |
| `PUT` | `/api/products/{id}` | Actualiza un producto. |
| `PATCH` | `/api/products/{id}/toggle` | Alterna activo/inactivo. |
| `DELETE` | `/api/products/{id}` | Elimina un producto. |

Payload de creación/edición:

```json
{
  "name": "Adobe Creative Cloud",
  "category": "Edicion",
  "basePrice": 349,
  "discountPercent": 15,
  "durationMonths": 1,
  "imageUrl": "https://…",
  "isActive": true,
  "isAdultOnly": false,
  "isFeatured": true
}
```

`durationMonths` debe ser `1`, `3`, `6` o `12`. `isAdultOnly` solo se permite con categoría `AdultPlus`; en esa categoría se fuerza a `true`.

### Temas

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/theme` | Público. |
| `PUT` | `/api/theme` | Guarda y activa un tema por `themeKey`. |
| `PUT` | `/api/theme/{themeKey}/activate` | Activa un tema existente. |

```json
{
  "themeKey": "halloween",
  "primaryColor": "#F97316",
  "secondaryColor": "#A855F7",
  "accentColor": "#FACC15",
  "backgroundColor": "#0B0710",
  "fontStyle": "Outfit",
  "customCss": ".hero-title { text-shadow: 0 0 30px #f97316; }"
}
```

Colores en hexadecimal (`#RGB` o `#RRGGBB`).

### Banners

| Método | Ruta |
| --- | --- |
| `GET` | `/api/banners` |
| `POST` | `/api/banners` |
| `PUT` | `/api/banners/{id}` |
| `PATCH` | `/api/banners/{id}/toggle` |
| `DELETE` | `/api/banners/{id}` |

```json
{
  "title": "Black Friday Eclipse",
  "description": "Hasta 35% en licencias premium.",
  "discountText": "35% OFF",
  "expiryDate": "2026-11-30T23:59:59Z",
  "isActive": true,
  "imageUrl": "https://…",
  "ctaText": "Ver ofertas",
  "ctaUrl": "#catalogo",
  "sortOrder": 0
}
```

### Cupones

| Método | Ruta |
| --- | --- |
| `GET` | `/api/coupons` |
| `POST` | `/api/coupons` |
| `PUT` | `/api/coupons/{id}` |
| `PATCH` | `/api/coupons/{id}/toggle` |
| `DELETE` | `/api/coupons/{id}` |

```json
{
  "code": "ECLIPSE10",
  "discountPercent": 10,
  "maxUses": 100,
  "expiryDate": "2026-12-31T23:59:59Z",
  "isActive": true
}
```

El código se normaliza a mayúsculas. No se permiten códigos duplicados.

### Combos

| Método | Ruta |
| --- | --- |
| `GET` | `/api/combos` |
| `POST` | `/api/combos` |
| `PUT` | `/api/combos/{id}` |
| `PATCH` | `/api/combos/{id}/toggle` |
| `DELETE` | `/api/combos/{id}` |

```json
{
  "name": "Combo 4 perfiles",
  "description": "El máximo ahorro para tu hogar.",
  "minProfiles": 4,
  "discountPercent": 15,
  "isActive": true
}
```

`minProfiles` entre 2 y 10 y único por nivel. Se aplica el nivel con mayor `minProfiles` que cumpla la cantidad de perfiles.

### Órdenes

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/orders?status=&search=&from=&to=&page=&pageSize=` | Lista paginada. |
| `GET` | `/api/orders/{id}` | Detalle. |
| `PUT` | `/api/orders/{id}/status` | Cambia el estado. |

```json
{ "status": "Verified" }
```

Estados: `Pending`, `Verified`, `Cancelled`. Al pasar a `Verified` se guarda `verifiedAt`; cualquier otro estado lo limpia.

### Configuración

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/settings` | Público (lo usa el checkout). |
| `PUT` | `/api/settings` | Actualiza datos de pago y contacto. |

```json
{
  "bankName": "BBVA México",
  "beneficiary": "Eclipse Digital MX",
  "clabeNumber": "012180015478965432",
  "mercadoPagoClabe": "722969010123456789",
  "oxxoReference": "ECLIPSE-4821",
  "whatsAppNumber": "5215512345678",
  "supportEmail": "soporte@techyuc.com",
  "paymentNote": "Envía tu comprobante por WhatsApp."
}
```

## Reglas de precios

Multiplicadores por duración (compartidos entre backend y storefront):

| Meses | Multiplicador | Ahorro vs. mensual |
| --- | --- | --- |
| 1 | `1.00` | — |
| 3 | `2.70` | 10% |
| 6 | `5.10` | 15% |
| 12 | `9.60` | 20% |

Fórmula por producto:

```text
precioUnitario = round2(basePrice × multiplicador × (1 − discountPercent / 100))
```

Combo:

```text
original = Σ precioUnitario(perfil)
descuentoCombo = nivel activo con mayor minProfiles ≤ número de perfiles
totalCombo = round2(original × (1 − descuentoCombo / 100)) × cantidad
```

Cupón: se aplica sobre el subtotal ya con descuentos de producto/combo.

## Errores y límites

Errores de negocio y validación usan `application/problem+json`:

```json
{
  "status": 400,
  "title": "Solicitud inválida",
  "detail": "La duración debe ser de 1, 3, 6 o 12 meses.",
  "instance": "/api/orders",
  "traceId": "0HN…"
}
```

Validaciones de modelo devuelven `400` con `errors` por campo.

Rate limiting por IP:

| Política | Límite | Rutas |
| --- | --- | --- |
| `auth` | 8/min | `POST /api/auth/login` |
| `public` | 120/min | `POST /api/orders`, `POST /api/coupons/validate` |

Al excederse responde `429` con un problem details.

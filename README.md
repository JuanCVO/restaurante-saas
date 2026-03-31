# 🍽️ RestaurantOS — SaaS de Gestión para Restaurantes

> Sistema completo de gestión para restaurantes: mesas, pedidos, inventario, cierre de caja y reportes en PDF.

***

## 📋 Descripción

**RestaurantOS** es una aplicación web SaaS diseñada para simplificar la operación diaria de restaurantes. Permite gestionar mesas en tiempo real, registrar pedidos por mesa, controlar el inventario de productos, hacer cierres de caja diarios y descargar reportes en PDF semanales o mensuales.

***

## 🚀 Funcionalidades

- **Autenticación** — Login seguro con JWT, roles ADMIN y EMPLOYEE
- **Mesas** — Estado en tiempo real (Disponible / Ocupada), creación y eliminación
- **Pedidos** — Drawer lateral por mesa, agregar/eliminar productos, cierre de cuenta con método de pago
- **Inventario** — Control de stock por producto, alerta de stock mínimo, descuento automático al vender
- **Menú** — Gestión de categorías y productos con precio y unidad
- **Dashboard** — Estadísticas del día: ingresos, pedidos, platos vendidos, mesas activas
- **Historial de ventas** — Órdenes cerradas del día en curso
- **Cierre de día** — Guarda resumen diario en la base de datos y archiva las órdenes
- **Reporte PDF** — Descarga reporte con resumen general y detalle por día

***

## 🛠️ Stack Tecnológico

### Backend
| Tecnología | Uso |
|---|---|
| Node.js + Express | Servidor REST API |
| TypeScript | Tipado estático |
| Prisma ORM | Acceso a base de datos |
| PostgreSQL (NeonDB) | Base de datos en la nube |
| JWT | Autenticación |
| PDFKit | Generación de reportes PDF |

### Frontend
| Tecnología | Uso |
|---|---|
| Next.js 15 | Framework React |
| TypeScript | Tipado estático |
| Tailwind CSS | Estilos |
| shadcn/ui | Componentes UI |
| Axios | Cliente HTTP |

***

## 📁 Estructura del Proyecto

```
restaurante-saas/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── order.controller.ts
│   │   │   ├── product.controller.ts
│   │   │   ├── table.controller.ts
│   │   │   ├── category.controller.ts
│   │   │   ├── dailySummary.controller.ts
│   │   │   └── pdf.controller.ts
│   │   ├── routes/
│   │   ├── middlewares/
│   │   ├── lib/
│   │   └── index.ts
│   ├── .env
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── (auth)/login/
    │   │   └── (dashboard)/
    │   │       ├── dashboard/
    │   │       ├── tables/
    │   │       ├── inventory/
    │   │       └── layout.tsx
    │   ├── components/ui/
    │   └── lib/
    ├── .env.local
    └── package.json
```

***

## ⚙️ Instalación Local

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/restaurante-saas.git
cd restaurante-saas
```

***
## 🗃️ Modelos de Base de Datos

```
Restaurant → User, Category, Product, Order, Table, DailySummary
Order → OrderItem → Product
Table → Order
DailySummary (resumen por día al hacer cierre de caja)
```

### Estados de Orden

| Estado | Descripción |
|---|---|
| `ABIERTA` | Orden activa en mesa |
| `CERRADA` | Cuenta pagada, visible en historial del día |
| `CANCELADA` | Orden cancelada |
| `ARCHIVADA` | Archivada tras cierre de día, no aparece en historial |

***

## 🔄 Flujo de Cierre de Caja

```
1. Mesero agrega productos a la orden por mesa
2. Al pagar → orden pasa a CERRADA
3. Jefe da "Cerrar día" → resumen guardado en DailySummary
                        → órdenes pasan a ARCHIVADA
                        → historial queda limpio
4. Jefe descarga PDF → reporte con todos los días guardados
```

***


## 👨‍💻 Autor

Desarrollado con ❤️ para la gestión eficiente de restaurantes.
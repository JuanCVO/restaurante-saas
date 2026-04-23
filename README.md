# RestaurantOS

Sistema SaaS de gestión operativa para restaurantes. Cubre el ciclo completo de trabajo: apertura de caja, atención de mesas, registro de pedidos, control de inventario, compras y gastos, cierre de caja y exportación de reportes en PDF.

---

## Funcionalidades

**Autenticación y roles**
- Login con JWT y dos niveles de acceso: ADMIN y EMPLOYEE
- Rutas protegidas por rol en frontend y backend
- Gestión de empleados desde el panel de administración

**Mesas y pedidos**
- Vista de mesas con estado en tiempo real (Disponible / Ocupada)
- Drawer lateral por mesa para agregar y eliminar productos
- Cierre de cuenta con selección de método de pago (Efectivo, Datáfono, Nequi) y propina

**Inventario y menú**
- Gestión de categorías y productos con precio y unidad de medida
- Control de stock con alerta de stock mínimo
- Descuento automático de inventario al registrar una venta

**Compras y gastos**
- Registro de base de caja al inicio del día
- Compras de insumos (informativo, no afectan el ingreso neto)
- Gastos operativos (se restan del ingreso neto al cerrar el día)
- Historial de movimientos con eliminación individual

**Dashboard y reportes**
- Estadísticas del día: ingresos, pedidos, platos vendidos, propinas
- Gráfico de ventas por día (semana o mes)
- Historial de cierres con detalle de gastos e ingresos netos
- Exportación en PDF: cierre del día actual y reporte semanal

**Cierre de día**
- Genera resumen diario en base de datos
- Archiva las órdenes cerradas
- Reinicia los movimientos de caja para el día siguiente

---

## Stack tecnológico

### Backend

| Tecnología | Uso |
|---|---|
| Node.js + Express | Servidor REST API |
| TypeScript | Tipado estático |
| Prisma ORM | Acceso a base de datos |
| PostgreSQL (NeonDB) | Base de datos en la nube |
| JWT | Autenticación y autorización |
| PDFKit | Generación de reportes PDF |

### Frontend

| Tecnología | Uso |
|---|---|
| Next.js 15 | Framework React con App Router |
| TypeScript | Tipado estático |
| Tailwind CSS | Estilos utilitarios |
| shadcn/ui | Componentes de interfaz |
| Axios | Cliente HTTP |

---

## Estructura del proyecto

```
restaurante-saas/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── src/
│       ├── controllers/
│       │   ├── auth.controller.ts
│       │   ├── order.controller.ts
│       │   ├── product.controller.ts
│       │   ├── table.controller.ts
│       │   ├── category.controller.ts
│       │   ├── cashMovement.controller.ts
│       │   ├── dailySummary.controller.ts
│       │   └── pdf.controller.ts
│       ├── routes/
│       ├── middlewares/
│       └── index.ts
│
└── frontend/
    └── src/
        └── app/
            ├── (auth)/login/
            └── (dashboard)/
                ├── dashboard/
                ├── tables/
                ├── inventory/
                ├── purchases/
                └── employees/
```

---

## Instalación local

### Requisitos

- Node.js 18+
- PostgreSQL o conexión a NeonDB

---

## Modelos de base de datos

```
Restaurant → User, Category, Product, Order, Table, DailySummary, CashMovement
Order      → OrderItem → Product
Table      → Order
DailySummary   (resumen por día al hacer cierre de caja)
CashMovement   (base de caja, compras y gastos operativos del día)
```

### Estados de orden

| Estado | Descripción |
|---|---|
| `ABIERTA` | Orden activa en mesa |
| `CERRADA` | Cuenta pagada, visible en historial del día |
| `CANCELADA` | Orden cancelada |
| `ARCHIVADA` | Archivada tras cierre de día |

### Tipos de movimiento de caja

| Tipo | Descripción |
|---|---|
| `BASE_CAJA` | Dinero inicial en caja para dar vueltas |
| `COMPRA` | Compra de insumos (informativo) |
| `GASTO` | Gasto operativo (se resta del ingreso neto) |

---

## Flujo de cierre de caja

```
1. Apertura del día
   - Se registra la base de caja (dinero inicial)
   - Se registran compras y gastos durante el día

2. Atención de mesas
   - Se abren órdenes por mesa y se agregan productos
   - Al pagar, la orden pasa a estado CERRADA

3. Cierre de día (ADMIN)
   - Se calcula el ingreso neto: ventas + base de caja - gastos operativos
   - Se guarda el resumen en DailySummary
   - Las órdenes pasan a estado ARCHIVADA
   - Los movimientos de caja se eliminan para comenzar el día siguiente en cero

4. Exportación
   - PDF del día: resumen de ventas, gastos e ingreso neto
   - PDF semanal: resumen general y detalle por día
```

---


## Autor

Desarrollado por [@JuanCVO](https://github.com/JuanCVO).

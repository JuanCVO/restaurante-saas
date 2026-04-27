<div align="center">

# RestaurantOS

**Sistema de gestión SaaS para restaurantes**

Plataforma multi-tenant que centraliza operaciones de mesa, inventario, caja, empleados y reportes en una sola aplicación.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![Express](https://img.shields.io/badge/Express-5-000000?style=flat-square&logo=express)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=flat-square&logo=postgresql)

</div>

---

## Qué es RestaurantOS

RestaurantOS es una aplicación web de gestión completa para restaurantes. Un administrador registra su restaurante, crea empleados, y desde ese momento tiene control total sobre:

- El estado de sus mesas y órdenes en tiempo real
- El inventario de productos con alertas de stock mínimo
- El registro de compras, gastos y movimientos de caja
- El pago de nómina y propinas a empleados
- El cierre de caja diario con reporte descargable en PDF

Cada restaurante opera de forma completamente aislada (multi-tenant). Un empleado solo puede ver y gestionar mesas; el administrador tiene acceso completo.

---

## Stack

| Capa | Tecnología |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript 5 |
| **Estilos** | Tailwind CSS 4, shadcn/ui, Lucide React |
| **Estado / Forms** | Zustand, React Hook Form, Zod |
| **Gráficas** | Recharts |
| **HTTP Client** | Axios |
| **Backend** | Node.js, Express 5, TypeScript 6 |
| **ORM** | Prisma 5 con PostgreSQL (Neon serverless) |
| **Auth** | JWT (8h), bcryptjs (cost 12) |
| **Seguridad** | Helmet, CORS allowlist, Zod schema validation |
| **PDF** | pdfkit |

---

## Funcionalidades

### Para el administrador (ADMIN)

| Módulo | Qué permite |
|---|---|
| **Dashboard** | Métricas del día: ingresos, órdenes, platos, gráficas por método de pago |
| **Mesas** | Crear y configurar mesas, ver estado (disponible / ocupada) |
| **Inventario** | Gestionar productos y categorías, ver alertas de stock bajo |
| **Compras y Gastos** | Registrar compras, gastos y base de caja con método de pago |
| **Empleados** | Crear cuentas de empleados, registrar salario y propinas |
| **Resumen Diario** | Cierre de caja con totales consolidados |
| **PDF** | Descargar reporte del período seleccionado |

### Para el empleado (EMPLOYEE)

| Módulo | Qué permite |
|---|---|
| **Mesas** | Ver mesas disponibles y ocupadas |
| **Órdenes** | Crear orden en una mesa, agregar productos, registrar método de pago y propina, cerrar orden |

---

## Arquitectura

```
restaurante-saas/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma           # 10 modelos, índices de rendimiento
│   │   └── migrations/
│   └── src/
│       ├── controllers/            # auth, products, categories, tables,
│       │                           # orders, cashMovements, employeePayments,
│       │                           # dailySummary, pdf
│       ├── routes/                 # REST endpoints por recurso
│       ├── middlewares/
│       │   ├── auth.middleware.ts  # JWT verify + adminOnly (DB fresh check)
│       │   ├── tenant.middleware.ts
│       │   └── error.middleware.ts # Error handler centralizado
│       ├── services/
│       │   └── dailyClose.service.ts
│       └── lib/
│           ├── prisma.ts           # Prisma client singleton
│           ├── env.ts              # Variables de entorno validadas
│           ├── errors.ts           # BusinessError tipado
│           ├── validators.ts       # Schemas Zod
│           └── asyncHandler.ts     # Wrapper try/catch para controllers
└── frontend/
    └── src/
        ├── app/
        │   ├── (auth)/login/       # Página pública de login
        │   └── (dashboard)/        # Rutas protegidas
        │       ├── dashboard/
        │       ├── tables/
        │       ├── inventory/
        │       ├── purchases/
        │       ├── employees/
        │       └── layout.tsx      # Sidebar + auth guard
        ├── components/ui/
        │   └── layout/Sidebar.tsx  # Navegación principal responsiva
        ├── lib/
        │   ├── axios.ts            # Instancia con interceptor JWT
        │   └── auth.ts             # setSession / getSession / clearSession
        └── types/
```

### Modelo de datos

```
Restaurant
  ├── User (ADMIN | EMPLOYEE)
  ├── Category → Product
  ├── Table → Order → OrderItem → Product
  ├── CashMovement  (COMPRA | GASTO | BASE_CAJA)
  ├── EmployeePayment
  └── DailySummary
```

### Multi-tenancy y seguridad

- Cada request autenticado lleva `restaurantId` en el JWT
- `adminOnly` middleware hace un query fresco a la DB en cada request de admin (evita escalada de privilegios con tokens viejos)
- Todos los recursos se filtran por `restaurantId` — ningún tenant puede ver datos de otro
- CORS con allowlist explícita (`localhost:3000` + dominio de producción en Vercel)
- Body limit de 100kb para prevenir payload abuse

---

### 2. Instalación

```bash
# Backend
cd backend
npm install
npx prisma migrate dev    # Crea las tablas en la DB
npm run dev               # Inicia en http://localhost:4000

# Frontend — en otra terminal
cd frontend
npm install
npm run dev               # Inicia en http://localhost:3000
```

### 3. Primer uso

1. Crear el primer restaurante + admin vía `POST /api/auth/register`
2. Iniciar sesión en `http://localhost:3000/login`
3. El admin puede crear empleados desde el módulo de Empleados


---
## Despliegue en producción

| Servicio | Plataforma recomendada |
|---|---|
| **Frontend** | [Vercel](https://vercel.com) — deploy automático desde Git |
| **Backend** | [Railway](https://railway.app) o [Render](https://render.com) |
| **Base de datos** | [Neon](https://neon.tech) — PostgreSQL serverless, free tier disponible |

El build del backend ejecuta `prisma migrate deploy` automáticamente antes de iniciar (`npm start`).

---
## Autor

Desarrollado por [@JuanCVO](https://github.com/JuanCVO).




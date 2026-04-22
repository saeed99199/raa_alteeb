# RAA AL-TEEB — Multi-Branch Business Management Platform

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│   React 18 SPA  │  Mobile Browser  │  POS Terminal Browser     │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS / REST API
┌────────────────────────────▼────────────────────────────────────┐
│                      API GATEWAY (Laravel)                      │
│   Sanctum Auth  │  RBAC Middleware  │  Rate Limiting            │
└────┬──────────┬──────────┬──────────┬──────────┬───────────────┘
     │          │          │          │          │
┌────▼──┐ ┌────▼──┐ ┌─────▼──┐ ┌────▼──┐ ┌────▼────┐
│Inventory│ │ Sales │ │  HR    │ │Reports│ │  Auth   │
│Module  │ │Module │ │Module  │ │Module │ │Module   │
└────┬──┘ └────┬──┘ └─────┬──┘ └────┬──┘ └────┬────┘
     └─────────┴──────────┴─────────┴──────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                      MySQL Database                             │
│  [branches] [users] [products] [sales] [employees] [payroll]   │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Backend     | Laravel 11 (PHP 8.3)              |
| Frontend    | React 18 + TypeScript + Vite      |
| UI Library  | Ant Design 5 + Tailwind CSS       |
| Database    | MySQL 8.0                         |
| Auth        | Laravel Sanctum (token-based)     |
| PDF         | DomPDF (backend) + jsPDF (client) |
| Charts      | Recharts                          |
| State       | Zustand + React Query             |
| i18n        | react-i18next (AR + EN)           |
| Deployment  | Shared Hosting (cPanel/GoDaddy)   |

## Module Breakdown

### 1. Auth & RBAC
- Roles: `super_admin`, `admin`, `branch_manager`, `cashier`, `hr_manager`, `employee`
- Permissions per module, per branch

### 2. Branch Management
- Unlimited branches
- Each branch: inventory, staff, sales, config

### 3. Inventory
- Products, categories, suppliers
- Stock per branch
- Purchase orders, stock transfers, barcode

### 4. Sales (POS)
- Fast POS checkout
- Invoice PDF generation
- Multi-payment, discounts, taxes
- Refunds & returns

### 5. HR
- Employee profiles, departments
- Attendance (clock in/out)
- Payroll computation
- Leave requests & approvals

### 6. Reports & Analytics
- Per-branch & global dashboards
- PDF & Excel exports

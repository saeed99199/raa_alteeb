# API Endpoints Reference

Base URL: `https://yourdomain.com/api`
Auth: `Authorization: Bearer {token}`

---

## Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login → returns token + user |
| POST | `/auth/logout` | Revoke current token |
| GET  | `/auth/me` | Get authenticated user |
| POST | `/auth/change-password` | Change password |

---

## Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Summary stats + charts |

---

## Inventory — Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/inventory/products` | List (paginated, search, filter) |
| POST   | `/inventory/products` | Create product |
| GET    | `/inventory/products/{id}` | Show product |
| PUT    | `/inventory/products/{id}` | Update product |
| DELETE | `/inventory/products/{id}` | Soft delete |
| GET    | `/inventory/products/barcode/{barcode}` | Lookup by barcode |
| GET    | `/inventory/products/low-stock` | Low stock items |
| POST   | `/inventory/products/{id}/adjust-stock` | Manual stock adjustment |

**Query params:** `search`, `category_id`, `is_active`, `branch_id`, `page`, `per_page`

---

## Inventory — Categories & Suppliers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/inventory/categories` | List/Create |
| GET/PUT/DELETE | `/inventory/categories/{id}` | Show/Update/Delete |
| GET/POST | `/inventory/suppliers` | List/Create |
| GET/PUT/DELETE | `/inventory/suppliers/{id}` | Show/Update/Delete |

---

## Inventory — Purchase Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/inventory/purchase-orders` | List/Create |
| GET/PUT/DELETE | `/inventory/purchase-orders/{id}` | Show/Update/Delete |
| POST | `/inventory/purchase-orders/{id}/receive` | Mark items received |

---

## Inventory — Stock Transfers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/inventory/stock-transfers` | List/Create |
| POST | `/inventory/stock-transfers/{id}/approve` | Approve transfer |
| POST | `/inventory/stock-transfers/{id}/complete` | Complete transfer |

---

## Sales

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/sales/` | List sales |
| POST   | `/sales/` | Create sale (POS checkout) |
| GET    | `/sales/{id}` | Show sale |
| GET    | `/sales/{id}/invoice` | Download invoice PDF |
| GET    | `/sales/daily-summary` | Day summary stats |

**Request body for POST `/sales/`:**
```json
{
  "branch_id": 1,
  "customer_id": null,
  "items": [
    { "product_id": 1, "quantity": 2, "unit_price": 10.00, "discount_percent": 0, "tax_rate": 15 }
  ],
  "payments": [
    { "method": "cash", "amount": 23.00 }
  ],
  "notes": ""
}
```

---

## Customers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/customers` | List/Create |
| GET/PUT/DELETE | `/customers/{id}` | Show/Update/Delete |

---

## Refunds

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/refunds` | Process refund |
| GET  | `/refunds` | List refunds |

---

## HR — Employees

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/hr/employees` | List/Create |
| GET/PUT/DELETE | `/hr/employees/{id}` | Show/Update/Delete |

---

## HR — Attendance

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/hr/attendance` | List records |
| POST | `/hr/attendance/check-in` | Employee check-in |
| POST | `/hr/attendance/check-out` | Employee check-out |
| POST | `/hr/attendance` | Manual attendance entry |
| GET  | `/hr/attendance/{employee}/monthly` | Monthly summary |

---

## HR — Leaves

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/hr/leaves` | List/Create |
| GET | `/hr/leaves/{id}` | Show |
| POST | `/hr/leaves/{id}/approve` | Approve |
| POST | `/hr/leaves/{id}/reject` | Reject |

---

## HR — Payroll

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/hr/payroll` | List payrolls |
| POST | `/hr/payroll/generate` | Generate for month |
| POST | `/hr/payroll/{id}/approve` | Approve |
| POST | `/hr/payroll/{id}/mark-paid` | Mark paid |

---

## Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reports/sales-summary` | Sales by period |
| GET | `/reports/inventory-valuation` | Stock valuation |
| GET | `/reports/top-products` | Best sellers |
| GET | `/reports/hr-summary` | HR monthly summary |
| GET | `/reports/export/sales-excel` | Download Excel file |

---

## Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/branches` | List/Create branches |
| GET/PUT/DELETE | `/branches/{id}` | Manage branch |
| GET/POST | `/users` | List/Create users |
| GET/PUT/DELETE | `/users/{id}` | Manage user |

---

## Response Format

```json
{
  "data": [],
  "current_page": 1,
  "last_page": 5,
  "per_page": 20,
  "total": 100
}
```

## Error Format

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "email": ["The email field is required."]
  }
}
```

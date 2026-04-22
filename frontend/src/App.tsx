import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import AppLayout from '@/components/layout/AppLayout';
import LoginPage from '@/pages/auth/LoginPage';
import AccountSettingsPage from '@/pages/auth/AccountSettingsPage';
import DashboardPage from '@/pages/DashboardPage';
import KanbanPage from '@/pages/KanbanPage';
import ProductsPage from '@/pages/inventory/ProductsPage';
import CategoriesPage from '@/pages/inventory/CategoriesPage';
import SuppliersPage from '@/pages/inventory/SuppliersPage';
import PurchaseOrdersPage from '@/pages/inventory/PurchaseOrdersPage';
import StockTransfersPage from '@/pages/inventory/StockTransfersPage';
import POSPage from '@/pages/sales/POSPage';
import SalesListPage from '@/pages/sales/SalesListPage';
import RefundsPage from '@/pages/sales/RefundsPage';
import CustomersPage from '@/pages/sales/CustomersPage';
import OffersPage from '@/pages/sales/OffersPage';
import EmployeesPage from '@/pages/hr/EmployeesPage';
import AttendancePage from '@/pages/hr/AttendancePage';
import PayrollPage from '@/pages/hr/PayrollPage';
import LeavesPage from '@/pages/hr/LeavesPage';
import TasksPage from '@/pages/hr/TasksPage';
import ReportsSalesPage from '@/pages/reports/ReportsSalesPage';
import ReportsInventoryPage from '@/pages/reports/ReportsInventoryPage';
import ReportsHRPage from '@/pages/reports/ReportsHRPage';
import BranchesPage from '@/pages/admin/BranchesPage';
import UsersPage from '@/pages/admin/UsersPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="kanban" element={<KanbanPage />} />
        <Route path="account/settings" element={<AccountSettingsPage />} />

        {/* Inventory */}
        <Route path="inventory/products" element={<ProductsPage />} />
        <Route path="inventory/categories" element={<CategoriesPage />} />
        <Route path="inventory/suppliers" element={<SuppliersPage />} />
        <Route path="inventory/purchase-orders" element={<PurchaseOrdersPage />} />
        <Route path="inventory/stock-transfers" element={<StockTransfersPage />} />

        {/* Sales */}
        <Route path="sales/pos" element={<POSPage />} />
        <Route path="sales/list" element={<SalesListPage />} />
        <Route path="sales/refunds" element={<RefundsPage />} />
        <Route path="sales/customers" element={<CustomersPage />} />
        <Route path="sales/offers" element={<OffersPage />} />

        {/* HR */}
        <Route path="hr/employees" element={<EmployeesPage />} />
        <Route path="hr/attendance" element={<AttendancePage />} />
        <Route path="hr/payroll" element={<PayrollPage />} />
        <Route path="hr/leaves" element={<LeavesPage />} />
        <Route path="hr/tasks" element={<TasksPage />} />

        {/* Reports */}
        <Route path="reports/sales" element={<ReportsSalesPage />} />
        <Route path="reports/inventory" element={<ReportsInventoryPage />} />
        <Route path="reports/hr" element={<ReportsHRPage />} />

        {/* Admin */}
        <Route path="admin/branches" element={<BranchesPage />} />
        <Route path="admin/users" element={<UsersPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\BranchController;
use App\Http\Controllers\API\CategoryController;
use App\Http\Controllers\API\SupplierController;
use App\Http\Controllers\API\ProductController;
use App\Http\Controllers\API\PurchaseOrderController;
use App\Http\Controllers\API\StockTransferController;
use App\Http\Controllers\API\SaleController;
use App\Http\Controllers\API\RefundController;
use App\Http\Controllers\API\CustomerController;
use App\Http\Controllers\API\EmployeeController;
use App\Http\Controllers\API\DepartmentController;
use App\Http\Controllers\API\AttendanceController;
use App\Http\Controllers\API\LeaveController;
use App\Http\Controllers\API\PayrollController;
use App\Http\Controllers\API\ReportController;
use App\Http\Controllers\API\UserController;
use App\Http\Controllers\API\NotificationController;
use App\Http\Controllers\API\DashboardController;

/*
|--------------------------------------------------------------------------
| Public routes
|--------------------------------------------------------------------------
*/
Route::post('/auth/login', [AuthController::class, 'login']);

/*
|--------------------------------------------------------------------------
| Authenticated routes
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'active.user'])->group(function () {

    // Auth
    Route::prefix('auth')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
        Route::post('change-password', [AuthController::class, 'changePassword']);
    });

    // Dashboard
    Route::get('dashboard', [DashboardController::class, 'index']);

    // Notifications
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::post('{id}/read', [NotificationController::class, 'markRead']);
        Route::post('read-all', [NotificationController::class, 'markAllRead']);
    });

    /*-----------------------------------------------------------------
    | Branch Management  (super_admin only)
    |-----------------------------------------------------------------*/
    Route::apiResource('branches', BranchController::class);

    /*-----------------------------------------------------------------
    | User Management
    |-----------------------------------------------------------------*/
    Route::apiResource('users', UserController::class);

    /*-----------------------------------------------------------------
    | Inventory
    |-----------------------------------------------------------------*/
    Route::prefix('inventory')->group(function () {
        // Categories
        Route::apiResource('categories', CategoryController::class);

        // Suppliers
        Route::apiResource('suppliers', SupplierController::class);

        // Products
        Route::get('products/low-stock', [ProductController::class, 'lowStock']);
        Route::get('products/barcode/{barcode}', [ProductController::class, 'findByBarcode']);
        Route::post('products/{product}/adjust-stock', [ProductController::class, 'adjustStock']);
        Route::apiResource('products', ProductController::class);

        // Purchase Orders
        Route::post('purchase-orders/{po}/receive', [PurchaseOrderController::class, 'receive']);
        Route::apiResource('purchase-orders', PurchaseOrderController::class);

        // Stock Transfers
        Route::post('stock-transfers/{transfer}/approve', [StockTransferController::class, 'approve']);
        Route::post('stock-transfers/{transfer}/complete', [StockTransferController::class, 'complete']);
        Route::apiResource('stock-transfers', StockTransferController::class);
    });

    /*-----------------------------------------------------------------
    | Sales / POS
    |-----------------------------------------------------------------*/
    Route::prefix('sales')->group(function () {
        Route::get('daily-summary', [SaleController::class, 'dailySummary']);
        Route::get('{sale}/invoice', [SaleController::class, 'downloadInvoice']);
        Route::apiResource('/', SaleController::class)->parameters(['' => 'sale']);
    });

    Route::apiResource('customers', CustomerController::class);

    Route::post('refunds', [RefundController::class, 'store']);
    Route::get('refunds', [RefundController::class, 'index']);

    /*-----------------------------------------------------------------
    | HR
    |-----------------------------------------------------------------*/
    Route::prefix('hr')->group(function () {
        // Departments
        Route::apiResource('departments', DepartmentController::class);

        // Employees
        Route::apiResource('employees', EmployeeController::class);

        // Attendance
        Route::get('attendance', [AttendanceController::class, 'index']);
        Route::post('attendance/check-in', [AttendanceController::class, 'checkIn']);
        Route::post('attendance/check-out', [AttendanceController::class, 'checkOut']);
        Route::post('attendance', [AttendanceController::class, 'store']);
        Route::get('attendance/{employee}/monthly', [AttendanceController::class, 'monthlySummary']);

        // Leaves
        Route::apiResource('leaves', LeaveController::class);
        Route::post('leaves/{leave}/approve', [LeaveController::class, 'approve']);
        Route::post('leaves/{leave}/reject', [LeaveController::class, 'reject']);

        // Payroll
        Route::get('payroll', [PayrollController::class, 'index']);
        Route::post('payroll/generate', [PayrollController::class, 'generate']);
        Route::post('payroll/{payroll}/approve', [PayrollController::class, 'approve']);
        Route::post('payroll/{payroll}/mark-paid', [PayrollController::class, 'markPaid']);
    });

    /*-----------------------------------------------------------------
    | Reports
    |-----------------------------------------------------------------*/
    Route::prefix('reports')->group(function () {
        Route::get('sales-summary', [ReportController::class, 'salesSummary']);
        Route::get('inventory-valuation', [ReportController::class, 'inventoryValuation']);
        Route::get('top-products', [ReportController::class, 'topProducts']);
        Route::get('hr-summary', [ReportController::class, 'hrSummary']);
        Route::get('export/sales-excel', [ReportController::class, 'exportSalesExcel']);
    });
});

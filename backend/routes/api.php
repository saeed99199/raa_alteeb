<?php

use App\Http\Controllers\API\AttendanceController;
use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\BranchController;
use App\Http\Controllers\API\NotificationController;
use App\Http\Controllers\API\LeaveController;
use App\Http\Controllers\API\UserAdminController;
use App\Http\Controllers\API\CategoryController;
use App\Http\Controllers\API\CustomerController;
use App\Http\Controllers\API\DashboardController;
use App\Http\Controllers\API\EmployeeController;
use App\Http\Controllers\API\EmployeeTaskController;
use App\Http\Controllers\API\MetaController;
use App\Http\Controllers\API\PayrollController;
use App\Http\Controllers\API\ProductController;
use App\Http\Controllers\API\PurchaseOrderController;
use App\Http\Controllers\API\RefundController;
use App\Http\Controllers\API\StockTransferController;
use App\Http\Controllers\API\SupplierController;
use App\Http\Controllers\API\ReportController;
use App\Http\Controllers\API\SaleController;
use App\Http\Controllers\API\OfferController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware(['auth:sanctum', 'active.user'])->group(function () {
    Route::prefix('meta')->group(function () {
        Route::get('roles', [MetaController::class, 'roles'])->middleware('permission:hr.view');
        Route::get('branches', [MetaController::class, 'branches'])->middleware('permission:hr.view');
        Route::get('permissions', [MetaController::class, 'permissions'])->middleware('permission:hr.view');
    });

    Route::prefix('auth')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
        Route::put('profile', [AuthController::class, 'updateProfile']);
        Route::patch('profile', [AuthController::class, 'updateProfile']);
        Route::post('change-password', [AuthController::class, 'changePassword']);
    });

    Route::get('dashboard', [DashboardController::class, 'index']);
    Route::get('notifications', [NotificationController::class, 'index']);

    Route::prefix('inventory')->group(function () {
        Route::get('categories', [CategoryController::class, 'index'])->middleware('permission:inventory.view');
        Route::post('categories', [CategoryController::class, 'store'])->middleware('permission:inventory.create');
        Route::get('categories/{category}', [CategoryController::class, 'show'])->middleware('permission:inventory.view');
        Route::put('categories/{category}', [CategoryController::class, 'update'])->middleware('permission:inventory.edit');
        Route::patch('categories/{category}', [CategoryController::class, 'update'])->middleware('permission:inventory.edit');
        Route::delete('categories/{category}', [CategoryController::class, 'destroy'])->middleware('permission:inventory.delete');

        Route::get('products/low-stock', [ProductController::class, 'lowStock'])->middleware('permission:inventory.view');
        Route::get('products/barcode/{barcode}', [ProductController::class, 'findByBarcode'])->middleware('permission:inventory.view');
        Route::post('products/{product}/adjust-stock', [ProductController::class, 'adjustStock'])->middleware('permission:inventory.edit');
        Route::get('products', [ProductController::class, 'index'])->middleware('permission:inventory.view');
        Route::post('products', [ProductController::class, 'store'])->middleware('permission:inventory.create');
        Route::get('products/{product}', [ProductController::class, 'show'])->middleware('permission:inventory.view');
        Route::put('products/{product}', [ProductController::class, 'update'])->middleware('permission:inventory.edit');
        Route::patch('products/{product}', [ProductController::class, 'update'])->middleware('permission:inventory.edit');
        Route::delete('products/{product}', [ProductController::class, 'destroy'])->middleware('permission:inventory.delete');

        Route::get('suppliers', [SupplierController::class, 'index'])->middleware('permission:inventory.view');
        Route::post('suppliers', [SupplierController::class, 'store'])->middleware('permission:inventory.create');
        Route::get('suppliers/{supplier}', [SupplierController::class, 'show'])->middleware('permission:inventory.view');
        Route::put('suppliers/{supplier}', [SupplierController::class, 'update'])->middleware('permission:inventory.edit');
        Route::patch('suppliers/{supplier}', [SupplierController::class, 'update'])->middleware('permission:inventory.edit');
        Route::delete('suppliers/{supplier}', [SupplierController::class, 'destroy'])->middleware('permission:inventory.delete');

        Route::get('purchase-orders', [PurchaseOrderController::class, 'index'])->middleware('permission:inventory.view');
        Route::post('purchase-orders', [PurchaseOrderController::class, 'store'])->middleware('permission:inventory.create');

        Route::get('stock-transfers', [StockTransferController::class, 'index'])->middleware('permission:inventory.view');
        Route::post('stock-transfers', [StockTransferController::class, 'store'])->middleware('permission:inventory.create');
    });

    Route::prefix('sales')->group(function () {
        Route::get('discount-codes/validate', [SaleController::class, 'validateDiscountCode'])->middleware('permission:sales.create');
        Route::get('offers', [OfferController::class, 'index'])->middleware('permission:offers.manage');
        Route::post('offers', [OfferController::class, 'store'])->middleware('permission:offers.manage');
        Route::put('offers/{offer}', [OfferController::class, 'update'])->middleware('permission:offers.manage');
        Route::patch('offers/{offer}', [OfferController::class, 'update'])->middleware('permission:offers.manage');
        Route::delete('offers/{offer}', [OfferController::class, 'destroy'])->middleware('permission:offers.manage');

        Route::get('daily-summary', [SaleController::class, 'dailySummary'])->middleware('permission:sales.view');
        Route::get('{sale}/invoice', [SaleController::class, 'downloadInvoice'])->middleware('permission:sales.view');
        Route::get('/', [SaleController::class, 'index'])->middleware('permission:sales.view');
        Route::post('/', [SaleController::class, 'store'])->middleware('permission:sales.create');
        Route::get('{sale}', [SaleController::class, 'show'])->middleware('permission:sales.view');
    });

    Route::get('customers', [CustomerController::class, 'index'])->middleware('permission:sales.view');
    Route::post('customers', [CustomerController::class, 'store'])->middleware('permission:sales.create');
    Route::get('customers/{customer}', [CustomerController::class, 'show'])->middleware('permission:sales.view');
    Route::put('customers/{customer}', [CustomerController::class, 'update'])->middleware('permission:sales.edit');
    Route::patch('customers/{customer}', [CustomerController::class, 'update'])->middleware('permission:sales.edit');
    Route::delete('customers/{customer}', [CustomerController::class, 'destroy'])->middleware('permission:sales.delete');

    Route::get('refunds', [RefundController::class, 'index'])->middleware('permission:sales.refund');
    Route::post('refunds', [RefundController::class, 'store'])->middleware('permission:sales.refund');

    Route::prefix('hr')->group(function () {
        Route::get('employees', [EmployeeController::class, 'index'])->middleware('permission:hr.view');
        Route::post('employees', [EmployeeController::class, 'store'])->middleware('permission:hr.create');
        Route::get('employees/{employee}', [EmployeeController::class, 'show'])->middleware('permission:hr.view');
        Route::put('employees/{employee}', [EmployeeController::class, 'update'])->middleware('permission:hr.edit');
        Route::patch('employees/{employee}', [EmployeeController::class, 'update'])->middleware('permission:hr.edit');
        Route::delete('employees/{employee}', [EmployeeController::class, 'destroy'])->middleware('permission:hr.edit');

        Route::get('attendance', [AttendanceController::class, 'index'])->middleware('permission:hr.view');
        Route::post('attendance/check-in', [AttendanceController::class, 'checkIn'])->middleware('permission:attendance.self.check_in');
        Route::post('attendance/check-out', [AttendanceController::class, 'checkOut'])->middleware('permission:attendance.self.check_out');
        Route::post('attendance', [AttendanceController::class, 'store'])->middleware('permission:hr.edit');
        Route::get('attendance/{employee}/monthly', [AttendanceController::class, 'monthlySummary'])->middleware('permission:hr.view');

        Route::get('payroll', [PayrollController::class, 'index'])->middleware('permission:hr.payroll');
        Route::post('payroll/generate', [PayrollController::class, 'generate'])->middleware('permission:hr.payroll');
        Route::post('payroll/{payroll}/approve', [PayrollController::class, 'approve'])->middleware('permission:hr.payroll');
        Route::post('payroll/{payroll}/mark-paid', [PayrollController::class, 'markPaid'])->middleware('permission:hr.payroll');

        Route::get('tasks', [EmployeeTaskController::class, 'index'])->middleware('permission:tasks.view');
        Route::post('tasks', [EmployeeTaskController::class, 'store'])->middleware('permission:tasks.create');
        Route::patch('tasks/{task}', [EmployeeTaskController::class, 'update'])->middleware('permission:tasks.edit');
        Route::put('tasks/{task}', [EmployeeTaskController::class, 'update'])->middleware('permission:tasks.edit');
        Route::delete('tasks/{task}', [EmployeeTaskController::class, 'destroy'])->middleware('permission:tasks.delete');

        Route::get('leaves/types', [LeaveController::class, 'leaveTypes']);
        Route::get('leaves', [LeaveController::class, 'index']);
        Route::post('leaves', [LeaveController::class, 'store']);
        Route::patch('leaves/{leave}/review', [LeaveController::class, 'review'])->middleware('permission:hr.edit');
        Route::delete('leaves/{leave}', [LeaveController::class, 'destroy']);
    });

    Route::prefix('reports')->group(function () {
        Route::get('sales-summary', [ReportController::class, 'salesSummary'])->middleware('permission:reports.view');
        Route::get('inventory-valuation', [ReportController::class, 'inventoryValuation'])->middleware('permission:reports.view');
        Route::get('top-products', [ReportController::class, 'topProducts'])->middleware('permission:reports.view');
        Route::get('hr-summary', [ReportController::class, 'hrSummary'])->middleware('permission:reports.view');
        Route::get('export/sales-excel', [ReportController::class, 'exportSalesExcel'])->middleware('permission:reports.export');
        Route::get('export/sales-pdf', [ReportController::class, 'exportSalesPdf'])->middleware('permission:reports.export');
    });

    Route::prefix('admin')->middleware('permission:branches.manage')->group(function () {
        Route::get('branches', [BranchController::class, 'index']);
        Route::post('branches', [BranchController::class, 'store']);
        Route::get('branches/{branch}', [BranchController::class, 'show']);
        Route::put('branches/{branch}', [BranchController::class, 'update']);
        Route::patch('branches/{branch}', [BranchController::class, 'update']);
        Route::delete('branches/{branch}', [BranchController::class, 'destroy']);

        Route::get('users', [UserAdminController::class, 'index']);
        Route::patch('users/{user}', [UserAdminController::class, 'update']);
        Route::post('users/{user}/toggle-active', [UserAdminController::class, 'toggleActive']);
    });
});

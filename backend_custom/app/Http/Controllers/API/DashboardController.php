<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use App\Models\Product;
use App\Models\ProductBranchStock;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $isSuperAdmin = $request->user()->isSuperAdmin();
        $branchId     = $isSuperAdmin ? null : $request->user()->branch_id;
        $today        = now()->toDateString();
        $monthStart   = now()->startOfMonth()->toDateString();

        // Today's sales
        $todaySales = Sale::when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->whereDate('created_at', $today)
            ->selectRaw('COUNT(*) as count, SUM(total_amount) as revenue')
            ->first();

        // Month sales
        $monthSales = Sale::when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->whereDate('created_at', '>=', $monthStart)
            ->selectRaw('COUNT(*) as count, SUM(total_amount) as revenue')
            ->first();

        // Low stock items
        $lowStockCount = ProductBranchStock::when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->whereColumn('quantity', '<=', DB::raw('(SELECT low_stock_threshold FROM products WHERE products.id = product_branch_stock.product_id)'))
            ->count();

        // Total employees
        $employeeCount = Employee::when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->where('is_active', true)->count();

        // Sales chart — last 7 days
        $salesChart = Sale::when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->whereDate('created_at', '>=', now()->subDays(6)->toDateString())
            ->selectRaw("DATE(created_at) as date, SUM(total_amount) as revenue, COUNT(*) as transactions")
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Top 5 products this month
        $topProducts = DB::table('sale_items')
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->join('products', 'products.id', '=', 'sale_items.product_id')
            ->when($branchId, fn($q) => $q->where('sales.branch_id', $branchId))
            ->whereDate('sales.created_at', '>=', $monthStart)
            ->selectRaw('products.name, SUM(sale_items.quantity) as qty, SUM(sale_items.line_total) as revenue')
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('qty')
            ->limit(5)
            ->get();

        return response()->json([
            'today'        => $todaySales,
            'month'        => $monthSales,
            'low_stock'    => $lowStockCount,
            'employees'    => $employeeCount,
            'sales_chart'  => $salesChart,
            'top_products' => $topProducts,
        ]);
    }
}

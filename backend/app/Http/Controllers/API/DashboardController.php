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
        $selectedBranchId = $isSuperAdmin
            ? ($request->filled('branch_id') ? (int) $request->input('branch_id') : null)
            : $request->user()->branch_id;

        $compareBranchId = $isSuperAdmin && $request->filled('compare_branch_id')
            ? (int) $request->input('compare_branch_id')
            : null;

        if ($compareBranchId === $selectedBranchId) {
            $compareBranchId = null;
        }

        $metrics = $this->buildMetrics($selectedBranchId);

        $comparison = null;
        if ($isSuperAdmin && $compareBranchId) {
            $compareMetrics = $this->buildMetrics($compareBranchId);
            $comparison = [
                'branch_id' => $compareBranchId,
                'today_revenue' => (float) ($compareMetrics['today']->revenue ?? 0),
                'month_revenue' => (float) ($compareMetrics['month']->revenue ?? 0),
                'month_growth_percent' => (float) ($compareMetrics['month_growth_percent'] ?? 0),
                'today_transactions' => (int) ($compareMetrics['today']->count ?? 0),
                'month_transactions' => (int) ($compareMetrics['month']->count ?? 0),
            ];
        }

        $availableBranches = $isSuperAdmin
            ? DB::table('branches')->where('is_active', true)->select('id', 'name', 'code')->orderBy('name')->get()
            : collect();

        return response()->json(array_merge($metrics, [
            'selected_branch_id' => $selectedBranchId,
            'compare_branch_id' => $compareBranchId,
            'available_branches' => $availableBranches,
            'comparison' => $comparison,
            'comparison_delta' => $comparison ? [
                'month_revenue_diff' => ((float) ($metrics['month']->revenue ?? 0)) - (float) ($comparison['month_revenue'] ?? 0),
                'today_revenue_diff' => ((float) ($metrics['today']->revenue ?? 0)) - (float) ($comparison['today_revenue'] ?? 0),
                'month_growth_diff' => ((float) ($metrics['month_growth_percent'] ?? 0)) - (float) ($comparison['month_growth_percent'] ?? 0),
            ] : null,
        ]));
    }

    private function buildMetrics(?int $branchId): array
    {
        $today = now()->toDateString();
        $monthStart = now()->startOfMonth()->toDateString();
        $prevMonthStart = now()->subMonthNoOverflow()->startOfMonth()->toDateString();
        $prevMonthEnd = now()->subMonthNoOverflow()->endOfMonth()->toDateString();

        $todaySales = Sale::when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->whereDate('created_at', $today)
            ->selectRaw('COUNT(*) as count, SUM(total_amount) as revenue')
            ->first();

        $monthSales = Sale::when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->whereDate('created_at', '>=', $monthStart)
            ->selectRaw('COUNT(*) as count, SUM(total_amount) as revenue')
            ->first();

        $prevMonthSales = Sale::when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->whereBetween(DB::raw('DATE(created_at)'), [$prevMonthStart, $prevMonthEnd])
            ->selectRaw('COUNT(*) as count, SUM(total_amount) as revenue')
            ->first();

        $lowStockCount = ProductBranchStock::when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->whereColumn('quantity', '<=', DB::raw('(SELECT low_stock_threshold FROM products WHERE products.id = product_branch_stock.product_id)'))
            ->count();

        $outOfStockCount = ProductBranchStock::when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->where('quantity', '<=', 0)
            ->count();

        $activeProductsCount = Product::where('is_active', true)->count();

        $employeeCount = Employee::when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->where('is_active', true)->count();

        $salesChart = Sale::when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->whereDate('created_at', '>=', now()->subDays(6)->toDateString())
            ->selectRaw("DATE(created_at) as date, SUM(total_amount) as revenue, COUNT(*) as transactions")
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $topProducts = DB::table('sale_items')
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->join('products', 'products.id', '=', 'sale_items.product_id')
            ->when($branchId, fn($q) => $q->where('sales.branch_id', $branchId))
            ->whereDate('sales.created_at', '>=', $monthStart)
            ->selectRaw('COALESCE(products.name_ar, products.name) as name, SUM(sale_items.quantity) as qty, SUM(sale_items.line_total) as revenue, products.id as product_id')
            ->groupBy('products.id', 'products.name', 'products.name_ar')
            ->orderByDesc('qty')
            ->limit(5)
            ->get();

        $pendingTransfersCount = DB::table('stock_transfers')
            ->when($branchId, fn($q) => $q->where(function ($q2) use ($branchId) {
                $q2->where('from_branch_id', $branchId)->orWhere('to_branch_id', $branchId);
            }))
            ->whereIn('status', ['pending', 'approved', 'in_transit'])
            ->count();

        $openPurchaseOrdersCount = DB::table('purchase_orders')
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->whereIn('status', ['draft', 'ordered', 'partial'])
            ->count();

        $monthRefundsAmount = DB::table('refunds')
            ->join('sales', 'sales.id', '=', 'refunds.sale_id')
            ->when($branchId, fn($q) => $q->where('sales.branch_id', $branchId))
            ->whereDate('refunds.created_at', '>=', $monthStart)
            ->sum('refunds.refund_amount');

        $todayRevenue = (float) ($todaySales->revenue ?? 0);
        $todayCount = (int) ($todaySales->count ?? 0);
        $monthRevenue = (float) ($monthSales->revenue ?? 0);
        $monthCount = (int) ($monthSales->count ?? 0);
        $prevMonthRevenue = (float) ($prevMonthSales->revenue ?? 0);

        $todayAvgTicket = $todayCount > 0 ? $todayRevenue / $todayCount : 0;
        $monthAvgTicket = $monthCount > 0 ? $monthRevenue / $monthCount : 0;
        $monthGrowthPercent = $prevMonthRevenue > 0
            ? (($monthRevenue - $prevMonthRevenue) / $prevMonthRevenue) * 100
            : ($monthRevenue > 0 ? 100 : 0);

        return [
            'today' => $todaySales,
            'month' => $monthSales,
            'prev_month' => $prevMonthSales,
            'low_stock' => $lowStockCount,
            'out_of_stock' => $outOfStockCount,
            'active_products' => $activeProductsCount,
            'employees' => $employeeCount,
            'sales_chart' => $salesChart,
            'top_products' => $topProducts,
            'pending_transfers' => $pendingTransfersCount,
            'open_purchase_orders' => $openPurchaseOrdersCount,
            'month_refunds' => $monthRefundsAmount,
            'today_avg_ticket' => $todayAvgTicket,
            'month_avg_ticket' => $monthAvgTicket,
            'month_growth_percent' => $monthGrowthPercent,
        ];
    }
}

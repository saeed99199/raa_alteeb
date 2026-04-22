<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use App\Models\Product;
use App\Models\ProductBranchStock;
use App\Models\Employee;
use App\Models\Attendance;
use App\Models\Payroll;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\SalesReportExport;

class ReportController extends Controller
{
    /**
     * Sales summary — by branch, date range, grouped by day/month.
     */
    public function salesSummary(Request $request)
    {
        $request->validate([
            'date_from'  => 'required|date',
            'date_to'    => 'required|date|after_or_equal:date_from',
            'branch_id'  => 'nullable|exists:branches,id',
            'group_by'   => 'nullable|in:day,month,branch',
        ]);

        $branchId = $request->user()->isSuperAdmin()
            ? $request->input('branch_id')
            : $request->user()->branch_id;

        $groupBy = $request->input('group_by', 'day');

        $selectDate = match ($groupBy) {
            'month'  => "DATE_FORMAT(created_at, '%Y-%m') as period",
            'branch' => 'branch_id as period',
            default  => 'DATE(created_at) as period',
        };

        $data = Sale::query()
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->whereBetween(DB::raw('DATE(created_at)'), [$request->date_from, $request->date_to])
            ->selectRaw("
                {$selectDate},
                COUNT(*) as transactions,
                SUM(total_amount) as revenue,
                SUM(tax_amount) as tax,
                SUM(discount_amount) as discount,
                SUM(total_amount - tax_amount) as net_revenue
            ")
            ->groupBy('period')
            ->orderBy('period')
            ->get();

        return response()->json($data);
    }

    /**
     * Inventory valuation per branch.
     */
    public function inventoryValuation(Request $request)
    {
        $branchId = $request->user()->isSuperAdmin()
            ? $request->input('branch_id')
            : $request->user()->branch_id;

        $data = ProductBranchStock::with('product.category')
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->get()
            ->map(fn($row) => [
                'product_id'       => $row->product_id,
                'product_name'     => $row->product->name,
                'category'         => $row->product->category?->name,
                'branch_id'        => $row->branch_id,
                'quantity'         => $row->quantity,
                'cost_price'       => $row->product->cost_price,
                'sale_price'       => $row->product->sale_price,
                'cost_valuation'   => $row->quantity * $row->product->cost_price,
                'sale_valuation'   => $row->quantity * $row->product->sale_price,
            ]);

        return response()->json([
            'items'              => $data,
            'total_cost_value'   => $data->sum('cost_valuation'),
            'total_retail_value' => $data->sum('sale_valuation'),
        ]);
    }

    /**
     * Top selling products.
     */
    public function topProducts(Request $request)
    {
        $branchId = $request->user()->isSuperAdmin()
            ? $request->input('branch_id')
            : $request->user()->branch_id;

        $data = DB::table('sale_items')
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->join('products', 'products.id', '=', 'sale_items.product_id')
            ->when($branchId, fn($q) => $q->where('sales.branch_id', $branchId))
            ->when($request->date_from, fn($q) => $q->whereDate('sales.created_at', '>=', $request->date_from))
            ->when($request->date_to, fn($q) => $q->whereDate('sales.created_at', '<=', $request->date_to))
            ->selectRaw('
                sale_items.product_id,
                products.name as product_name,
                SUM(sale_items.quantity) as total_qty,
                SUM(sale_items.line_total) as total_revenue
            ')
            ->groupBy('sale_items.product_id', 'products.name')
            ->orderByDesc('total_qty')
            ->limit($request->input('limit', 10))
            ->get();

        return response()->json($data);
    }

    /**
     * HR — attendance & payroll summary.
     */
    public function hrSummary(Request $request)
    {
        $branchId = $request->user()->isSuperAdmin()
            ? $request->input('branch_id')
            : $request->user()->branch_id;

        $year  = $request->input('year', now()->year);
        $month = $request->input('month', now()->month);

        $employees = Employee::where('branch_id', $branchId)->where('is_active', true)->count();

        $payroll = Payroll::where('branch_id', $branchId)
            ->where('pay_year', $year)
            ->where('pay_month', $month)
            ->selectRaw('SUM(net_salary) as total_payroll, SUM(deductions) as total_deductions, SUM(overtime_pay) as total_overtime')
            ->first();

        $attendance = Attendance::whereHas('employee', fn($q) => $q->where('branch_id', $branchId))
            ->whereYear('date', $year)
            ->whereMonth('date', $month)
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        return response()->json([
            'employees'      => $employees,
            'payroll'        => $payroll,
            'attendance'     => $attendance,
        ]);
    }

    /**
     * Export sales to Excel.
     */
    public function exportSalesExcel(Request $request)
    {
        $request->validate([
            'date_from' => 'required|date',
            'date_to'   => 'required|date',
        ]);

        return Excel::download(
            new SalesReportExport($request->date_from, $request->date_to, $request->branch_id),
            'sales-report.xlsx'
        );
    }
}

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
use App\Services\ChromePdfService;

class ReportController extends Controller
{
    public function __construct(private readonly ChromePdfService $chromePdfService)
    {
    }

    /**
     * Sales summary — by branch, date range, grouped by day/month.
     */
    public function salesSummary(Request $request)
    {
        $request->validate([
            'date_from'  => 'required|date',
            'date_to'    => 'required|date|after_or_equal:date_from',
            'branch_id'  => 'nullable|exists:branches,id',
            'branch_ids' => 'nullable|array',
            'branch_ids.*' => 'integer|exists:branches,id',
            'group_by'   => 'nullable|in:day,month,branch',
        ]);

        $branchIds = $this->resolveBranchIds($request);

        $data = $this->buildSalesSummaryData(
            dateFrom: $request->date_from,
            dateTo: $request->date_to,
            groupBy: $request->input('group_by', 'day'),
            branchIds: $branchIds,
        );

        return response()->json($data);
    }

    /**
     * Inventory valuation per branch.
     */
    public function inventoryValuation(Request $request)
    {
        $request->validate([
            'branch_id'  => 'nullable|exists:branches,id',
            'branch_ids' => 'nullable|array',
            'branch_ids.*' => 'integer|exists:branches,id',
        ]);

        $branchIds = $this->resolveBranchIds($request);

        $data = Product::with('category')
            ->withSum([
                'branchStock as quantity' => fn($q) => $q->when($branchIds, fn($q2) => $q2->whereIn('branch_id', $branchIds)),
            ], 'quantity')
            ->get()
            ->map(fn($product) => [
                'product_id'       => $product->id,
                'product_name'     => $product->name_ar ?: $product->name,
                'category'         => $product->category?->name,
                'branch_id'        => null,
                'quantity'         => (int) ($product->quantity ?? 0),
                'cost_price'       => (float) $product->cost_price,
                'sale_price'       => (float) $product->sale_price,
                'cost_valuation'   => (int) ($product->quantity ?? 0) * (float) $product->cost_price,
                'sale_valuation'   => (int) ($product->quantity ?? 0) * (float) $product->sale_price,
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
        $request->validate([
            'branch_id'  => 'nullable|exists:branches,id',
            'branch_ids' => 'nullable|array',
            'branch_ids.*' => 'integer|exists:branches,id',
        ]);

        $branchIds = $this->resolveBranchIds($request);

        $limit = $request->filled('limit')
            ? max((int) $request->input('limit'), 1)
            : 10;

        $data = $this->buildSoldItemsData(
            dateFrom: $request->input('date_from'),
            dateTo: $request->input('date_to'),
            branchIds: $branchIds,
            limit: $limit,
        );

        return response()->json($data);
    }

    /**
     * HR — attendance & payroll summary.
     */
    public function hrSummary(Request $request)
    {
        $request->validate([
            'branch_id'  => 'nullable|exists:branches,id',
            'branch_ids' => 'nullable|array',
            'branch_ids.*' => 'integer|exists:branches,id',
        ]);

        $branchIds = $this->resolveBranchIds($request);

        $year  = $request->input('year', now()->year);
        $month = $request->input('month', now()->month);

        $employees = Employee::when($branchIds, fn($q) => $q->whereIn('branch_id', $branchIds))
            ->where('is_active', true)
            ->count();

        $payroll = Payroll::when($branchIds, fn($q) => $q->whereIn('branch_id', $branchIds))
            ->where('pay_year', $year)
            ->where('pay_month', $month)
            ->selectRaw('SUM(net_salary) as total_payroll, SUM(deductions) as total_deductions, SUM(overtime_pay) as total_overtime')
            ->first();

        $attendance = Attendance::whereHas('employee', fn($q) => $q->when($branchIds, fn($q2) => $q2->whereIn('branch_id', $branchIds)))
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
            'branch_id' => 'nullable|exists:branches,id',
            'branch_ids' => 'nullable|array',
            'branch_ids.*' => 'integer|exists:branches,id',
        ]);

        $branchIds = $this->resolveBranchIds($request);

        return Excel::download(
            new SalesReportExport($request->date_from, $request->date_to, $branchIds),
            'sales-report.xlsx'
        );
    }

    /**
     * Export sales summary to PDF.
     */
    public function exportSalesPdf(Request $request)
    {
        $request->validate([
            'date_from' => 'required|date',
            'date_to'   => 'required|date|after_or_equal:date_from',
            'group_by'  => 'nullable|in:day,month,branch',
            'branch_id' => 'nullable|exists:branches,id',
            'branch_ids' => 'nullable|array',
            'branch_ids.*' => 'integer|exists:branches,id',
        ]);

        $branchIds = $this->resolveBranchIds($request);

        $groupBy = $request->input('group_by', 'day');

        $data = $this->buildSalesSummaryData(
            dateFrom: $request->date_from,
            dateTo: $request->date_to,
            groupBy: $groupBy,
            branchIds: $branchIds,
        );

        $totals = [
            'revenue' => (float) $data->sum('revenue'),
            'transactions' => (int) $data->sum('transactions'),
            'tax' => (float) $data->sum('tax'),
            'discount' => (float) $data->sum('discount'),
            'net_revenue' => (float) $data->sum('net_revenue'),
        ];

        $pdf = $this->chromePdfService->renderViewToPdf('reports.sales-summary-pdf', [
            'rows' => $data,
            'totals' => $totals,
            'sold_items' => $this->buildSoldItemsData(
                dateFrom: $request->date_from,
                dateTo: $request->date_to,
                branchIds: $branchIds,
                limit: 20,
            ),
            'date_from' => $request->date_from,
            'date_to' => $request->date_to,
            'group_by' => $groupBy,
        ]);

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="sales-report.pdf"',
        ]);
    }

    private function buildSalesSummaryData(string $dateFrom, string $dateTo, string $groupBy, ?array $branchIds)
    {
        $selectDate = match ($groupBy) {
            'month'  => "strftime('%Y-%m', created_at) as period",
            'branch' => 'branch_id as period',
            default  => 'DATE(created_at) as period',
        };

        return Sale::query()
            ->when($branchIds, fn($q) => $q->whereIn('branch_id', $branchIds))
            ->whereBetween(DB::raw('DATE(created_at)'), [$dateFrom, $dateTo])
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
    }

    private function buildSoldItemsData(
        ?string $dateFrom,
        ?string $dateTo,
        ?array $branchIds,
        ?int $limit = null
    ) {
        $query = DB::table('sale_items')
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->join('products', 'products.id', '=', 'sale_items.product_id')
            ->when($branchIds, fn($q) => $q->whereIn('sales.branch_id', $branchIds))
            ->when($dateFrom, fn($q) => $q->whereDate('sales.created_at', '>=', $dateFrom))
            ->when($dateTo, fn($q) => $q->whereDate('sales.created_at', '<=', $dateTo))
            ->selectRaw('
                sale_items.product_id,
                products.name as product_name,
                SUM(sale_items.quantity) as total_qty,
                COUNT(DISTINCT sales.id) as transactions,
                SUM(sale_items.line_total) as total_revenue
            ')
            ->groupBy('sale_items.product_id', 'products.name')
            ->orderByDesc('total_qty');

        if ($limit !== null && $limit > 0) {
            $query->limit($limit);
        }

        return $query->get();
    }

    private function resolveBranchIds(Request $request): ?array
    {
        if (!$request->user()->isSuperAdmin()) {
            return $request->user()->branch_id ? [(int) $request->user()->branch_id] : null;
        }

        $ids = $request->input('branch_ids');
        if (is_array($ids) && count($ids) > 0) {
            return array_values(array_unique(array_map('intval', $ids)));
        }

        if ($request->filled('branch_id')) {
            return [(int) $request->input('branch_id')];
        }

        return null;
    }
}

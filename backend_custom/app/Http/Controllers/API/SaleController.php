<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SalePayment;
use App\Models\ProductBranchStock;
use App\Models\StockMovement;
use App\Services\InvoiceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SaleController extends Controller
{
    public function __construct(private InvoiceService $invoiceService) {}

    public function index(Request $request)
    {
        $branchId = $request->user()->isSuperAdmin()
            ? $request->input('branch_id')
            : $request->user()->branch_id;

        $sales = Sale::with(['customer', 'cashier', 'branch'])
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->when($request->date_from, fn($q) => $q->whereDate('created_at', '>=', $request->date_from))
            ->when($request->date_to, fn($q) => $q->whereDate('created_at', '<=', $request->date_to))
            ->when($request->invoice_number, fn($q) => $q->where('invoice_number', 'like', "%{$request->invoice_number}%"))
            ->orderByDesc('created_at')
            ->paginate($request->input('per_page', 20));

        return response()->json($sales);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'branch_id'        => 'required|exists:branches,id',
            'customer_id'      => 'nullable|exists:customers,id',
            'items'            => 'required|array|min:1',
            'items.*.product_id'       => 'required|exists:products,id',
            'items.*.quantity'         => 'required|integer|min:1',
            'items.*.unit_price'       => 'required|numeric|min:0',
            'items.*.discount_percent' => 'nullable|numeric|min:0|max:100',
            'items.*.tax_rate'         => 'nullable|numeric|min:0|max:100',
            'payments'         => 'required|array|min:1',
            'payments.*.method' => 'required|in:cash,card,bank_transfer',
            'payments.*.amount' => 'required|numeric|min:0',
            'payments.*.reference' => 'nullable|string',
            'notes'            => 'nullable|string',
        ]);

        $sale = DB::transaction(function () use ($data, $request) {
            $subtotal = 0;
            $taxAmount = 0;

            foreach ($data['items'] as $item) {
                $discount   = ($item['unit_price'] * $item['quantity']) * (($item['discount_percent'] ?? 0) / 100);
                $lineNet    = ($item['unit_price'] * $item['quantity']) - $discount;
                $lineTax    = $lineNet * (($item['tax_rate'] ?? 0) / 100);
                $subtotal  += $lineNet;
                $taxAmount += $lineTax;
            }

            $totalPaid = collect($data['payments'])->sum('amount');
            $total     = $subtotal + $taxAmount;

            $sale = Sale::create([
                'invoice_number' => 'INV-' . strtoupper(Str::random(8)),
                'branch_id'      => $data['branch_id'],
                'customer_id'    => $data['customer_id'] ?? null,
                'cashier_id'     => $request->user()->id,
                'subtotal'       => $subtotal,
                'discount_amount'=> 0,
                'tax_amount'     => $taxAmount,
                'total_amount'   => $total,
                'paid_amount'    => $totalPaid,
                'change_amount'  => max(0, $totalPaid - $total),
                'payment_method' => count($data['payments']) > 1 ? 'multiple' : $data['payments'][0]['method'],
                'notes'          => $data['notes'] ?? null,
            ]);

            foreach ($data['items'] as $item) {
                $discount  = ($item['unit_price'] * $item['quantity']) * (($item['discount_percent'] ?? 0) / 100);
                $lineNet   = ($item['unit_price'] * $item['quantity']) - $discount;
                $lineTax   = $lineNet * (($item['tax_rate'] ?? 0) / 100);

                $product   = \App\Models\Product::find($item['product_id']);

                SaleItem::create([
                    'sale_id'          => $sale->id,
                    'product_id'       => $item['product_id'],
                    'product_name'     => $product->name,
                    'unit_price'       => $item['unit_price'],
                    'quantity'         => $item['quantity'],
                    'discount_percent' => $item['discount_percent'] ?? 0,
                    'tax_rate'         => $item['tax_rate'] ?? 0,
                    'line_total'       => $lineNet + $lineTax,
                ]);

                // Deduct stock
                $stock = ProductBranchStock::firstOrCreate(
                    ['product_id' => $item['product_id'], 'branch_id' => $data['branch_id']],
                    ['quantity' => 0]
                );
                $stock->decrement('quantity', $item['quantity']);

                StockMovement::create([
                    'product_id'       => $item['product_id'],
                    'branch_id'        => $data['branch_id'],
                    'type'             => 'sale',
                    'quantity'         => -$item['quantity'],
                    'balance_after'    => $stock->fresh()->quantity,
                    'reference_type'   => Sale::class,
                    'reference_id'     => $sale->id,
                    'created_by'       => $request->user()->id,
                ]);
            }

            foreach ($data['payments'] as $payment) {
                SalePayment::create([
                    'sale_id'   => $sale->id,
                    'method'    => $payment['method'],
                    'amount'    => $payment['amount'],
                    'reference' => $payment['reference'] ?? null,
                ]);
            }

            return $sale;
        });

        return response()->json($sale->load('items.product', 'payments', 'customer'), 201);
    }

    public function show(Sale $sale)
    {
        return response()->json($sale->load('items.product', 'payments', 'customer', 'cashier', 'refunds'));
    }

    public function downloadInvoice(Sale $sale)
    {
        $pdf = $this->invoiceService->generate($sale->load('items.product', 'payments', 'customer', 'cashier', 'branch'));

        return response($pdf, 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => "inline; filename=\"{$sale->invoice_number}.pdf\"",
        ]);
    }

    public function dailySummary(Request $request)
    {
        $branchId = $request->user()->isSuperAdmin()
            ? $request->input('branch_id')
            : $request->user()->branch_id;

        $date = $request->input('date', now()->toDateString());

        $summary = Sale::query()
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->whereDate('created_at', $date)
            ->selectRaw('
                COUNT(*) as total_transactions,
                SUM(total_amount) as total_revenue,
                SUM(tax_amount) as total_tax,
                SUM(discount_amount) as total_discount,
                AVG(total_amount) as avg_sale
            ')
            ->first();

        return response()->json($summary);
    }
}

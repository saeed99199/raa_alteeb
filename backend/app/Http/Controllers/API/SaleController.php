<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SalePayment;
use App\Models\Offer;
use App\Models\ProductBranchStock;
use App\Models\StockMovement;
use App\Services\InvoiceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;
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
            'discount_code'    => 'nullable|string|max:50',
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
            $grossSubtotal = 0;
            $itemDiscountAmount = 0;
            $subtotalAfterItemsDiscount = 0;
            $taxAmount = 0;

            foreach ($data['items'] as $item) {
                $lineGross  = $item['unit_price'] * $item['quantity'];
                $discount   = $lineGross * (($item['discount_percent'] ?? 0) / 100);
                $lineNet    = $lineGross - $discount;
                $lineTax    = $lineNet * (($item['tax_rate'] ?? 0) / 100);
                $grossSubtotal += $lineGross;
                $itemDiscountAmount += $discount;
                $subtotalAfterItemsDiscount += $lineNet;
                $taxAmount += $lineTax;
            }

            $offerResult = $this->resolveOffer(
                code: $data['discount_code'] ?? null,
                branchId: (int) $data['branch_id'],
                subtotal: (float) $subtotalAfterItemsDiscount,
                lockForUpdate: true,
            );

            $offerDiscountAmount = $offerResult['discount_amount'];
            $discountOffer = $offerResult['offer'];

            $subtotal = max(0, $subtotalAfterItemsDiscount - $offerDiscountAmount);
            $taxAmount = 0;

            foreach ($data['items'] as $item) {
                $lineGross = $item['unit_price'] * $item['quantity'];
                $lineDiscount = $lineGross * (($item['discount_percent'] ?? 0) / 100);
                $lineNet = $lineGross - $lineDiscount;
                $lineShare = $subtotalAfterItemsDiscount > 0 ? ($lineNet / $subtotalAfterItemsDiscount) : 0;
                $lineOfferDiscount = $offerDiscountAmount * $lineShare;
                $lineTaxable = max(0, $lineNet - $lineOfferDiscount);
                $taxAmount += $lineTaxable * (($item['tax_rate'] ?? 0) / 100);
            }

            $totalPaid = collect($data['payments'])->sum('amount');
            $total     = $subtotal + $taxAmount;

            $sale = Sale::create([
                'invoice_number' => 'INV-' . strtoupper(Str::random(8)),
                'branch_id'      => $data['branch_id'],
                'customer_id'    => $data['customer_id'] ?? null,
                'discount_offer_id' => $discountOffer?->id,
                'discount_code'  => $discountOffer?->code,
                'cashier_id'     => $request->user()->id,
                'subtotal'       => $subtotal,
                'discount_amount'=> $itemDiscountAmount + $offerDiscountAmount,
                'tax_amount'     => $taxAmount,
                'total_amount'   => $total,
                'paid_amount'    => $totalPaid,
                'change_amount'  => max(0, $totalPaid - $total),
                'payment_method' => count($data['payments']) > 1 ? 'multiple' : $data['payments'][0]['method'],
                'notes'          => $data['notes'] ?? null,
            ]);

            foreach ($data['items'] as $item) {
                $lineGross = $item['unit_price'] * $item['quantity'];
                $discount  = $lineGross * (($item['discount_percent'] ?? 0) / 100);
                $lineNet   = $lineGross - $discount;
                $lineShare = $subtotalAfterItemsDiscount > 0 ? ($lineNet / $subtotalAfterItemsDiscount) : 0;
                $lineOfferDiscount = $offerDiscountAmount * $lineShare;
                $lineTaxable = max(0, $lineNet - $lineOfferDiscount);
                $lineTax   = $lineTaxable * (($item['tax_rate'] ?? 0) / 100);

                $product   = \App\Models\Product::find($item['product_id']);

                SaleItem::create([
                    'sale_id'          => $sale->id,
                    'product_id'       => $item['product_id'],
                    'product_name'     => $product->name,
                    'unit_price'       => $item['unit_price'],
                    'quantity'         => $item['quantity'],
                    'discount_percent' => $item['discount_percent'] ?? 0,
                    'tax_rate'         => $item['tax_rate'] ?? 0,
                    'line_total'       => $lineTaxable + $lineTax,
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

            if ($discountOffer) {
                $discountOffer->increment('used_count');
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

    public function validateDiscountCode(Request $request)
    {
        $data = $request->validate([
            'code' => 'required|string|max:50',
            'branch_id' => 'required|exists:branches,id',
            'subtotal' => 'required|numeric|min:0',
        ]);

        $result = $this->resolveOffer(
            code: $data['code'],
            branchId: (int) $data['branch_id'],
            subtotal: (float) $data['subtotal'],
            lockForUpdate: false,
        );

        if (!$result['offer']) {
            return response()->json(['message' => 'كود الخصم غير صالح أو غير متاح.'], 422);
        }

        return response()->json([
            'offer' => [
                'id' => $result['offer']->id,
                'name' => $result['offer']->name,
                'code' => $result['offer']->code,
                'discount_type' => $result['offer']->discount_type,
                'discount_value' => $result['offer']->discount_value,
                'max_discount' => $result['offer']->max_discount,
                'min_subtotal' => $result['offer']->min_subtotal,
            ],
            'discount_amount' => round($result['discount_amount'], 2),
        ]);
    }

    private function resolveOffer(?string $code, int $branchId, float $subtotal, bool $lockForUpdate): array
    {
        if (!$code) {
            return ['offer' => null, 'discount_amount' => 0.0];
        }

        $query = Offer::query()
            ->whereRaw('UPPER(code) = ?', [strtoupper(trim($code))])
            ->where('is_active', true)
            ->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id')->orWhere('branch_id', $branchId);
            })
            ->where(function ($q) {
                $q->whereNull('starts_at')->orWhere('starts_at', '<=', Carbon::now());
            })
            ->where(function ($q) {
                $q->whereNull('ends_at')->orWhere('ends_at', '>=', Carbon::now());
            })
            ->whereRaw('(usage_limit IS NULL OR used_count < usage_limit)');

        if ($lockForUpdate) {
            $query->lockForUpdate();
        }

        $offer = $query->first();

        if (!$offer) {
            return ['offer' => null, 'discount_amount' => 0.0];
        }

        if ($subtotal < (float) $offer->min_subtotal) {
            return ['offer' => null, 'discount_amount' => 0.0];
        }

        $discount = $offer->discount_type === 'percent'
            ? $subtotal * ((float) $offer->discount_value / 100)
            : (float) $offer->discount_value;

        if ($offer->max_discount !== null) {
            $discount = min($discount, (float) $offer->max_discount);
        }

        $discount = max(0, min($discount, $subtotal));

        return ['offer' => $offer, 'discount_amount' => $discount];
    }
}

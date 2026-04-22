<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Refund;
use App\Models\RefundItem;
use App\Models\Sale;
use App\Models\ProductBranchStock;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RefundController extends Controller
{
    public function index(Request $request)
    {
        $branchId = $request->user()->isSuperAdmin()
            ? $request->input('branch_id')
            : $request->user()->branch_id;

        $rows = Refund::query()
            ->with(['sale:id,invoice_number,branch_id', 'processor:id,name'])
            ->when($branchId, fn($q) => $q->whereHas('sale', fn($q2) => $q2->where('branch_id', $branchId)))
            ->orderByDesc('created_at')
            ->paginate($request->input('per_page', 20));

        return response()->json($rows);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'sale_id'          => 'required|exists:sales,id',
            'reason'           => 'required|string',
            'method'           => 'required|in:cash,card,bank_transfer,store_credit',
            'items'            => 'required|array|min:1',
            'items.*.sale_item_id' => 'required|exists:sale_items,id',
            'items.*.quantity'     => 'required|integer|min:1',
        ]);

        $refund = DB::transaction(function () use ($data, $request) {
            $sale = Sale::findOrFail($data['sale_id']);
            $totalRefund = 0;

            $refund = Refund::create([
                'refund_number' => 'REF-' . strtoupper(Str::random(8)),
                'sale_id'       => $sale->id,
                'processed_by'  => $request->user()->id,
                'refund_amount' => 0, // updated below
                'method'        => $data['method'],
                'reason'        => $data['reason'],
            ]);

            foreach ($data['items'] as $item) {
                $saleItem = $sale->items()->findOrFail($item['sale_item_id']);
                $unitPrice = $saleItem->line_total / $saleItem->quantity;
                $amount    = $unitPrice * $item['quantity'];

                RefundItem::create([
                    'refund_id'    => $refund->id,
                    'sale_item_id' => $saleItem->id,
                    'quantity'     => $item['quantity'],
                    'amount'       => $amount,
                ]);

                $totalRefund += $amount;

                // Restock
                $stock = ProductBranchStock::firstOrCreate(
                    ['product_id' => $saleItem->product_id, 'branch_id' => $sale->branch_id],
                    ['quantity' => 0]
                );
                $stock->increment('quantity', $item['quantity']);

                StockMovement::create([
                    'product_id'     => $saleItem->product_id,
                    'branch_id'      => $sale->branch_id,
                    'type'           => 'return',
                    'quantity'       => $item['quantity'],
                    'balance_after'  => $stock->fresh()->quantity,
                    'reference_type' => Refund::class,
                    'reference_id'   => $refund->id,
                    'created_by'     => $request->user()->id,
                ]);
            }

            $refund->update(['refund_amount' => $totalRefund]);
            $sale->update(['status' => 'partial_refund']);

            return $refund;
        });

        return response()->json($refund->load('items'), 201);
    }
}

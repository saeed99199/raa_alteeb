<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PurchaseOrderController extends Controller
{
    public function index(Request $request)
    {
        $branchId = $request->user()->isSuperAdmin()
            ? $request->input('branch_id')
            : $request->user()->branch_id;

        $rows = DB::table('purchase_orders as po')
            ->leftJoin('suppliers as s', 's.id', '=', 'po.supplier_id')
            ->leftJoin('branches as b', 'b.id', '=', 'po.branch_id')
            ->leftJoin('users as u', 'u.id', '=', 'po.created_by')
            ->when($branchId, fn($q) => $q->where('po.branch_id', $branchId))
            ->select([
                'po.id',
                'po.po_number',
                'po.status',
                'po.total_amount',
                'po.expected_date',
                'po.notes',
                'po.created_at',
                's.name as supplier_name',
                'b.name as branch_name',
                'u.name as created_by_name',
            ])
            ->orderByDesc('po.created_at')
            ->paginate($request->input('per_page', 20));

        return response()->json($rows);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'branch_id' => 'nullable|exists:branches,id',
            'expected_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity_ordered' => 'required|integer|min:1',
            'items.*.unit_cost' => 'nullable|numeric|min:0',
        ]);

        $branchId = $data['branch_id'] ?? $request->user()->branch_id;
        if (!$branchId) {
            $branchId = DB::table('branches')->value('id');
        }

        if (!$branchId) {
            return response()->json(['message' => 'لا يوجد فرع متاح.'], 422);
        }

        $poId = DB::transaction(function () use ($data, $request, $branchId) {
            $items = [];
            $total = 0;

            foreach ($data['items'] as $item) {
                $unitCost = isset($item['unit_cost'])
                    ? (float) $item['unit_cost']
                    : (float) Product::where('id', $item['product_id'])->value('cost_price');

                $lineTotal = $unitCost * (int) $item['quantity_ordered'];
                $total += $lineTotal;

                $items[] = [
                    'product_id' => $item['product_id'],
                    'quantity_ordered' => (int) $item['quantity_ordered'],
                    'quantity_received' => 0,
                    'unit_cost' => $unitCost,
                ];
            }

            $id = DB::table('purchase_orders')->insertGetId([
                'po_number' => 'PO-' . strtoupper(Str::random(8)),
                'supplier_id' => $data['supplier_id'],
                'branch_id' => $branchId,
                'created_by' => $request->user()->id,
                'status' => 'draft',
                'total_amount' => $total,
                'expected_date' => $data['expected_date'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            foreach ($items as $item) {
                DB::table('purchase_order_items')->insert([
                    'purchase_order_id' => $id,
                    'product_id' => $item['product_id'],
                    'quantity_ordered' => $item['quantity_ordered'],
                    'quantity_received' => $item['quantity_received'],
                    'unit_cost' => $item['unit_cost'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            return $id;
        });

        $po = DB::table('purchase_orders')->where('id', $poId)->first();

        return response()->json($po, 201);
    }
}

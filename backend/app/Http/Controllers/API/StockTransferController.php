<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class StockTransferController extends Controller
{
    public function index(Request $request)
    {
        $branchId = $request->user()->isSuperAdmin()
            ? $request->input('branch_id')
            : $request->user()->branch_id;

        $rows = DB::table('stock_transfers as st')
            ->leftJoin('branches as fb', 'fb.id', '=', 'st.from_branch_id')
            ->leftJoin('branches as tb', 'tb.id', '=', 'st.to_branch_id')
            ->leftJoin('users as rb', 'rb.id', '=', 'st.requested_by')
            ->when($branchId, fn($q) => $q->where(function ($q2) use ($branchId) {
                $q2->where('st.from_branch_id', $branchId)->orWhere('st.to_branch_id', $branchId);
            }))
            ->select([
                'st.id',
                'st.transfer_number',
                'st.status',
                'st.notes',
                'st.created_at',
                'fb.name as from_branch_name',
                'tb.name as to_branch_name',
                'rb.name as requested_by_name',
            ])
            ->orderByDesc('st.created_at')
            ->paginate($request->input('per_page', 20));

        return response()->json($rows);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'from_branch_id' => 'required|exists:branches,id',
            'to_branch_id' => 'required|exists:branches,id|different:from_branch_id',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        $transferId = DB::transaction(function () use ($data, $request) {
            $id = DB::table('stock_transfers')->insertGetId([
                'transfer_number' => 'TR-' . strtoupper(Str::random(8)),
                'from_branch_id' => $data['from_branch_id'],
                'to_branch_id' => $data['to_branch_id'],
                'requested_by' => $request->user()->id,
                'approved_by' => null,
                'status' => 'pending',
                'notes' => $data['notes'] ?? null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            foreach ($data['items'] as $item) {
                DB::table('stock_transfer_items')->insert([
                    'stock_transfer_id' => $id,
                    'product_id' => $item['product_id'],
                    'quantity' => (int) $item['quantity'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            return $id;
        });

        $transfer = DB::table('stock_transfers')->where('id', $transferId)->first();

        return response()->json($transfer, 201);
    }
}

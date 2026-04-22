<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\EmployeeTask;
use App\Models\ProductBranchStock;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $user     = $request->user();
        $employee = $user->employee;

        // ── Pending / overdue tasks assigned to this user ──
        $tasks = [];
        if ($employee) {
            $tasks = EmployeeTask::where('assigned_to', $employee->id)
                ->whereIn('status', ['todo', 'in_progress', 'review'])
                ->orderByRaw("CASE WHEN due_date < DATE('now') THEN 0 ELSE 1 END, due_date ASC NULLS LAST")
                ->limit(10)
                ->get(['id', 'title', 'status', 'priority', 'due_date'])
                ->map(function ($task) {
                    $overdue = $task->due_date && $task->due_date < now()->toDateString();
                    return [
                        'id'       => $task->id,
                        'type'     => 'task',
                        'title'    => $task->title,
                        'priority' => $task->priority,
                        'status'   => $task->status,
                        'due_date' => $task->due_date,
                        'overdue'  => $overdue,
                    ];
                });
        }

        // ── Low-stock products ──
        $branchId   = $user->isSuperAdmin() ? null : $user->branch_id;
        $lowStock   = ProductBranchStock::with('product:id,name,name_ar,low_stock_threshold')
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->whereColumn(
                'quantity',
                '<=',
                DB::raw('(SELECT low_stock_threshold FROM products WHERE products.id = product_branch_stock.product_id)')
            )
            ->limit(15)
            ->get()
            ->map(function ($stock) {
                $name = $stock->product->name_ar ?: $stock->product->name;
                return [
                    'id'        => $stock->id,
                    'type'      => 'low_stock',
                    'title'     => $name,
                    'quantity'  => $stock->quantity,
                    'threshold' => $stock->product->low_stock_threshold,
                ];
            });

        return response()->json([
            'tasks'      => $tasks,
            'low_stock'  => $lowStock,
            'total'      => count($tasks) + count($lowStock),
        ]);
    }
}

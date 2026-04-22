<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use Illuminate\Http\Request;

class LeaveController extends Controller
{
    private function canManageAll($user): bool
    {
        return $user->isSuperAdmin()
            || in_array($user->role?->name, ['admin', 'branch_manager', 'hr_manager'], true)
            || $user->hasPermission('hr.edit');
    }

    public function index(Request $request)
    {
        $user     = $request->user();
        $employee = $user->employee;
        $canAll   = $this->canManageAll($user);

        $query = LeaveRequest::with(['employee.user', 'leaveType', 'reviewer'])
            ->orderByDesc('created_at');

        if (!$canAll) {
            if (!$employee) {
                return response()->json([], 200);
            }
            $query->where('employee_id', $employee->id);
        } else {
            if ($request->employee_id) {
                $query->where('employee_id', $request->employee_id);
            }
            if ($request->status) {
                $query->where('status', $request->status);
            }
            if (!$user->isSuperAdmin() && $user->branch_id) {
                $query->whereHas('employee', fn ($q) => $q->where('branch_id', $user->branch_id));
            }
        }

        return response()->json($query->paginate($request->input('per_page', 30)));
    }

    public function leaveTypes()
    {
        return response()->json(LeaveType::orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $user     = $request->user();
        $employee = $user->employee;

        if (!$employee) {
            return response()->json(['message' => 'لا يوجد سجل موظف مرتبط بهذا الحساب.'], 422);
        }

        $data = $request->validate([
            'leave_type_id' => 'required|exists:leave_types,id',
            'start_date'    => 'required|date|after_or_equal:today',
            'end_date'      => 'required|date|after_or_equal:start_date',
            'reason'        => 'nullable|string|max:1000',
        ]);

        $start     = \Carbon\Carbon::parse($data['start_date']);
        $end       = \Carbon\Carbon::parse($data['end_date']);
        $daysCount = $start->diffInDays($end) + 1;

        $leave = LeaveRequest::create([
            'employee_id'   => $employee->id,
            'leave_type_id' => $data['leave_type_id'],
            'start_date'    => $data['start_date'],
            'end_date'      => $data['end_date'],
            'days_count'    => $daysCount,
            'reason'        => $data['reason'] ?? null,
            'status'        => 'pending',
        ]);

        $leave->load(['employee.user', 'leaveType']);

        return response()->json($leave, 201);
    }

    public function review(Request $request, LeaveRequest $leave)
    {
        if (!$this->canManageAll($request->user())) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'status'       => 'required|in:approved,rejected',
            'review_notes' => 'nullable|string|max:500',
        ]);

        $leave->update([
            'status'       => $data['status'],
            'reviewed_by'  => $request->user()->id,
            'review_notes' => $data['review_notes'] ?? null,
        ]);

        $leave->load(['employee.user', 'leaveType', 'reviewer']);

        return response()->json($leave);
    }

    public function destroy(LeaveRequest $leave)
    {
        if ($leave->status !== 'pending') {
            return response()->json(['message' => 'لا يمكن حذف طلب تمت مراجعته.'], 422);
        }

        $leave->delete();

        return response()->json(null, 204);
    }
}

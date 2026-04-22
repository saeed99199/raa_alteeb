<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Employee;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    public function index(Request $request)
    {
        $branchId = $request->user()->isSuperAdmin()
            ? $request->input('branch_id')
            : $request->user()->branch_id;

        $attendance = Attendance::with('employee.user')
            ->whereHas('employee', fn($q) => $q->when($branchId, fn($q) => $q->where('branch_id', $branchId)))
            ->when($request->date, fn($q) => $q->where('date', $request->date))
            ->when($request->employee_id, fn($q) => $q->where('employee_id', $request->employee_id))
            ->orderByDesc('date')
            ->paginate($request->input('per_page', 30));

        return response()->json($attendance);
    }

    public function checkIn(Request $request)
    {
        $employee = Employee::where('user_id', $request->user()->id)->firstOrFail();
        $today    = now()->toDateString();

        $existing = Attendance::where('employee_id', $employee->id)->where('date', $today)->first();

        if ($existing && $existing->check_in) {
            return response()->json(['message' => 'Already checked in.'], 422);
        }

        $attendance = Attendance::updateOrCreate(
            ['employee_id' => $employee->id, 'date' => $today],
            ['check_in' => now()->toTimeString(), 'status' => 'present']
        );

        return response()->json($attendance, 201);
    }

    public function checkOut(Request $request)
    {
        $employee   = Employee::where('user_id', $request->user()->id)->firstOrFail();
        $today      = now()->toDateString();
        $attendance = Attendance::where('employee_id', $employee->id)->where('date', $today)->firstOrFail();

        if ($attendance->check_out) {
            return response()->json(['message' => 'Already checked out.'], 422);
        }

        $checkIn      = \Carbon\Carbon::parse($attendance->check_in);
        $checkOut     = now();
        $workedHours  = $checkIn->diffInMinutes($checkOut) / 60;
        $overtimeHours = max(0, $workedHours - 8);

        $attendance->update([
            'check_out'      => $checkOut->toTimeString(),
            'worked_hours'   => round($workedHours, 2),
            'overtime_hours' => round($overtimeHours, 2),
        ]);

        return response()->json($attendance);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'date'        => 'required|date',
            'check_in'    => 'nullable|date_format:H:i',
            'check_out'   => 'nullable|date_format:H:i',
            'status'      => 'required|in:present,absent,late,half_day,holiday,leave',
            'notes'       => 'nullable|string',
        ]);

        $attendance = Attendance::updateOrCreate(
            ['employee_id' => $data['employee_id'], 'date' => $data['date']],
            $data
        );

        return response()->json($attendance, 201);
    }

    public function monthlySummary(Request $request, Employee $employee)
    {
        $year  = $request->input('year', now()->year);
        $month = $request->input('month', now()->month);

        $records = Attendance::where('employee_id', $employee->id)
            ->whereYear('date', $year)
            ->whereMonth('date', $month)
            ->get();

        return response()->json([
            'employee_id'    => $employee->id,
            'year'           => $year,
            'month'          => $month,
            'present_days'   => $records->where('status', 'present')->count(),
            'absent_days'    => $records->where('status', 'absent')->count(),
            'late_days'      => $records->where('status', 'late')->count(),
            'total_hours'    => $records->sum('worked_hours'),
            'overtime_hours' => $records->sum('overtime_hours'),
            'records'        => $records,
        ]);
    }
}

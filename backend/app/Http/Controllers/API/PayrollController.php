<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Payroll;
use App\Models\Attendance;
use Illuminate\Http\Request;

class PayrollController extends Controller
{
    public function index(Request $request)
    {
        $branchId = $request->user()->isSuperAdmin()
            ? $request->input('branch_id')
            : $request->user()->branch_id;

        $payrolls = Payroll::with(['employee.user', 'branch'])
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->when($request->year, fn($q) => $q->where('pay_year', $request->year))
            ->when($request->month, fn($q) => $q->where('pay_month', $request->month))
            ->orderByDesc('pay_year')
            ->orderByDesc('pay_month')
            ->paginate(20);

        return response()->json($payrolls);
    }

    /**
     * Generate payroll for all employees in a branch for a given month.
     */
    public function generate(Request $request)
    {
        $data = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'year'      => 'required|integer|min:2020',
            'month'     => 'required|integer|min:1|max:12',
        ]);

        $employees = Employee::where('branch_id', $data['branch_id'])
            ->where('is_active', true)
            ->get();

        $created = [];

        foreach ($employees as $employee) {
            // Prevent double generation
            if (Payroll::where('employee_id', $employee->id)
                ->where('pay_year', $data['year'])
                ->where('pay_month', $data['month'])
                ->exists()) {
                continue;
            }

            $attendance = Attendance::where('employee_id', $employee->id)
                ->whereYear('date', $data['year'])
                ->whereMonth('date', $data['month'])
                ->get();

            $absentDays    = $attendance->where('status', 'absent')->count();
            $overtimeHours = $attendance->sum('overtime_hours');

            $dailyRate    = $employee->base_salary / 30;
            $deductions   = $dailyRate * $absentDays;
            $overtimePay  = ($employee->base_salary / (30 * 8)) * $overtimeHours * 1.5;
            $net          = $employee->base_salary - $deductions + $overtimePay;

            $payroll = Payroll::create([
                'employee_id'  => $employee->id,
                'branch_id'    => $data['branch_id'],
                'pay_year'     => $data['year'],
                'pay_month'    => $data['month'],
                'base_salary'  => $employee->base_salary,
                'overtime_pay' => round($overtimePay, 2),
                'bonuses'      => 0,
                'deductions'   => round($deductions, 2),
                'tax_deduction'=> 0,
                'net_salary'   => round($net, 2),
                'status'       => 'draft',
            ]);

            $created[] = $payroll;
        }

        return response()->json(['generated' => count($created), 'payrolls' => $created], 201);
    }

    public function approve(Payroll $payroll)
    {
        $payroll->update(['status' => 'approved']);

        return response()->json($payroll);
    }

    public function markPaid(Payroll $payroll)
    {
        $payroll->update(['status' => 'paid', 'paid_at' => now()->toDateString()]);

        return response()->json($payroll);
    }
}

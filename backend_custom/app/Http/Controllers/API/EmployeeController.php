<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class EmployeeController extends Controller
{
    public function index(Request $request)
    {
        $branchId = $request->user()->isSuperAdmin()
            ? $request->input('branch_id')
            : $request->user()->branch_id;

        $employees = Employee::with(['user', 'branch', 'department'])
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->when($request->search, fn($q) => $q->whereHas('user', fn($q) => $q->where('name', 'like', "%{$request->search}%")))
            ->paginate($request->input('per_page', 20));

        return response()->json($employees);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'             => 'required|string',
            'email'            => 'required|email|unique:users',
            'password'         => 'required|min:8',
            'role_id'          => 'required|exists:roles,id',
            'branch_id'        => 'required|exists:branches,id',
            'department_id'    => 'nullable|exists:departments,id',
            'national_id'      => 'nullable|string',
            'date_of_birth'    => 'nullable|date',
            'gender'           => 'nullable|in:male,female',
            'nationality'      => 'nullable|string',
            'hire_date'        => 'required|date',
            'job_title'        => 'required|string',
            'base_salary'      => 'required|numeric|min:0',
            'salary_type'      => 'nullable|in:monthly,daily,hourly',
            'bank_name'        => 'nullable|string',
            'bank_account'     => 'nullable|string',
            'emergency_contact_name'  => 'nullable|string',
            'emergency_contact_phone' => 'nullable|string',
        ]);

        $employee = DB::transaction(function () use ($data) {
            $user = User::create([
                'name'      => $data['name'],
                'email'     => $data['email'],
                'password'  => $data['password'],
                'role_id'   => $data['role_id'],
                'branch_id' => $data['branch_id'],
            ]);

            $employee = Employee::create([
                'user_id'       => $user->id,
                'branch_id'     => $data['branch_id'],
                'department_id' => $data['department_id'] ?? null,
                'employee_code' => 'EMP-' . strtoupper(Str::random(6)),
                'national_id'   => $data['national_id'] ?? null,
                'date_of_birth' => $data['date_of_birth'] ?? null,
                'gender'        => $data['gender'] ?? null,
                'nationality'   => $data['nationality'] ?? null,
                'hire_date'     => $data['hire_date'],
                'job_title'     => $data['job_title'],
                'base_salary'   => $data['base_salary'],
                'salary_type'   => $data['salary_type'] ?? 'monthly',
                'bank_name'     => $data['bank_name'] ?? null,
                'bank_account'  => $data['bank_account'] ?? null,
                'emergency_contact_name'  => $data['emergency_contact_name'] ?? null,
                'emergency_contact_phone' => $data['emergency_contact_phone'] ?? null,
            ]);

            return $employee;
        });

        return response()->json($employee->load('user', 'branch', 'department'), 201);
    }

    public function show(Employee $employee)
    {
        return response()->json($employee->load('user', 'branch', 'department', 'leaveRequests', 'payrolls'));
    }

    public function update(Request $request, Employee $employee)
    {
        $data = $request->validate([
            'name'          => 'sometimes|string',
            'branch_id'     => 'sometimes|exists:branches,id',
            'department_id' => 'nullable|exists:departments,id',
            'hire_date'     => 'sometimes|date',
            'job_title'     => 'sometimes|string',
            'base_salary'   => 'sometimes|numeric|min:0',
            'salary_type'   => 'nullable|in:monthly,daily,hourly',
            'is_active'     => 'boolean',
        ]);

        DB::transaction(function () use ($data, $employee) {
            if (isset($data['name'])) {
                $employee->user->update(['name' => $data['name']]);
            }
            $employee->update($data);
        });

        return response()->json($employee->load('user', 'branch', 'department'));
    }

    public function destroy(Employee $employee)
    {
        $employee->delete();
        $employee->user->delete();

        return response()->json(null, 204);
    }
}

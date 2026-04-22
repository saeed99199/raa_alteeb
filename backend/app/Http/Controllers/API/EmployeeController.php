<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class EmployeeController extends Controller
{
    public function index(Request $request)
    {
        $branchId = $request->user()->isSuperAdmin()
            ? $request->input('branch_id')
            : $request->user()->branch_id;

        $employees = Employee::with(['user.role.permissions', 'user.permissions', 'branch', 'department'])
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->when($request->search, fn($q) => $q->whereHas('user', fn($q) => $q->where('name', 'like', "%{$request->search}%")))
            ->paginate($request->input('per_page', 20));

        $employees->getCollection()->transform(function ($employee) {
            $employee->setAttribute('permission_names', $employee->user?->permissionNames() ?? []);
            return $employee;
        });

        return response()->json($employees);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'             => 'required|string',
            'email'            => 'required|email|unique:users',
            'password'         => 'required|min:8',
            'role_id'          => 'required|exists:roles,id',
            'permission_names' => 'nullable|array',
            'permission_names.*' => 'string|exists:permissions,name',
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
            'identity_pdf'     => 'nullable|file|mimes:pdf|max:10240',
            'contract_pdf'     => 'nullable|file|mimes:pdf|max:10240',
            'cv_pdf'           => 'nullable|file|mimes:pdf|max:10240',
            'qualifications_pdf' => 'nullable|file|mimes:pdf|max:10240',
        ]);

        $documentPaths = $this->storeUploadedDocuments($request);

        $employee = DB::transaction(function () use ($data, $documentPaths) {
            $user = User::create([
                'name'      => $data['name'],
                'email'     => $data['email'],
                'password'  => $data['password'],
                'role_id'   => $data['role_id'],
                'branch_id' => $data['branch_id'],
            ]);

            if (! empty($data['permission_names'])) {
                $ids = \App\Models\Permission::whereIn('name', $data['permission_names'])->pluck('id');
                $user->permissions()->sync($ids);
            }

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
                'identity_pdf' => $documentPaths['identity_pdf'] ?? null,
                'contract_pdf' => $documentPaths['contract_pdf'] ?? null,
                'cv_pdf' => $documentPaths['cv_pdf'] ?? null,
                'qualifications_pdf' => $documentPaths['qualifications_pdf'] ?? null,
            ]);

            return $employee;
        });

        $employee->load('user.role.permissions', 'user.permissions', 'branch', 'department');
        $employee->setAttribute('permission_names', $employee->user?->permissionNames() ?? []);

        return response()->json($employee, 201);
    }

    public function show(Employee $employee)
    {
        $employee->load('user.role.permissions', 'user.permissions', 'branch', 'department', 'leaveRequests', 'payrolls');
        $employee->setAttribute('permission_names', $employee->user?->permissionNames() ?? []);

        return response()->json($employee);
    }

    public function update(Request $request, Employee $employee)
    {
        $data = $request->validate([
            'name'          => 'sometimes|string',
            'email'         => 'sometimes|email|unique:users,email,' . $employee->user_id,
            'password'      => 'nullable|min:8',
            'role_id'       => 'sometimes|exists:roles,id',
            'permission_names' => 'nullable|array',
            'permission_names.*' => 'string|exists:permissions,name',
            'branch_id'     => 'sometimes|exists:branches,id',
            'department_id' => 'nullable|exists:departments,id',
            'hire_date'     => 'sometimes|date',
            'job_title'     => 'sometimes|string',
            'base_salary'   => 'sometimes|numeric|min:0',
            'salary_type'   => 'nullable|in:monthly,daily,hourly',
            'is_active'     => 'boolean',
            'identity_pdf'     => 'nullable|file|mimes:pdf|max:10240',
            'contract_pdf'     => 'nullable|file|mimes:pdf|max:10240',
            'cv_pdf'           => 'nullable|file|mimes:pdf|max:10240',
            'qualifications_pdf' => 'nullable|file|mimes:pdf|max:10240',
            'remove_identity_pdf' => 'nullable|boolean',
            'remove_contract_pdf' => 'nullable|boolean',
            'remove_cv_pdf' => 'nullable|boolean',
            'remove_qualifications_pdf' => 'nullable|boolean',
        ]);

        DB::transaction(function () use ($data, $employee, $request) {
            $userPayload = [];
            if (isset($data['name'])) {
                $userPayload['name'] = $data['name'];
            }
            if (isset($data['email'])) {
                $userPayload['email'] = $data['email'];
            }
            if (isset($data['role_id'])) {
                $userPayload['role_id'] = $data['role_id'];
            }
            if (! empty($data['password'])) {
                $userPayload['password'] = $data['password'];
            }
            if (isset($data['branch_id'])) {
                $userPayload['branch_id'] = $data['branch_id'];
            }
            if (array_key_exists('is_active', $data)) {
                $userPayload['is_active'] = $data['is_active'];
            }

            if (! empty($userPayload)) {
                $employee->user->update($userPayload);
            }

            if (array_key_exists('permission_names', $data)) {
                $ids = \App\Models\Permission::whereIn('name', $data['permission_names'] ?? [])->pluck('id');
                $employee->user->permissions()->sync($ids);
            }

            $documentFields = ['identity_pdf', 'contract_pdf', 'cv_pdf', 'qualifications_pdf'];
            $employeePayload = collect($data)->except([
                'email', 'password', 'role_id', 'permission_names',
                'identity_pdf', 'contract_pdf', 'cv_pdf', 'qualifications_pdf',
                'remove_identity_pdf', 'remove_contract_pdf', 'remove_cv_pdf', 'remove_qualifications_pdf',
            ])->toArray();

            foreach ($documentFields as $field) {
                $removeField = 'remove_' . $field;

                if (!empty($data[$removeField]) && !empty($employee->{$field})) {
                    Storage::disk('public')->delete($employee->{$field});
                    $employeePayload[$field] = null;
                }

                if ($request->hasFile($field)) {
                    if (!empty($employee->{$field})) {
                        Storage::disk('public')->delete($employee->{$field});
                    }

                    $employeePayload[$field] = $request->file($field)->store('employees/documents', 'public');
                }
            }

            $employee->update($employeePayload);
        });

        $employee->load('user.role.permissions', 'user.permissions', 'branch', 'department');
        $employee->setAttribute('permission_names', $employee->user?->permissionNames() ?? []);

        return response()->json($employee);
    }

    public function destroy(Employee $employee)
    {
        foreach (['identity_pdf', 'contract_pdf', 'cv_pdf', 'qualifications_pdf'] as $field) {
            if (!empty($employee->{$field})) {
                Storage::disk('public')->delete($employee->{$field});
            }
        }

        $employee->delete();
        $employee->user->delete();

        return response()->json(null, 204);
    }

    private function storeUploadedDocuments(Request $request): array
    {
        $documents = [];

        foreach (['identity_pdf', 'contract_pdf', 'cv_pdf', 'qualifications_pdf'] as $field) {
            if ($request->hasFile($field)) {
                $documents[$field] = $request->file($field)->store('employees/documents', 'public');
            }
        }

        return $documents;
    }
}

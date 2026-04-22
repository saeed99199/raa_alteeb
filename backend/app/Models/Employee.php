<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Employee extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id', 'branch_id', 'department_id', 'employee_code',
        'national_id', 'date_of_birth', 'gender', 'nationality',
        'hire_date', 'job_title', 'base_salary', 'salary_type',
        'bank_name', 'bank_account',
        'emergency_contact_name', 'emergency_contact_phone',
        'identity_pdf', 'contract_pdf', 'cv_pdf', 'qualifications_pdf',
        'is_active',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'hire_date'     => 'date',
        'base_salary'   => 'decimal:2',
        'is_active'     => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function attendance()
    {
        return $this->hasMany(Attendance::class);
    }

    public function leaveRequests()
    {
        return $this->hasMany(LeaveRequest::class);
    }

    public function payrolls()
    {
        return $this->hasMany(Payroll::class);
    }
}

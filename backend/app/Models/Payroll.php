<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payroll extends Model
{
    protected $fillable = [
        'employee_id', 'branch_id', 'pay_year', 'pay_month', 'base_salary', 'overtime_pay',
        'bonuses', 'deductions', 'tax_deduction', 'net_salary', 'status', 'paid_at', 'notes',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}

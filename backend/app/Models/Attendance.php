<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    protected $table = 'attendance';

    protected $fillable = [
        'employee_id', 'date', 'check_in', 'check_out', 'worked_hours',
        'overtime_hours', 'status', 'notes',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeaveType extends Model
{
    protected $fillable = ['name', 'name_ar', 'days_per_year', 'is_paid'];

    protected $casts = ['is_paid' => 'boolean'];
}

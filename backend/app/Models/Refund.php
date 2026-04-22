<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Refund extends Model
{
    protected $fillable = [
        'refund_number', 'sale_id', 'processed_by', 'refund_amount', 'method', 'reason',
    ];

    public function items()
    {
        return $this->hasMany(RefundItem::class);
    }

    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }

    public function processor()
    {
        return $this->belongsTo(User::class, 'processed_by');
    }
}

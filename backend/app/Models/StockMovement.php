<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockMovement extends Model
{
    protected $fillable = [
        'product_id', 'branch_id', 'type', 'quantity', 'balance_after',
        'reference_type', 'reference_id', 'created_by', 'notes',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}

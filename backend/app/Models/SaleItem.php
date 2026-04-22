<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SaleItem extends Model
{
    protected $fillable = [
        'sale_id', 'product_id', 'product_name', 'unit_price', 'quantity',
        'discount_percent', 'tax_rate', 'line_total',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}

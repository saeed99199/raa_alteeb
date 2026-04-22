<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductBranchStock extends Model
{
    protected $table = 'product_branch_stock';

    protected $fillable = ['product_id', 'branch_id', 'quantity'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function isLowStock(): bool
    {
        return $this->quantity <= $this->product->low_stock_threshold;
    }
}

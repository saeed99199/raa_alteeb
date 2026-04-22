<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name', 'name_ar', 'barcode', 'sku', 'category_id', 'supplier_id',
        'description', 'cost_price', 'sale_price', 'tax_rate',
        'unit', 'low_stock_threshold', 'image', 'is_active',
    ];

    protected $casts = [
        'cost_price'          => 'decimal:2',
        'sale_price'          => 'decimal:2',
        'tax_rate'            => 'decimal:2',
        'low_stock_threshold' => 'integer',
        'is_active'           => 'boolean',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function branchStock()
    {
        return $this->hasMany(ProductBranchStock::class);
    }

    public function stockMovements()
    {
        return $this->hasMany(StockMovement::class);
    }

    public function getStockForBranch(int $branchId): int
    {
        return $this->branchStock()->where('branch_id', $branchId)->value('quantity') ?? 0;
    }
}

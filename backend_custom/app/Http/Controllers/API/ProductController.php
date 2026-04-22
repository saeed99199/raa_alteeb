<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductBranchStock;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $branchId = $request->input('branch_id', $request->user()->branch_id);

        $query = Product::with(['category', 'supplier'])
            ->when($request->search, fn($q) => $q->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                    ->orWhere('barcode', 'like', "%{$request->search}%")
                    ->orWhere('sku', 'like', "%{$request->search}%");
            }))
            ->when($request->category_id, fn($q) => $q->where('category_id', $request->category_id))
            ->when($request->is_active !== null, fn($q) => $q->where('is_active', $request->boolean('is_active')))
            ->withCount(['branchStock as branch_stock' => fn($q) => $q->where('branch_id', $branchId)->select(DB::raw('sum(quantity)'))]);

        return response()->json($query->paginate($request->input('per_page', 20)));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'                => 'required|string|max:200',
            'name_ar'             => 'nullable|string|max:200',
            'barcode'             => 'nullable|string|unique:products',
            'sku'                 => 'nullable|string|unique:products',
            'category_id'         => 'nullable|exists:categories,id',
            'supplier_id'         => 'nullable|exists:suppliers,id',
            'description'         => 'nullable|string',
            'cost_price'          => 'required|numeric|min:0',
            'sale_price'          => 'required|numeric|min:0',
            'tax_rate'            => 'nullable|numeric|min:0|max:100',
            'unit'                => 'nullable|string|max:30',
            'low_stock_threshold' => 'nullable|integer|min:0',
            'is_active'           => 'boolean',
        ]);

        $product = Product::create($data);

        return response()->json($product->load('category', 'supplier'), 201);
    }

    public function show(Product $product)
    {
        return response()->json($product->load('category', 'supplier', 'branchStock.branch'));
    }

    public function update(Request $request, Product $product)
    {
        $data = $request->validate([
            'name'                => 'sometimes|string|max:200',
            'name_ar'             => 'nullable|string|max:200',
            'barcode'             => 'nullable|string|unique:products,barcode,' . $product->id,
            'sku'                 => 'nullable|string|unique:products,sku,' . $product->id,
            'category_id'         => 'nullable|exists:categories,id',
            'supplier_id'         => 'nullable|exists:suppliers,id',
            'description'         => 'nullable|string',
            'cost_price'          => 'sometimes|numeric|min:0',
            'sale_price'          => 'sometimes|numeric|min:0',
            'tax_rate'            => 'nullable|numeric|min:0|max:100',
            'unit'                => 'nullable|string|max:30',
            'low_stock_threshold' => 'nullable|integer|min:0',
            'is_active'           => 'boolean',
        ]);

        $product->update($data);

        return response()->json($product->load('category', 'supplier'));
    }

    public function destroy(Product $product)
    {
        $product->delete();

        return response()->json(null, 204);
    }

    public function findByBarcode(string $barcode)
    {
        $product = Product::where('barcode', $barcode)->with('category')->firstOrFail();

        return response()->json($product);
    }

    public function lowStock(Request $request)
    {
        $branchId = $request->input('branch_id', $request->user()->branch_id);

        $stocks = ProductBranchStock::with('product.category')
            ->where('branch_id', $branchId)
            ->whereColumn('quantity', '<=', DB::raw('(SELECT low_stock_threshold FROM products WHERE products.id = product_branch_stock.product_id)'))
            ->paginate(20);

        return response()->json($stocks);
    }

    public function adjustStock(Request $request, Product $product)
    {
        $data = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'quantity'  => 'required|integer',
            'notes'     => 'nullable|string',
        ]);

        DB::transaction(function () use ($data, $product, $request) {
            $stock = ProductBranchStock::firstOrCreate(
                ['product_id' => $product->id, 'branch_id' => $data['branch_id']],
                ['quantity'   => 0]
            );

            $stock->increment('quantity', $data['quantity']);

            StockMovement::create([
                'product_id'    => $product->id,
                'branch_id'     => $data['branch_id'],
                'type'          => 'adjustment',
                'quantity'      => $data['quantity'],
                'balance_after' => $stock->fresh()->quantity,
                'created_by'    => $request->user()->id,
                'notes'         => $data['notes'] ?? null,
            ]);
        });

        return response()->json(['message' => 'Stock adjusted successfully.']);
    }
}

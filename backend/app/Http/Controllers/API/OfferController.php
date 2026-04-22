<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Offer;
use Illuminate\Http\Request;

class OfferController extends Controller
{
    public function index(Request $request)
    {
        $branchId = $request->user()->isSuperAdmin()
            ? $request->input('branch_id')
            : $request->user()->branch_id;

        $query = Offer::query()
            ->with('branch:id,name,code')
            ->when($branchId, fn($q) => $q->where(function ($sub) use ($branchId) {
                $sub->whereNull('branch_id')->orWhere('branch_id', $branchId);
            }))
            ->when($request->filled('is_active'), fn($q) => $q->where('is_active', (bool) $request->boolean('is_active')))
            ->when($request->search, fn($q) => $q->where(function ($sub) use ($request) {
                $term = (string) $request->search;
                $sub->where('name', 'like', "%{$term}%")
                    ->orWhere('code', 'like', "%{$term}%");
            }))
            ->orderByDesc('created_at');

        return response()->json($query->paginate($request->input('per_page', 20)));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:offers,code',
            'discount_type' => 'required|in:percent,fixed',
            'discount_value' => 'required|numeric|min:0.01',
            'min_subtotal' => 'nullable|numeric|min:0',
            'max_discount' => 'nullable|numeric|min:0',
            'branch_id' => 'nullable|exists:branches,id',
            'starts_at' => 'nullable|date',
            'ends_at' => 'nullable|date|after_or_equal:starts_at',
            'usage_limit' => 'nullable|integer|min:1',
            'is_active' => 'nullable|boolean',
            'notes' => 'nullable|string',
        ]);

        $data['code'] = strtoupper(trim($data['code']));
        $data['min_subtotal'] = $data['min_subtotal'] ?? 0;
        $data['is_active'] = $data['is_active'] ?? true;

        if (($data['discount_type'] ?? null) === 'percent' && (float) $data['discount_value'] > 100) {
            return response()->json(['message' => 'نسبة الخصم يجب أن تكون بين 0 و 100.'], 422);
        }

        $offer = Offer::create($data);

        return response()->json($offer->load('branch:id,name,code'), 201);
    }

    public function update(Request $request, Offer $offer)
    {
        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'code' => 'sometimes|required|string|max:50|unique:offers,code,' . $offer->id,
            'discount_type' => 'sometimes|required|in:percent,fixed',
            'discount_value' => 'sometimes|required|numeric|min:0.01',
            'min_subtotal' => 'sometimes|nullable|numeric|min:0',
            'max_discount' => 'sometimes|nullable|numeric|min:0',
            'branch_id' => 'sometimes|nullable|exists:branches,id',
            'starts_at' => 'sometimes|nullable|date',
            'ends_at' => 'sometimes|nullable|date|after_or_equal:starts_at',
            'usage_limit' => 'sometimes|nullable|integer|min:1',
            'used_count' => 'sometimes|nullable|integer|min:0',
            'is_active' => 'sometimes|boolean',
            'notes' => 'sometimes|nullable|string',
        ]);

        if (isset($data['code'])) {
            $data['code'] = strtoupper(trim($data['code']));
        }

        $effectiveType = $data['discount_type'] ?? $offer->discount_type;
        $effectiveValue = isset($data['discount_value']) ? (float) $data['discount_value'] : (float) $offer->discount_value;

        if ($effectiveType === 'percent' && $effectiveValue > 100) {
            return response()->json(['message' => 'نسبة الخصم يجب أن تكون بين 0 و 100.'], 422);
        }

        $offer->update($data);

        return response()->json($offer->fresh()->load('branch:id,name,code'));
    }

    public function destroy(Offer $offer)
    {
        $offer->delete();

        return response()->json(['message' => 'تم حذف العرض بنجاح.']);
    }
}

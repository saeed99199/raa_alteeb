<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class UserAdminController extends Controller
{
    public function index(Request $request)
    {
        $query = User::with(['role', 'branch'])
            ->when($request->search, function ($q) use ($request) {
                $q->where(function ($q2) use ($request) {
                    $q2->where('name', 'like', "%{$request->search}%")
                        ->orWhere('email', 'like', "%{$request->search}%");
                });
            })
            ->when($request->role_id, fn ($q) => $q->where('role_id', $request->role_id))
            ->when($request->branch_id, fn ($q) => $q->where('branch_id', $request->branch_id))
            ->orderBy('name');

        return response()->json($query->paginate($request->input('per_page', 30)));
    }

    public function update(Request $request, User $user)
    {
        $data = $request->validate([
            'name'      => 'sometimes|string',
            'email'     => 'sometimes|email|unique:users,email,' . $user->id,
            'role_id'   => 'sometimes|exists:roles,id',
            'branch_id' => 'nullable|exists:branches,id',
            'is_active' => 'sometimes|boolean',
            'password'  => 'nullable|min:8',
        ]);

        if (isset($data['password'])) {
            $user->update(['password' => $data['password']]);
            unset($data['password']);
        }

        $user->update($data);

        $user->load('role', 'branch');

        return response()->json($user);
    }

    public function toggleActive(User $user)
    {
        $user->update(['is_active' => !$user->is_active]);

        return response()->json(['is_active' => $user->is_active]);
    }
}

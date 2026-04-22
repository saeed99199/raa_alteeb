<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Permission;
use App\Models\Role;

class MetaController extends Controller
{
    public function roles()
    {
        $roles = Role::query()
            ->select(['id', 'name', 'display_name'])
            ->whereNotIn('name', ['super_admin'])
            ->orderBy('id')
            ->get();

        return response()->json($roles);
    }

    public function branches()
    {
        $branches = Branch::query()
            ->select(['id', 'name', 'code', 'is_active'])
            ->orderBy('name')
            ->get();

        return response()->json($branches);
    }

    public function permissions()
    {
        $permissions = Permission::query()
            ->select(['id', 'name', 'module'])
            ->orderBy('module')
            ->orderBy('name')
            ->get();

        return response()->json($permissions);
    }
}

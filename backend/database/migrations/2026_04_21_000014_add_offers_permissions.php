<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::table('permissions')->insertOrIgnore([
            [
                'name' => 'offers.manage',
                'module' => 'sales',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'tab.sales.offers',
                'module' => 'menu',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        $managerRoleId = DB::table('roles')->where('name', 'branch_manager')->value('id');

        if ($managerRoleId) {
            $permissionIds = DB::table('permissions')
                ->whereIn('name', ['offers.manage', 'tab.sales.offers'])
                ->pluck('id');

            foreach ($permissionIds as $permissionId) {
                DB::table('role_permissions')->insertOrIgnore([
                    'role_id' => $managerRoleId,
                    'permission_id' => $permissionId,
                ]);
            }
        }
    }

    public function down(): void
    {
        $permissionIds = DB::table('permissions')
            ->whereIn('name', ['offers.manage', 'tab.sales.offers'])
            ->pluck('id');

        if ($permissionIds->isNotEmpty()) {
            DB::table('role_permissions')->whereIn('permission_id', $permissionIds)->delete();
            DB::table('permissions')->whereIn('id', $permissionIds)->delete();
        }
    }
};

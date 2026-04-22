<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Roles
        $roles = [
            ['name' => 'super_admin',    'display_name' => 'Super Admin'],
            ['name' => 'admin',          'display_name' => 'Admin'],
            ['name' => 'branch_manager', 'display_name' => 'Branch Manager'],
            ['name' => 'cashier',        'display_name' => 'Cashier'],
            ['name' => 'hr_manager',     'display_name' => 'HR Manager'],
            ['name' => 'employee',       'display_name' => 'Employee'],
        ];

        foreach ($roles as $role) {
            DB::table('roles')->insertOrIgnore($role + ['created_at' => now(), 'updated_at' => now()]);
        }

        // Permissions
        $permissions = [
            // Inventory
            ['name' => 'inventory.view',   'module' => 'inventory'],
            ['name' => 'inventory.create', 'module' => 'inventory'],
            ['name' => 'inventory.edit',   'module' => 'inventory'],
            ['name' => 'inventory.delete', 'module' => 'inventory'],
            // Sales
            ['name' => 'sales.view',       'module' => 'sales'],
            ['name' => 'sales.create',     'module' => 'sales'],
            ['name' => 'sales.refund',     'module' => 'sales'],
            // HR
            ['name' => 'hr.view',          'module' => 'hr'],
            ['name' => 'hr.create',        'module' => 'hr'],
            ['name' => 'hr.edit',          'module' => 'hr'],
            ['name' => 'hr.payroll',       'module' => 'hr'],
            // Reports
            ['name' => 'reports.view',     'module' => 'reports'],
            ['name' => 'reports.export',   'module' => 'reports'],
            // Branches
            ['name' => 'branches.manage',  'module' => 'branches'],
        ];

        foreach ($permissions as $perm) {
            DB::table('permissions')->insertOrIgnore($perm + ['created_at' => now(), 'updated_at' => now()]);
        }

        // Assign all permissions to super_admin
        $superAdminId = DB::table('roles')->where('name', 'super_admin')->value('id');
        $allPermIds   = DB::table('permissions')->pluck('id');
        foreach ($allPermIds as $pid) {
            DB::table('role_permissions')->insertOrIgnore(['role_id' => $superAdminId, 'permission_id' => $pid]);
        }

        // Branch Manager permissions
        $managerRole = DB::table('roles')->where('name', 'branch_manager')->value('id');
        $managerPerms = DB::table('permissions')
            ->whereIn('name', ['inventory.view', 'inventory.create', 'inventory.edit', 'sales.view', 'sales.create', 'sales.refund', 'hr.view', 'reports.view', 'reports.export'])
            ->pluck('id');
        foreach ($managerPerms as $pid) {
            DB::table('role_permissions')->insertOrIgnore(['role_id' => $managerRole, 'permission_id' => $pid]);
        }

        // Cashier permissions
        $cashierRole = DB::table('roles')->where('name', 'cashier')->value('id');
        $cashierPerms = DB::table('permissions')
            ->whereIn('name', ['inventory.view', 'sales.view', 'sales.create'])
            ->pluck('id');
        foreach ($cashierPerms as $pid) {
            DB::table('role_permissions')->insertOrIgnore(['role_id' => $cashierRole, 'permission_id' => $pid]);
        }

        // Branches
        $branch1 = DB::table('branches')->insertGetId([
            'name' => 'Main Branch', 'name_ar' => 'الفرع الرئيسي',
            'code' => 'MAIN', 'address' => 'King Fahad Rd, Riyadh',
            'city' => 'Riyadh', 'phone' => '+966-11-0001', 'email' => 'main@raa-alteeb.com',
            'is_active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);

        $branch2 = DB::table('branches')->insertGetId([
            'name' => 'North Branch', 'name_ar' => 'الفرع الشمالي',
            'code' => 'NORTH', 'address' => 'Olaya St, Riyadh',
            'city' => 'Riyadh', 'phone' => '+966-11-0002', 'email' => 'north@raa-alteeb.com',
            'is_active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);

        // Super Admin user
        DB::table('users')->insertOrIgnore([
            'name'       => 'Super Admin',
            'email'      => 'admin@raa-alteeb.com',
            'password'   => Hash::make('Admin@123456'),
            'role_id'    => $superAdminId,
            'branch_id'  => null,
            'locale'     => 'en',
            'is_active'  => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Sample categories
        $catId = DB::table('categories')->insertGetId([
            'name' => 'Beverages', 'name_ar' => 'المشروبات',
            'is_active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);

        // Sample supplier
        $supplierId = DB::table('suppliers')->insertGetId([
            'name' => 'Al-Najm Supplies', 'company' => 'Al-Najm Trading Co.',
            'phone' => '+966-12-3456', 'email' => 'supplier@najm.com',
            'is_active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);

        // Sample products
        $products = [
            ['name' => 'Mineral Water 500ml', 'name_ar' => 'مياه معدنية 500مل', 'barcode' => '6281234500001', 'sku' => 'WAT-500', 'cost_price' => 0.50, 'sale_price' => 1.00, 'tax_rate' => 15, 'unit' => 'pcs', 'low_stock_threshold' => 20],
            ['name' => 'Orange Juice 1L',     'name_ar' => 'عصير برتقال 1 لتر',  'barcode' => '6281234500002', 'sku' => 'JUS-ORN', 'cost_price' => 2.50, 'sale_price' => 4.50, 'tax_rate' => 15, 'unit' => 'pcs', 'low_stock_threshold' => 10],
            ['name' => 'Green Tea Bags x20',  'name_ar' => 'شاي أخضر 20 كيس',   'barcode' => '6281234500003', 'sku' => 'TEA-GRN', 'cost_price' => 5.00, 'sale_price' => 9.00, 'tax_rate' => 15, 'unit' => 'box', 'low_stock_threshold' => 5],
        ];

        foreach ($products as $prod) {
            $pid = DB::table('products')->insertGetId(array_merge($prod, [
                'category_id' => $catId,
                'supplier_id' => $supplierId,
                'is_active'   => true,
                'created_at'  => now(),
                'updated_at'  => now(),
            ]));

            // Initial stock
            foreach ([$branch1, $branch2] as $bid) {
                DB::table('product_branch_stock')->insertOrIgnore([
                    'product_id' => $pid, 'branch_id' => $bid,
                    'quantity'   => rand(50, 200),
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            }
        }

        // Tax setting
        DB::table('tax_settings')->insertOrIgnore([
            'name' => 'VAT', 'rate' => 15.00, 'is_default' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        // Leave types
        foreach ([
            ['name' => 'Annual Leave', 'name_ar' => 'إجازة سنوية', 'days_per_year' => 21, 'is_paid' => true],
            ['name' => 'Sick Leave',   'name_ar' => 'إجازة مرضية', 'days_per_year' => 14, 'is_paid' => true],
            ['name' => 'Emergency',    'name_ar' => 'طارئ',         'days_per_year' => 3,  'is_paid' => false],
        ] as $lt) {
            DB::table('leave_types')->insertOrIgnore($lt + ['created_at' => now(), 'updated_at' => now()]);
        }
    }
}

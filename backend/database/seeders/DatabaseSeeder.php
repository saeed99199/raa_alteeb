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
            ['name' => 'sales.edit',       'module' => 'sales'],
            ['name' => 'sales.delete',     'module' => 'sales'],
            ['name' => 'sales.refund',     'module' => 'sales'],
            ['name' => 'offers.manage',    'module' => 'sales'],
            // HR
            ['name' => 'hr.view',          'module' => 'hr'],
            ['name' => 'hr.create',        'module' => 'hr'],
            ['name' => 'hr.edit',          'module' => 'hr'],
            ['name' => 'hr.payroll',       'module' => 'hr'],
            ['name' => 'attendance.self.check_in',  'module' => 'hr'],
            ['name' => 'attendance.self.check_out', 'module' => 'hr'],
            ['name' => 'leaves.request',            'module' => 'hr'],
            ['name' => 'tasks.view',       'module' => 'hr'],
            ['name' => 'tasks.create',     'module' => 'hr'],
            ['name' => 'tasks.edit',       'module' => 'hr'],
            ['name' => 'tasks.delete',     'module' => 'hr'],
            ['name' => 'tasks.manage_all', 'module' => 'hr'],
            // Reports
            ['name' => 'reports.view',     'module' => 'reports'],
            ['name' => 'reports.export',   'module' => 'reports'],
            // Branches
            ['name' => 'branches.manage',  'module' => 'branches'],
            // Menu tabs (for checkbox-driven visibility)
            ['name' => 'tab.dashboard',                'module' => 'menu'],
            ['name' => 'tab.kanban',                   'module' => 'menu'],
            ['name' => 'tab.inventory.products',       'module' => 'menu'],
            ['name' => 'tab.inventory.categories',     'module' => 'menu'],
            ['name' => 'tab.inventory.suppliers',      'module' => 'menu'],
            ['name' => 'tab.inventory.purchase_orders','module' => 'menu'],
            ['name' => 'tab.inventory.stock_transfers','module' => 'menu'],
            ['name' => 'tab.sales.pos',                'module' => 'menu'],
            ['name' => 'tab.sales.invoices',           'module' => 'menu'],
            ['name' => 'tab.sales.refunds',            'module' => 'menu'],
            ['name' => 'tab.sales.customers',          'module' => 'menu'],
            ['name' => 'tab.sales.offers',             'module' => 'menu'],
            ['name' => 'tab.hr.employees',             'module' => 'menu'],
            ['name' => 'tab.hr.attendance',            'module' => 'menu'],
            ['name' => 'tab.hr.payroll',               'module' => 'menu'],
            ['name' => 'tab.hr.leaves',                'module' => 'menu'],
            ['name' => 'tab.hr.tasks',                 'module' => 'menu'],
            ['name' => 'tab.reports.sales',            'module' => 'menu'],
            ['name' => 'tab.reports.inventory',        'module' => 'menu'],
            ['name' => 'tab.reports.hr',               'module' => 'menu'],
            ['name' => 'tab.admin.branches',           'module' => 'menu'],
            ['name' => 'tab.admin.users',              'module' => 'menu'],
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
            ->whereIn('name', ['inventory.view', 'inventory.create', 'inventory.edit', 'sales.view', 'sales.create', 'sales.refund', 'offers.manage', 'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.delete', 'tasks.manage_all', 'hr.view', 'reports.view', 'reports.export', 'tab.dashboard', 'tab.kanban', 'tab.inventory.products', 'tab.inventory.categories', 'tab.inventory.suppliers', 'tab.inventory.purchase_orders', 'tab.inventory.stock_transfers', 'tab.sales.pos', 'tab.sales.invoices', 'tab.sales.refunds', 'tab.sales.customers', 'tab.sales.offers', 'tab.hr.attendance', 'tab.hr.tasks', 'tab.reports.sales', 'tab.reports.inventory', 'tab.reports.hr'])
            ->pluck('id');
        foreach ($managerPerms as $pid) {
            DB::table('role_permissions')->insertOrIgnore(['role_id' => $managerRole, 'permission_id' => $pid]);
        }

        // Cashier permissions
        $cashierRole = DB::table('roles')->where('name', 'cashier')->value('id');
        $cashierPerms = DB::table('permissions')
            ->whereIn('name', ['inventory.view', 'sales.view', 'sales.create', 'tab.dashboard', 'tab.sales.pos', 'tab.sales.invoices'])
            ->pluck('id');
        foreach ($cashierPerms as $pid) {
            DB::table('role_permissions')->insertOrIgnore(['role_id' => $cashierRole, 'permission_id' => $pid]);
        }

        // HR Manager permissions
        $hrManagerRole = DB::table('roles')->where('name', 'hr_manager')->value('id');
        $hrPerms = DB::table('permissions')
            ->whereIn('name', ['hr.view', 'hr.create', 'hr.edit', 'hr.payroll', 'reports.view', 'leaves.request', 'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.delete', 'tasks.manage_all', 'tab.dashboard', 'tab.kanban', 'tab.hr.employees', 'tab.hr.attendance', 'tab.hr.payroll', 'tab.hr.leaves', 'tab.hr.tasks', 'tab.reports.hr'])
            ->pluck('id');
        foreach ($hrPerms as $pid) {
            DB::table('role_permissions')->insertOrIgnore(['role_id' => $hrManagerRole, 'permission_id' => $pid]);
        }

        // Employee permissions
        $employeeRole = DB::table('roles')->where('name', 'employee')->value('id');
        $employeePerms = DB::table('permissions')
            ->whereIn('name', ['inventory.view', 'sales.view', 'hr.view', 'attendance.self.check_in', 'attendance.self.check_out', 'leaves.request', 'tasks.view', 'tab.dashboard', 'tab.hr.attendance', 'tab.hr.leaves', 'tab.hr.tasks'])
            ->pluck('id');
        foreach ($employeePerms as $pid) {
            DB::table('role_permissions')->insertOrIgnore(['role_id' => $employeeRole, 'permission_id' => $pid]);
        }

        // Branches
        $branch1 = DB::table('branches')->insertGetId([
            'name' => 'Main Branch', 'name_ar' => 'الفرع الرئيسي',
            'code' => 'MAIN', 'address' => 'King Fahad Rd, Riyadh',
            'city' => 'Riyadh', 'phone' => '+966-11-0001', 'email' => 'main@raa-alteeb.com',
            'commercial_register' => '1010123456', 'vat_number' => '300123456700003',
            'is_active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);

        $branch2 = DB::table('branches')->insertGetId([
            'name' => 'North Branch', 'name_ar' => 'الفرع الشمالي',
            'code' => 'NORTH', 'address' => 'Olaya St, Riyadh',
            'city' => 'Riyadh', 'phone' => '+966-11-0002', 'email' => 'north@raa-alteeb.com',
            'commercial_register' => '1010987654', 'vat_number' => '300123456700010',
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

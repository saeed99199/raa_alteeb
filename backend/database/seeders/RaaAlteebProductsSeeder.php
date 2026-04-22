<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class RaaAlteebProductsSeeder extends Seeder
{
    public function run(): void
    {
        $now = Carbon::now();

        // ===== CATEGORIES =====
        $categoryDefs = [
            ['name' => 'Natural Oud',       'name_ar' => 'العود الطبيعي'],
            ['name' => 'Oud Oil',            'name_ar' => 'دهن العود'],
            ['name' => 'Musk',               'name_ar' => 'مسك'],
            ['name' => 'Incense Burners',    'name_ar' => 'المباخر'],
            ['name' => 'Fragrances',         'name_ar' => 'معطرات'],
        ];

        $categoryIds = [];
        foreach ($categoryDefs as $cat) {
            $existing = DB::table('categories')->where('name_ar', $cat['name_ar'])->first();
            if ($existing) {
                $categoryIds[$cat['name_ar']] = $existing->id;
            } else {
                $id = DB::table('categories')->insertGetId([
                    'name'       => $cat['name'],
                    'name_ar'    => $cat['name_ar'],
                    'is_active'  => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
                $categoryIds[$cat['name_ar']] = $id;
            }
        }

        // ===== PRODUCTS =====
        $products = [
            // العود الطبيعي
            ['name' => 'Masqqa Raa Alteeb',           'name_ar' => 'مسقّى راع الطيب',                  'cat' => 'العود الطبيعي',  'price' => 99,  'cost' => 60,  'unit' => 'قطعة'],
            ['name' => 'Oud Moroki Hayy Super',        'name_ar' => 'موروكي حي - سوبر',                 'cat' => 'العود الطبيعي',  'price' => 95,  'cost' => 55,  'unit' => 'قطعة'],
            ['name' => 'Oud Tiger Cambodian - 2oz',    'name_ar' => 'عود تايقر كمبودي - أوقيتين',       'cat' => 'العود الطبيعي',  'price' => 100, 'cost' => 60,  'unit' => 'قطعة'],
            ['name' => 'Oud Awalain Best Deal',        'name_ar' => 'العرض الاقوى لعود الاولين',        'cat' => 'العود الطبيعي',  'price' => 189, 'cost' => 110, 'unit' => 'طقم'],
            ['name' => 'Klementaan Blue Royal Oud',    'name_ar' => 'كلمنتان العود الازرق الملكي',      'cat' => 'العود الطبيعي',  'price' => 120, 'cost' => 70,  'unit' => 'قطعة'],
            ['name' => 'Saffron 1g - 12 boxes',        'name_ar' => '12 علبة زعفران 1 جرام',            'cat' => 'العود الطبيعي',  'price' => 189, 'cost' => 110, 'unit' => 'طقم'],

            // دهن العود
            ['name' => 'Oud Oil Al-Khalidiya',         'name_ar' => 'دهن الخالديّة',                    'cat' => 'دهن العود',      'price' => 199, 'cost' => 120, 'unit' => 'ربع تولة'],
            ['name' => 'Oud Oil Shubra',                'name_ar' => 'دهن شُبرا',                        'cat' => 'دهن العود',      'price' => 250, 'cost' => 150, 'unit' => 'ربع تولة'],
            ['name' => 'Oud Oil Ukkaz',                 'name_ar' => 'دهن عُكاظ',                        'cat' => 'دهن العود',      'price' => 250, 'cost' => 150, 'unit' => 'ربع تولة'],
            ['name' => '3 Cambodian Oils Best Deal',    'name_ar' => 'العرض الاقوى للادهان الكمبودية', 'cat' => 'دهن العود',      'price' => 229, 'cost' => 135, 'unit' => 'طقم'],
            ['name' => '3 Mixed Oils Siyofi Hindi',    'name_ar' => '3 أدهان مخلط سيوفي هندي',         'cat' => 'دهن العود',      'price' => 229, 'cost' => 135, 'unit' => 'طقم'],
            ['name' => 'Elite Oud Oil',                 'name_ar' => 'دهن العود النخبوي',                'cat' => 'دهن العود',      'price' => 350, 'cost' => 210, 'unit' => 'ربع تولة'],
            ['name' => 'Oud Oil Brashin',               'name_ar' => 'دهن عود براشين',                  'cat' => 'دهن العود',      'price' => 199, 'cost' => 120, 'unit' => 'ربع تولة'],
            ['name' => 'Aged Cambodian Oud Oil',        'name_ar' => 'دهن العود الكمبودي المعتّق',      'cat' => 'دهن العود',      'price' => 229, 'cost' => 135, 'unit' => 'ربع تولة'],

            // مسك
            ['name' => 'Elite Musk',                    'name_ar' => 'مسك النخبة',                      'cat' => 'مسك',            'price' => 30,  'cost' => 15,  'unit' => 'ربع تولة'],
            ['name' => 'Pomegranate Musk',              'name_ar' => 'مسك الرمان',                      'cat' => 'مسك',            'price' => 30,  'cost' => 15,  'unit' => 'ربع تولة'],
            ['name' => 'Mulberry Musk',                 'name_ar' => 'مسك التوت',                       'cat' => 'مسك',            'price' => 30,  'cost' => 15,  'unit' => 'ربع تولة'],
            ['name' => 'Musk Al-Khatam',                'name_ar' => 'مسك الختام',                      'cat' => 'مسك',            'price' => 75,  'cost' => 40,  'unit' => 'ربع تولة'],

            // المباخر
            ['name' => 'Syrian Shell Box - Medium',     'name_ar' => 'صندوق صدف صناعة سورية - وسط',    'cat' => 'المباخر',        'price' => 80,  'cost' => 45,  'unit' => 'قطعة'],
            ['name' => 'Syrian Shell Box - Small',      'name_ar' => 'صندوق صدف صناعة سورية - صغير',   'cat' => 'المباخر',        'price' => 40,  'cost' => 22,  'unit' => 'قطعة'],
            ['name' => 'Hailiya Luxury Incense Set',    'name_ar' => 'طقم مباخر حائلية فاخرة',          'cat' => 'المباخر',        'price' => 395, 'cost' => 240, 'unit' => 'طقم'],
            ['name' => 'Small Indian Incense Burner',   'name_ar' => 'مبخرة هنديّة صغيرة',             'cat' => 'المباخر',        'price' => 39,  'cost' => 20,  'unit' => 'قطعة'],

            // معطرات
            ['name' => 'Spray Ria - 250ml',             'name_ar' => 'مرش رِيع - 250 مل',               'cat' => 'معطرات',         'price' => 59,  'cost' => 33,  'unit' => 'قطعة'],
            ['name' => 'Spray Masyyaf - 250ml',         'name_ar' => 'مرش مصّياف - 250 مل',             'cat' => 'معطرات',         'price' => 59,  'cost' => 33,  'unit' => 'قطعة'],
            ['name' => 'Spray Nubl - 250ml',            'name_ar' => 'مرش نُبل - 250 مل',               'cat' => 'معطرات',         'price' => 59,  'cost' => 33,  'unit' => 'قطعة'],
        ];

        foreach ($products as $p) {
            $catId = $categoryIds[$p['cat']] ?? null;
            if (!$catId) continue;

            $existing = DB::table('products')->where('name_ar', $p['name_ar'])->first();

            $payload = [
                'name'                => $p['name'],
                'name_ar'             => $p['name_ar'],
                'category_id'         => $catId,
                'sale_price'          => $p['price'],
                'cost_price'          => $p['cost'],
                'tax_rate'            => 15,
                'unit'                => $p['unit'],
                'low_stock_threshold' => 5,
                'is_active'           => true,
                'updated_at'          => $now,
            ];

            if ($existing) {
                DB::table('products')->where('id', $existing->id)->update($payload);
                continue;
            }

            DB::table('products')->insert($payload + [
                'created_at' => $now,
            ]);
        }

        $this->command->info('✅ Raa Al Teeb categories & products seeded successfully.');
    }
}

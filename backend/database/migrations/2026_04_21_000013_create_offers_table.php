<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('offers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code', 50)->unique();
            $table->enum('discount_type', ['percent', 'fixed']);
            $table->decimal('discount_value', 14, 2);
            $table->decimal('min_subtotal', 14, 2)->default(0);
            $table->decimal('max_discount', 14, 2)->nullable();
            $table->foreignId('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->unsignedInteger('usage_limit')->nullable();
            $table->unsignedInteger('used_count')->default(0);
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->foreignId('discount_offer_id')->nullable()->after('customer_id')->constrained('offers')->nullOnDelete();
            $table->string('discount_code', 50)->nullable()->after('discount_offer_id');
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropConstrainedForeignId('discount_offer_id');
            $table->dropColumn('discount_code');
        });

        Schema::dropIfExists('offers');
    }
};

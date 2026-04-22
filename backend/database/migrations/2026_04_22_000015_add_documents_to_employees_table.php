<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->string('identity_pdf')->nullable()->after('emergency_contact_phone');
            $table->string('contract_pdf')->nullable()->after('identity_pdf');
            $table->string('cv_pdf')->nullable()->after('contract_pdf');
            $table->string('qualifications_pdf')->nullable()->after('cv_pdf');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn(['identity_pdf', 'contract_pdf', 'cv_pdf', 'qualifications_pdf']);
        });
    }
};

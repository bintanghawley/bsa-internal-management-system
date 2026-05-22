<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('finance_transactions') || !Schema::hasColumn('finance_transactions', 'method')) {
            return;
        }

        Schema::table('finance_transactions', function (Blueprint $table) {
            $table->dropColumn('method');
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('finance_transactions') || Schema::hasColumn('finance_transactions', 'method')) {
            return;
        }

        Schema::table('finance_transactions', function (Blueprint $table) {
            $table->enum('method', ['Transfer', 'Tunai', 'QRIS'])->default('Transfer')->after('category');
        });
    }
};

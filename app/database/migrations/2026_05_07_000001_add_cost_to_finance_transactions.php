<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('finance_transactions', function (Blueprint $table) {
            if (!Schema::hasColumn('finance_transactions', 'cost')) {
                $table->decimal('cost', 14, 2)->after('amount')->default(0);
            }
        });

        // Populate cost for finance transactions from linked orders
        DB::statement('UPDATE finance_transactions SET cost = (SELECT COALESCE(SUM(buy_price * quantity), 0) FROM order_items WHERE order_items.order_id = finance_transactions.order_id) WHERE order_id IS NOT NULL');
    }

    public function down(): void
    {
        Schema::table('finance_transactions', function (Blueprint $table) {
            $table->dropColumn('cost');
        });
    }
};

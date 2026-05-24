<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'price_buy')) {
                $table->decimal('price_buy', 14, 2)->after('name')->default(0);
            }
            if (!Schema::hasColumn('products', 'price_sell')) {
                $table->decimal('price_sell', 14, 2)->after('price_buy')->default(0);
            }
        });

        Schema::table('order_items', function (Blueprint $table) {
            if (!Schema::hasColumn('order_items', 'buy_price')) {
                $table->decimal('buy_price', 14, 2)->after('unit_price')->default(0);
            }
        });

        Schema::table('finance_transactions', function (Blueprint $table) {
            if (!Schema::hasColumn('finance_transactions', 'cost')) {
                $table->decimal('cost', 14, 2)->after('amount')->default(0);
            }
        });

        // Copy existing price to price_sell
        DB::table('products')->update([
            'price_sell' => DB::raw('price'),
            'price_buy' => DB::raw('price * 0.8') // Assuming 20% margin for existing data
        ]);

        // Try to populate existing order items buy_price from products
        DB::statement('UPDATE order_items SET buy_price = (SELECT price_buy FROM products WHERE products.id = order_items.product_id) WHERE product_id IS NOT NULL');

        // Populate cost for finance transactions from linked orders
        DB::statement('UPDATE finance_transactions SET cost = (SELECT SUM(buy_price * quantity) FROM order_items WHERE order_items.order_id = finance_transactions.order_id) WHERE order_id IS NOT NULL');
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['price_buy', 'price_sell']);
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn('buy_price');
        });
    }
};

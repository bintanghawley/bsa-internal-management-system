<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('finance_transactions') || !Schema::hasTable('orders')) {
            return;
        }

        if (!Schema::hasColumn('finance_transactions', 'order_id')) {
            Schema::table('finance_transactions', function (Blueprint $table) {
                $table->foreignId('order_id')
                    ->nullable()
                    ->after('id')
                    ->constrained('orders')
                    ->cascadeOnDelete();
            });
        }

        DB::table('orders')
            ->select('id')
            ->orderBy('id')
            ->chunkById(200, function ($orders): void {
                foreach ($orders as $order) {
                    $prefix = 'Pembayaran order #ORD-'.str_pad((string) $order->id, 4, '0', STR_PAD_LEFT);

                    $transactionId = DB::table('finance_transactions')
                        ->whereNull('order_id')
                        ->where('description', 'like', $prefix.'%')
                        ->orderByDesc('id')
                        ->value('id');

                    if (!$transactionId) {
                        continue;
                    }

                    DB::table('finance_transactions')
                        ->where('id', $transactionId)
                        ->update(['order_id' => $order->id]);
                }
            }, 'id');

        Schema::table('finance_transactions', function (Blueprint $table) {
            $table->unique('order_id', 'finance_transactions_order_id_unique');
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('finance_transactions') || !Schema::hasColumn('finance_transactions', 'order_id')) {
            return;
        }

        Schema::table('finance_transactions', function (Blueprint $table) {
            $table->dropUnique('finance_transactions_order_id_unique');
            $table->dropConstrainedForeignId('order_id');
        });
    }
};
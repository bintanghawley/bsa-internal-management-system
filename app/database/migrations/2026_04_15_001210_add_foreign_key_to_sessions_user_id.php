<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('sessions') || !Schema::hasTable('users') || !Schema::hasColumn('sessions', 'user_id')) {
            return;
        }

        DB::table('sessions')
            ->whereNotNull('user_id')
            ->whereNotExists(function ($query): void {
                $query->select(DB::raw(1))
                    ->from('users')
                    ->whereColumn('users.id', 'sessions.user_id');
            })
            ->update(['user_id' => null]);

        Schema::table('sessions', function (Blueprint $table) {
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('sessions') || !Schema::hasColumn('sessions', 'user_id')) {
            return;
        }

        Schema::table('sessions', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
        });
    }
};
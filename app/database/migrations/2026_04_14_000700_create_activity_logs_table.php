<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->dateTime('logged_at');
            $table->string('user_name');
            $table->string('action');
            $table->string('module');
            $table->enum('status', ['sukses', 'warning', 'gagal'])->default('sukses');
            $table->json('metadata')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['module', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};

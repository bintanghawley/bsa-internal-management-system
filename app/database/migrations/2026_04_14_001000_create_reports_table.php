<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->date('report_month');
            $table->string('title');
            $table->foreignId('generated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('total_revenue', 14, 2)->default(0);
            $table->unsignedInteger('total_orders')->default(0);
            $table->unsignedInteger('total_customers')->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('report_month');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};

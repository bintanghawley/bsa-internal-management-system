<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('growth_reports', function (Blueprint $table) {
            $table->id();
            $table->date('period_month');
            $table->decimal('revenue', 14, 2);
            $table->unsignedInteger('new_customers');
            $table->unsignedInteger('total_orders');
            $table->decimal('growth_rate', 6, 2);
            $table->text('summary');
            $table->timestamps();

            $table->unique('period_month');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('growth_reports');
    }
};

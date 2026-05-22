<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('calendar_events', function (Blueprint $table) {
            $table->id();
            $table->date('event_date');
            $table->time('event_time');
            $table->string('title');
            $table->string('type');
            $table->string('location');
            $table->enum('status', ['terjadwal', 'berlangsung', 'selesai'])->default('terjadwal');
            $table->timestamps();

            $table->index(['event_date', 'event_time']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calendar_events');
    }
};

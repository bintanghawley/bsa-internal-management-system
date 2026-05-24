<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CalendarEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'event_date',
        'event_time',
        'title',
        'type',
        'location',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'event_date' => 'date',
        ];
    }
}

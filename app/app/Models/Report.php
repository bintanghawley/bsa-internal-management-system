<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Report extends Model
{
    use HasFactory;

    protected $fillable = [
        'report_month',
        'title',
        'generated_by_user_id',
        'total_revenue',
        'total_orders',
        'total_customers',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'report_month' => 'date',
            'total_revenue' => 'decimal:2',
        ];
    }

    public function generatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by_user_id');
    }
}

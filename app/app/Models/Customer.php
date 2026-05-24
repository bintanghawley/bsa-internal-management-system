<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'phone',
        'address',
        'order_history_count',
        'total_spending',
    ];

    protected function casts(): array
    {
        return [
            'total_spending' => 'decimal:2',
        ];
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }
}

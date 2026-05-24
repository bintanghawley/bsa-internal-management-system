<?php

namespace App\Support;

use App\Models\ActivityLog;
use App\Models\CalendarEvent;
use App\Models\Customer;
use App\Models\FinanceTransaction;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Str;

class DashboardDataMapper
{
    public static function stock(Product $product): array
    {
        return [
            'id' => $product->id,
            'code' => $product->code,
            'name' => $product->name,
            'priceBuy' => (float) $product->price_buy,
            'priceSell' => (float) $product->price_sell,
            'price' => (float) $product->price_sell, // For backward compatibility
            'stock' => (int) $product->stock,
        ];
    }

    public static function order(Order $order): array
    {
        $items = $order->relationLoaded('items')
            ? $order->items
            : $order->items()->get();

        $recorderName = trim((string) ($order->user?->name ?? ''));

        return [
            'id' => $order->id,
            'date' => optional($order->order_date)->format('d.m.y') ?? '',
            'author' => $order->author_name,
            'recorder' => $recorderName !== '' ? $recorderName : '-',
            'customerId' => $order->customer_id,
            'product' => $order->product_name,
            'nominal' => (float) $order->nominal,
            'status' => $order->status,
            'items' => $items->map(fn ($item) => [
                'id' => $item->id,
                'product' => $item->product_name,
                'quantity' => (int) $item->quantity,
                'unitPrice' => (float) $item->unit_price,
                'buyPrice' => (float) $item->buy_price,
                'lineTotal' => (float) $item->line_total,
            ])->values()->all(),
        ];
    }

    public static function customer(Customer $customer): array
    {
        return [
            'id' => $customer->id,
            'name' => $customer->name,
            'phone' => $customer->phone,
            'address' => $customer->address,
            'history' => (int) $customer->order_history_count,
            'total' => (float) $customer->total_spending,
        ];
    }

    public static function activity(ActivityLog $log): array
    {
        return [
            'id' => $log->id,
            'dateTime' => optional($log->logged_at)->format('d.m.y H:i') ?? '',
            'user' => $log->user_name,
            'action' => $log->action,
            'module' => $log->module,
            'status' => $log->status,
        ];
    }

    public static function employee(User $employee): array
    {
        $roleName = strtolower((string) ($employee->role?->name ?? 'karyawan'));

        return [
            'id' => $employee->id,
            'name' => $employee->name,
            'role' => $roleName,
            'position' => $employee->position,
            'division' => $employee->division,
            'phone' => $employee->phone,
            'shift' => $employee->shift,
            'status' => $employee->employment_status,
            'createdAt' => optional($employee->created_at)->format('d.m.y H:i') ?? '',
        ];
    }

    public static function user(User $user): array
    {
        $roleName = strtolower((string) ($user->role?->name ?? 'karyawan'));

        return [
            'id' => $user->id,
            'name' => $user->name,
            'role' => $roleName,
            'createdAt' => optional($user->created_at)->format('d.m.y H:i') ?? '',
        ];
    }

    public static function calendarEvent(CalendarEvent $event): array
    {
        return [
            'id' => $event->id,
            'date' => optional($event->event_date)->format('Y-m-d') ?? '',
            'time' => Str::of((string) $event->event_time)->substr(0, 5)->toString(),
            'title' => $event->title,
            'type' => $event->type,
            'location' => $event->location,
            'status' => $event->status,
        ];
    }

    public static function finance(FinanceTransaction $transaction): array
    {
        return [
            'id' => $transaction->id,
            'orderId' => $transaction->order_id,
            'date' => optional($transaction->transaction_date)->format('d.m.y') ?? '',
            'description' => $transaction->description,
            'category' => $transaction->category,
            'amount' => (float) $transaction->amount,
            'cost' => (float) $transaction->cost,
        ];
    }

    public static function parseDisplayDate(string $value): ?CarbonImmutable
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }

        $timezone = config('app.timezone', 'UTC');

        if (preg_match('/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/', $value, $match)) {
            $day = (int) $match[1];
            $month = (int) $match[2];
            $year = (int) $match[3];
            if ($year < 100) {
                $year += 2000;
            }

            try {
                return CarbonImmutable::create($year, $month, $day, 0, 0, 0, $timezone)->startOfDay();
            } catch (\Throwable) {
                return null;
            }
        }

        $formats = ['Y-m-d', 'd.m.y', 'd.m.Y', 'd/m/y', 'd/m/Y', 'd-m-y', 'd-m-Y'];
        foreach ($formats as $format) {
            try {
                return CarbonImmutable::createFromFormat($format, $value, $timezone)->startOfDay();
            } catch (\Throwable) {
                // Continue trying known formats.
            }
        }

        return null;
    }

    public static function parseDisplayDateTime(string $value): ?CarbonImmutable
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }

        $timezone = config('app.timezone', 'UTC');

        if (preg_match('/^(\d{1,2})[\.\/-](\d{1,2})[\.\/-](\d{2,4})(?:\s+|T)(\d{1,2}):(\d{2})(?::(\d{2}))?$/', $value, $match)) {
            $day = (int) $match[1];
            $month = (int) $match[2];
            $year = (int) $match[3];
            $hour = (int) $match[4];
            $minute = (int) $match[5];
            $second = isset($match[6]) ? (int) $match[6] : 0;
            if ($year < 100) {
                $year += 2000;
            }

            try {
                return CarbonImmutable::create($year, $month, $day, $hour, $minute, $second, $timezone);
            } catch (\Throwable) {
                return null;
            }
        }

        $formats = [
            'd.m.y H:i',
            'd.m.Y H:i',
            'd/m/y H:i',
            'd/m/Y H:i',
            'd-m-y H:i',
            'd-m-Y H:i',
            'Y-m-d H:i',
            'Y-m-d\TH:i',
            'Y-m-d\TH:i:s',
        ];
        foreach ($formats as $format) {
            try {
                return CarbonImmutable::createFromFormat($format, $value, $timezone);
            } catch (\Throwable) {
                // Continue trying known formats.
            }
        }

        return null;
    }

    public static function parseMonthLabel(string $value): ?CarbonImmutable
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }

        $monthMap = [
            'Mei' => 'May',
            'Agu' => 'Aug',
            'Okt' => 'Oct',
            'Des' => 'Dec',
        ];

        $normalized = str_replace(array_keys($monthMap), array_values($monthMap), $value);
        $timestamp = strtotime('1 '.$normalized);

        if ($timestamp === false) {
            return null;
        }

        return CarbonImmutable::createFromTimestamp($timestamp)->startOfMonth();
    }
}

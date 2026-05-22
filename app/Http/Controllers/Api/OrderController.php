<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\FinanceTransaction;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Support\ActivityLogger;
use App\Support\DashboardDataMapper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    public function index(): JsonResponse
    {
        $rows = Order::query()
            ->with(['items', 'user'])
            ->orderByDesc('id')
            ->get()
            ->map(fn (Order $item) => DashboardDataMapper::order($item));

        return response()->json(['data' => $rows]);
    }

    public function store(Request $request): JsonResponse
    {
        [$payload, $customer, $items] = $this->validatedPayload($request);

        $order = DB::transaction(function () use ($payload, $customer, $items): Order {
            $order = Order::create($payload);
            $this->syncOrderItems($order, $items);
            $this->syncStockForOrderChange([], $this->toCommittedQuantities($items, (string) ($payload['status'] ?? '')));
            $this->syncCustomerMetrics($customer);
            $this->syncFinanceTransactionForOrder($order);

            return $order;
        });

        ActivityLogger::log('Tambah Data', 'Pesanan', 'sukses', null, ['id' => $order->id]);

        return response()->json([
            'message' => 'Data pesanan berhasil ditambahkan.',
            'data' => DashboardDataMapper::order($order->refresh()->load(['items', 'user'])),
        ], 201);
    }

    public function update(Request $request, Order $order): JsonResponse
    {
        $order->loadMissing('items', 'customer');
        $previousCustomer = $order->customer;
        $previousStatus = (string) $order->status;
        $previousItems = $order->items
            ->map(fn ($item) => [
                'product_id' => $item->product_id,
                'quantity' => $item->quantity,
            ])
            ->values()
            ->all();

        [$payload, $customer, $items] = $this->validatedPayload($request);

        DB::transaction(function () use ($order, $payload, $customer, $items, $previousCustomer, $previousStatus, $previousItems): void {
            $this->syncStockForOrderChange(
                $this->toCommittedQuantities($previousItems, $previousStatus),
                $this->toCommittedQuantities($items, (string) ($payload['status'] ?? '')),
            );

            $order->update($payload);
            $this->syncOrderItems($order, $items);
            $this->syncCustomerMetrics($customer);
            $this->syncFinanceTransactionForOrder($order);

            if ($previousCustomer && $previousCustomer->id !== $customer?->id) {
                $this->syncCustomerMetrics($previousCustomer);
            }
        });

        ActivityLogger::log('Edit Data', 'Pesanan', 'sukses', null, ['id' => $order->id]);

        return response()->json([
            'message' => 'Data pesanan berhasil diperbarui.',
            'data' => DashboardDataMapper::order($order->refresh()->load(['items', 'user'])),
        ]);
    }

    public function destroy(Order $order): JsonResponse
    {
        $order->loadMissing('items', 'customer');
        $id = $order->id;
        $customer = $order->customer;

        DB::transaction(function () use ($order, $customer): void {
            $this->syncStockForOrderChange(
                $this->toCommittedQuantities(
                    $order->items
                        ->map(fn ($item) => [
                            'product_id' => $item->product_id,
                            'quantity' => $item->quantity,
                        ])
                        ->values()
                        ->all(),
                    (string) $order->status,
                ),
                [],
            );

            $this->deleteFinanceTransactionForOrder($order);
            $order->delete();
            $this->syncCustomerMetrics($customer);
        });

        ActivityLogger::log('Hapus Data', 'Pesanan', 'warning', null, ['id' => $id]);

        return response()->json([
            'message' => 'Data pesanan berhasil dihapus.',
        ]);
    }

    private function validatedPayload(Request $request): array
    {
        $validated = $request->validate([
            'date' => ['required', 'string', 'max:20'],
            'author' => ['required', 'string', 'max:255'],
            'product' => ['required', 'string', 'max:255'],
            'nominal' => ['required', 'numeric', 'min:0'],
            'status' => ['required', Rule::in(['terkirim', 'tertolak', 'tertunda'])],
            'items' => ['nullable', 'array', 'min:1'],
            'items.*.product' => ['required_with:items', 'string', 'max:255'],
            'items.*.quantity' => ['required_with:items', 'integer', 'min:1'],
            'items.*.unit_price' => ['required_with:items', 'numeric', 'min:0'],
        ]);

        $parsedDate = DashboardDataMapper::parseDisplayDate($validated['date']);
        if (!$parsedDate) {
            throw ValidationException::withMessages([
                'date' => 'Format tanggal pesanan tidak valid. Gunakan d.m.y atau YYYY-MM-DD.',
            ]);
        }

        $customerName = preg_replace('/\s+/', ' ', trim((string) $validated['author']));
        if ($customerName === '') {
            throw ValidationException::withMessages([
                'author' => 'Nama pelanggan wajib diisi.',
            ]);
        }

        $customer = Customer::query()
            ->whereRaw('LOWER(name) = ?', [strtolower($customerName)])
            ->first();

        if (!$customer) {
            $customer = Customer::query()->create([
                'name' => $customerName,
                'phone' => '-',
                'address' => '-',
                'order_history_count' => 0,
                'total_spending' => 0,
            ]);
        }

        [$items, $productSummary, $totalNominal] = $this->resolveOrderItems($validated);
        $actorUserId = $this->resolveActorUserId($request);
        $primaryProductId = (int) ($items[0]['product_id'] ?? 0);

        $payload = [
            'order_date' => $parsedDate->toDateString(),
            'author_name' => $customer->name,
            'product_name' => $productSummary,
            'nominal' => $totalNominal,
            'status' => $validated['status'],
            'customer_id' => $customer->id,
            'product_id' => $primaryProductId > 0 ? $primaryProductId : null,
        ];

        if ($actorUserId > 0) {
            $payload['user_id'] = $actorUserId;
        }

        return [$payload, $customer, $items];
    }

    private function resolveOrderItems(array $validated): array
    {
        $items = [];

        if (!empty($validated['items']) && is_array($validated['items'])) {
            foreach ($validated['items'] as $item) {
                $name = preg_replace('/\s+/', ' ', trim((string) ($item['product'] ?? '')));
                if ($name === '') {
                    throw ValidationException::withMessages([
                        'items' => 'Nama barang pada daftar pesanan wajib diisi.',
                    ]);
                }

                $quantity = max(1, (int) ($item['quantity'] ?? 1));
                $unitPrice = max(0, (float) ($item['unit_price'] ?? 0));
                $product = Product::query()->where('name', $name)->first();
                $lineTotal = $unitPrice * $quantity;

                $items[] = [
                    'product_id' => $product?->id,
                    'product_name' => $name,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'buy_price' => (float) ($product?->price_buy ?? 0),
                    'line_total' => $lineTotal,
                ];
            }
        }

        if (!$items) {
            $fallbackName = preg_replace('/\s+/', ' ', trim((string) ($validated['product'] ?? '')));
            if ($fallbackName === '') {
                throw ValidationException::withMessages([
                    'product' => 'Nama barang wajib diisi.',
                ]);
            }

            $fallbackPrice = max(0, (float) ($validated['nominal'] ?? 0));
            $product = Product::query()->where('name', $fallbackName)->first();

            $items[] = [
                'product_id' => $product?->id,
                'product_name' => $fallbackName,
                'quantity' => 1,
                'unit_price' => $fallbackPrice,
                'buy_price' => (float) ($product?->price_buy ?? 0),
                'line_total' => $fallbackPrice,
            ];
        }

        $totalNominal = array_reduce($items, fn ($sum, $item) => $sum + (float) $item['line_total'], 0.0);
        $productSummary = implode(', ', array_map(function (array $item): string {
            $name = $item['product_name'];
            $qty = (int) $item['quantity'];
            return $qty > 1 ? sprintf('%s x%d', $name, $qty) : $name;
        }, $items));

        return [$items, $productSummary, $totalNominal];
    }

    private function resolveActorUserId(Request $request): int
    {
        $authUserId = (int) ($request->user()?->id ?? 0);
        if ($authUserId > 0) {
            return $authUserId;
        }

        $actorId = (int) $request->header('X-BSA-Actor-Id', 0);
        if ($actorId > 0) {
            $byId = (int) (User::query()->where('id', $actorId)->value('id') ?? 0);
            if ($byId > 0) {
                return $byId;
            }
        }

        $actorPhone = trim((string) $request->header('X-BSA-Actor-Phone', ''));
        if ($actorPhone !== '') {
            $byPhone = (int) (User::query()->where('phone', $actorPhone)->value('id') ?? 0);
            if ($byPhone > 0) {
                return $byPhone;
            }
        }

        $actorName = trim((string) $request->header('X-BSA-Actor-Name', ''));
        if ($actorName === '') {
            return 0;
        }

        $actorRole = strtolower(trim((string) $request->header('X-BSA-Actor-Role', '')));

        $query = User::query()->whereRaw('LOWER(name) = ?', [strtolower($actorName)]);
        if ($actorRole !== '') {
            $query->whereHas('role', function ($roleQuery) use ($actorRole): void {
                $roleQuery->whereRaw('LOWER(name) = ?', [$actorRole]);
            });
        }

        return (int) ($query->value('id') ?? 0);
    }

    private function syncOrderItems(Order $order, array $items): void
    {
        $order->items()->delete();
        if (!$items) {
            return;
        }

        $order->items()->createMany($items);
    }

    private function toCommittedQuantities(array $items, string $status): array
    {
        if ($status !== 'terkirim') {
            return [];
        }

        $quantities = [];

        foreach ($items as $item) {
            $productId = (int) ($item['product_id'] ?? 0);
            $quantity = (int) ($item['quantity'] ?? 0);
            if ($productId <= 0 || $quantity <= 0) {
                continue;
            }

            $quantities[$productId] = ($quantities[$productId] ?? 0) + $quantity;
        }

        return $quantities;
    }

    private function syncStockForOrderChange(array $previousCommitted, array $currentCommitted): void
    {
        $productIds = array_values(array_unique(array_merge(array_keys($previousCommitted), array_keys($currentCommitted))));
        if (!$productIds) {
            return;
        }

        $products = Product::query()
            ->whereIn('id', $productIds)
            ->lockForUpdate()
            ->get()
            ->keyBy('id');

        foreach ($productIds as $productId) {
            $before = (int) ($previousCommitted[$productId] ?? 0);
            $after = (int) ($currentCommitted[$productId] ?? 0);
            $delta = $after - $before;
            if ($delta === 0) {
                continue;
            }

            $product = $products->get($productId);
            if (!$product) {
                continue;
            }

            if ($delta > 0) {
                $available = (int) $product->stock;
                if ($available < $delta) {
                    throw ValidationException::withMessages([
                        'items' => "Stok {$product->name} tidak cukup. Tersedia {$available}, dibutuhkan {$delta}.",
                    ]);
                }

                $product->stock = $available - $delta;
                $product->save();
                continue;
            }

            $product->stock = (int) $product->stock + abs($delta);
            $product->save();
        }
    }

    private function syncCustomerMetrics(?Customer $customer): void
    {
        if (!$customer) {
            return;
        }

        $historyOrders = $customer->orders()->whereIn('status', ['terkirim', 'tertunda']);
        $realizedOrders = $customer->orders()->where('status', 'terkirim');

        $customer->update([
            'order_history_count' => $historyOrders->count(),
            'total_spending' => (float) $realizedOrders->sum('nominal'),
        ]);
    }

    private function syncFinanceTransactionForOrder(Order $order): void
    {
        $existing = $this->findFinanceTransactionByOrderId((int) $order->id);

        // Keuangan hanya mencatat order yang benar-benar terkirim.
        if ((string) $order->status !== 'terkirim') {
            $existing?->delete();
            return;
        }

        $cost = $order->items->sum(fn ($item) => (float) $item->buy_price * (int) $item->quantity);

        $payload = [
            'order_id' => $order->id,
            'transaction_date' => optional($order->order_date)->format('Y-m-d') ?? now()->toDateString(),
            'description' => $this->buildFinanceDescriptionForOrder($order),
            'category' => 'pemasukan',
            'amount' => (float) $order->nominal,
            'cost' => (float) $cost,
        ];

        if ($existing) {
            $existing->update($payload);
            return;
        }

        FinanceTransaction::query()->create($payload);
    }

    private function deleteFinanceTransactionForOrder(Order $order): void
    {
        $existing = $this->findFinanceTransactionByOrderId((int) $order->id);
        $existing?->delete();
    }

    private function findFinanceTransactionByOrderId(int $orderId): ?FinanceTransaction
    {
        $direct = FinanceTransaction::query()
            ->where('order_id', $orderId)
            ->orderByDesc('id')
            ->first();

        if ($direct) {
            return $direct;
        }

        $legacy = FinanceTransaction::query()
            ->whereNull('order_id')
            ->where('description', 'like', $this->orderFinancePrefix($orderId).'%')
            ->orderByDesc('id')
            ->first();

        if ($legacy) {
            $legacy->order_id = $orderId;
            $legacy->save();
        }

        return $legacy;
    }

    private function buildFinanceDescriptionForOrder(Order $order): string
    {
        $prefix = $this->orderFinancePrefix((int) $order->id);
        $author = trim((string) $order->author_name);

        return $author !== '' ? $prefix.' - '.$author : $prefix;
    }

    private function orderFinancePrefix(int $orderId): string
    {
        return 'Pembayaran order #ORD-'.str_pad((string) $orderId, 4, '0', STR_PAD_LEFT);
    }
}

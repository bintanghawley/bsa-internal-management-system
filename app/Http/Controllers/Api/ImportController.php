<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\CalendarEvent;
use App\Models\Customer;
use App\Models\FinanceTransaction;
use App\Models\Order;
use App\Models\Product;
use App\Models\Role;
use App\Models\User;
use App\Support\ActivityLogger;
use App\Support\DashboardDataMapper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Facades\Excel;

class ImportController extends Controller
{
    private const SUPPORTED_TABLES = [
        'stock',
        'orders',
        'customers',
        'activity',
        'users',
        'finance',
        'calendarEvents',
    ];

    public function import(Request $request, string $table): JsonResponse
    {
        if (!in_array($table, self::SUPPORTED_TABLES, true)) {
            abort(404);
        }

        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls,csv', 'max:10240'],
        ]);

        $rows = $this->readRowsFromUpload($request);

        $processed = DB::transaction(function () use ($table, $rows, $request): int {
            return match ($table) {
                'stock' => $this->importStockRows($rows),
            'orders' => $this->importOrderRows($rows, $request),
                'customers' => $this->importCustomerRows($rows),
                'activity' => $this->importActivityRows($rows),
                'users' => $this->importUserRows($rows),
                'finance' => $this->importFinanceRows($rows),
                'calendarEvents' => $this->importCalendarRows($rows),
                default => 0,
            };
        });

        ActivityLogger::log('Import Data', $this->moduleLabel($table), 'sukses', null, [
            'table' => $table,
            'rows' => $processed,
        ]);

        return response()->json([
            'message' => sprintf('Import %s berhasil. %d baris diproses.', $this->tableLabel($table), $processed),
            'imported' => $processed,
            'data' => $this->mappedRows($table),
        ]);
    }

    private function importStockRows(Collection $rows): int
    {
        $processed = 0;

        foreach ($rows as $index => $row) {
            $line = $this->lineNumber($index);

            $priceSell = $this->requiredFloat($row, ['price_sell', 'priceSell', 'harga_jual', 'harga', 'price'], $line, 'Harga Jual', 0);
            $priceBuy = $this->optionalFloat($row, ['price_buy', 'priceBuy', 'harga_beli', 'modal']) ?? ($priceSell * 0.8);

            $payload = [
                'code' => $this->requiredString($row, ['code', 'kode_barang', 'kode'], $line, 'Kode Barang'),
                'name' => $this->requiredString($row, ['name', 'nama_barang', 'nama'], $line, 'Nama Barang'),
                'price_buy' => $priceBuy,
                'price_sell' => $priceSell,
                'stock' => $this->requiredInt($row, ['stock', 'stok'], $line, 'Stok', 0),
            ];
            $payload['price'] = $payload['price_sell'];

            $id = $this->optionalInt($row, ['id']);
            $record = $id ? Product::query()->find($id) : null;

            if ($record) {
                $record->update($payload);
            } else {
                Product::query()->updateOrCreate(
                    ['code' => $payload['code']],
                    $payload,
                );
            }

            $processed++;
        }

        return $processed;
    }

    private function importOrderRows(Collection $rows, Request $request): int
    {
        $processed = 0;
        $affectedCustomerIds = [];
        $authUserId = $this->resolveActorUserId($request);

        foreach ($rows as $index => $row) {
            $line = $this->lineNumber($index);

            $dateText = $this->requiredString($row, ['date', 'tanggal'], $line, 'Tanggal');
            $parsedDate = DashboardDataMapper::parseDisplayDate($dateText);
            if (!$parsedDate) {
                throw $this->rowValidationException($line, 'Format tanggal pesanan tidak valid.');
            }

            $customerName = $this->requiredString($row, ['author', 'pelanggan'], $line, 'Pelanggan');
            $productName = $this->requiredString($row, ['product', 'produk', 'pesanan'], $line, 'Produk');
            $nominalInput = $this->requiredFloat($row, ['nominal'], $line, 'Nominal', 0);
            $status = $this->requiredEnum($row, ['status'], $line, 'Status', ['terkirim', 'tertolak', 'tertunda']);

            $quantity = $this->optionalInt($row, ['quantity', 'qty', 'jumlah']) ?? 1;
            if ($quantity < 1) {
                throw $this->rowValidationException($line, 'Quantity harus lebih dari 0.');
            }

            $unitPrice = $this->optionalFloat($row, ['unit_price', 'harga_satuan']) ?? ($nominalInput / max($quantity, 1));
            if ($unitPrice < 0) {
                throw $this->rowValidationException($line, 'Harga satuan tidak boleh negatif.');
            }

            $lineTotal = round($unitPrice * $quantity, 2);
            $nominal = $lineTotal;

            $customer = $this->findOrCreateCustomer($customerName);
            $product = Product::query()->where('name', $productName)->first();

            $items = [[
                'product_id' => $product?->id,
                'product_name' => $productName,
                'quantity' => $quantity,
                'unit_price' => round($unitPrice, 2),
                'buy_price' => (float) ($product?->price_buy ?? 0),
                'line_total' => $lineTotal,
            ]];

            $payload = [
                'order_date' => $parsedDate->toDateString(),
                'author_name' => $customer->name,
                'product_name' => $productName,
                'nominal' => $nominal,
                'status' => $status,
                'customer_id' => $customer->id,
                'product_id' => $product?->id,
            ];

            if ($authUserId > 0) {
                $payload['user_id'] = $authUserId;
            }

            $id = $this->optionalInt($row, ['id']);
            $order = $id ? Order::query()->with('items')->find($id) : null;

            $previousCustomerId = $order?->customer_id;
            $previousCommitted = $order ? $this->toCommittedQuantitiesFromOrder($order) : [];
            $currentCommitted = $this->toCommittedQuantitiesFromItems($items, $status);

            $this->syncStockForOrderChange($previousCommitted, $currentCommitted, $line);

            if ($order) {
                $order->update($payload);
                $order->items()->delete();
                $order->items()->createMany($items);
            } else {
                $order = Order::query()->create($payload);
                $order->items()->createMany($items);
            }

            $this->syncFinanceTransactionForOrder($order);

            $affectedCustomerIds[$customer->id] = true;
            if ($previousCustomerId && $previousCustomerId !== $customer->id) {
                $affectedCustomerIds[$previousCustomerId] = true;
            }

            $processed++;
        }

        $this->syncCustomerMetricsByIds(array_keys($affectedCustomerIds));

        return $processed;
    }

    private function resolveActorUserId(Request $request): int
    {
        $authUserId = (int) (Auth::id() ?? 0);
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

    private function importCustomerRows(Collection $rows): int
    {
        $processed = 0;

        foreach ($rows as $index => $row) {
            $line = $this->lineNumber($index);

            $payload = [
                'name' => $this->requiredString($row, ['name', 'nama'], $line, 'Nama'),
                'phone' => $this->requiredString($row, ['phone', 'no_hp', 'nomor_hp'], $line, 'No HP'),
                'address' => $this->requiredString($row, ['address', 'alamat'], $line, 'Alamat'),
                'order_history_count' => $this->requiredInt($row, ['history', 'riwayat_pesanan'], $line, 'Riwayat Pesanan', 0),
                'total_spending' => $this->requiredFloat($row, ['total', 'total_pengeluaran', 'total_pengeluaran_terkirim'], $line, 'Total Pengeluaran', 0),
            ];

            $id = $this->optionalInt($row, ['id']);
            $record = $id ? Customer::query()->find($id) : null;

            if ($record) {
                $record->update($payload);
            } else {
                Customer::query()->updateOrCreate(
                    ['name' => $payload['name'], 'phone' => $payload['phone']],
                    $payload,
                );
            }

            $processed++;
        }

        return $processed;
    }

    private function importActivityRows(Collection $rows): int
    {
        $processed = 0;

        foreach ($rows as $index => $row) {
            $line = $this->lineNumber($index);

            $dateTimeText = $this->requiredString($row, ['date_time', 'tanggal_jam'], $line, 'Tanggal Jam');
            $loggedAt = DashboardDataMapper::parseDisplayDateTime($dateTimeText);
            if (!$loggedAt) {
                throw $this->rowValidationException($line, 'Format tanggal dan jam tidak valid.');
            }

            $payload = [
                'logged_at' => $loggedAt,
                'user_name' => $this->requiredString($row, ['user'], $line, 'User'),
                'action' => $this->requiredString($row, ['action', 'aktifitas', 'aktivitas'], $line, 'Aktifitas'),
                'module' => $this->requiredString($row, ['module', 'modul'], $line, 'Modul'),
                'status' => $this->requiredEnum($row, ['status'], $line, 'Status', ['sukses', 'warning', 'gagal']),
            ];

            $id = $this->optionalInt($row, ['id']);
            $record = $id ? ActivityLog::query()->find($id) : null;

            if ($record) {
                $record->update($payload);
            } else {
                ActivityLog::query()->create($payload);
            }

            $processed++;
        }

        return $processed;
    }

    private function importUserRows(Collection $rows): int
    {
        $processed = 0;

        $allowedRoles = Role::query()
            ->pluck('name')
            ->map(fn ($name) => strtolower((string) $name))
            ->filter()
            ->values()
            ->all();

        if (!$allowedRoles) {
            $allowedRoles = ['owner', 'karyawan'];
        }

        foreach ($rows as $index => $row) {
            $line = $this->lineNumber($index);

            $name = $this->requiredString($row, ['name', 'nama'], $line, 'Nama');
            $phone = $this->requiredString($row, ['phone', 'no_hp', 'nomor_hp'], $line, 'No HP');

            $roleName = $this->requiredEnum($row, ['role', 'peran'], $line, 'Role', $allowedRoles);
            $role = Role::query()->whereRaw('LOWER(name) = ?', [$roleName])->first();

            $passwordRaw = $this->pickValue($row, ['password', 'kata_sandi']);
            $password = trim((string) ($passwordRaw ?? ''));
            $this->validateImportedPassword($password, $line);

            $payload = [
                'name' => $name,
                'role_id' => $role?->id,
                'phone' => $phone,
            ];

            $id = $this->optionalInt($row, ['id']);
            $record = $id ? User::query()->find($id) : null;

            if ($password !== '') {
                $payload['password'] = $password;
            }

            if ($record) {
                $record->update($payload);
            } else {
                $existing = User::query()->where('phone', $phone)->first();
                if (!$existing) {
                    $existing = User::query()
                        ->whereRaw('LOWER(name) = ?', [strtolower($name)])
                        ->where('role_id', $role?->id)
                        ->first();
                }

                if ($existing) {
                    $existing->update($payload);
                } else {
                    if (!array_key_exists('password', $payload)) {
                        throw $this->rowValidationException($line, 'Password wajib diisi untuk user baru saat import.');
                    }

                    User::query()->create([
                        ...$payload,
                        'password' => $payload['password'],
                    ]);
                }
            }

            $processed++;
        }

        return $processed;
    }

    private function validateImportedPassword(string $password, int $line): void
    {
        if ($password === '') {
            return;
        }

        $hasMinLength = mb_strlen($password) >= 8;
        $hasLower = preg_match('/[a-z]/', $password) === 1;
        $hasUpper = preg_match('/[A-Z]/', $password) === 1;
        $hasNumber = preg_match('/[0-9]/', $password) === 1;

        if ($hasMinLength && $hasLower && $hasUpper && $hasNumber) {
            return;
        }

        throw $this->rowValidationException(
            $line,
            'Password minimal 8 karakter dan wajib mengandung huruf besar, huruf kecil, dan angka.',
        );
    }

    private function importFinanceRows(Collection $rows): int
    {
        $processed = 0;

        foreach ($rows as $index => $row) {
            $line = $this->lineNumber($index);

            $dateText = $this->requiredString($row, ['date', 'tanggal'], $line, 'Tanggal');
            $parsedDate = DashboardDataMapper::parseDisplayDate($dateText);
            if (!$parsedDate) {
                throw $this->rowValidationException($line, 'Format tanggal tidak valid.');
            }

            $payload = [
                'transaction_date' => $parsedDate->toDateString(),
                'description' => $this->requiredString($row, ['description', 'keterangan'], $line, 'Keterangan'),
                'category' => $this->requiredEnum($row, ['category', 'kategori'], $line, 'Kategori', ['pemasukan', 'pengeluaran']),
                'amount' => $this->requiredFloat($row, ['amount', 'nominal'], $line, 'Nominal', 0),
            ];

            $id = $this->optionalInt($row, ['id']);
            $record = $id ? FinanceTransaction::query()->find($id) : null;

            if ($record) {
                $record->update($payload);
            } else {
                FinanceTransaction::query()->create($payload);
            }

            $processed++;
        }

        return $processed;
    }

    private function importCalendarRows(Collection $rows): int
    {
        $processed = 0;

        foreach ($rows as $index => $row) {
            $line = $this->lineNumber($index);

            $dateText = $this->requiredString($row, ['date', 'tanggal'], $line, 'Tanggal');
            $parsedDate = DashboardDataMapper::parseDisplayDate($dateText);
            if (!$parsedDate) {
                throw $this->rowValidationException($line, 'Format tanggal agenda tidak valid.');
            }

            $timeText = $this->requiredString($row, ['time', 'jam'], $line, 'Jam');
            $normalizedTime = $this->parseTime($timeText, $line);

            $payload = [
                'event_date' => $parsedDate->toDateString(),
                'event_time' => $normalizedTime,
                'title' => $this->requiredString($row, ['title', 'judul'], $line, 'Judul'),
                'type' => $this->requiredString($row, ['type', 'tipe'], $line, 'Tipe'),
                'location' => $this->requiredString($row, ['location', 'lokasi'], $line, 'Lokasi'),
                'status' => $this->requiredEnum($row, ['status'], $line, 'Status', ['terjadwal', 'berlangsung', 'selesai']),
            ];

            $id = $this->optionalInt($row, ['id']);
            $record = $id ? CalendarEvent::query()->find($id) : null;

            if ($record) {
                $record->update($payload);
            } else {
                CalendarEvent::query()->create($payload);
            }

            $processed++;
        }

        return $processed;
    }

    private function readRowsFromUpload(Request $request): Collection
    {
        $sheets = Excel::toArray(new class implements WithHeadingRow {
        }, $request->file('file'));

        $rows = collect($sheets[0] ?? [])
            ->map(fn ($row) => $this->normalizeRow((array) $row))
            ->filter(fn (array $row) => $this->rowHasValues($row))
            ->values();

        if ($rows->isEmpty()) {
            throw ValidationException::withMessages([
                'file' => 'File tidak berisi data yang bisa diimport.',
            ]);
        }

        return $rows;
    }

    private function normalizeRow(array $row): array
    {
        $normalized = [];

        foreach ($row as $key => $value) {
            $normalizedKey = is_string($key)
                ? $this->normalizeColumnKey($key)
                : sprintf('column_%s', (string) $key);

            if ($normalizedKey === '') {
                continue;
            }

            $normalized[$normalizedKey] = is_string($value)
                ? trim($value)
                : $value;
        }

        return $normalized;
    }

    private function normalizeColumnKey(string $key): string
    {
        return (string) Str::of($key)
            ->lower()
            ->ascii()
            ->replaceMatches('/[^a-z0-9]+/', '_')
            ->trim('_');
    }

    private function rowHasValues(array $row): bool
    {
        foreach ($row as $value) {
            if (is_string($value) && trim($value) === '') {
                continue;
            }
            if ($value !== null && $value !== '') {
                return true;
            }
        }

        return false;
    }

    private function requiredString(array $row, array $aliases, int $line, string $label): string
    {
        $value = $this->pickValue($row, $aliases);
        $text = trim((string) ($value ?? ''));

        if ($text === '') {
            throw $this->rowValidationException($line, sprintf('Kolom %s wajib diisi.', $label));
        }

        return $text;
    }

    private function requiredFloat(array $row, array $aliases, int $line, string $label, ?float $min = null): float
    {
        $value = $this->pickValue($row, $aliases);
        if ($value === null || $value === '') {
            throw $this->rowValidationException($line, sprintf('Kolom %s wajib diisi.', $label));
        }

        $number = $this->toFloat($value);
        if ($number === null) {
            throw $this->rowValidationException($line, sprintf('Kolom %s harus berupa angka yang valid.', $label));
        }

        if ($min !== null && $number < $min) {
            throw $this->rowValidationException($line, sprintf('Kolom %s tidak boleh kurang dari %s.', $label, $min));
        }

        return $number;
    }

    private function optionalFloat(array $row, array $aliases): ?float
    {
        $value = $this->pickValue($row, $aliases);
        if ($value === null || $value === '') {
            return null;
        }

        return $this->toFloat($value);
    }

    private function requiredInt(array $row, array $aliases, int $line, string $label, ?int $min = null): int
    {
        $value = $this->pickValue($row, $aliases);
        if ($value === null || $value === '') {
            throw $this->rowValidationException($line, sprintf('Kolom %s wajib diisi.', $label));
        }

        $number = $this->toFloat($value);
        if ($number === null || abs($number - round($number)) > 0.00001) {
            throw $this->rowValidationException($line, sprintf('Kolom %s harus berupa bilangan bulat.', $label));
        }

        $intValue = (int) round($number);
        if ($min !== null && $intValue < $min) {
            throw $this->rowValidationException($line, sprintf('Kolom %s tidak boleh kurang dari %d.', $label, $min));
        }

        return $intValue;
    }

    private function optionalInt(array $row, array $aliases): ?int
    {
        $value = $this->pickValue($row, $aliases);
        if ($value === null || $value === '') {
            return null;
        }

        $number = $this->toFloat($value);
        if ($number === null) {
            return null;
        }

        return (int) round($number);
    }

    private function requiredEnum(array $row, array $aliases, int $line, string $label, array $allowed): string
    {
        $raw = $this->requiredString($row, $aliases, $line, $label);

        foreach ($allowed as $option) {
            if (strtolower($raw) === strtolower($option)) {
                return $option;
            }
        }

        throw $this->rowValidationException(
            $line,
            sprintf('Kolom %s tidak valid. Nilai yang diizinkan: %s.', $label, implode(', ', $allowed)),
        );
    }

    private function pickValue(array $row, array $aliases): mixed
    {
        foreach ($aliases as $alias) {
            $key = $this->normalizeColumnKey($alias);
            if (!array_key_exists($key, $row)) {
                continue;
            }

            $value = $row[$key];
            if (is_string($value) && trim($value) === '') {
                continue;
            }

            if ($value === null) {
                continue;
            }

            return $value;
        }

        return null;
    }

    private function toFloat(mixed $value): ?float
    {
        if (is_int($value) || is_float($value)) {
            return (float) $value;
        }

        if (!is_string($value)) {
            return null;
        }

        $normalized = trim($value);
        if ($normalized === '') {
            return null;
        }

        $normalized = str_ireplace(['rp', 'idr'], '', $normalized);
        $normalized = str_replace(["\xC2\xA0", ' '], '', $normalized);
        $normalized = preg_replace('/[^0-9,\.\-]/', '', $normalized) ?? '';

        if ($normalized === '' || $normalized === '-' || $normalized === ',' || $normalized === '.') {
            return null;
        }

        if (str_contains($normalized, ',') && str_contains($normalized, '.')) {
            $lastComma = strrpos($normalized, ',');
            $lastDot = strrpos($normalized, '.');

            if ($lastComma !== false && $lastDot !== false && $lastComma > $lastDot) {
                $normalized = str_replace('.', '', $normalized);
                $normalized = str_replace(',', '.', $normalized);
            } else {
                $normalized = str_replace(',', '', $normalized);
            }
        } elseif (str_contains($normalized, ',')) {
            if (preg_match('/^-?\d{1,3}(,\d{3})+$/', $normalized) === 1) {
                $normalized = str_replace(',', '', $normalized);
            } else {
                $normalized = str_replace(',', '.', $normalized);
            }
        } elseif (str_contains($normalized, '.')) {
            if (preg_match('/^-?\d{1,3}(\.\d{3})+$/', $normalized) === 1) {
                $normalized = str_replace('.', '', $normalized);
            }
        }

        if (!is_numeric($normalized)) {
            return null;
        }

        return (float) $normalized;
    }

    private function parseTime(string $value, int $line): string
    {
        $value = trim($value);
        if ($value === '') {
            throw $this->rowValidationException($line, 'Kolom Jam wajib diisi.');
        }

        if (preg_match('/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/', $value, $matches) !== 1) {
            throw $this->rowValidationException($line, 'Format jam tidak valid. Gunakan HH:MM.');
        }

        $hour = (int) $matches[1];
        $minute = (int) $matches[2];
        $second = isset($matches[3]) ? (int) $matches[3] : 0;

        if ($hour > 23 || $minute > 59 || $second > 59) {
            throw $this->rowValidationException($line, 'Nilai jam tidak valid.');
        }

        return sprintf('%02d:%02d:%02d', $hour, $minute, $second);
    }

    private function rowValidationException(int $line, string $message): ValidationException
    {
        return ValidationException::withMessages([
            'file' => sprintf('Baris %d: %s', $line, $message),
        ]);
    }

    private function lineNumber(int $index): int
    {
        return $index + 2;
    }

    private function findOrCreateCustomer(string $name): Customer
    {
        $normalizedName = preg_replace('/\s+/', ' ', trim($name)) ?: '';

        if ($normalizedName === '') {
            throw ValidationException::withMessages([
                'file' => 'Nama pelanggan tidak valid.',
            ]);
        }

        return Customer::query()
            ->whereRaw('LOWER(name) = ?', [strtolower($normalizedName)])
            ->first()
            ?? Customer::query()->create([
                'name' => $normalizedName,
                'phone' => '-',
                'address' => '-',
                'order_history_count' => 0,
                'total_spending' => 0,
            ]);
    }

    private function toCommittedQuantitiesFromOrder(Order $order): array
    {
        if ((string) $order->status !== 'terkirim') {
            return [];
        }

        $items = $order->items;
        if ($items->isEmpty() && $order->product_id) {
            return [(int) $order->product_id => 1];
        }

        return $this->toCommittedQuantitiesFromItems(
            $items
                ->map(fn ($item) => [
                    'product_id' => $item->product_id,
                    'quantity' => $item->quantity,
                ])
                ->values()
                ->all(),
            'terkirim',
        );
    }

    private function toCommittedQuantitiesFromItems(array $items, string $status): array
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

    private function syncStockForOrderChange(array $previousCommitted, array $currentCommitted, int $line): void
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
                    throw $this->rowValidationException(
                        $line,
                        sprintf('Stok %s tidak cukup. Tersedia %d, dibutuhkan %d.', $product->name, $available, $delta),
                    );
                }

                $product->stock = $available - $delta;
                $product->save();
                continue;
            }

            $product->stock = (int) $product->stock + abs($delta);
            $product->save();
        }
    }

    private function syncCustomerMetricsByIds(array $customerIds): void
    {
        $ids = array_values(array_filter(array_map('intval', $customerIds), fn ($id) => $id > 0));
        if (!$ids) {
            return;
        }

        Customer::query()->whereIn('id', $ids)->get()->each(function (Customer $customer): void {
            $historyOrders = $customer->orders()->whereIn('status', ['terkirim', 'tertunda']);
            $realizedOrders = $customer->orders()->where('status', 'terkirim');

            $customer->update([
                'order_history_count' => $historyOrders->count(),
                'total_spending' => (float) $realizedOrders->sum('nominal'),
            ]);
        });
    }

    private function syncFinanceTransactionForOrder(Order $order): void
    {
        $existing = $this->findFinanceTransactionByOrderId((int) $order->id);

        // Keuangan hanya mencatat order yang benar-benar terkirim.
        if ((string) $order->status !== 'terkirim') {
            $existing?->delete();
            return;
        }

        $payload = [
            'order_id' => $order->id,
            'transaction_date' => optional($order->order_date)->format('Y-m-d') ?? now()->toDateString(),
            'description' => $this->buildFinanceDescriptionForOrder($order),
            'category' => 'pemasukan',
            'amount' => (float) $order->nominal,
        ];

        if ($existing) {
            $existing->update($payload);
            return;
        }

        FinanceTransaction::query()->create($payload);
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

    private function mappedRows(string $table): array
    {
        return match ($table) {
            'stock' => Product::query()->orderBy('id')->get()->map(fn (Product $row) => DashboardDataMapper::stock($row))->values()->all(),
            'orders' => Order::query()->with(['items', 'user'])->orderByDesc('id')->get()->map(fn (Order $row) => DashboardDataMapper::order($row))->values()->all(),
            'customers' => Customer::query()->orderBy('name')->get()->map(fn (Customer $row) => DashboardDataMapper::customer($row))->values()->all(),
            'activity' => ActivityLog::query()->orderByDesc('logged_at')->get()->map(fn (ActivityLog $row) => DashboardDataMapper::activity($row))->values()->all(),
            'users' => User::query()->with('role')->orderBy('name')->get()->map(fn (User $row) => DashboardDataMapper::employee($row))->values()->all(),
            'finance' => FinanceTransaction::query()->orderByDesc('transaction_date')->orderByDesc('id')->get()->map(fn (FinanceTransaction $row) => DashboardDataMapper::finance($row))->values()->all(),
            'calendarEvents' => CalendarEvent::query()->orderBy('event_date')->orderBy('event_time')->get()->map(fn (CalendarEvent $row) => DashboardDataMapper::calendarEvent($row))->values()->all(),
            default => [],
        };
    }

    private function tableLabel(string $table): string
    {
        return match ($table) {
            'stock' => 'stok barang',
            'orders' => 'pesanan',
            'customers' => 'pelanggan',
            'activity' => 'log aktivitas',
            'users' => 'karyawan',
            'finance' => 'transaksi keuangan',
            'calendarEvents' => 'agenda kalender',
            default => $table,
        };
    }

    private function moduleLabel(string $table): string
    {
        return match ($table) {
            'stock' => 'Stok',
            'orders' => 'Pesanan',
            'customers' => 'Pelanggan',
            'activity' => 'Aktifitas',
            'users' => 'Karyawan',
            'finance' => 'Keuangan',
            'calendarEvents' => 'Kalender',
            default => 'Import',
        };
    }
}

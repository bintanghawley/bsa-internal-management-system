<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Support\ActivityLogger;
use App\Support\DashboardDataMapper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    public function index(): JsonResponse
    {
        $rows = Product::query()->orderBy('id')->get()->map(fn (Product $item) => DashboardDataMapper::stock($item));

        return response()->json(['data' => $rows]);
    }

    public function store(Request $request): JsonResponse
    {
        $priceVal = $request->input('price');
        $priceBuyVal = $request->input('price_buy') ?? $request->input('priceBuy') ?? ($priceVal ? (float) $priceVal * 0.8 : null);
        $priceSellVal = $request->input('price_sell') ?? $request->input('priceSell') ?? $priceVal;

        $request->merge([
            'code' => $this->normalizeCodeInput((string) $request->input('code', '')),
            'name' => trim((string) $request->input('name', '')),
            'price_buy' => $priceBuyVal,
            'price_sell' => $priceSellVal,
        ]);

        $payload = $request->validate([
            'code' => ['nullable', 'string', 'max:50', 'unique:products,code'],
            'name' => ['required', 'string', 'max:255'],
            'price_buy' => ['required', 'numeric', 'min:0'],
            'price_sell' => ['required', 'numeric', 'min:0'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'stock' => ['required', 'integer', 'min:0'],
        ]);

        if (!isset($payload['price_sell']) && isset($payload['price'])) {
            $payload['price_sell'] = $payload['price'];
        }
        $payload['price'] = $payload['price_sell']; // Sync old field for safety

        if (trim((string) ($payload['code'] ?? '')) === '') {
            $payload['code'] = $this->generateUniqueProductCode((string) ($payload['name'] ?? ''));
        }

        $product = Product::query()->create($payload);

        ActivityLogger::log('Tambah Data: ' . $product->name, 'Stok', 'sukses', null, ['id' => $product->id]);

        return response()->json([
            'message' => 'Data barang berhasil ditambahkan.',
            'data' => DashboardDataMapper::stock($product),
        ], 201);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $priceVal = $request->input('price');
        $priceBuyVal = $request->input('price_buy') ?? $request->input('priceBuy') ?? ($priceVal ? (float) $priceVal * 0.8 : null);
        $priceSellVal = $request->input('price_sell') ?? $request->input('priceSell') ?? $priceVal;

        $request->merge([
            'code' => $this->normalizeCodeInput((string) $request->input('code', '')),
            'name' => trim((string) $request->input('name', '')),
            'price_buy' => $priceBuyVal,
            'price_sell' => $priceSellVal,
        ]);

        $payload = $request->validate([
            'code' => ['required', 'string', 'max:50', Rule::unique('products', 'code')->ignore($product->id)],
            'name' => ['required', 'string', 'max:255'],
            'price_buy' => ['required', 'numeric', 'min:0'],
            'price_sell' => ['required', 'numeric', 'min:0'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'stock' => ['required', 'integer', 'min:0'],
        ]);

        if (!isset($payload['price_sell']) && isset($payload['price'])) {
            $payload['price_sell'] = $payload['price'];
        }
        $payload['price'] = $payload['price_sell']; // Sync old field for safety

        $product->update($payload);

        ActivityLogger::log('Edit Data: ' . $product->name, 'Stok', 'sukses', null, ['id' => $product->id]);

        return response()->json([
            'message' => 'Data barang berhasil diperbarui.',
            'data' => DashboardDataMapper::stock($product->refresh()),
        ]);
    }

    public function destroy(Product $product): JsonResponse
    {
        $id = $product->id;
        $product->delete();

        ActivityLogger::log('Hapus Data: ' . $product->name, 'Stok', 'warning', null, ['id' => $id]);

        return response()->json([
            'message' => 'Data barang berhasil dihapus.',
        ]);
    }

    private function normalizeCodeInput(string $value): string
    {
        return strtoupper(trim($value));
    }

    private function generateUniqueProductCode(string $productName): string
    {
        $base = $this->buildProductCodeBase($productName);

        $codes = Product::query()
            ->where(function ($query) use ($base): void {
                $query->where('code', $base)
                    ->orWhere('code', 'like', $base.'-%');
            })
            ->pluck('code');

        $hasBaseCode = false;
        $maxSequence = 0;

        foreach ($codes as $code) {
            if (!is_string($code)) {
                continue;
            }

            $normalizedCode = strtoupper(trim($code));
            if ($normalizedCode === $base) {
                $hasBaseCode = true;
                continue;
            }

            if (preg_match('/^'.preg_quote($base, '/').'-([0-9]{1,6})$/', strtoupper($code), $match) !== 1) {
                continue;
            }

            $value = (int) $match[1];
            if ($value > $maxSequence) {
                $maxSequence = $value;
            }
        }

        if (!$hasBaseCode) {
            return $base;
        }

        $next = max(2, $maxSequence + 1);

        for ($offset = 0; $offset < 10000; $offset++) {
            $candidate = sprintf('%s-%d', $base, $next + $offset);
            $exists = Product::query()->where('code', $candidate)->exists();

            if (!$exists) {
                return $candidate;
            }
        }

        return $base.'-'.now()->format('His');
    }

    private function buildProductCodeBase(string $productName): string
    {
        $normalized = strtoupper(trim($productName));
        $namePart = preg_replace('/[^A-Z0-9]+/', '', $normalized) ?: 'BARANG';

        return substr('PRD-'.$namePart, 0, 45);
    }
}
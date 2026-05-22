<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Support\ActivityLogger;
use App\Support\DashboardDataMapper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function index(): JsonResponse
    {
        $rows = Customer::query()->orderBy('name')->get()->map(fn (Customer $item) => DashboardDataMapper::customer($item));

        return response()->json(['data' => $rows]);
    }

    public function store(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:40'],
            'address' => ['required', 'string', 'max:255'],
            'history' => ['required', 'integer', 'min:0'],
            'total' => ['required', 'numeric', 'min:0'],
        ]);

        $customer = Customer::create([
            'name' => $payload['name'],
            'phone' => $payload['phone'],
            'address' => $payload['address'],
            'order_history_count' => $payload['history'],
            'total_spending' => $payload['total'],
        ]);

        ActivityLogger::log('Tambah Data', 'Pelanggan', 'sukses', null, ['id' => $customer->id]);

        return response()->json([
            'message' => 'Data pelanggan berhasil ditambahkan.',
            'data' => DashboardDataMapper::customer($customer),
        ], 201);
    }

    public function update(Request $request, Customer $customer): JsonResponse
    {
        $payload = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:40'],
            'address' => ['required', 'string', 'max:255'],
            'history' => ['required', 'integer', 'min:0'],
            'total' => ['required', 'numeric', 'min:0'],
        ]);

        $customer->update([
            'name' => $payload['name'],
            'phone' => $payload['phone'],
            'address' => $payload['address'],
            'order_history_count' => $payload['history'],
            'total_spending' => $payload['total'],
        ]);

        ActivityLogger::log('Edit Data', 'Pelanggan', 'sukses', null, ['id' => $customer->id]);

        return response()->json([
            'message' => 'Data pelanggan berhasil diperbarui.',
            'data' => DashboardDataMapper::customer($customer->refresh()),
        ]);
    }

    public function destroy(Customer $customer): JsonResponse
    {
        $id = $customer->id;
        $customer->delete();

        ActivityLogger::log('Hapus Data', 'Pelanggan', 'warning', null, ['id' => $id]);

        return response()->json([
            'message' => 'Data pelanggan berhasil dihapus.',
        ]);
    }
}

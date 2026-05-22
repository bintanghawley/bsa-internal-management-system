<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FinanceTransaction;
use App\Support\ActivityLogger;
use App\Support\DashboardDataMapper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class FinanceTransactionController extends Controller
{
    public function index(): JsonResponse
    {
        $rows = FinanceTransaction::query()
            ->orderByDesc('transaction_date')
            ->orderByDesc('id')
            ->get()
            ->map(fn (FinanceTransaction $item) => DashboardDataMapper::finance($item));

        return response()->json(['data' => $rows]);
    }

    public function store(Request $request): JsonResponse
    {
        $payload = $this->validatedPayload($request);

        $transaction = FinanceTransaction::create($payload);

        ActivityLogger::log('Tambah Data', 'Keuangan', 'sukses', null, ['id' => $transaction->id]);

        return response()->json([
            'message' => 'Transaksi keuangan berhasil ditambahkan.',
            'data' => DashboardDataMapper::finance($transaction),
        ], 201);
    }

    public function update(Request $request, FinanceTransaction $financeTransaction): JsonResponse
    {
        $payload = $this->validatedPayload($request);

        $financeTransaction->update($payload);

        ActivityLogger::log('Edit Data', 'Keuangan', 'sukses', null, ['id' => $financeTransaction->id]);

        return response()->json([
            'message' => 'Transaksi keuangan berhasil diperbarui.',
            'data' => DashboardDataMapper::finance($financeTransaction->refresh()),
        ]);
    }

    public function destroy(FinanceTransaction $financeTransaction): JsonResponse
    {
        $id = $financeTransaction->id;
        $financeTransaction->delete();

        ActivityLogger::log('Hapus Data', 'Keuangan', 'warning', null, ['id' => $id]);

        return response()->json([
            'message' => 'Transaksi keuangan berhasil dihapus.',
        ]);
    }

    private function validatedPayload(Request $request): array
    {
        $validated = $request->validate([
            'date' => ['required', 'string', 'max:20'],
            'description' => ['required', 'string', 'max:1000'],
            'category' => ['required', Rule::in(['pemasukan', 'pengeluaran', 'Pemasukan', 'Pengeluaran'])],
            'amount' => ['required', 'numeric', 'min:0'],
        ]);

        $parsedDate = DashboardDataMapper::parseDisplayDate($validated['date']);
        if (!$parsedDate) {
            throw ValidationException::withMessages([
                'date' => 'Format tanggal tidak valid. Gunakan d.m.y atau YYYY-MM-DD.',
            ]);
        }

        return [
            'transaction_date' => $parsedDate->toDateString(),
            'description' => $validated['description'],
            'category' => strtolower($validated['category']),
            'amount' => $validated['amount'],
        ];
    }
}

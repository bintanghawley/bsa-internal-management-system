<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Support\ActivityLogger;
use App\Support\DashboardDataMapper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ActivityLogController extends Controller
{
    public function index(): JsonResponse
    {
        $rows = ActivityLog::query()->orderByDesc('logged_at')->limit(200)->get()->map(fn (ActivityLog $item) => DashboardDataMapper::activity($item));

        return response()->json(['data' => $rows]);
    }

    public function store(Request $request): JsonResponse
    {
        $payload = $this->validatedPayload($request);

        $log = ActivityLog::create($payload);

        ActivityLogger::log('Tambah Data', 'Aktifitas', 'sukses', null, ['id' => $log->id]);

        return response()->json([
            'message' => 'Log aktivitas berhasil ditambahkan.',
            'data' => DashboardDataMapper::activity($log),
        ], 201);
    }

    public function update(Request $request, ActivityLog $activityLog): JsonResponse
    {
        $payload = $this->validatedPayload($request);

        $activityLog->update($payload);

        ActivityLogger::log('Edit Data', 'Aktifitas', 'warning', null, ['id' => $activityLog->id]);

        return response()->json([
            'message' => 'Log aktivitas berhasil diperbarui.',
            'data' => DashboardDataMapper::activity($activityLog->refresh()),
        ]);
    }

    public function destroy(ActivityLog $activityLog): JsonResponse
    {
        $id = $activityLog->id;
        $activityLog->delete();

        ActivityLogger::log('Hapus Data', 'Aktifitas', 'warning', null, ['id' => $id]);

        return response()->json([
            'message' => 'Log aktivitas berhasil dihapus.',
        ]);
    }

    private function validatedPayload(Request $request): array
    {
        $validated = $request->validate([
            'dateTime' => ['required', 'string', 'max:32'],
            'user' => ['required', 'string', 'max:255'],
            'action' => ['required', 'string', 'max:255'],
            'module' => ['required', 'string', 'max:255'],
            'status' => ['required', Rule::in(['sukses', 'warning', 'gagal'])],
        ]);

        $parsedDateTime = DashboardDataMapper::parseDisplayDateTime($validated['dateTime']);
        if (!$parsedDateTime) {
            throw ValidationException::withMessages([
                'dateTime' => 'Format tanggal dan jam tidak valid. Contoh: 16.04.26 14:30.',
            ]);
        }

        return [
            'logged_at' => $parsedDateTime,
            'user_name' => $validated['user'],
            'action' => $validated['action'],
            'module' => $validated['module'],
            'status' => $validated['status'],
        ];
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class SessionController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'account_id' => ['required', 'integer', 'min:1'],
            'password' => ['required', 'string', 'max:255'],
        ]);

        $accountId = (int) $payload['account_id'];

        $user = User::query()
            ->with('role')
            ->find($accountId);

        if (!$user || !Hash::check((string) $payload['password'], (string) $user->password)) {
            ActivityLogger::log(
                'Login',
                'Dashboard',
                'gagal',
                $user?->name,
                ['account_id' => $accountId],
            );

            return response()->json([
                'message' => 'Password salah untuk akun yang dipilih.',
            ], 422);
        }

        if (strtolower((string) $user->employment_status) !== 'aktif') {
            ActivityLogger::log(
                'Login',
                'Dashboard',
                'gagal',
                $user->name,
                ['account_id' => $accountId, 'reason' => 'Account is not active'],
            );

            return response()->json([
                'message' => 'Akun ini sedang tidak aktif dan tidak dapat login.',
            ], 403);
        }

        ActivityLogger::log('Login', 'Dashboard', 'sukses', $user->name, ['account_id' => $user->id]);

        $role = strtolower((string) ($user->role?->name ?? 'karyawan'));

        return response()->json([
            'message' => 'Login berhasil.',
            'data' => [
                'id' => (int) $user->id,
                'name' => (string) $user->name,
                'phone' => (string) $user->phone,
                'role' => $role === 'owner' ? 'Owner' : 'Karyawan',
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->validate([
            'account_id' => ['nullable', 'integer', 'min:1'],
        ]);

        ActivityLogger::log('Logout', 'Dashboard', 'sukses');

        return response()->json([
            'message' => 'Logout berhasil.',
        ]);
    }
}
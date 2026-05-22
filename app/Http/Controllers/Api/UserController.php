<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use App\Support\ActivityLogger;
use App\Support\DashboardDataMapper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        $rows = User::query()
            ->with('role')
            ->orderBy('name')
            ->get()
            ->map(fn (User $item) => DashboardDataMapper::employee($item));

        return response()->json(['data' => $rows]);
    }

    public function store(Request $request): JsonResponse
    {
        $roleNames = $this->availableRoleNames();

        $payload = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'role' => ['required', 'string', Rule::in($roleNames)],
            'password' => ['required', 'string', 'max:255', Password::min(8)->letters()->mixedCase()->numbers()],
            'position' => ['nullable', 'string', 'max:255'],
            'division' => ['nullable', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:40', Rule::unique('users', 'phone')],
            'shift' => ['nullable', Rule::in(['Pagi', 'Siang', 'Malam'])],
            'status' => ['nullable', Rule::in(['aktif', 'cuti', 'nonaktif'])],
        ]);

        $role = $this->findRoleByName($payload['role']);

        $user = User::query()->create([
            'name' => trim($payload['name']),
            'role_id' => $role?->id,
            'password' => $payload['password'],
            ...$this->profileAttributes($payload),
        ]);

        ActivityLogger::log('Tambah Data', 'Karyawan', 'sukses', null, ['id' => $user->id]);

        return response()->json([
            'message' => 'Data karyawan berhasil ditambahkan.',
            'data' => DashboardDataMapper::employee($user->refresh()->load('role')),
        ], 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $roleNames = $this->availableRoleNames();

        $payload = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'role' => ['required', 'string', Rule::in($roleNames)],
            'password' => ['nullable', 'string', 'max:255', Password::min(8)->letters()->mixedCase()->numbers()],
            'position' => ['nullable', 'string', 'max:255'],
            'division' => ['nullable', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:40', Rule::unique('users', 'phone')->ignore($user->id)],
            'shift' => ['nullable', Rule::in(['Pagi', 'Siang', 'Malam'])],
            'status' => ['nullable', Rule::in(['aktif', 'cuti', 'nonaktif'])],
        ]);

        $role = $this->findRoleByName($payload['role']);

        $updateData = [
            'name' => trim($payload['name']),
            'role_id' => $role?->id,
            ...$this->profileAttributes($payload, $user),
        ];

        if (array_key_exists('password', $payload) && trim((string) $payload['password']) !== '') {
            $updateData['password'] = $payload['password'];
        }

        $user->update($updateData);

        ActivityLogger::log('Edit Data', 'Karyawan', 'sukses', null, ['id' => $user->id]);

        return response()->json([
            'message' => 'Data karyawan berhasil diperbarui.',
            'data' => DashboardDataMapper::employee($user->refresh()->load('role')),
        ]);
    }

    public function destroy(User $user): JsonResponse
    {
        $user->loadMissing('role');

        if (strtolower((string) ($user->role?->name ?? '')) === 'owner') {
            $ownerCount = User::query()
                ->whereHas('role', fn ($query) => $query->whereRaw('LOWER(name) = ?', ['owner']))
                ->count();

            if ($ownerCount <= 1) {
                return response()->json([
                    'message' => 'Owner terakhir tidak boleh dihapus.',
                ], 422);
            }
        }

        $id = $user->id;
        $user->delete();

        ActivityLogger::log('Hapus Data', 'Karyawan', 'warning', null, ['id' => $id]);

        return response()->json([
            'message' => 'Data karyawan berhasil dihapus.',
        ]);
    }

    private function profileAttributes(array $payload, ?User $user = null): array
    {
        return [
            'position' => $this->resolveProfileString($payload, 'position', $user?->position ?? 'Staf'),
            'division' => $this->resolveProfileString($payload, 'division', $user?->division ?? 'Umum'),
            'phone' => $this->resolveProfileString($payload, 'phone', $user?->phone ?? '-'),
            'shift' => $this->resolveShift($payload, $user?->shift ?? 'Pagi'),
            'employment_status' => $this->resolveEmploymentStatus($payload, $user?->employment_status ?? 'aktif'),
        ];
    }

    private function resolveProfileString(array $payload, string $key, string $fallback): string
    {
        $value = trim((string) ($payload[$key] ?? ''));

        return $value !== '' ? $value : $fallback;
    }

    private function resolveShift(array $payload, string $fallback): string
    {
        $value = trim((string) ($payload['shift'] ?? ''));
        if ($value === '') {
            return $fallback;
        }

        return in_array($value, ['Pagi', 'Siang', 'Malam'], true) ? $value : $fallback;
    }

    private function resolveEmploymentStatus(array $payload, string $fallback): string
    {
        $value = strtolower(trim((string) ($payload['status'] ?? '')));
        if ($value === '') {
            return $fallback;
        }

        return in_array($value, ['aktif', 'cuti', 'nonaktif'], true) ? $value : $fallback;
    }

    private function availableRoleNames(): array
    {
        $roles = Role::query()
            ->orderBy('name')
            ->pluck('name')
            ->map(fn ($name) => strtolower((string) $name))
            ->filter()
            ->values()
            ->all();

        if (!$roles) {
            return ['owner', 'karyawan'];
        }

        return array_values(array_unique($roles));
    }

    private function findRoleByName(string $roleName): ?Role
    {
        return Role::query()->whereRaw('LOWER(name) = ?', [strtolower(trim($roleName))])->first();
    }
}

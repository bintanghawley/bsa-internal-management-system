<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('users')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'position')) {
                $table->string('position')->default('Staf')->after('name');
            }

            if (!Schema::hasColumn('users', 'division')) {
                $table->string('division')->default('Umum')->after('position');
            }

            if (!Schema::hasColumn('users', 'phone')) {
                $table->string('phone', 40)->default('-')->after('division');
            }

            if (!Schema::hasColumn('users', 'shift')) {
                $table->enum('shift', ['Pagi', 'Siang', 'Malam'])->default('Pagi')->after('phone');
            }

            if (!Schema::hasColumn('users', 'employment_status')) {
                $table->enum('employment_status', ['aktif', 'cuti', 'nonaktif'])->default('aktif')->after('shift');
            }
        });

        $this->migrateLegacyEmployeeProfiles();
    }

    public function down(): void
    {
        if (!Schema::hasTable('users')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'employment_status')) {
                $table->dropColumn('employment_status');
            }

            if (Schema::hasColumn('users', 'shift')) {
                $table->dropColumn('shift');
            }

            if (Schema::hasColumn('users', 'phone')) {
                $table->dropColumn('phone');
            }

            if (Schema::hasColumn('users', 'division')) {
                $table->dropColumn('division');
            }

            if (Schema::hasColumn('users', 'position')) {
                $table->dropColumn('position');
            }
        });
    }

    private function migrateLegacyEmployeeProfiles(): void
    {
        if (!Schema::hasTable('employees')) {
            return;
        }

        $karyawanRoleId = DB::table('roles')
            ->whereRaw('LOWER(name) = ?', ['karyawan'])
            ->value('id');

        DB::table('employees')
            ->select(['id', 'name', 'position', 'division', 'phone', 'shift', 'status'])
            ->orderBy('id')
            ->chunkById(200, function ($rows) use ($karyawanRoleId): void {
                foreach ($rows as $row) {
                    $name = trim((string) ($row->name ?? ''));
                    if ($name === '') {
                        continue;
                    }

                    $position = trim((string) ($row->position ?? '')) ?: 'Staf';
                    $division = trim((string) ($row->division ?? '')) ?: 'Umum';
                    $phone = trim((string) ($row->phone ?? '')) ?: '-';
                    $shift = $this->normalizeShift((string) ($row->shift ?? 'Pagi'));
                    $status = $this->normalizeEmploymentStatus((string) ($row->status ?? 'aktif'));

                    $userId = DB::table('users')
                        ->where('phone', $phone)
                        ->value('id');

                    if (!$userId) {
                        $userId = DB::table('users')
                        ->whereRaw('LOWER(name) = ?', [strtolower($name)])
                        ->value('id');
                    }

                    $resolvedPhone = $this->buildUniqueEmployeePhone(
                        $phone,
                        (int) $row->id,
                        $userId ? (int) $userId : null,
                    );

                    if (!$userId) {
                        $userId = DB::table('users')->insertGetId([
                            'name' => $name,
                            'role_id' => $karyawanRoleId,
                            'password' => Hash::make('password123'),
                            'position' => $position,
                            'division' => $division,
                            'phone' => $resolvedPhone,
                            'shift' => $shift,
                            'employment_status' => $status,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }

                    DB::table('users')
                        ->where('id', $userId)
                        ->update([
                            'position' => $position,
                            'division' => $division,
                            'phone' => $resolvedPhone,
                            'shift' => $shift,
                            'employment_status' => $status,
                            'updated_at' => now(),
                        ]);
                }
            }, 'id');
    }

    private function buildUniqueEmployeePhone(string $phone, int $seed, ?int $exceptUserId = null): string
    {
        $base = trim($phone);
        if ($base === '' || $base === '-') {
            $base = sprintf('080000%06d', max(1, $seed));
        }

        $suffix = 0;
        while (true) {
            $candidate = $suffix === 0
                ? $base
                : sprintf('%s-%d', $base, $suffix);

            $query = DB::table('users')->where('phone', $candidate);
            if ($exceptUserId && $exceptUserId > 0) {
                $query->where('id', '!=', $exceptUserId);
            }

            $exists = $query->exists();
            if (!$exists) {
                return $candidate;
            }

            $suffix++;
        }
    }

    private function normalizeShift(string $shift): string
    {
        $normalized = strtolower(trim($shift));

        return match ($normalized) {
            'siang' => 'Siang',
            'malam' => 'Malam',
            default => 'Pagi',
        };
    }

    private function normalizeEmploymentStatus(string $status): string
    {
        $normalized = strtolower(trim($status));

        return in_array($normalized, ['aktif', 'cuti', 'nonaktif'], true)
            ? $normalized
            : 'aktif';
    }
};
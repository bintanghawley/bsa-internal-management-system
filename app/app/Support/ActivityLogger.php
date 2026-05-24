<?php

namespace App\Support;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ActivityLogger
{
    public static function log(
        string $action,
        string $module,
        string $status = 'sukses',
        ?string $userName = null,
        array $metadata = []
    ): void {
        [$actorUser, $actorName] = self::resolveActorContext();
        $resolvedUserName = $userName ?: ($actorUser?->name ?: ($actorName !== '' ? $actorName : 'System'));

        ActivityLog::create([
            'logged_at' => now(),
            'user_name' => $resolvedUserName,
            'action' => $action,
            'module' => $module,
            'status' => $status,
            'metadata' => $metadata ?: null,
            'user_id' => $actorUser?->id,
        ]);

        // Otomatis hapus (prune) log jika melebihi batas 200 data teranyar
        try {
            $maxLogs = 200;
            $count = ActivityLog::count();
            if ($count > $maxLogs) {
                $excessIds = ActivityLog::query()
                    ->orderByDesc('logged_at')
                    ->orderByDesc('id')
                    ->skip($maxLogs)
                    ->take($count - $maxLogs)
                    ->pluck('id');

                if ($excessIds->isNotEmpty()) {
                    ActivityLog::query()->whereIn('id', $excessIds)->delete();
                }
            }
        } catch (\Exception $e) {
            // Abaikan kesalahan agar tidak menghalangi pencatatan log utama
        }
    }

    private static function resolveActorContext(): array
    {
        $authUser = Auth::user();
        if ($authUser) {
            return [$authUser, (string) $authUser->name];
        }

        if (app()->runningInConsole()) {
            return [null, ''];
        }

        /** @var Request|null $request */
        $request = request();
        if (!$request instanceof Request) {
            return [null, ''];
        }

        $actorId = (int) $request->header('X-BSA-Actor-Id', 0);
        if ($actorId > 0) {
            $user = User::query()->find($actorId);
            if ($user) {
                return [$user, (string) $user->name];
            }
        }

        $actorPhone = trim((string) $request->header('X-BSA-Actor-Phone', ''));
        if ($actorPhone !== '') {
            $user = User::query()->where('phone', $actorPhone)->first();
            if ($user) {
                return [$user, (string) $user->name];
            }
        }

        $actorName = trim((string) $request->header('X-BSA-Actor-Name', ''));
        if ($actorName === '') {
            return [null, ''];
        }

        $actorRole = strtolower(trim((string) $request->header('X-BSA-Actor-Role', '')));
        $query = User::query()->whereRaw('LOWER(name) = ?', [strtolower($actorName)]);

        if ($actorRole !== '') {
            $query->whereHas('role', function ($roleQuery) use ($actorRole): void {
                $roleQuery->whereRaw('LOWER(name) = ?', [$actorRole]);
            });
        }

        $user = $query->first();

        return [$user, $user?->name ?? $actorName];
    }
}

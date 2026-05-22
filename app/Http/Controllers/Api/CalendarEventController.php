<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CalendarEvent;
use App\Support\ActivityLogger;
use App\Support\DashboardDataMapper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CalendarEventController extends Controller
{
    public function index(): JsonResponse
    {
        $rows = CalendarEvent::query()
            ->orderBy('event_date')
            ->orderBy('event_time')
            ->get()
            ->map(fn (CalendarEvent $item) => DashboardDataMapper::calendarEvent($item));

        return response()->json(['data' => $rows]);
    }

    public function store(Request $request): JsonResponse
    {
        $payload = $this->validatedPayload($request);

        $event = CalendarEvent::create($payload);

        ActivityLogger::log('Tambah Data', 'Kalender', 'sukses', null, ['id' => $event->id]);

        return response()->json([
            'message' => 'Agenda berhasil ditambahkan.',
            'data' => DashboardDataMapper::calendarEvent($event),
        ], 201);
    }

    public function update(Request $request, CalendarEvent $calendarEvent): JsonResponse
    {
        $payload = $this->validatedPayload($request);

        $calendarEvent->update($payload);

        ActivityLogger::log('Edit Data', 'Kalender', 'sukses', null, ['id' => $calendarEvent->id]);

        return response()->json([
            'message' => 'Agenda berhasil diperbarui.',
            'data' => DashboardDataMapper::calendarEvent($calendarEvent->refresh()),
        ]);
    }

    public function destroy(CalendarEvent $calendarEvent): JsonResponse
    {
        $id = $calendarEvent->id;
        $calendarEvent->delete();

        ActivityLogger::log('Hapus Data', 'Kalender', 'warning', null, ['id' => $id]);

        return response()->json([
            'message' => 'Agenda berhasil dihapus.',
        ]);
    }

    private function validatedPayload(Request $request): array
    {
        $validated = $request->validate([
            'date' => ['required', 'string', 'max:20'],
            'time' => ['required', 'string', 'max:10'],
            'title' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'max:255'],
            'location' => ['required', 'string', 'max:255'],
            'status' => ['required', Rule::in(['terjadwal', 'berlangsung', 'selesai'])],
        ]);

        $parsedDate = DashboardDataMapper::parseDisplayDate($validated['date']);
        if (!$parsedDate) {
            throw ValidationException::withMessages([
                'date' => 'Format tanggal tidak valid.',
            ]);
        }

        try {
            $eventTime = \Illuminate\Support\Carbon::parse($validated['time'])->format('H:i:s');
        } catch (\Throwable) {
            throw ValidationException::withMessages([
                'time' => 'Format jam tidak valid.',
            ]);
        }

        return [
            'event_date' => $parsedDate->toDateString(),
            'event_time' => $eventTime,
            'title' => $validated['title'],
            'type' => $validated['type'],
            'location' => $validated['location'],
            'status' => $validated['status'],
        ];
    }
}

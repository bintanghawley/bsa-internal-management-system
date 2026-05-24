<?php

namespace App\Http\Controllers;

use App\Exports\GenericTableExport;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Models\ActivityLog;
use App\Models\CalendarEvent;
use App\Models\Customer;
use App\Models\FinanceTransaction;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Support\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;

class ExportController extends Controller
{
    public function export(Request $request, string $table): Response
    {
        [$headings, $rows, $fileName] = match ($table) {
            'stock' => [
                ['ID', 'Kode Barang', 'Nama Barang', 'Harga Beli', 'Harga Jual', 'Stok'],
                Product::query()->orderBy('id')->get()->map(fn (Product $item) => [
                    $item->id,
                    $item->code,
                    $item->name,
                    (float) $item->price_buy,
                    (float) $item->price_sell,
                    (int) $item->stock,
                ])->toArray(),
                'stok-barang',
            ],
            'orders' => [
                ['ID', 'Tanggal', 'Pelanggan', 'Produk', 'Nominal', 'Status'],
                Order::query()->orderByDesc('id')->get()->map(fn (Order $item) => [
                    $item->id,
                    optional($item->order_date)->format('d.m.Y'),
                    $item->author_name,
                    $item->product_name,
                    (float) $item->nominal,
                    $item->status,
                ])->toArray(),
                'pesanan',
            ],
            'customers' => [
                ['ID', 'Nama', 'No HP', 'Alamat', 'Riwayat Pesanan', 'Total Pengeluaran (Terkirim)'],
                Customer::query()->orderBy('name')->get()->map(fn (Customer $item) => [
                    $item->id,
                    $item->name,
                    $item->phone,
                    $item->address,
                    (int) $item->order_history_count,
                    (float) $item->total_spending,
                ])->toArray(),
                'pelanggan',
            ],
            'activity' => [
                ['ID', 'Tanggal Jam', 'User', 'Aktifitas', 'Modul', 'Status'],
                ActivityLog::query()->orderByDesc('logged_at')->get()->map(fn (ActivityLog $item) => [
                    $item->id,
                    optional($item->logged_at)->format('d.m.Y H:i'),
                    $item->user_name,
                    $item->action,
                    $item->module,
                    $item->status,
                ])->toArray(),
                'log-aktivitas',
            ],
            'users' => [
                ['ID', 'Nama', 'Role', 'Jabatan', 'Divisi', 'No HP', 'Shift', 'Status'],
                User::query()->with('role')->orderBy('name')->get()->map(fn (User $item) => [
                    $item->id,
                    $item->name,
                    strtolower((string) ($item->role?->name ?? 'karyawan')),
                    $item->position,
                    $item->division,
                    $item->phone,
                    $item->shift,
                    $item->employment_status,
                ])->toArray(),
                'karyawan',
            ],
            'finance' => [
                ['ID', 'Tanggal', 'Keterangan', 'Kategori', 'Nominal'],
                FinanceTransaction::query()->orderByDesc('transaction_date')->orderByDesc('id')->get()->map(fn (FinanceTransaction $item) => [
                    $item->id,
                    optional($item->transaction_date)->format('d.m.Y'),
                    $item->description,
                    $item->category,
                    (float) $item->amount,
                ])->toArray(),
                'transaksi-keuangan',
            ],
            'calendarEvents' => [
                ['ID', 'Tanggal', 'Jam', 'Judul', 'Tipe', 'Lokasi', 'Status'],
                CalendarEvent::query()->orderBy('event_date')->orderBy('event_time')->get()->map(fn (CalendarEvent $item) => [
                    $item->id,
                    optional($item->event_date)->format('Y-m-d'),
                    substr((string) $item->event_time, 0, 5),
                    $item->title,
                    $item->type,
                    $item->location,
                    $item->status,
                ])->toArray(),
                'agenda-kalender',
            ],
        };

        $orientation = $this->resolveOrientation($table);
        $paperSize = $this->resolvePaperSize($table);

        $format = strtolower((string) $request->query('format', 'xlsx'));
        if (!in_array($format, ['xlsx', 'pdf'], true)) {
            abort(422, 'Format export tidak didukung. Gunakan xlsx atau pdf.');
        }

        $timestamp = now()->format('Ymd-His');

        if ($format === 'pdf') {
            $downloadName = sprintf('%s-%s.pdf', $fileName, $timestamp);
            $title = Str::of($fileName)->replace('-', ' ')->title()->toString();
            $pdf = Pdf::loadView('exports.table-pdf', [
                'title' => $title,
                'headings' => $headings,
                'rows' => $rows,
                'generatedAt' => now()->format('d.m.Y H:i'),
            ])->setPaper($paperSize, $orientation);

            ActivityLogger::log('Export Laporan', $this->moduleLabel($table), 'sukses', null, [
                'table' => $table,
                'format' => 'pdf',
                'rows' => count($rows),
            ]);

            return $pdf->download($downloadName);
        }

        $export = new GenericTableExport($headings, $rows, $orientation, $paperSize);
        $downloadName = sprintf('%s-%s.xlsx', $fileName, $timestamp);

        ActivityLogger::log('Export Laporan', $this->moduleLabel($table), 'sukses', null, [
            'table' => $table,
            'format' => 'xlsx',
            'rows' => count($rows),
        ]);

        return Excel::download($export, $downloadName);
    }

    public function importTemplate(string $table): BinaryFileResponse
    {
        [$headings, $rows, $fileName] = match ($table) {
            'stock' => [
                ['ID', 'Kode Barang', 'Nama Barang', 'Harga Beli', 'Harga Jual', 'Stok'],
                [
                    ['', 'BRG-100', 'Nama Barang Contoh', 20000, 25000, 10],
                ],
                'template-import-stok',
            ],
            'orders' => [
                ['ID', 'Tanggal', 'Pelanggan', 'Produk', 'Nominal', 'Status', 'Quantity', 'Unit Price'],
                [
                    ['', '2026-04-14', 'Pelanggan Contoh', 'LPG', 66000, 'terkirim', 3, 22000],
                ],
                'template-import-pesanan',
            ],
            'customers' => [
                ['ID', 'Nama', 'No HP', 'Alamat', 'Riwayat Pesanan', 'Total Pengeluaran (Terkirim)'],
                [
                    ['', 'Pelanggan Contoh', '081234567890', 'Jl. Contoh No. 12', 1, 22000],
                ],
                'template-import-pelanggan',
            ],
            'activity' => [
                ['ID', 'Tanggal Jam', 'User', 'Aktifitas', 'Modul', 'Status'],
                [
                    ['', '14.04.2026 08:30', 'Admin', 'Tambah Data', 'Stok', 'sukses'],
                ],
                'template-import-aktivitas',
            ],
            'users' => [
                ['ID', 'Nama', 'Role', 'Password', 'Jabatan', 'Divisi', 'No HP', 'Shift', 'Status'],
                [
                    ['', 'Karyawan Contoh', 'karyawan', 'Password123', 'Admin', 'Operasional', '081234567890', 'Pagi', 'aktif'],
                ],
                'template-import-karyawan',
            ],
            'finance' => [
                ['ID', 'Tanggal', 'Keterangan', 'Kategori', 'Nominal'],
                [
                    ['', '14.04.2026', 'Pembayaran pelanggan tetap', 'pemasukan', 350000],
                ],
                'template-import-keuangan',
            ],
            'calendarEvents' => [
                ['ID', 'Tanggal', 'Jam', 'Judul', 'Tipe', 'Lokasi', 'Status'],
                [
                    ['', '2026-04-14', '08:30', 'Rapat Operasional', 'Meeting', 'Kantor Pusat', 'terjadwal'],
                ],
                'template-import-kalender',
            ],
        };

        $orientation = $this->resolveOrientation($table);
        $paperSize = $this->resolvePaperSize($table);

        $export = new GenericTableExport($headings, $rows, $orientation, $paperSize);
        $downloadName = sprintf('%s-%s.xlsx', $fileName, now()->format('Ymd-His'));

        ActivityLogger::log('Download Template', $this->moduleLabel($table), 'sukses', null, [
            'table' => $table,
        ]);

        return Excel::download($export, $downloadName);
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
            default => 'Dashboard',
        };
    }

    private function resolveOrientation(string $table): string
    {
        $default = $this->normalizeOrientation(config('export.orientation.default'), 'portrait');
        $tableConfig = config('export.orientation.tables', []);

        if (!is_array($tableConfig)) {
            return $default;
        }

        return $this->normalizeOrientation($tableConfig[$table] ?? null, $default);
    }

    private function normalizeOrientation(mixed $value, string $fallback): string
    {
        if (!is_string($value)) {
            return $fallback;
        }

        $normalized = strtolower(trim($value));

        if (!in_array($normalized, ['portrait', 'landscape'], true)) {
            return $fallback;
        }

        return $normalized;
    }

    private function resolvePaperSize(string $table): string
    {
        $default = $this->normalizePaperSize(config('export.paper.default'), 'a4');
        $tableConfig = config('export.paper.tables', []);

        if (!is_array($tableConfig)) {
            return $default;
        }

        return $this->normalizePaperSize($tableConfig[$table] ?? null, $default);
    }

    private function normalizePaperSize(mixed $value, string $fallback): string
    {
        if (!is_string($value)) {
            return $fallback;
        }

        $normalized = strtolower(trim($value));
        if (!in_array($normalized, ['a4', 'letter', 'legal', 'folio'], true)) {
            return $fallback;
        }

        return $normalized;
    }
}

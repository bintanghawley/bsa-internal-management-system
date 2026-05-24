<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ExportController;
use Illuminate\Support\Facades\Route;

Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
Route::get('/dashboard', [DashboardController::class, 'index']);

Route::get('/dashboard/export/{table}', [ExportController::class, 'export'])
    ->whereIn('table', ['stock', 'orders', 'customers', 'activity', 'users', 'finance', 'calendarEvents'])
    ->name('dashboard.export');

Route::get('/dashboard/import-template/{table}', [ExportController::class, 'importTemplate'])
    ->whereIn('table', ['stock', 'orders', 'customers', 'activity', 'users', 'finance', 'calendarEvents'])
    ->name('dashboard.import-template');

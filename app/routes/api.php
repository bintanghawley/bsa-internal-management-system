<?php

use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\CalendarEventController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\FinanceTransactionController;
use App\Http\Controllers\Api\ImportController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\SessionController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::post('session/login', [SessionController::class, 'login'])->middleware('throttle:15,1');
Route::post('session/logout', [SessionController::class, 'logout'])->middleware('throttle:20,1');

Route::apiResource('products', ProductController::class)->only(['index', 'store', 'update', 'destroy']);
Route::apiResource('orders', OrderController::class)->only(['index', 'store', 'update', 'destroy']);
Route::apiResource('customers', CustomerController::class)->only(['index', 'store', 'update', 'destroy']);
Route::apiResource('activity-logs', ActivityLogController::class)->only(['index', 'store', 'update', 'destroy']);
Route::apiResource('users', UserController::class)->only(['index', 'store', 'update', 'destroy']);
Route::apiResource('finance-transactions', FinanceTransactionController::class)->only(['index', 'store', 'update', 'destroy']);
Route::apiResource('calendar-events', CalendarEventController::class)->only(['index', 'store', 'update', 'destroy']);

Route::post('import/{table}', [ImportController::class, 'import'])
	->whereIn('table', ['stock', 'orders', 'customers', 'activity', 'users', 'finance', 'calendarEvents']);

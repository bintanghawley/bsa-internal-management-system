<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\CalendarEvent;
use App\Models\Customer;
use App\Models\FinanceTransaction;
use App\Models\Order;
use App\Models\Product;
use App\Models\Report;
use App\Models\User;
use App\Support\DashboardDataMapper;
use Illuminate\Contracts\View\View;

class DashboardController extends Controller
{
    public function index(): View
    {
        // We only provide a small subset of data for the initial dashboard view.
        // Other data will be fetched via API when the user navigates to those sections.
        $bootstrapData = [
            'stock' => Product::query()
                ->select(['id', 'code', 'name', 'price_buy', 'price_sell', 'price', 'stock'])
                ->orderBy('name')
                ->get()
                ->map(fn (Product $row) => DashboardDataMapper::stock($row))
                ->values(),
            'orders' => Order::query()
                ->with(['items:id,order_id,product_name,quantity,unit_price,buy_price,line_total', 'user:id,name'])
                ->select(['id', 'order_date', 'author_name', 'product_name', 'nominal', 'status', 'user_id', 'customer_id'])
                ->orderByDesc('id')
                ->limit(50)
                ->get()
                ->map(fn (Order $row) => DashboardDataMapper::order($row))
                ->values(),
            'users' => User::query()
                ->with('role:id,name')
                ->select(['id', 'name', 'phone', 'position', 'division', 'shift', 'employment_status', 'role_id', 'created_at'])
                ->get()
                ->map(fn (User $row) => DashboardDataMapper::employee($row))
                ->values(),
            'customers' => Customer::query()
                ->select(['id', 'name', 'phone', 'address', 'order_history_count', 'total_spending'])
                ->orderBy('name')
                ->get()
                ->map(fn (Customer $row) => DashboardDataMapper::customer($row))
                ->values(),
            'activity' => [],
            'calendarEvents' => [],
            'finance' => FinanceTransaction::query()
                ->select(['id', 'order_id', 'transaction_date', 'description', 'category', 'amount', 'cost'])
                ->where('transaction_date', '>=', now()->subDays(45))
                ->orderByDesc('id')
                ->get()
                ->map(fn (FinanceTransaction $row) => DashboardDataMapper::finance($row))
                ->values(),
        ];

        $summaryData = [
            'totalUsers' => User::query()->count(),
            'totalTransactions' => FinanceTransaction::query()->count(),
            'monthlyReports' => Report::query()
                ->whereYear('report_month', now()->year)
                ->whereMonth('report_month', now()->month)
                ->count(),
        ];

        $apiConfig = [
            'endpoints' => [
                'stock' => url('/api/products'),
                'orders' => url('/api/orders'),
                'customers' => url('/api/customers'),
                'activity' => url('/api/activity-logs'),
                'users' => url('/api/users'),
                'accountLogin' => url('/api/session/login'),
                'accountLogout' => url('/api/session/logout'),
                'finance' => url('/api/finance-transactions'),
                'calendarEvents' => url('/api/calendar-events'),
            ],
            'exportEndpoint' => url('/dashboard/export'),
            'importEndpoint' => url('/api/import'),
            'importTemplateEndpoint' => url('/dashboard/import-template'),
        ];

        return view('pages.dashboard', [
            'bootstrapData' => $bootstrapData,
            'summaryData' => $summaryData,
            'apiConfig' => $apiConfig,
        ]);
    }
}

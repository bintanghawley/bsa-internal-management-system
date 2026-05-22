@extends('layouts.app')

@section('content')
    <script>
        window.bsaBootstrapData = {!! \Illuminate\Support\Js::from($bootstrapData ?? []) !!};
        window.bsaApiConfig = {!! \Illuminate\Support\Js::from($apiConfig ?? []) !!};
        window.bsaSummaryData = {!! \Illuminate\Support\Js::from($summaryData ?? []) !!};
    </script>

    <div class="bsa-app" id="bsaApp">
        @include('components.sidebar')
        <div id="sidebarBackdrop" class="sidebar-backdrop" aria-hidden="true"></div>

        <div class="bsa-main">
            @include('components.navbar')

            <main class="bsa-content">
                <section class="app-view is-active" data-view="dashboard">
                    {{-- Row 1: Quick action buttons --}}
                    <div class="dash-actions-row">
                        <button class="dash-action-btn" type="button" data-open-entity-modal="stock" data-mode="add">+ Edit Stok Barang</button>
                        <button class="dash-action-btn" type="button" data-open-entity-modal="orders" data-mode="add">+ Tambah Pesanan</button>
                    </div>

                    {{-- Row 2: Charts + Calendar (3 columns) --}}
                    <div class="dash-charts-row">
                        @include('components.card', [
                            'title' => 'Penjualan',
                            'value' => 0,
                            'subtitle' => 'Memuat data penjualan...',
                            'counterId' => 'salesTotal',
                            'chartType' => 'line-soft',
                            'format' => 'rupiah',
                            'showDropdown' => true,
                        ])

                        @include('components.card', [
                            'title' => 'Produk Terjual',
                            'value' => 0,
                            'subtitle' => 'Memuat data produk...',
                            'counterId' => 'productSold',
                            'chartType' => 'donut',
                            'format' => 'id-integer',
                            'showDropdown' => true,
                        ])

                        <article class="panel calendar-panel">
                            <h3 id="dashboardMiniCalendarMonth">-</h3>

                            <div class="calendar-grid calendar-days-name">
                                <span>m</span>
                                <span>t</span>
                                <span>w</span>
                                <span>t</span>
                                <span>f</span>
                                <span>s</span>
                                <span>s</span>
                            </div>

                            <div class="calendar-grid calendar-days" id="dashboardMiniCalendarDays"></div>

                            <div class="calendar-footer" id="dashboardMiniCalendarFooter">&lt; - &gt;</div>
                        </article>
                    </div>

                    {{-- Row 3: Tables side by side --}}
                    <div class="dash-tables-row">
                        <article class="panel">
                            <h2 class="panel-title">Data Stok Barang</h2>
                            <div class="mini-table-wrap">
                                <table class="mini-table">
                                    <thead>
                                        <tr>
                                            <th>No. Barang</th>
                                            <th>Kode Barang</th>
                                            <th>Nama Barang</th>
                                            <th>Harga</th>
                                            <th>Stok</th>
                                        </tr>
                                    </thead>
                                    <tbody id="dashboardStockBody"></tbody>
                                </table>
                            </div>
                        </article>

                        <article class="panel">
                            <h2 class="panel-title">Data Pesanan</h2>
                            <div class="mini-table-wrap">
                                <table class="mini-table">
                                    <thead>
                                        <tr>
                                            <th>No.Pesanan</th>
                                            <th>Tanggal</th>
                                            <th>Pencatan</th>
                                            <th>Pesanan</th>
                                            <th>Nominal</th>
                                        </tr>
                                    </thead>
                                    <tbody id="dashboardOrderBody"></tbody>
                                </table>
                            </div>
                        </article>
                    </div>

                    {{-- Row 4: Ringkasan Keuangan --}}
                    <article class="panel dash-finance-summary">
                        <div class="finance-panel-head finance-summary-head">
                            <div>
                                <h2 class="panel-title">Ringkasan Keuangan</h2>
                                <p class="finance-caption" id="dashFinanceSummaryCaption">Periode bulan ini.</p>
                            </div>
                            <div class="finance-period-group" role="group" aria-label="Pilih Periode">
                                <button class="ghost-btn" type="button" data-dash-finance-period="day">Harian</button>
                                <button class="ghost-btn" type="button" data-dash-finance-period="week">Mingguan</button>
                                <button class="ghost-btn is-selected" type="button" data-dash-finance-period="month">Bulanan</button>
                            </div>
                        </div>
                        <div class="finance-kpi-grid finance-kpi-grid-three">
                            <article class="finance-kpi-card incoming">
                                <p>Total Pemasukan</p>
                                <h3 id="dashIncomeValue">Rp 0</h3>
                                <span class="finance-trend up" id="dashIncomeTrend">-</span>
                            </article>
                            <article class="finance-kpi-card outgoing">
                                <p>Total Pengeluaran</p>
                                <h3 id="dashExpenseValue">Rp 0</h3>
                                <span class="finance-trend down" id="dashExpenseTrend">-</span>
                            </article>
                            <article class="finance-kpi-card net">
                                <p>Laba Bersih</p>
                                <h3 id="dashNetValue">Rp 0</h3>
                                <span class="finance-trend up" id="dashNetTrend">-</span>
                            </article>
                        </div>
                    </article>
                </section>

                <section class="app-view" data-view="stock">
                    @include('components.table', [
                        'tableId' => 'stock',
                        'title' => 'Data Stok Barang',
                        'addLabel' => 'Tambah Barang',
                        'searchPlaceholder' => 'Cari nama atau kode barang...',
                        'columns' => [
                            ['key' => 'id', 'label' => 'No. Barang'],
                            ['key' => 'code', 'label' => 'Kode Barang'],
                            ['key' => 'name', 'label' => 'Nama Barang'],
                            ['key' => 'priceBuy', 'label' => 'Modal'],
                            ['key' => 'priceSell', 'label' => 'Jual'],
                            ['key' => 'stock', 'label' => 'Stok(pcs)'],
                            ['key' => 'action', 'label' => 'Action', 'sortable' => false, 'class' => 'action-col'],
                        ],
                    ])
                </section>

                <section class="app-view" data-view="orders">
                    @include('components.table', [
                        'tableId' => 'orders',
                        'title' => 'Data Pesanan',
                        'addLabel' => 'Tambah Pesanan',
                        'searchPlaceholder' => 'Cari pelanggan atau produk...',
                        'columns' => [
                            ['key' => 'id', 'label' => 'No. Pesanan'],
                            ['key' => 'date', 'label' => 'Tanggal'],
                            ['key' => 'author', 'label' => 'Pelanggan'],
                            ['key' => 'recorder', 'label' => 'Dicatat Oleh'],
                            ['key' => 'product', 'label' => 'Pesanan'],
                            ['key' => 'nominal', 'label' => 'Nominal Transaksi'],
                            ['key' => 'status', 'label' => 'Status'],
                            ['key' => 'action', 'label' => 'Action', 'sortable' => false, 'class' => 'action-col'],
                        ],
                    ])
                </section>

                <section class="app-view" data-view="customers">
                    @include('components.table', [
                        'tableId' => 'customers',
                        'title' => 'Data Pelanggan',
                        'addLabel' => 'Tambah Pelanggan',
                        'searchPlaceholder' => 'Cari nama, no. hp, atau alamat...',
                        'columns' => [
                            ['key' => 'name', 'label' => 'Nama'],
                            ['key' => 'phone', 'label' => 'No.hp'],
                            ['key' => 'address', 'label' => 'Alamat'],
                            ['key' => 'history', 'label' => 'Riwayat Pesanan'],
                            ['key' => 'total', 'label' => 'Total Pengeluaran (Terkirim)'],
                            ['key' => 'action', 'label' => 'Action', 'sortable' => false, 'class' => 'action-col'],
                        ],
                    ])
                </section>

                <section class="app-view" data-view="activity">
                    @include('components.table', [
                        'tableId' => 'activity',
                        'title' => 'Log Aktifitas',
                        'addLabel' => 'Tambah Catatan',
                        'searchPlaceholder' => 'Cari user, aksi, atau modul...',
                        'columns' => [
                            ['key' => 'id', 'label' => 'No'],
                            ['key' => 'dateTime', 'label' => 'Tanggal & Jam'],
                            ['key' => 'user', 'label' => 'User'],
                            ['key' => 'action', 'label' => 'Aktifitas'],
                            ['key' => 'module', 'label' => 'Modul'],
                            ['key' => 'status', 'label' => 'Status'],
                            ['key' => 'actionCol', 'label' => 'Aksi', 'sortable' => false, 'class' => 'action-col'],
                        ],
                    ])
                </section>

                <section class="app-view" data-view="users">
                    @include('components.table', [
                        'tableId' => 'users',
                        'title' => 'Data Karyawan',
                        'addLabel' => 'Tambah Karyawan',
                        'searchPlaceholder' => 'Cari nama, jabatan, atau no hp...',
                        'columns' => [
                            ['key' => 'id', 'label' => 'No'],
                            ['key' => 'name', 'label' => 'Nama'],
                            ['key' => 'role', 'label' => 'Role'],
                            ['key' => 'position', 'label' => 'Jabatan'],
                            ['key' => 'division', 'label' => 'Divisi'],
                            ['key' => 'phone', 'label' => 'No.hp'],
                            ['key' => 'shift', 'label' => 'Shift'],
                            ['key' => 'status', 'label' => 'Status'],
                            ['key' => 'actionCol', 'label' => 'Aksi', 'sortable' => false, 'class' => 'action-col'],
                        ],
                    ])
                </section>

                <section class="app-view" data-view="finance">
                    <div class="finance-page">
                        <article class="panel finance-transaction-panel">
                            <h2 class="panel-title">Riwayat Transaksi</h2>

                            <div class="toolbar-row finance-toolbar-row">
                                <label class="search-input-wrap finance-search-wrap">
                                    <span class="search-icon">
                                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="6" stroke="currentColor" stroke-width="2"/><path d="M16 16L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                                    </span>
                                    <input type="text" data-table-search="finance" placeholder="Cari transaksi...">
                                </label>

                                <div class="toolbar-actions finance-toolbar-actions">
                                    <select class="filter-select" data-table-filter="finance" aria-label="Filter transaksi"></select>
                                    <button class="ghost-btn icon-btn" type="button" data-table-reset="finance" title="Reset" aria-label="Reset">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
                                        <span>Segarkan</span>
                                    </button>
                                    <button class="ghost-btn icon-btn" type="button" data-table-template="finance" title="Template" aria-label="Download Template">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
                                        <span>Template</span>
                                    </button>
                                    <button class="ghost-btn icon-btn" type="button" data-table-export="finance" title="Export Excel" aria-label="Export to Excel">
                                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3z"/><path d="M8 11h8M8 15h4" stroke="white" stroke-width="2" fill="none"/></svg>
                                        <span>Excel</span>
                                    </button>
                                    <button class="ghost-btn icon-btn" type="button" data-table-export-pdf="finance" title="Export PDF" aria-label="Export to PDF">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/><text x="7" y="15" font-size="8" font-weight="bold" fill="currentColor">PDF</text></svg>
                                        <span>PDF</span>
                                    </button>
                                    <button class="ghost-btn icon-btn" type="button" data-table-import="finance" title="Import" aria-label="Import Data">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                        <span>Unggah</span>
                                    </button>
                                </div>
                            </div>

                            <div class="table-wrap">
                                <table class="bsa-table finance-table">
                                    <thead>
                                        <tr>
                                            <th class="is-sortable" data-sort-table="finance" data-sort-key="id"><span>ID</span><i class="sort-caret" aria-hidden="true"></i></th>
                                            <th class="is-sortable" data-sort-table="finance" data-sort-key="date"><span>Tanggal</span><i class="sort-caret" aria-hidden="true"></i></th>
                                            <th class="is-sortable" data-sort-table="finance" data-sort-key="description"><span>Deskripsi</span><i class="sort-caret" aria-hidden="true"></i></th>
                                            <th class="is-sortable" data-sort-table="finance" data-sort-key="category"><span>Kategori</span><i class="sort-caret" aria-hidden="true"></i></th>
                                            <th class="is-sortable" data-sort-table="finance" data-sort-key="amount"><span>Nominal</span><i class="sort-caret" aria-hidden="true"></i></th>
                                            <th><span>Action</span></th>
                                        </tr>
                                    </thead>
                                    <tbody id="financeTableBody"></tbody>
                                </table>
                            </div>

                            <div class="table-footer-row">
                                <p class="table-meta" id="financeDataInfo">Menampilkan 0 data</p>
                                <div class="pagination-controls">
                                    <button class="mini-btn" type="button" data-page-nav="prev" data-page-table="finance">&lt;</button>
                                    <span class="page-indicator" id="financePageInfo">1 / 1</span>
                                    <button class="mini-btn" type="button" data-page-nav="next" data-page-table="finance">&gt;</button>
                                </div>
                            </div>

                            <button class="primary-action finance-primary-btn" type="button" data-open-entity-modal="finance" data-mode="add">+Tambah Transaksi</button>
                        </article>

                        <article class="panel finance-summary-panel">
                            <div class="finance-panel-head finance-summary-head">
                                <div>
                                    <h2 class="panel-title">Ringkasan Keuangan</h2>
                                    <p class="finance-caption" id="financeSummaryCaption">Periode bulan ini.</p>
                                </div>

                                <div class="finance-period-group" role="group" aria-label="Pilih Periode">
                                    <button class="ghost-btn" type="button" data-finance-period="day">Harian</button>
                                    <button class="ghost-btn" type="button" data-finance-period="week">Mingguan</button>
                                    <button class="ghost-btn is-selected" type="button" data-finance-period="month">Bulanan</button>
                                </div>
                            </div>

                            <div class="finance-kpi-grid finance-kpi-grid-three">
                                <article class="finance-kpi-card incoming">
                                    <p>Total Pemasukan</p>
                                    <h3 id="financeIncomeValue">Rp 0</h3>
                                    <span class="finance-trend up" id="financeIncomeTrend">-</span>
                                </article>

                                <article class="finance-kpi-card outgoing">
                                    <p>Total Pengeluaran</p>
                                    <h3 id="financeExpenseValue">Rp 0</h3>
                                    <span class="finance-trend down" id="financeExpenseTrend">-</span>
                                </article>

                                <article class="finance-kpi-card net">
                                    <p>Laba Bersih</p>
                                    <h3 id="financeNetValue">Rp 0</h3>
                                    <span class="finance-trend up" id="financeNetTrend">-</span>
                                </article>
                            </div>
                        </article>

                        <div class="finance-chart-grid">
                            <article class="panel finance-chart-panel">
                                <div class="finance-panel-head">
                                    <h3 id="financeBarsTitle">Arus Kas Bulanan</h3>
                                    <button class="ghost-btn finance-chip" type="button" id="financeBarsRange">2026</button>
                                </div>

                                <div class="finance-bars-wrap" aria-hidden="true">
                                    <div class="finance-bars" id="financeBars"></div>
                                </div>

                                <div class="finance-legend">
                                    <span><i class="dot dot-a"></i>Pemasukan</span>
                                    <span><i class="dot dot-c"></i>Pengeluaran</span>
                                </div>
                            </article>

                            <article class="panel finance-distribution-panel">
                                <div class="finance-panel-head">
                                    <h3>Data Pemasukan &amp; Pengeluaran</h3>
                                    <button class="ghost-btn finance-chip" type="button" id="financeDistributionRange">Minggu ini</button>
                                </div>

                                <p class="finance-distribution-amount" id="financeDistributionTotal">Rp 0</p>

                                <div class="finance-donut-wrap" aria-hidden="true">
                                    <div class="finance-donut-chart" id="financeDonutChart">
                                        <div class="finance-donut-hole" id="financeDonutCenter">0%</div>
                                    </div>

                                    <ul class="finance-donut-list" id="financeDistributionList"></ul>
                                </div>
                            </article>
                        </div>
                    </div>
                </section>

                <section class="app-view" data-view="calendar">
                    <div class="calendar-page-grid">
                        <article class="panel calendar-board-panel">
                            <div class="calendar-page-head">
                                <h2 class="panel-title">Kalender Kegiatan</h2>

                                <div class="calendar-page-controls">
                                    <button class="mini-btn" type="button" data-cal-nav="prev">&lt;</button>
                                    <p id="calendarMonthLabel">April 2026</p>
                                    <button class="mini-btn" type="button" data-cal-nav="next">&gt;</button>
                                    <button class="ghost-btn" type="button" data-cal-nav="today">Hari Ini</button>
                                </div>
                            </div>

                            <div class="calendar-week-head">
                                <span>Sen</span>
                                <span>Sel</span>
                                <span>Rab</span>
                                <span>Kam</span>
                                <span>Jum</span>
                                <span>Sab</span>
                                <span>Min</span>
                            </div>

                            <div id="calendarMonthGrid" class="calendar-month-grid"></div>
                        </article>

                        <article class="panel calendar-agenda-panel">
                            <div class="calendar-agenda-head">
                                <div>
                                    <h3>Agenda Kegiatan</h3>
                                    <p class="finance-caption" id="calendarAgendaDateLabel">Semua kegiatan</p>
                                </div>
                                <button class="primary-action calendar-add-btn" type="button" data-open-entity-modal="calendarEvents" data-mode="add">+ Tambah Agenda</button>
                            </div>

                            <label class="search-input-wrap calendar-agenda-search">
                                <span class="search-icon">
                                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="6" stroke="currentColor" stroke-width="2"/><path d="M16 16L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                                </span>
                                <input type="text" data-calendar-search placeholder="Cari agenda, lokasi, atau tipe...">
                            </label>

                            <ul id="calendarAgendaList" class="calendar-agenda-list"></ul>
                        </article>
                    </div>
                </section>
            </main>
        </div>
    </div>

    <div class="account-gate" id="accountGate">
        <article class="account-gate-card">
            <h2>Welcome Back</h2>
            <p>Klik akun, lalu masukkan password di pop up.</p>

            <div class="account-grid">
                @foreach (($bootstrapData['users'] ?? []) as $accountUser)
                    @php
                        $accountId = (int) ($accountUser['id'] ?? 0);
                        $accountName = trim((string) ($accountUser['name'] ?? 'User'));
                        $accountPhone = trim((string) ($accountUser['phone'] ?? ''));
                        $accountRoleRaw = strtolower(trim((string) ($accountUser['role'] ?? 'karyawan')));
                        $accountRole = $accountRoleRaw === 'owner' ? 'Owner' : 'Karyawan';
                    @endphp
                    <button class="account-option" type="button" data-account-id="{{ $accountId }}" data-account-name="{{ $accountName }}" data-account-phone="{{ $accountPhone }}" data-account-role="{{ $accountRole }}">
                        <span class="account-avatar"></span>
                        <strong>{{ $accountName }}</strong>
                        <span class="account-role-tag">{{ $accountRole }}</span>
                    </button>
                @endforeach
            </div>

            <div class="account-note">
                Password tidak dapat ditampilkan di halaman utama, hanya muncul saat akun dipilih.
            </div>
        </article>
    </div>

    <div class="modal-backdrop" id="passwordModal" aria-hidden="true">
        <article class="modal-card modal-small">
            <div class="modal-head">
                <h3>Masukkan Password</h3>
                <button class="modal-close" type="button" data-close-password aria-label="Close">x</button>
            </div>
            <p class="modal-note">Akun terpilih: <strong id="passwordAccountLabel">-</strong></p>

            <form id="passwordForm" novalidate>
                <label for="passwordInput" class="input-label">Password</label>
                <div class="password-input-wrap">
                    <input id="passwordInput" name="password" class="text-input" type="password" placeholder="Masukkan password" minlength="1" required>
                    <button type="button" class="password-toggle-btn" data-toggle-password data-target-input="passwordInput" aria-controls="passwordInput" aria-pressed="false">Tampil</button>
                </div>
                <p id="passwordError" class="form-error"></p>

                <div class="modal-actions">
                    <button type="button" class="ghost-btn" data-close-password>Batal</button>
                    <button type="submit" class="primary-action">Masuk</button>
                </div>
            </form>
        </article>
    </div>

    <div class="modal-backdrop" id="entityModal" aria-hidden="true">
        <article id="entityModalCard" class="modal-card">
            <div class="modal-head">
                <h3 id="entityModalTitle">Tambah Data</h3>
                <button class="modal-close" type="button" data-close-entity aria-label="Close">x</button>
            </div>

            <form id="entityForm" novalidate>
                <input type="hidden" id="entityTableName" name="entityTableName">
                <input type="hidden" id="entityRowId" name="entityRowId">

                <div id="entityFields" class="entity-form-grid"></div>
                <p id="entityFormError" class="form-error"></p>

                <div class="modal-actions">
                    <button type="button" class="ghost-btn" data-close-entity>Batal</button>
                    <button type="submit" class="primary-action">Simpan</button>
                </div>
            </form>
        </article>
    </div>

    <div class="modal-backdrop" id="financeDetailModal" aria-hidden="true">
        <article class="modal-card finance-detail-modal-card">
            <div class="modal-head">
                <h3>Detail Transaksi</h3>
                <button class="modal-close" type="button" data-close-finance-detail aria-label="Close">x</button>
            </div>

            <p class="modal-note">Popup ini hanya untuk melihat rincian, tanpa edit data.</p>

            <div class="finance-detail-grid">
                <div class="finance-detail-item">
                    <span>ID Transaksi</span>
                    <strong id="financeDetailId">-</strong>
                </div>
                <div class="finance-detail-item">
                    <span>Tanggal</span>
                    <strong id="financeDetailDate">-</strong>
                </div>
                <div class="finance-detail-item full">
                    <span>Keterangan</span>
                    <strong id="financeDetailDescription">-</strong>
                </div>
                <div class="finance-detail-item">
                    <span>Kategori</span>
                    <strong id="financeDetailCategory">-</strong>
                </div>
                <div class="finance-detail-item full">
                    <span>Nominal</span>
                    <strong id="financeDetailAmount" class="finance-detail-amount">-</strong>
                </div>
            </div>

            <div class="modal-actions">
                <button type="button" class="ghost-btn" data-close-finance-detail>Tutup</button>
            </div>
        </article>
    </div>

    <div class="modal-backdrop" id="recordDetailModal" aria-hidden="true">
        <article class="modal-card finance-detail-modal-card record-detail-modal-card">
            <div class="modal-head">
                <h3 id="recordDetailTitle">Detail Data</h3>
                <button class="modal-close" type="button" data-close-record-detail aria-label="Close">x</button>
            </div>

            <p class="modal-note">Popup ini hanya untuk melihat rincian data.</p>

            <div id="recordDetailGrid" class="finance-detail-grid"></div>

            <div class="modal-actions">
                <button type="button" class="ghost-btn" data-close-record-detail>Tutup</button>
            </div>
        </article>
    </div>

    <div class="modal-backdrop" id="confirmModal" aria-hidden="true">
        <article class="modal-card modal-small confirm-modal-card" role="dialog" aria-modal="true" aria-labelledby="confirmModalTitle" aria-describedby="confirmModalMessage">
            <div class="modal-head">
                <h3 id="confirmModalTitle">Konfirmasi</h3>
                <button class="modal-close" type="button" data-close-confirm aria-label="Close">x</button>
            </div>

            <p id="confirmModalMessage" class="confirm-modal-message">Lanjutkan proses ini?</p>

            <div class="modal-actions confirm-modal-actions">
                <button type="button" class="ghost-btn" id="confirmModalCancelBtn" data-close-confirm>Batal</button>
                <button type="button" class="primary-action" id="confirmModalConfirmBtn">Oke</button>
            </div>
        </article>
    </div>

    <div id="undoToast" class="undo-toast" role="status" aria-live="polite" aria-atomic="true">
        <span id="undoToastMessage" class="undo-toast-message"></span>
        <button id="undoToastButton" class="undo-toast-button" type="button">Urungkan</button>
    </div>

    <div id="appToast" class="app-toast" role="status" aria-live="polite"></div>
@endsection
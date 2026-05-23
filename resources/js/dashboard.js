const bootstrapData = window.bsaBootstrapData || {};
const apiConfig = window.bsaApiConfig || {};
const apiEndpoints = apiConfig.endpoints || {};
const exportEndpoint = apiConfig.exportEndpoint || '';
const importEndpoint = apiConfig.importEndpoint || '';
const importTemplateEndpoint = apiConfig.importTemplateEndpoint || '';
const accountLoginEndpoint = apiEndpoints.accountLogin || apiConfig.accountLoginEndpoint || '';
const accountLogoutEndpoint = apiEndpoints.accountLogout || apiConfig.accountLogoutEndpoint || '';
const OWNER_ONLY_VIEWS = new Set(['activity', 'users']);
const OWNER_ONLY_MESSAGE = 'Menu ini hanya dapat diakses oleh Owner.';
const WIB_TIMEZONE = 'Asia/Jakarta';
const DASHBOARD_METRIC_PERIOD_LABELS = {
    day: 'Hari ini',
    week: 'Minggu ini',
    month: 'Bulan ini',
};
const ACCOUNT_SESSION_KEY = 'bsa.activeAccount';
const VIEW_SESSION_KEY = 'bsa.activeView';
const TABLE_STATE_SESSION_KEY = 'bsa.tableState';
const DELETE_UNDO_TIMEOUT_MS = 8000;
const DELETE_UNDO_TICK_MS = 250;

const initialWibDate = getWibDateParts();
const initialWibIsoDate = `${String(initialWibDate.year).padStart(4, '0')}-${String(initialWibDate.month).padStart(2, '0')}-${String(initialWibDate.day).padStart(2, '0')}`;

const pageMeta = {
    dashboard: { title: 'Dasbor' },
    stock: { title: 'Stok Barang' },
    orders: { title: 'Pesanan' },
    customers: { title: 'Pelanggan' },
    activity: { title: 'Log Aktifitas' },
    users: { title: 'Karyawan' },
    finance: { title: 'Keuangan' },
    calendar: { title: 'Kalender' },
};

const tableDefinitions = {
    stock: {
        entityName: 'Barang',
        fields: [
            {
                key: 'code',
                label: 'Kode Barang',
                type: 'text',
                required: false,
                placeholder: 'Terisi otomatis, bisa diubah manual',
            },
            { key: 'name', label: 'Nama Barang', type: 'text', required: true },
            {
                key: 'priceBuy',
                label: 'Harga Beli',
                type: 'number',
                required: true,
                numericFormat: 'id-thousands',
                placeholder: 'Harga modal barang',
            },
            {
                key: 'priceSell',
                label: 'Harga Jual',
                type: 'number',
                required: true,
                numericFormat: 'id-thousands',
                placeholder: 'Harga jual ke pelanggan',
            },
            { key: 'stock', label: 'Stok(pcs)', type: 'number', required: true },
        ],
        filterOptions: [
            { value: 'all', label: 'Filter' },
            { value: 'low', label: 'Stok < 10' },
            { value: 'high', label: 'Stok >= 10' },
        ],
        filterRow: (row, filter) => {
            if (filter === 'low') {
                return Number(row.stock) < 10;
            }
            if (filter === 'high') {
                return Number(row.stock) >= 10;
            }
            return true;
        },
        formatCell: (key, value) => {
            if (key === 'priceBuy' || key === 'priceSell' || key === 'price') {
                return formatCurrency(value);
            }
            return value;
        },
        searchableKeys: ['code', 'name'],
    },
    orders: {
        entityName: 'Pesanan',
        fields: [
            { key: 'date', label: 'Tanggal', type: 'date', required: true },
            {
                key: 'author',
                label: 'Pelanggan',
                type: 'text',
                required: true,
                suggestionSource: 'customers',
                suggestionKey: 'name',
                placeholder: 'Pilih pelanggan lama atau ketik pelanggan baru',
            },
            {
                key: 'product',
                label: 'Ringkasan Barang',
                type: 'hidden',
                required: true,
            },
            {
                key: 'nominal',
                label: 'Nominal Transaksi',
                type: 'number',
                required: false,
                readonly: true,
                min: 0,
                step: '0.01',
                hideInForm: true,
            },
            {
                key: 'status',
                label: 'Status',
                type: 'select',
                required: true,
                options: ['terkirim', 'tertolak', 'tertunda'],
            },
        ],
        filterOptions: [
            { value: 'all', label: 'Filter' },
            { value: 'terkirim', label: 'Terkirim' },
            { value: 'tertolak', label: 'Tertolak' },
            { value: 'tertunda', label: 'Tertunda' },
        ],
        filterRow: (row, filter) => {
            if (filter === 'all') {
                return true;
            }
            return row.status === filter;
        },
        formatCell: (key, value) => {
            if (key === 'nominal') {
                return formatCurrency(value);
            }
            if (key === 'status') {
                return `<span class="status-pill ${escapeHtml(String(value).toLowerCase())}">${capitalize(value)}</span>`;
            }
            return value;
        },
        searchableKeys: ['author', 'recorder', 'product', 'status'],
    },
    customers: {
        entityName: 'Pelanggan',
        fields: [
            { key: 'name', label: 'Nama', type: 'text', required: true },
            { key: 'phone', label: 'No.hp', type: 'text', required: true },
            { key: 'address', label: 'Alamat', type: 'text', required: true },
            { key: 'history', label: 'Riwayat Pesanan', type: 'number', required: true },
            {
                key: 'total',
                label: 'Total Pengeluaran (Terkirim)',
                type: 'number',
                required: true,
                numericFormat: 'id-thousands',
                placeholder: 'Contoh: 100.000',
            },
        ],
        filterOptions: [
            { value: 'all', label: 'Filter' },
            { value: 'high', label: '> 500.000' },
            { value: 'medium', label: '30.000 - 500.000' },
        ],
        filterRow: (row, filter) => {
            if (filter === 'high') {
                return Number(row.total) > 500000;
            }
            if (filter === 'medium') {
                return Number(row.total) >= 30000 && Number(row.total) <= 500000;
            }
            return true;
        },
        formatCell: (key, value) => {
            if (key === 'total') {
                return formatCurrency(value);
            }
            return value;
        },
        searchableKeys: ['name', 'phone', 'address'],
    },
    activity: {
        entityName: 'Catatan Aktifitas',
        fields: [
            {
                key: 'date',
                label: 'Tanggal',
                type: 'date',
                required: true,
            },
            { key: 'time', label: 'Jam', type: 'time', required: true },
            { key: 'user', label: 'User', type: 'text', required: true },
            {
                key: 'action',
                label: 'Aktifitas',
                type: 'select',
                required: true,
                options: ['Login', 'Tambah Data', 'Edit Data', 'Hapus Data', 'Export Laporan'],
            },
            {
                key: 'module',
                label: 'Modul',
                type: 'select',
                required: true,
                options: ['Dashboard', 'Stok', 'Pesanan', 'Keuangan', 'Pelanggan', 'Karyawan'],
            },
            {
                key: 'status',
                label: 'Status',
                type: 'select',
                required: true,
                options: ['sukses', 'warning', 'gagal'],
            },
        ],
        filterOptions: [
            { value: 'all', label: 'Semua Aktifitas' },
            { value: 'login', label: 'Login' },
            { value: 'ubah', label: 'Perubahan Data' },
            { value: 'laporan', label: 'Laporan' },
        ],
        filterRow: (row, filter) => {
            if (filter === 'all') {
                return true;
            }
            if (filter === 'login') {
                return row.action === 'Login';
            }
            if (filter === 'ubah') {
                return ['Tambah Data', 'Edit Data', 'Hapus Data'].includes(row.action);
            }
            return row.action === 'Export Laporan';
        },
        formatCell: (key, value) => value,
        searchableKeys: ['dateTime', 'user', 'action', 'module', 'status'],
    },
    users: {
        entityName: 'Karyawan',
        fields: [
            { key: 'name', label: 'Nama', type: 'text', required: true },
            {
                key: 'role',
                label: 'Role',
                type: 'select',
                required: true,
                options: ['owner', 'karyawan'],
            },
            {
                key: 'password',
                label: 'Password',
                type: 'password',
                required: false,
            },
            { key: 'position', label: 'Jabatan', type: 'text', required: true },
            { key: 'division', label: 'Divisi', type: 'text', required: true },
            { key: 'phone', label: 'No.hp', type: 'text', required: true },
            {
                key: 'shift',
                label: 'Shift',
                type: 'select',
                required: true,
                options: ['Pagi', 'Siang', 'Malam'],
            },
            {
                key: 'status',
                label: 'Status',
                type: 'select',
                required: true,
                options: ['aktif', 'cuti', 'nonaktif'],
            },
        ],
        filterOptions: [
            { value: 'all', label: 'Semua Status' },
            { value: 'aktif', label: 'Aktif' },
            { value: 'cuti', label: 'Cuti' },
            { value: 'nonaktif', label: 'Nonaktif' },
        ],
        filterRow: (row, filter) => {
            if (filter === 'all') {
                return true;
            }
            return row.status === filter;
        },
        formatCell: (key, value) => {
            if (key === 'role') {
                return capitalize(String(value || '').toLowerCase());
            }
            return value;
        },
        searchableKeys: ['name', 'role', 'position', 'division', 'phone', 'shift', 'status'],
    },
    calendarEvents: {
        entityName: 'Agenda',
        fields: [
            { key: 'date', label: 'Tanggal', type: 'date', required: true },
            { key: 'time', label: 'Jam', type: 'time', required: true },
            { key: 'title', label: 'Judul Agenda', type: 'text', required: true, full: true },
            {
                key: 'type',
                label: 'Tipe',
                type: 'select',
                required: true,
                options: ['Operasional', 'Meeting', 'Pengiriman', 'Keuangan', 'Maintenance'],
            },
            { key: 'location', label: 'Lokasi', type: 'text', required: true },
            {
                key: 'status',
                label: 'Status',
                type: 'select',
                required: true,
                options: ['terjadwal', 'berlangsung', 'selesai'],
            },
        ],
        filterOptions: [
            { value: 'all', label: 'Semua Agenda' },
        ],
        filterRow: () => true,
        formatCell: (key, value) => value,
        searchableKeys: ['title'],
    },
    finance: {
        entityName: 'Transaksi',
        fields: [
            { key: 'date', label: 'Tanggal', type: 'date', required: true },
            {
                key: 'category',
                label: 'Kategori',
                type: 'select',
                required: true,
                options: ['Pemasukan', 'Pengeluaran'],
            },
            {
                key: 'amount',
                label: 'Nominal',
                type: 'number',
                required: true,
                numericFormat: 'id-thousands',
                placeholder: 'Rp.00',
            },
            {
                key: 'description',
                label: 'Deskripsi (Keterangan)',
                type: 'textarea',
                required: true,
                full: true,
                placeholder: 'Tambahkan Keterangan',
            },
        ],
        filterOptions: [
            { value: 'all', label: 'Filter' },
            { value: 'pemasukan', label: 'Pemasukan' },
            { value: 'pengeluaran', label: 'Pengeluaran' },
        ],
        filterRow: (row, filter) => {
            if (filter === 'all') {
                return true;
            }
            return normalizeFinanceCategory(row.category) === filter;
        },
        formatCell: (key, value) => value,
        searchableKeys: ['date', 'description', 'category'],
    },
};

const state = {
    selectedAccount: { id: 0, name: '', role: '', phone: '' },
    pendingAccount: null,
    isAuthenticated: false,
    currentView: 'dashboard',
    countersAnimated: false,
    dashboardMetricPeriod: 'month',
    data: {
        stock: [],
        orders: [],
        customers: [],
        activity: [],
        users: [],
        calendarEvents: [],
        finance: [],
    },
    tableState: {
        stock: { query: '', page: 1, perPage: 7, sortKey: 'id', sortDir: 'asc', filterIndex: 0, loaded: false },
        orders: { query: '', page: 1, perPage: 7, sortKey: 'id', sortDir: 'asc', filterIndex: 0, loaded: false },
        customers: { query: '', page: 1, perPage: 7, sortKey: 'name', sortDir: 'asc', filterIndex: 0, loaded: false },
        activity: { query: '', page: 1, perPage: 7, sortKey: 'dateTime', sortDir: 'desc', filterIndex: 0, loaded: false },
        users: { query: '', page: 1, perPage: 7, sortKey: 'id', sortDir: 'asc', filterIndex: 0, loaded: false },
        finance: { query: '', page: 1, perPage: 7, sortKey: 'id', sortDir: 'desc', filterIndex: 0, loaded: false },
    },
    calendarView: {
        year: initialWibDate.year,
        month: initialWibDate.month - 1,
        selectedDate: initialWibIsoDate,
        search: '',
        loaded: false,
    },
    financePeriod: 'month',
    modalState: {
        mode: 'add',
        table: null,
        id: null,
        formSnapshot: '',
    },
    confirmDialog: {
        resolve: null,
        restoreFocusEl: null,
        pendingLabel: '',
        delayMs: 0,
        isSubmitting: false,
        submitDelayTimerId: 0,
    },
    undoDelete: {
        item: null,
        timerId: 0,
        tickId: 0,
    },
    requestLocks: {
        submitForm: false,
        deletingKeys: new Set(),
        importingTables: new Set(),
        exportingTables: new Set(),
        loadingTables: new Set(),
    },
    leaveGuard: {
        allowUnload: false,
        resetTimerId: 0,
    },
};

// syncMockDateLabelsToWib(state.data);
state.data = mergeBootstrapData(state.data, bootstrapData);
// Mark bootstrap data as loaded
Object.keys(bootstrapData).forEach(table => {
    if (state.tableState[table] && Array.isArray(bootstrapData[table])) {
        state.tableState[table].loaded = true;
    }
});
restoreTableStateSession();

document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('bsaApp')) {
        return;
    }

    state.isAuthenticated = restoreAccountSession();

    bindSidebarControls();
    bindStaticActionLinks();
    bindViewShortcutButtons();
    bindDashboardMetricControls();
    bindTableControls();
    bindFinanceControls();
    bindCalendarControls();
    bindEntityModal();
    bindFinanceDetailModal();
    bindRecordDetailModal();
    bindConfirmModal();
    bindUndoToast();
    bindAccountGate();
    bindPasswordVisibilityToggles();
    bindTopbar();
    bindThemeToggle();
    bindBeforeUnloadGuard();
    bindReloadShortcutGuard();
    startWibClock();
    syncTableControlsFromState();

    renderAllTables();
    renderDashboardMiniCalendar();
    renderDashboardMiniTables();
    renderFinanceOverview();
    renderCalendarView();
    updateMetricCounters(true);
    updateProfileInfo();
    applyRoleAccessControl();
    openView(resolveInitialView());
});

function bindSidebarControls() {
    document.querySelectorAll('[data-view-target]').forEach((button) => {
        button.addEventListener('click', () => {
            const target = button.dataset.viewTarget;
            openView(target);
        });
    });

    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const app = document.getElementById('bsaApp');
            if (!app) {
                return;
            }

            if (window.innerWidth <= 1024) {
                app.classList.toggle('sidebar-mobile-open');
            } else {
                app.classList.toggle('sidebar-collapsed');
            }
        });
    }

    const mainArea = document.querySelector('.bsa-main');
    if (mainArea) {
        mainArea.addEventListener('click', () => {
            if (window.innerWidth <= 1024) {
                document.getElementById('bsaApp')?.classList.remove('sidebar-mobile-open');
            }
        });
    }
}

function bindStaticActionLinks() {
    document.querySelectorAll('[data-secondary-action]').forEach((button) => {
        button.addEventListener('click', () => {
            showToast('Fitur ini disiapkan untuk integrasi backend berikutnya.');
        });
    });
}

function bindViewShortcutButtons() {
    document.querySelectorAll('[data-view-target-direct]').forEach((button) => {
        button.addEventListener('click', () => {
            const target = button.dataset.viewTargetDirect;
            if (target) {
                openView(target);
            }
        });
    });
}

function bindDashboardMetricControls() {
    document.querySelectorAll('[data-metric-period-select]').forEach((control) => {
        if (!(control instanceof HTMLSelectElement)) {
            return;
        }

        control.value = state.dashboardMetricPeriod;

        control.addEventListener('change', () => {
            const next = normalizeMetricPeriod(control.value);
            state.dashboardMetricPeriod = next;
            syncDashboardMetricPeriodControls();
            updateMetricCounters(true);
        });
    });
}

function syncDashboardMetricPeriodControls() {
    document.querySelectorAll('[data-metric-period-select]').forEach((control) => {
        if (control instanceof HTMLSelectElement) {
            control.value = state.dashboardMetricPeriod;
        }
    });
}

function bindFinanceControls() {
    const handlePeriodChange = (button, attribute) => {
        const period = button.getAttribute(attribute);
        if (!period) {
            return;
        }

        state.financePeriod = period;
        
        // Sync both sets of buttons
        document.querySelectorAll('[data-finance-period], [data-dash-finance-period]').forEach((item) => {
            const itemPeriod = item.getAttribute('data-finance-period') || item.getAttribute('data-dash-finance-period');
            item.classList.toggle('is-selected', itemPeriod === period);
        });
        
        renderFinanceOverview();
    };

    document.querySelectorAll('[data-finance-period]').forEach((button) => {
        button.addEventListener('click', () => handlePeriodChange(button, 'data-finance-period'));
    });

    document.querySelectorAll('[data-dash-finance-period]').forEach((button) => {
        button.addEventListener('click', () => handlePeriodChange(button, 'data-dash-finance-period'));
    });
}

function bindCalendarControls() {
    const monthGrid = document.getElementById('calendarMonthGrid');
    if (monthGrid) {
        monthGrid.addEventListener('click', (event) => {
            const button = event.target.closest('[data-cal-date]');
            if (!button) {
                return;
            }

            const iso = button.dataset.calDate;
            if (!iso) {
                return;
            }

            state.calendarView.selectedDate = iso;
            const selected = new Date(`${iso}T00:00:00`);
            state.calendarView.year = selected.getFullYear();
            state.calendarView.month = selected.getMonth();
            renderCalendarView();
        });
    }

    document.querySelectorAll('[data-cal-nav]').forEach((button) => {
        button.addEventListener('click', () => {
            const nav = button.dataset.calNav;
            if (nav === 'today') {
                const nowWib = getWibDateParts();
                state.calendarView.year = nowWib.year;
                state.calendarView.month = nowWib.month - 1;
                state.calendarView.selectedDate = getWibTodayIso();
                renderCalendarView();
                return;
            }

            const current = new Date(state.calendarView.year, state.calendarView.month, 1);
            if (nav === 'prev') {
                current.setMonth(current.getMonth() - 1);
            }
            if (nav === 'next') {
                current.setMonth(current.getMonth() + 1);
            }

            state.calendarView.year = current.getFullYear();
            state.calendarView.month = current.getMonth();
            state.calendarView.selectedDate = formatIsoDate(new Date(current.getFullYear(), current.getMonth(), 1));
            renderCalendarView();
        });
    });

    const agendaSearch = document.querySelector('[data-calendar-search]');
    if (agendaSearch) {
        agendaSearch.addEventListener('input', () => {
            state.calendarView.search = agendaSearch.value.trim().toLowerCase();
            renderCalendarAgendaList();
        });
    }

    const agendaList = document.getElementById('calendarAgendaList');
    if (agendaList) {
        agendaList.addEventListener('click', (event) => {
            const actionButton = event.target.closest('[data-calendar-event-action]');
            if (!actionButton) {
                return;
            }

            const action = actionButton.dataset.calendarEventAction;
            const id = Number(actionButton.dataset.calendarEventId);
            if (!Number.isFinite(id)) {
                return;
            }

            if (action === 'view') {
                openRecordDetailModal('calendarEvents', id);
            }

            if (action === 'edit') {
                openEntityModal('calendarEvents', 'edit', id);
            }

            if (action === 'delete') {
                void deleteEntityRow('calendarEvents', id);
            }
        });
    }
}

function bindTableControls() {
    document.querySelectorAll('[data-table-search]').forEach((input) => {
        input.addEventListener('input', () => {
            const table = input.dataset.tableSearch;
            if (!table || !state.tableState[table]) {
                return;
            }

            state.tableState[table].query = sanitizeTableQuery(input.value);
            state.tableState[table].page = 1;
            renderTable(table);
        });
    });

    document.querySelectorAll('[data-table-filter]').forEach((control) => {
        const table = control.dataset.tableFilter;
        if (!table || !state.tableState[table] || !tableDefinitions[table]) {
            return;
        }

        syncTableFilterControl(table, control);

        if (control instanceof HTMLSelectElement) {
            control.addEventListener('change', () => {
                const next = resolveSafeFilterIndex(table, Number(control.value));
                state.tableState[table].filterIndex = next;
                state.tableState[table].page = 1;
                syncTableFilterControl(table, control);
                renderTable(table);
            });
            return;
        }

        control.addEventListener('click', () => {
            const options = tableDefinitions[table].filterOptions || [];
            if (!options.length) {
                return;
            }

            const current = resolveSafeFilterIndex(table, state.tableState[table].filterIndex);
            const next = (current + 1) % options.length;
            state.tableState[table].filterIndex = next;
            state.tableState[table].page = 1;
            syncTableFilterControl(table, control);
            renderTable(table);
        });
    });

    document.querySelectorAll('[data-table-reset]').forEach((button) => {
        button.addEventListener('click', () => {
            const table = button.dataset.tableReset;
            if (!table || !state.tableState[table]) {
                return;
            }

            state.tableState[table].query = '';
            state.tableState[table].page = 1;
            state.tableState[table].filterIndex = 0;
            state.tableState[table].sortDir = 'asc';
            state.tableState[table].sortKey = table === 'customers' ? 'name' : 'id';

            if (table === 'activity') {
                state.tableState[table].sortKey = 'dateTime';
                state.tableState[table].sortDir = 'desc';
            }

            if (table === 'finance') {
                state.tableState[table].sortDir = 'desc';
            }

            const input = document.querySelector(`[data-table-search="${table}"]`);
            if (input) {
                input.value = '';
            }

            const filter = document.querySelector(`[data-table-filter="${table}"]`);
            if (filter) {
                syncTableFilterControl(table, filter);
            }

            renderTable(table);
        });
    });

    document.querySelectorAll('[data-table-export]').forEach((button) => {
        button.addEventListener('click', () => {
            const table = button.dataset.tableExport;
            if (!table) {
                return;
            }

            if (state.requestLocks.exportingTables.has(table)) {
                return;
            }

            void exportTableAsExcel(table);
        });
    });

    document.querySelectorAll('[data-table-export-pdf]').forEach((button) => {
        button.addEventListener('click', () => {
            const table = button.dataset.tableExportPdf;
            if (!table) {
                return;
            }

            if (state.requestLocks.exportingTables.has(table)) {
                return;
            }

            void exportTableAsPdf(table);
        });
    });

    document.querySelectorAll('[data-table-template]').forEach((button) => {
        button.addEventListener('click', () => {
            const table = button.dataset.tableTemplate;
            if (!table) {
                return;
            }

            void downloadImportTemplate(table);
        });
    });

    document.querySelectorAll('[data-table-import]').forEach((button) => {
        button.addEventListener('click', () => {
            const table = button.dataset.tableImport;
            if (!table) {
                return;
            }

            if (state.requestLocks.importingTables.has(table)) {
                return;
            }

            openImportPicker(table);
        });
    });

    document.querySelectorAll('[data-sort-table][data-sort-key]').forEach((header) => {
        header.addEventListener('click', () => {
            const table = header.dataset.sortTable;
            const key = header.dataset.sortKey;
            if (!table || !key || !state.tableState[table]) {
                return;
            }

            if (state.tableState[table].sortKey === key) {
                state.tableState[table].sortDir = state.tableState[table].sortDir === 'asc' ? 'desc' : 'asc';
            } else {
                state.tableState[table].sortKey = key;
                state.tableState[table].sortDir = 'asc';
            }

            renderTable(table);
        });
    });

    document.querySelectorAll('[data-page-nav][data-page-table]').forEach((button) => {
        button.addEventListener('click', () => {
            const table = button.dataset.pageTable;
            const nav = button.dataset.pageNav;
            if (!table || !nav || !state.tableState[table]) {
                return;
            }

            const totalRows = getProcessedRows(table).length;
            const totalPages = Math.max(1, Math.ceil(totalRows / state.tableState[table].perPage));

            if (nav === 'prev') {
                state.tableState[table].page = Math.max(1, state.tableState[table].page - 1);
            }
            if (nav === 'next') {
                state.tableState[table].page = Math.min(totalPages, state.tableState[table].page + 1);
            }

            renderTable(table);
        });
    });

    document.addEventListener('click', (event) => {
        const actionButton = event.target.closest('[data-row-action]');
        if (actionButton) {
            const action = actionButton.dataset.rowAction;
            const table = actionButton.dataset.rowTable;
            const id = Number(actionButton.dataset.rowId);

            if (action === 'view') {
                if (table === 'finance') {
                    openFinanceDetailModal(id);
                } else {
                    openRecordDetailModal(table, id);
                }
            }

            if (action === 'edit') {
                openEntityModal(table, 'edit', id);
            }

            if (action === 'delete') {
                void deleteEntityRow(table, id);
            }
        }
    });
}

function bindEntityModal() {
    document.querySelectorAll('[data-open-entity-modal]').forEach((button) => {
        button.addEventListener('click', () => {
            const table = button.dataset.openEntityModal;
            const mode = button.dataset.mode || 'add';
            openEntityModal(table, mode);
        });
    });

    const closeButtons = document.querySelectorAll('[data-close-entity]');
    closeButtons.forEach((button) => {
        button.addEventListener('click', () => {
            void closeEntityModal();
        });
    });

    const entityModal = document.getElementById('entityModal');
    if (entityModal) {
        entityModal.addEventListener('click', (event) => {
            if (event.target === entityModal) {
                void closeEntityModal();
            }
        });
    }

    const entityForm = document.getElementById('entityForm');
    if (entityForm) {
        entityForm.addEventListener('submit', (event) => {
            event.preventDefault();
            void submitEntityForm();
        });
    }
}

function bindFinanceDetailModal() {
    const modal = document.getElementById('financeDetailModal');
    if (!modal) {
        return;
    }

    document.querySelectorAll('[data-close-finance-detail]').forEach((button) => {
        button.addEventListener('click', closeFinanceDetailModal);
    });

    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeFinanceDetailModal();
        }
    });
}

function bindRecordDetailModal() {
    const modal = document.getElementById('recordDetailModal');
    if (!modal) {
        return;
    }

    document.querySelectorAll('[data-close-record-detail]').forEach((button) => {
        button.addEventListener('click', closeRecordDetailModal);
    });

    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeRecordDetailModal();
        }
    });
}

function bindConfirmModal() {
    const modal = document.getElementById('confirmModal');
    if (!modal) {
        return;
    }

    document.querySelectorAll('[data-close-confirm]').forEach((button) => {
        button.addEventListener('click', () => {
            if (state.confirmDialog.isSubmitting) {
                return;
            }

            closeConfirmModal(false);
        });
    });

    const confirmButton = document.getElementById('confirmModalConfirmBtn');
    const cancelButton = document.getElementById('confirmModalCancelBtn');
    if (confirmButton) {
        confirmButton.addEventListener('click', () => {
            if (state.confirmDialog.isSubmitting) {
                return;
            }

            const pendingLabel = String(state.confirmDialog.pendingLabel || '').trim();
            const delayMs = Math.max(0, Number(state.confirmDialog.delayMs) || 0);
            if (!pendingLabel || delayMs <= 0) {
                closeConfirmModal(true);
                return;
            }

            state.confirmDialog.isSubmitting = true;
            modal.classList.add('is-submitting');

            setButtonBusy(confirmButton, true, pendingLabel);

            if (cancelButton instanceof HTMLButtonElement) {
                cancelButton.disabled = true;
                cancelButton.classList.add('is-busy');
            }

            document.querySelectorAll('[data-close-confirm]').forEach((button) => {
                if (!(button instanceof HTMLButtonElement)) {
                    return;
                }

                button.disabled = true;
                button.classList.add('is-busy');
            });

            window.clearTimeout(state.confirmDialog.submitDelayTimerId);
            state.confirmDialog.submitDelayTimerId = window.setTimeout(() => {
                closeConfirmModal(true);
            }, delayMs);
        });
    }

    modal.addEventListener('click', (event) => {
        if (state.confirmDialog.isSubmitting) {
            return;
        }

        if (event.target === modal) {
            closeConfirmModal(false);
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.classList.contains('show')) {
            if (state.confirmDialog.isSubmitting) {
                return;
            }

            event.preventDefault();
            closeConfirmModal(false);
        }
    });
}

function bindUndoToast() {
    const button = document.getElementById('undoToastButton');
    if (!button) {
        return;
    }

    button.addEventListener('click', () => {
        void undoPendingDeletion();
    });
}

function bindAccountGate() {
    const accountGate = document.getElementById('accountGate');
    const passwordModal = document.getElementById('passwordModal');
    const passwordForm = document.getElementById('passwordForm');

    syncAccountGateVisibility(!state.isAuthenticated, accountGate);

    document.querySelectorAll('.account-option').forEach((button) => {
        button.addEventListener('click', () => {
            state.pendingAccount = {
                id: Number(button.dataset.accountId || 0) || 0,
                name: button.dataset.accountName || 'User',
                role: button.dataset.accountRole || 'Karyawan',
                phone: String(button.dataset.accountPhone || '').trim(),
            };

            const label = document.getElementById('passwordAccountLabel');
            if (label) {
                label.textContent = `${state.pendingAccount.name} (${state.pendingAccount.role})`;
            }

            passwordModal?.classList.add('show');
            passwordModal?.setAttribute('aria-hidden', 'false');
            document.getElementById('passwordInput')?.focus();
        });
    });

    document.querySelectorAll('[data-close-password]').forEach((button) => {
        button.addEventListener('click', closePasswordModal);
    });

    if (passwordModal) {
        passwordModal.addEventListener('click', (event) => {
            if (event.target === passwordModal) {
                closePasswordModal();
            }
        });
    }

    if (passwordForm) {
        passwordForm.addEventListener('submit', (event) => {
            event.preventDefault();
            void submitAccountGateLogin();
        });
    }
}

function bindPasswordVisibilityToggles() {
    document.querySelectorAll('[data-toggle-password]').forEach((button) => {
        if (!(button instanceof HTMLButtonElement)) {
            return;
        }

        if (button.dataset.boundToggle === '1') {
            return;
        }

        button.dataset.boundToggle = '1';

        button.addEventListener('click', () => {
            const targetInputId = String(button.dataset.targetInput || '').trim();
            if (!targetInputId) {
                return;
            }

            const input = document.getElementById(targetInputId);
            if (!(input instanceof HTMLInputElement)) {
                return;
            }

            const shouldShow = input.type === 'password';
            setPasswordVisibilityState(input, button, shouldShow);
        });
    });
}

function resetPasswordVisibilityToggles() {
    document.querySelectorAll('[data-toggle-password]').forEach((button) => {
        if (!(button instanceof HTMLButtonElement)) {
            return;
        }

        const targetInputId = String(button.dataset.targetInput || '').trim();
        if (!targetInputId) {
            return;
        }

        const input = document.getElementById(targetInputId);
        if (!(input instanceof HTMLInputElement)) {
            return;
        }

        setPasswordVisibilityState(input, button, false);
    });
}

function setPasswordVisibilityState(input, button, isVisible) {
    input.type = isVisible ? 'text' : 'password';
    button.setAttribute('aria-pressed', isVisible ? 'true' : 'false');
    button.textContent = isVisible ? 'Sembunyikan' : 'Tampil';
}

async function submitAccountGateLogin() {
    const passwordForm = document.getElementById('passwordForm');
    const passwordInput = document.getElementById('passwordInput');
    const error = document.getElementById('passwordError');
    const submitButton = passwordForm?.querySelector('button[type="submit"]');
    const value = passwordInput?.value || '';

    if (!state.pendingAccount || !Number.isFinite(Number(state.pendingAccount.id)) || Number(state.pendingAccount.id) <= 0) {
        if (error) {
            error.textContent = 'Akun tidak valid. Tutup lalu pilih akun lagi.';
        }
        return;
    }

    if (String(value).trim() === '') {
        if (error) {
            error.textContent = 'Password wajib diisi.';
        }
        return;
    }

    if (error) {
        error.textContent = '';
    }

    setButtonBusy(submitButton, true, 'Memverifikasi...');

    try {
        const verifiedAccount = await verifyAccountLogin(state.pendingAccount.id, value);

        state.selectedAccount = {
            id: Number(verifiedAccount.id || state.pendingAccount.id) || Number(state.pendingAccount.id),
            name: String(verifiedAccount.name || state.pendingAccount.name || 'User'),
            role: String(verifiedAccount.role || state.pendingAccount.role || 'Karyawan'),
            phone: String(verifiedAccount.phone || state.pendingAccount.phone || '').trim(),
        };
        state.isAuthenticated = true;
        persistAccountSession(state.selectedAccount);
        updateProfileInfo();
        applyRoleAccessControl();

        closePasswordModal();
        syncAccountGateVisibility(false);
        showToast(`Selamat datang ${state.selectedAccount.name}.`);
    } catch (requestError) {
        if (error) {
            error.textContent = requestError instanceof Error
                ? requestError.message
                : 'Password tidak valid.';
        }
    } finally {
        setButtonBusy(submitButton, false);
    }
}

async function verifyAccountLogin(accountId, password) {
    if (!accountLoginEndpoint) {
        throw new Error('Endpoint login akun belum tersedia.');
    }

    const response = await fetch(accountLoginEndpoint, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
            account_id: Number(accountId),
            password: String(password || ''),
        }),
    });

    const result = await parseJsonResponse(response);
    if (!response.ok) {
        throw new Error(resolveApiErrorMessage(result) || 'Password salah untuk akun yang dipilih.');
    }

    return result.data || {};
}

function bindTopbar() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            void handleLogoutRequest();
        });
    }

    const profilePill = document.getElementById('profilePill');
    if (profilePill) {
        profilePill.addEventListener('click', () => {
            showToast(`Akun aktif: ${state.selectedAccount.name} (${state.selectedAccount.role}).`);
        });
    }
}

function hasInFlightUiRequests() {
    return Boolean(
        state.requestLocks.submitForm
        || state.requestLocks.importingTables.size > 0
        || state.requestLocks.exportingTables.size > 0
        || state.confirmDialog.isSubmitting,
    );
}

function hasPendingCriticalChanges() {
    return Boolean(
        hasEntityFormUnsavedChanges()
        || state.undoDelete.item,
    );
}

function shouldWarnBeforeLeave() {
    if (state.leaveGuard.allowUnload) {
        return false;
    }

    return hasInFlightUiRequests() || hasPendingCriticalChanges();
}

function shouldWarnBeforeNativeUnload() {
    if (state.leaveGuard.allowUnload) {
        return false;
    }

    // Keep native browser prompt only for background critical states.
    // Unsaved form edits and submit-in-progress are handled by in-app flows.
    return Boolean(
        state.undoDelete.item
        || state.requestLocks.importingTables.size > 0
        || state.requestLocks.exportingTables.size > 0
        || state.requestLocks.deletingKeys.size > 0
        || state.confirmDialog.isSubmitting
    );
}

function temporarilyAllowUnload(durationMs = 1200) {
    state.leaveGuard.allowUnload = true;

    window.clearTimeout(state.leaveGuard.resetTimerId);
    state.leaveGuard.resetTimerId = window.setTimeout(() => {
        state.leaveGuard.allowUnload = false;
        state.leaveGuard.resetTimerId = 0;
    }, Math.max(200, Number(durationMs) || 1200));
}

function handleBeforeUnloadGuard(event) {
    if (!shouldWarnBeforeNativeUnload()) {
        return;
    }

    event.preventDefault();
    event.returnValue = '';
}

function bindBeforeUnloadGuard() {
    if (bindBeforeUnloadGuard.bound) {
        return;
    }

    window.addEventListener('beforeunload', handleBeforeUnloadGuard);

    bindBeforeUnloadGuard.bound = true;
}

function isReloadShortcutEvent(event) {
    if (!(event instanceof KeyboardEvent)) {
        return false;
    }

    if (event.key === 'F5') {
        return true;
    }

    const key = String(event.key || '').toLowerCase();
    return (event.ctrlKey || event.metaKey) && key === 'r';
}

function bindReloadShortcutGuard() {
    if (bindReloadShortcutGuard.bound) {
        return;
    }

    document.addEventListener('keydown', (event) => {
        if (!isReloadShortcutEvent(event)) {
            return;
        }

        if (!shouldWarnBeforeLeave()) {
            return;
        }

        event.preventDefault();
        void requestReloadShortcutConfirmation();
    });

    bindReloadShortcutGuard.bound = true;
}

async function requestReloadShortcutConfirmation() {
    const confirmModal = document.getElementById('confirmModal');
    if (confirmModal?.classList.contains('show')) {
        return;
    }

    const confirmed = await requestConfirmDialog({
        title: 'Muat Ulang Halaman',
        message: 'Perubahan belum disimpan atau proses masih berjalan. Tetap muat ulang?',
        confirmLabel: 'Muat Ulang',
        cancelLabel: 'Batal',
        danger: true,
    });

    if (!confirmed) {
        return;
    }

    temporarilyAllowUnload();
    window.location.reload();
}

async function handleLogoutRequest() {
    if (hasInFlightUiRequests()) {
        showToast('Proses sedang berjalan. Tunggu hingga selesai.');
        return;
    }

    if (hasPendingCriticalChanges()) {
        const confirmed = await requestConfirmDialog({
            title: 'Keluar Sesi',
            message: 'Masih ada perubahan/proses belum selesai. Tetap keluar dari sesi?',
            confirmLabel: 'Keluar',
            cancelLabel: 'Batal',
            danger: true,
        });

        if (!confirmed) {
            return;
        }
    }

    await sendLogoutActivity();

    await undoPendingDeletion({ silent: true });
    state.isAuthenticated = false;
    clearAccountSession();
    clearViewSession();
    clearTableStateSession();
    syncAccountGateVisibility(true);
    showToast('Sesi berakhir. Pilih akun untuk masuk kembali.');
}

function syncAccountGateVisibility(isVisible, accountGate = null) {
    const gate = accountGate || document.getElementById('accountGate');
    if (gate) {
        gate.classList.toggle('is-visible', Boolean(isVisible));
    }

    document.body.classList.toggle('is-account-gate-open', Boolean(isVisible));
}

async function sendLogoutActivity() {
    if (!accountLogoutEndpoint) {
        return;
    }

    try {
        await fetch(accountLogoutEndpoint, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...buildActorRequestHeaders(),
            },
            body: JSON.stringify({
                account_id: Number(state.selectedAccount?.id || 0) || null,
            }),
        });
    } catch (error) {
        // Logout UI should continue even when log endpoint fails.
    }
}

async function openView(viewName) {
    if (isOwnerOnlyView(viewName) && !hasOwnerAccess()) {
        showToast(OWNER_ONLY_MESSAGE);
        return;
    }

    state.currentView = viewName;
    persistViewSession(viewName);

    document.querySelectorAll('.app-view').forEach((view) => {
        view.classList.toggle('is-active', view.dataset.view === viewName);
    });

    document.querySelectorAll('[data-view-target]').forEach((link) => {
        link.classList.toggle('is-active', link.dataset.viewTarget === viewName);
    });

    const meta = pageMeta[viewName] || pageMeta.dashboard;
    const pageTitle = document.getElementById('pageTitle');
    const pageDate = document.getElementById('pageDate');

    if (pageTitle) {
        pageTitle.textContent = meta.title;
    }

    if (pageDate) {
        pageDate.textContent = getWibDateTimeLabel();
    }

    if (window.innerWidth <= 1024) {
        document.getElementById('bsaApp')?.classList.remove('sidebar-mobile-open');
    }

    // Lazy load data if not already loaded
    if (state.tableState[viewName] && !state.tableState[viewName].loaded) {
        await fetchTableData(viewName);
    }

    if (viewName === 'dashboard') {
        renderDashboardMiniCalendar();
        updateMetricCounters(!state.countersAnimated);
        renderFinanceOverview();
    }

    if (viewName === 'finance') {
        renderFinanceOverview();
    }

    if (viewName === 'calendar') {
        if (!state.calendarView.loaded) {
            await refreshCalendarEventsFromBackend();
            state.calendarView.loaded = true;
        }
        renderCalendarView();
    }
}

async function fetchTableData(table) {
    const endpoint = apiEndpoints[table];
    if (!endpoint || state.requestLocks.loadingTables.has(table)) {
        return;
    }

    state.requestLocks.loadingTables.add(table);
    renderTableLoading(table, true);

    try {
        const response = await fetch(endpoint, {
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...buildActorRequestHeaders(),
            }
        });
        const result = await parseJsonResponse(response);
        if (result && result.data) {
            state.data[table] = Array.isArray(result.data) ? result.data : [];
            state.tableState[table].loaded = true;
        }
    } catch (e) {
        console.error(`Fetch error for ${table}:`, e);
        showToast(`Gagal memuat data ${table}. Silakan coba lagi.`);
    } finally {
        state.requestLocks.loadingTables.delete(table);
        renderTableLoading(table, false);
        renderTable(table);
    }
}

function renderTableLoading(table, isLoading) {
    const panel = document.querySelector(`[data-table-panel="${table}"]`);
    if (panel) {
        panel.classList.toggle('is-loading', Boolean(isLoading));
    }
}

function renderAllTables() {
    Object.keys(tableDefinitions).forEach((table) => {
        renderTable(table);
    });
}

function renderTable(table) {
    const body = document.getElementById(`${table}TableBody`);
    if (!body) {
        return;
    }

    const processedRows = getProcessedRows(table);
    const tableState = state.tableState[table];
    const totalRows = processedRows.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / tableState.perPage));
    tableState.page = Math.min(tableState.page, totalPages);

    const startIndex = (tableState.page - 1) * tableState.perPage;
    const pageRows = processedRows.slice(startIndex, startIndex + tableState.perPage);
    const emptyColspan = {
        stock: 6,
        orders: 8,
        customers: 5,
        activity: 7,
        users: 9,
        finance: 6,
    }[table] || 1;

    if (!pageRows.length) {
        body.innerHTML = `<tr><td colspan="${emptyColspan}" class="empty-cell">Data tidak ditemukan.</td></tr>`;
    } else {
        body.innerHTML = pageRows
            .map((row, index) => renderTableRow(table, row, startIndex + index + 1))
            .join('');
    }

    const meta = document.getElementById(`${table}DataInfo`);
    const pageInfo = document.getElementById(`${table}PageInfo`);
    if (meta) {
        const from = totalRows ? startIndex + 1 : 0;
        const to = Math.min(startIndex + pageRows.length, totalRows);
        meta.textContent = `Menampilkan ${from}-${to} dari ${totalRows} data`;
    }
    if (pageInfo) {
        pageInfo.textContent = `${tableState.page} / ${totalPages}`;
    }

    persistTableStateSession();
    syncSortMarker(table);
}

function getProcessedRows(table) {
    const rows = [...state.data[table]];
    const definition = tableDefinitions[table];
    const tableState = state.tableState[table];
    const filterOpt = definition.filterOptions[tableState.filterIndex]?.value || 'all';

    const filtered = rows.filter((row) => {
        const passFilter = definition.filterRow(row, filterOpt);
        if (!passFilter) {
            return false;
        }

        if (!tableState.query) {
            return true;
        }

        return definition.searchableKeys.some((key) => {
            const value = row[key];
            return String(value).toLowerCase().includes(tableState.query);
        });
    });

    filtered.sort((a, b) => compareValue(a[tableState.sortKey], b[tableState.sortKey], tableState.sortDir));

    return filtered;
}

function renderTableRow(table, row, rowNumber = 0) {
    const displayNo = Math.max(1, Number(rowNumber) || 1);

    if (table === 'stock') {
        return `
            <tr>
                <td>${displayNo}</td>
                <td>${escapeHtml(row.code)}</td>
                <td>${escapeHtml(row.name)}</td>
                <td>${formatCurrency(row.priceBuy)}</td>
                <td>${formatCurrency(row.priceSell)}</td>
                <td>${row.stock}</td>
                <td>
                    <div class="row-actions">
                        ${renderActionButtons(table, row.id)}
                    </div>
                </td>
            </tr>
        `;
    }

    if (table === 'orders') {
        return `
            <tr>
                <td>${displayNo}</td>
                <td>${escapeHtml(row.date)}</td>
                <td>${escapeHtml(row.author)}</td>
                <td>${escapeHtml(row.recorder || '-')}</td>
                <td>${escapeHtml(row.product)}</td>
                <td>${formatCurrency(row.nominal)}</td>
                <td>${tableDefinitions.orders.formatCell('status', row.status)}</td>
                <td>
                    <div class="row-actions">
                        ${renderActionButtons(table, row.id)}
                    </div>
                </td>
            </tr>
        `;
    }

    if (table === 'activity') {
        const statusClass = resolveLogStatusClass(row.status);
        return `
            <tr>
                <td>${displayNo}</td>
                <td>${escapeHtml(row.dateTime)}</td>
                <td>${escapeHtml(row.user)}</td>
                <td>${escapeHtml(row.action)}</td>
                <td>${escapeHtml(row.module)}</td>
                <td><span class="status-pill ${statusClass}">${capitalize(row.status)}</span></td>
                <td>
                    <div class="row-actions">
                        ${renderActionButtons(table, row.id)}
                    </div>
                </td>
            </tr>
        `;
    }

    if (table === 'users') {
        const statusClass = resolveUserStatusClass(row.status);
        return `
            <tr>
                <td>${displayNo}</td>
                <td>${escapeHtml(row.name)}</td>
                <td>${escapeHtml(capitalize(String(row.role || '').toLowerCase()))}</td>
                <td>${escapeHtml(row.position)}</td>
                <td>${escapeHtml(row.division)}</td>
                <td>${escapeHtml(row.phone)}</td>
                <td>${escapeHtml(row.shift)}</td>
                <td><span class="status-pill ${statusClass}">${capitalize(row.status)}</span></td>
                <td>
                    <div class="row-actions">
                        ${renderActionButtons(table, row.id)}
                    </div>
                </td>
            </tr>
        `;
    }

    if (table === 'finance') {
        const isOutgoing = isFinanceOutgoingCategory(row.category);
        const badgeClass = isOutgoing ? 'out' : '';
        const nominalClass = isOutgoing ? 'is-negative' : 'is-positive';
        const nominalSign = isOutgoing ? '-' : '+';

        return `
            <tr>
                <td>${row.id}</td>
                <td>${escapeHtml(row.date)}</td>
                <td>${escapeHtml(row.description)}</td>
                <td><span class="finance-badge ${badgeClass}">${formatFinanceCategoryLabel(row.category)}</span></td>
                <td class="${nominalClass}">${nominalSign} Rp ${formatCurrency(row.amount)}</td>
                <td>
                    <div class="row-actions">
                        ${renderActionButtons(table, row.id)}
                    </div>
                </td>
            </tr>
        `;
    }

    return `
        <tr>
            <td>${escapeHtml(row.name)}</td>
            <td>${escapeHtml(row.phone)}</td>
            <td>${escapeHtml(row.address || '-')}</td>
            <td>${row.history}</td>
            <td>${formatCurrency(row.total)}</td>
            <td>
                <div class="row-actions">
                    ${renderActionButtons(table, row.id)}
                </div>
            </td>
        </tr>
    `;
}

function renderActionButtons(table, id) {
    if (
        table === 'finance'
        || table === 'activity'
        || table === 'users'
        || table === 'stock'
        || table === 'orders'
        || table === 'customers'
    ) {
        return `
            <button class="row-action view" type="button" data-row-action="view" data-row-table="${table}" data-row-id="${id}" aria-label="Lihat detail">
                <svg viewBox="0 0 24 24"><path d="M12 5c5.7 0 10 5.4 11.2 7-.9 1.4-5 7-11.2 7S2.8 13.4 1.8 12C2.9 10.4 6.3 5 12 5zm0 2.3A4.7 4.7 0 1 0 12 16.7a4.7 4.7 0 0 0 0-9.4zm0 2.1A2.6 2.6 0 1 1 12 14.6 2.6 2.6 0 0 1 12 9.4z"/></svg>
            </button>
            <button class="row-action edit" type="button" data-row-action="edit" data-row-table="${table}" data-row-id="${id}" aria-label="Edit">
                <svg viewBox="0 0 24 24"><path d="M3 17.3V21h3.7L17.8 9.9l-3.7-3.7zM20.7 7c.4-.4.4-1 0-1.4L18.4 3.3a1 1 0 0 0-1.4 0l-1.8 1.8 3.7 3.7z"/></svg>
            </button>
            <button class="row-action delete" type="button" data-row-action="delete" data-row-table="${table}" data-row-id="${id}" aria-label="Hapus">
                <svg viewBox="0 0 24 24"><path d="M6 7h12l-1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2zm3-4h6l1 2h4v2H4V5h4z"/></svg>
            </button>
        `;
    }

    return `
        <button class="row-action edit" type="button" data-row-action="edit" data-row-table="${table}" data-row-id="${id}" aria-label="Edit">
            <svg viewBox="0 0 24 24"><path d="M3 17.3V21h3.7L17.8 9.9l-3.7-3.7zM20.7 7c.4-.4.4-1 0-1.4L18.4 3.3a1 1 0 0 0-1.4 0l-1.8 1.8 3.7 3.7z"/></svg>
        </button>
        <button class="row-action delete" type="button" data-row-action="delete" data-row-table="${table}" data-row-id="${id}" aria-label="Hapus">
            <svg viewBox="0 0 24 24"><path d="M6 7h12l-1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2zm3-4h6l1 2h4v2H4V5h4z"/></svg>
        </button>
    `;
}

function syncSortMarker(table) {
    document.querySelectorAll(`[data-sort-table="${table}"]`).forEach((th) => {
        th.classList.remove('sorted-asc', 'sorted-desc');
    });

    const tableState = state.tableState[table];
    const active = document.querySelector(
        `[data-sort-table="${table}"][data-sort-key="${tableState.sortKey}"]`,
    );

    if (active) {
        active.classList.add(tableState.sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
    }
}

function renderDashboardMiniTables() {
    const stockBody = document.getElementById('dashboardStockBody');
    const orderBody = document.getElementById('dashboardOrderBody');

    if (stockBody) {
        const rows = getProcessedRows('stock');
        stockBody.innerHTML = rows.slice(0, 8).map((row, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(row.code)}</td>
                <td>${escapeHtml(row.name)}</td>
                <td>${formatCurrency(row.priceSell)}</td>
                <td>${row.stock}</td>
            </tr>
        `).join('');
    }

    if (orderBody) {
        const rows = getProcessedRows('orders');
        orderBody.innerHTML = rows.slice(0, 4).map((row, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(row.date)}</td>
                <td>${escapeHtml(row.author)}</td>
                <td>${escapeHtml(row.product)}</td>
                <td>${formatCurrency(row.nominal)}</td>
            </tr>
        `).join('');
    }
}

function renderDashboardMiniCalendar() {
    const monthNode = document.getElementById('dashboardMiniCalendarMonth');
    const daysNode = document.getElementById('dashboardMiniCalendarDays');
    const footerNode = document.getElementById('dashboardMiniCalendarFooter');
    if (!monthNode || !daysNode || !footerNode) {
        return;
    }

    const today = getWibTodayDate();
    const year = today.getFullYear();
    const month = today.getMonth();
    const todayDate = today.getDate();

    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const leadingOffset = (firstDay.getDay() + 6) % 7;

    const monthLabel = new Intl.DateTimeFormat('id-ID', {
        timeZone: WIB_TIMEZONE,
        month: 'long',
    }).format(today);

    const cells = [];

    for (let i = leadingOffset - 1; i >= 0; i -= 1) {
        const day = daysInPrevMonth - i;
        cells.push(`<span class="is-muted">${String(day).padStart(2, '0')}</span>`);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
        if (day === todayDate) {
            cells.push(`<span class="is-selected">${String(day).padStart(2, '0')}</span>`);
        } else {
            cells.push(`<span>${String(day).padStart(2, '0')}</span>`);
        }
    }

    const trailing = (7 - (cells.length % 7)) % 7;
    for (let day = 1; day <= trailing; day += 1) {
        cells.push(`<span class="is-muted">${String(day).padStart(2, '0')}</span>`);
    }

    monthNode.textContent = capitalize(monthLabel);
    footerNode.textContent = `< ${year} >`;
    daysNode.innerHTML = cells.join('');
}

function updateMetricCounters(animate = false) {
    const metrics = buildDashboardMetrics(state.dashboardMetricPeriod);
    const values = {
        customerGrowth: metrics.customerGrowth.value,
        salesTotal: metrics.salesTotal.value,
        productSold: metrics.productSold.value,
    };

    document.querySelectorAll('[data-counter]').forEach((element) => {
        const key = element.dataset.counter;
        const target = values[key] ?? Number(element.dataset.target || 0);
        element.dataset.target = String(target);

        if (animate) {
            animateCounter(element, target, element.dataset.format || 'id-number');
        } else {
            element.textContent = formatCounterValue(target, element.dataset.format || 'id-number');
        }
    });

    Object.entries(metrics).forEach(([key, metric]) => {
        const subtitle = document.querySelector(`[data-metric-subtitle="${key}"]`);
        if (subtitle) {
            subtitle.textContent = metric.subtitle;
        }
    });

    renderMetricLineChart('customerGrowth', metrics.customerGrowth.chart);
    renderMetricLineChart('salesTotal', metrics.salesTotal.chart);
    renderMetricDonutChart('productSold', metrics.productSold.donut);

    if (animate) {
        state.countersAnimated = true;
    }
}

function buildDashboardMetrics(period = 'month') {
    const anchor = getWibTodayDate();
    const normalizedPeriod = normalizeMetricPeriod(period);
    const { buckets, indexByKey } = buildDashboardMetricBuckets(anchor, normalizedPeriod);

    const orders = (state.data.orders || [])
        .map((row) => {
            const parsedDate = parseFlexibleDate(row.date);
            if (!parsedDate) {
                return null;
            }

            return {
                ...row,
                parsedDate,
                status: String(row.status || '').toLowerCase(),
                nominal: Number(row.nominal || 0),
            };
        })
        .filter((row) => row);

    const firstMonthByCustomer = {};
    [...orders]
        .filter((row) => row.status !== 'tertolak')
        .sort((left, right) => left.parsedDate.getTime() - right.parsedDate.getTime())
        .forEach((row) => {
            const customerKey = resolveMetricCustomerKey(row);
            if (!customerKey) {
                return;
            }

            const bucketKey = getDashboardMetricBucketKey(row.parsedDate, normalizedPeriod);
            if (!firstMonthByCustomer[customerKey]) {
                firstMonthByCustomer[customerKey] = bucketKey;
            }
        });

    orders.forEach((row) => {
        const bucketKey = getDashboardMetricBucketKey(row.parsedDate, normalizedPeriod);
        const index = indexByKey[bucketKey];
        if (index === undefined) {
            return;
        }

        const bucket = buckets[index];
        const customerKey = resolveMetricCustomerKey(row);
        if (customerKey && row.status !== 'tertolak') {
            bucket.activeCustomers.add(customerKey);
        }

        if (row.status === 'terkirim') {
            bucket.salesDelivered += row.nominal;
            bucket.deliveredOrders += 1;

            extractMetricOrderItems(row).forEach((item) => {
                const productName = item.name;
                const quantity = Number(item.quantity || 0);
                bucket.productUnits[productName] = (bucket.productUnits[productName] || 0) + quantity;
                bucket.totalUnits += quantity;
            });
        } else if (row.status === 'tertunda') {
            bucket.salesPending += row.nominal;
            bucket.pendingOrders += 1;
        } else {
            bucket.salesRejected += row.nominal;
        }
    });

    const firstMonthList = Object.values(firstMonthByCustomer);
    buckets.forEach((bucket) => {
        bucket.newCustomers = firstMonthList.filter((monthKey) => monthKey === bucket.key).length;
        bucket.returningCustomers = Math.max(bucket.activeCustomers.size - bucket.newCustomers, 0);
    });

    const current = buckets[buckets.length - 1] || {
        activeCustomers: new Set(),
        newCustomers: 0,
        returningCustomers: 0,
        salesDelivered: 0,
        salesPending: 0,
        salesRejected: 0,
        deliveredOrders: 0,
        totalUnits: 0,
        productUnits: {},
    };
    const previous = buckets.length > 1 ? buckets[buckets.length - 2] : null;

    const customerGrowth = calculateMetricGrowthPercent(
        current.activeCustomers.size,
        previous ? previous.activeCustomers.size : 0,
    );

    let donutSource = { ...current.productUnits };
    if (!Object.keys(donutSource).length) {
        donutSource = {};
        buckets.forEach((bucket) => {
            Object.entries(bucket.productUnits).forEach(([label, quantity]) => {
                donutSource[label] = (donutSource[label] || 0) + Number(quantity || 0);
            });
        });
    }

    const donutEntriesRaw = Object.entries(donutSource)
        .sort((left, right) => Number(right[1]) - Number(left[1]))
        .slice(0, 3);
    const donutTotal = donutEntriesRaw.reduce((sum, [, quantity]) => sum + Number(quantity || 0), 0);

    let donutEntries = donutEntriesRaw.map(([label, quantity]) => ({
        label,
        quantity: Number(quantity || 0),
        pct: donutTotal > 0 ? Math.round((Number(quantity || 0) / donutTotal) * 100) : 0,
    }));

    if (!donutEntries.length) {
        donutEntries = [{ label: 'Belum ada penjualan', quantity: 0, pct: 0 }];
    }

    const leadingPct = Math.max(...donutEntries.map((entry) => Number(entry.pct || 0)), 0);

    const periodLabel = DASHBOARD_METRIC_PERIOD_LABELS[normalizedPeriod] || DASHBOARD_METRIC_PERIOD_LABELS.month;

    return {
        customerGrowth: {
            value: round2(customerGrowth),
            subtitle: `${current.activeCustomers.size} pelanggan aktif · ${current.newCustomers} baru ${periodLabel.toLowerCase()}`,
            chart: {
                series: [
                    buckets.map((bucket) => bucket.activeCustomers.size),
                    buckets.map((bucket) => bucket.newCustomers),
                    buckets.map((bucket) => bucket.returningCustomers),
                ],
                legends: ['Pelanggan Aktif', 'Pelanggan Baru', 'Pelanggan Kembali'],
            },
        },
        salesTotal: {
            value: Math.round(current.salesDelivered),
            subtitle: `${current.deliveredOrders} order terkirim ${periodLabel.toLowerCase()}`,
            chart: {
                series: [
                    buckets.map((bucket) => Math.round(bucket.salesDelivered)),
                    buckets.map((bucket) => Math.round(bucket.salesPending)),
                    buckets.map((bucket) => Math.round(bucket.salesRejected)),
                ],
                legends: ['Terkirim', 'Tertunda', 'Tertolak'],
            },
        },
        productSold: {
            value: Math.round(current.totalUnits),
            subtitle: `${current.deliveredOrders} order terkirim ${periodLabel.toLowerCase()}`,
            donut: {
                entries: donutEntries,
                centerLabel: `${leadingPct}%`,
            },
        },
    };
}

function buildDashboardMetricBuckets(anchorDate, period) {
    const buckets = [];
    const indexByKey = {};

    if (period === 'day') {
        for (let i = 6; i >= 0; i -= 1) {
            const date = shiftDate(anchorDate, -i);
            const key = formatIsoDate(date);
            indexByKey[key] = buckets.length;
            buckets.push(createDashboardMetricBucket(key, formatShortDate(date)));
        }
        return { buckets, indexByKey };
    }

    if (period === 'week') {
        const anchorWeekStart = getFinanceWeekStart(anchorDate);
        for (let i = 5; i >= 0; i -= 1) {
            const weekStart = shiftDate(anchorWeekStart, -(i * 7));
            const key = formatIsoDate(weekStart);
            indexByKey[key] = buckets.length;
            buckets.push(createDashboardMetricBucket(key, `${String(weekStart.getDate()).padStart(2, '0')}/${String(weekStart.getMonth() + 1).padStart(2, '0')}`));
        }
        return { buckets, indexByKey };
    }

    for (let i = 5; i >= 0; i -= 1) {
        const monthDate = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - i, 1);
        const key = getMetricMonthKey(monthDate);

        indexByKey[key] = buckets.length;
        buckets.push(createDashboardMetricBucket(key, getMetricMonthLabel(monthDate)));
    }

    return { buckets, indexByKey };
}

function createDashboardMetricBucket(key, label) {
    return {
        key,
        label,
        activeCustomers: new Set(),
        newCustomers: 0,
        returningCustomers: 0,
        salesDelivered: 0,
        salesPending: 0,
        salesRejected: 0,
        deliveredOrders: 0,
        pendingOrders: 0,
        totalUnits: 0,
        productUnits: {},
    };
}

function getDashboardMetricBucketKey(dateObj, period) {
    const normalizedPeriod = normalizeMetricPeriod(period);
    if (normalizedPeriod === 'day') {
        return formatIsoDate(dateObj);
    }

    if (normalizedPeriod === 'week') {
        return formatIsoDate(getFinanceWeekStart(dateObj));
    }

    return getMetricMonthKey(dateObj);
}

function normalizeMetricPeriod(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'day' || normalized === 'week' || normalized === 'month') {
        return normalized;
    }

    return 'month';
}

function getMetricMonthKey(dateObj) {
    return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
}

function getMetricMonthLabel(dateObj) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return monthNames[dateObj.getMonth()] || 'Jan';
}

function resolveMetricCustomerKey(row) {
    if (row.customerId !== undefined && row.customerId !== null && String(row.customerId).trim() !== '') {
        return `id:${row.customerId}`;
    }

    const author = String(row.author || '').trim().toLowerCase();
    if (!author) {
        return '';
    }

    return `name:${author}`;
}

function extractMetricOrderItems(row) {
    if (Array.isArray(row.items) && row.items.length) {
        return row.items.map((item) => ({
            name: String(item.product || item.product_name || row.product || 'Produk Lainnya'),
            quantity: Math.max(1, Number(item.quantity || 1)),
        }));
    }

    return [{
        name: String(row.product || 'Produk Lainnya'),
        quantity: 1,
    }];
}

function calculateMetricGrowthPercent(currentValue, previousValue) {
    const current = Number(currentValue || 0);
    const previous = Number(previousValue || 0);

    if (previous <= 0) {
        return current > 0 ? 100 : 0;
    }

    return ((current - previous) / previous) * 100;
}

function buildMetricLinePath(values, width, height, padding = 6) {
    const safeValues = (values || []).map((value) => Number(value || 0));
    if (!safeValues.length) {
        return `M${padding} ${height - padding} L${width - padding} ${height - padding}`;
    }

    const max = Math.max(...safeValues);
    const min = Math.min(...safeValues);
    const range = max - min;
    const denominator = safeValues.length > 1 ? safeValues.length - 1 : 1;
    const xSpan = width - (padding * 2);
    const ySpan = height - (padding * 2);

    return safeValues
        .map((value, index) => {
            const x = padding + ((xSpan * index) / denominator);
            const ratio = range === 0 ? 0.5 : (value - min) / range;
            const y = (height - padding) - (ratio * ySpan);
            const prefix = index === 0 ? 'M' : 'L';
            return `${prefix}${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(' ');
}

function renderMetricLineChart(metricKey, chartData) {
    const chart = document.querySelector(`[data-metric-line-chart="${metricKey}"]`);
    if (!chart || !chartData) {
        return;
    }

    const viewBox = String(chart.getAttribute('viewBox') || '0 0 260 84')
        .split(/\s+/)
        .map((value) => Number(value));
    const width = Number(viewBox[2]) || 260;
    const height = Number(viewBox[3]) || 84;

    const seriesKeys = ['a', 'b', 'c'];
    seriesKeys.forEach((seriesKey, index) => {
        const path = chart.querySelector(`[data-line-series="${seriesKey}"]`);
        if (!path) {
            return;
        }

        const values = Array.isArray(chartData.series?.[index]) ? chartData.series[index] : [];
        path.setAttribute('d', buildMetricLinePath(values, width, height));
    });

    const legendWrap = document.querySelector(`[data-line-legend="${metricKey}"]`);
    if (!legendWrap) {
        return;
    }

    seriesKeys.forEach((seriesKey, index) => {
        const labelNode = legendWrap.querySelector(`[data-legend-series="${seriesKey}"] .legend-text`);
        if (labelNode) {
            labelNode.textContent = chartData.legends?.[index] || '-';
        }
    });
}

function renderMetricDonutChart(metricKey, donutData) {
    const donut = document.querySelector(`[data-metric-donut-chart="${metricKey}"]`);
    const center = document.querySelector(`[data-metric-donut-center="${metricKey}"]`);
    const legendWrap = document.querySelector(`[data-metric-donut-legend="${metricKey}"]`);
    if (!donut || !center || !legendWrap) {
        return;
    }

    const entries = Array.isArray(donutData?.entries) ? donutData.entries.slice(0, 3) : [];
    const colors = ['#6b7bff', '#e08cff', '#fb7ba1'];

    if (!entries.length) {
        donut.style.background = 'conic-gradient(#dbe3f4 0 100%)';
        center.textContent = '0%';
        legendWrap.querySelectorAll('[data-donut-index]').forEach((item) => {
            item.style.display = 'none';
        });
        return;
    }

    let offset = 0;
    const gradients = [];
    entries.forEach((entry, index) => {
        const pct = Math.max(0, Math.min(100, Number(entry.pct || 0)));
        const start = offset;
        const end = Math.min(100, start + pct);
        gradients.push(`${colors[index]} ${start}% ${end}%`);
        offset = end;
    });

    if (offset < 100) {
        gradients.push(`#dbe3f4 ${offset}% 100%`);
    }

    donut.style.background = `conic-gradient(${gradients.join(', ')})`;
    center.textContent = donutData?.centerLabel || '0%';

    legendWrap.querySelectorAll('[data-donut-index]').forEach((item, index) => {
        const labelNode = item.querySelector('.donut-label');
        const entry = entries[index];

        if (!entry) {
            item.style.display = 'none';
            return;
        }

        item.style.display = '';
        if (labelNode) {
            labelNode.textContent = `${entry.label} (${entry.pct}%)`;
        }
    });
}

function renderFinanceOverview() {
    const now = getWibTodayDate();
    const monthLabel = capitalize(new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(now));

    const rows = getFinanceRowsByPeriod(state.financePeriod);
    const incomingRows = rows.filter((row) => !isFinanceOutgoingCategory(row.category));
    const outgoingRows = rows.filter((row) => isFinanceOutgoingCategory(row.category));

    const incoming = incomingRows.reduce((total, row) => total + Number(row.amount), 0);
    const incomingCost = incomingRows.reduce((total, row) => total + Number(row.cost || 0), 0);
    const outgoing = outgoingRows.reduce((total, row) => total + Number(row.amount), 0);
    
    const net = (incoming - incomingCost) - outgoing;

    const summaryMap = {
        day: 'Periode hari ini.',
        week: 'Periode 7 hari terakhir.',
        month: `Periode ${monthLabel} ${now.getFullYear()}.`,
    };

    // Update Finance Page Summary
    const financeCaption = document.getElementById('financeSummaryCaption');
    if (financeCaption) {
        financeCaption.textContent = summaryMap[state.financePeriod] || summaryMap.month;
    }
    updateFinanceKPIUI('finance', incoming, outgoing, net);

    // Update Dashboard Summary
    const dashCaption = document.getElementById('dashFinanceSummaryCaption');
    if (dashCaption) {
        dashCaption.textContent = summaryMap[state.financePeriod] || summaryMap.month;
    }
    updateFinanceKPIUI('dash', incoming, outgoing, net);

    const barsMeta = {
        day: { title: 'Arus Kas Harian', range: '7 Hari' },
        week: { title: 'Arus Kas Mingguan', range: '6 Minggu' },
        month: { title: 'Arus Kas Bulanan', range: String(now.getFullYear()) },
    };

    const distributionMap = {
        day: 'Hari ini',
        week: 'Minggu ini',
        month: 'Bulan ini',
    };

    const activeBarsMeta = barsMeta[state.financePeriod] || barsMeta.month;
    const barsTitle = document.getElementById('financeBarsTitle');
    const barsRange = document.getElementById('financeBarsRange');
    const distributionRange = document.getElementById('financeDistributionRange');
    if (barsTitle) {
        barsTitle.textContent = activeBarsMeta.title;
    }
    if (barsRange) {
        barsRange.textContent = activeBarsMeta.range;
    }
    if (distributionRange) {
        distributionRange.textContent = distributionMap[state.financePeriod] || distributionMap.month;
    }

    renderFinanceBars(state.financePeriod);
    renderFinanceDistribution(rows);
}

function updateFinanceKPIUI(prefix, incoming, outgoing, net) {
    const incomeValue = document.getElementById(`${prefix}IncomeValue`);
    const expenseValue = document.getElementById(`${prefix}ExpenseValue`);
    const netValue = document.getElementById(`${prefix}NetValue`);
    const incomeTrend = document.getElementById(`${prefix}IncomeTrend`);
    const expenseTrend = document.getElementById(`${prefix}ExpenseTrend`);
    const netTrend = document.getElementById(`${prefix}NetTrend`);

    if (incomeValue) {
        incomeValue.textContent = `Rp ${formatCurrency(incoming)}`;
    }
    if (expenseValue) {
        expenseValue.textContent = `Rp ${formatCurrency(outgoing)}`;
    }
    if (netValue) {
        netValue.textContent = `Rp ${formatCurrency(net)}`;
    }
    
    // Trend data is currently placeholder/empty in this version
    if (incomeTrend) {
        incomeTrend.textContent = '-';
        incomeTrend.style.opacity = '0.5';
    }
    if (expenseTrend) {
        expenseTrend.textContent = '-';
        expenseTrend.style.opacity = '0.5';
    }
    if (netTrend) {
        netTrend.textContent = '-';
        netTrend.style.opacity = '0.5';
    }
}

function renderCalendarView() {
    renderCalendarMonthGrid();
    renderCalendarAgendaList();
}

function renderCalendarMonthGrid() {
    const grid = document.getElementById('calendarMonthGrid');
    const monthLabel = document.getElementById('calendarMonthLabel');
    if (!grid || !monthLabel) {
        return;
    }

    const { year, month, selectedDate } = state.calendarView;
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();
    const offset = (firstDay.getDay() + 6) % 7;

    const monthName = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(firstDay);
    monthLabel.textContent = `${capitalize(monthName)} ${year}`;

    const cells = [];

    for (let i = offset - 1; i >= 0; i -= 1) {
        const day = daysInPrev - i;
        const date = new Date(year, month - 1, day);
        cells.push(buildCalendarCell(date, false, selectedDate));
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
        const date = new Date(year, month, day);
        cells.push(buildCalendarCell(date, true, selectedDate));
    }

    const needed = 42 - cells.length;
    for (let day = 1; day <= needed; day += 1) {
        const date = new Date(year, month + 1, day);
        cells.push(buildCalendarCell(date, false, selectedDate));
    }

    grid.innerHTML = cells.join('');
}

function buildCalendarCell(dateObj, inMonth, selectedDate) {
    const iso = formatIsoDate(dateObj);
    const eventCount = (state.data.calendarEvents || []).filter((item) => item.date === iso).length;
    const isToday = iso === getWibTodayIso();
    const isSelected = iso === selectedDate;

    return `
        <button
            class="calendar-day-cell ${inMonth ? '' : 'is-other'} ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}"
            type="button"
            data-cal-date="${iso}"
        >
            <span>${dateObj.getDate()}</span>
            ${eventCount ? `<i>${eventCount}</i>` : ''}
        </button>
    `;
}

function renderCalendarAgendaList() {
    const list = document.getElementById('calendarAgendaList');
    const label = document.getElementById('calendarAgendaDateLabel');
    if (!list || !label) {
        return;
    }

    const { selectedDate, search } = state.calendarView;
    const selectedHuman = formatDateHuman(selectedDate);
    label.textContent = `Agenda ${selectedHuman}`;

    let rows = (state.data.calendarEvents || [])
        .filter((item) => item.date === selectedDate)
        .sort((a, b) => String(a.time).localeCompare(String(b.time), 'id'));

    if (search) {
        rows = rows.filter((item) => {
            const haystack = `${item.title} ${item.type} ${item.location} ${item.status}`.toLowerCase();
            return haystack.includes(search);
        });
    }

    if (!rows.length) {
        list.innerHTML = '<li class="calendar-empty">Tidak ada agenda untuk tanggal ini.</li>';
        return;
    }

    list.innerHTML = rows
        .map((row) => {
            const statusClass = resolveCalendarStatusClass(row.status);
            return `
                <li class="calendar-agenda-item">
                    <div class="calendar-agenda-main">
                        <p class="calendar-agenda-title">${escapeHtml(row.title)}</p>
                        <p class="calendar-agenda-meta">${escapeHtml(row.time)} · ${escapeHtml(row.location)} · ${escapeHtml(row.type)}</p>
                    </div>
                    <div class="calendar-agenda-side">
                        <span class="status-pill ${statusClass}">${capitalize(row.status)}</span>
                        <div class="row-actions">
                            <button class="row-action view" type="button" data-calendar-event-action="view" data-calendar-event-id="${row.id}" aria-label="Lihat agenda">
                                <svg viewBox="0 0 24 24"><path d="M12 5c5.7 0 10 5.4 11.2 7-.9 1.4-5 7-11.2 7S2.8 13.4 1.8 12C2.9 10.4 6.3 5 12 5zm0 2.3A4.7 4.7 0 1 0 12 16.7a4.7 4.7 0 0 0 0-9.4zm0 2.1A2.6 2.6 0 1 1 12 14.6 2.6 2.6 0 0 1 12 9.4z"/></svg>
                            </button>
                            <button class="row-action edit" type="button" data-calendar-event-action="edit" data-calendar-event-id="${row.id}" aria-label="Edit agenda">
                                <svg viewBox="0 0 24 24"><path d="M3 17.3V21h3.7L17.8 9.9l-3.7-3.7zM20.7 7c.4-.4.4-1 0-1.4L18.4 3.3a1 1 0 0 0-1.4 0l-1.8 1.8 3.7 3.7z"/></svg>
                            </button>
                            <button class="row-action delete" type="button" data-calendar-event-action="delete" data-calendar-event-id="${row.id}" aria-label="Hapus agenda">
                                <svg viewBox="0 0 24 24"><path d="M6 7h12l-1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2zm3-4h6l1 2h4v2H4V5h4z"/></svg>
                            </button>
                        </div>
                    </div>
                </li>
            `;
        })
        .join('');
}

function getFinanceRowsByPeriod(period) {
    const rows = state.data.finance || [];
    const anchor = getWibTodayDate();

    return rows.filter((row) => {
        const date = parseFinanceDate(row.date);
        if (!date) {
            return false;
        }

        if (period === 'day') {
            return date.getTime() === anchor.getTime();
        }

        if (period === 'week') {
            const start = new Date(anchor);
            start.setDate(anchor.getDate() - 6);
            return date >= start && date <= anchor;
        }

        return date.getMonth() === anchor.getMonth() && date.getFullYear() === anchor.getFullYear();
    });
}

function renderFinanceBars(period) {
    const wrap = document.getElementById('financeBars');
    if (!wrap) {
        return;
    }

    const bars = buildFinanceBarSeries(period);
    const maxValue = Math.max(1, ...bars.flatMap((item) => [Number(item.in), Number(item.out)]));
    const chartHeight = 64;
    wrap.style.gridTemplateColumns = `repeat(${Math.max(bars.length, 1)}, minmax(0, 1fr))`;
    wrap.innerHTML = bars
        .map((item) => {
            const inHeight = Number(item.in) > 0
                ? Math.max(10, Math.min(chartHeight, Math.round((Number(item.in) / maxValue) * chartHeight)))
                : 5;
            const outHeight = Number(item.out) > 0
                ? Math.max(10, Math.min(chartHeight, Math.round((Number(item.out) / maxValue) * chartHeight)))
                : 5;

            const inLabel = Number(item.in) > 0 ? formatCompactRupiah(item.in) : '-';
            const outLabel = Number(item.out) > 0 ? formatCompactRupiah(item.out) : '-';

            return `
            <div class="finance-bar-group">
                <div class="finance-bar-axis">
                    <div class="finance-bar in" style="--bar-h: ${inHeight}px"><b>${escapeHtml(inLabel)}</b></div>
                    <div class="finance-bar out" style="--bar-h: ${outHeight}px"><b>${escapeHtml(outLabel)}</b></div>
                </div>
                <span>${escapeHtml(item.label)}</span>
            </div>
        `;
        })
        .join('');
}

function buildFinanceBarSeries(period) {
    const rows = (state.data.finance || [])
        .map((row) => ({
            ...row,
            parsedDate: parseFinanceDate(row.date),
        }))
        .filter((row) => row.parsedDate);

    const anchor = getWibTodayDate();

    if (period === 'day') {
        return buildFinanceDailySeries(rows, anchor);
    }

    if (period === 'week') {
        return buildFinanceWeeklySeries(rows, anchor);
    }

    return buildFinanceMonthlySeries(rows, anchor);
}

function buildFinanceDailySeries(rows, anchor) {
    const buckets = [];
    const indexByKey = {};

    for (let i = 6; i >= 0; i -= 1) {
        const date = shiftDate(anchor, -i);
        const key = formatIsoDate(date);
        indexByKey[key] = buckets.length;
        buckets.push({
            key,
            label: `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`,
            in: 0,
            out: 0,
        });
    }

    rows.forEach((row) => {
        const key = formatIsoDate(row.parsedDate);
        const index = indexByKey[key];
        if (index === undefined) {
            return;
        }

        if (isFinanceOutgoingCategory(row.category)) {
            buckets[index].out += Number(row.amount);
        } else {
            buckets[index].in += Number(row.amount);
        }
    });

    return buckets;
}

function buildFinanceWeeklySeries(rows, anchor) {
    const buckets = [];
    const indexByKey = {};
    const anchorWeekStart = getFinanceWeekStart(anchor);

    for (let i = 5; i >= 0; i -= 1) {
        const weekStart = shiftDate(anchorWeekStart, -(i * 7));
        const key = formatIsoDate(weekStart);
        indexByKey[key] = buckets.length;
        buckets.push({
            key,
            label: `${String(weekStart.getDate()).padStart(2, '0')}/${String(weekStart.getMonth() + 1).padStart(2, '0')}`,
            in: 0,
            out: 0,
        });
    }

    rows.forEach((row) => {
        const weekStart = getFinanceWeekStart(row.parsedDate);
        const key = formatIsoDate(weekStart);
        const index = indexByKey[key];
        if (index === undefined) {
            return;
        }

        if (isFinanceOutgoingCategory(row.category)) {
            buckets[index].out += Number(row.amount);
        } else {
            buckets[index].in += Number(row.amount);
        }
    });

    return buckets;
}

function buildFinanceMonthlySeries(rows, anchor) {
    const buckets = [];
    const indexByKey = {};
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    for (let i = 5; i >= 0; i -= 1) {
        const monthDate = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
        const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
        indexByKey[key] = buckets.length;
        buckets.push({
            key,
            label: monthLabels[monthDate.getMonth()] || 'Jan',
            in: 0,
            out: 0,
        });
    }

    rows.forEach((row) => {
        const date = row.parsedDate;
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const index = indexByKey[key];
        if (index === undefined) {
            return;
        }

        if (isFinanceOutgoingCategory(row.category)) {
            buckets[index].out += Number(row.amount);
        } else {
            buckets[index].in += Number(row.amount);
        }
    });

    return buckets;
}

function getFinanceWeekStart(dateObj) {
    const start = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    const dayIndex = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - dayIndex);
    return start;
}

function normalizeFinanceCategory(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === 'pemasukan' ? 'pemasukan' : 'pengeluaran';
}

function isFinanceOutgoingCategory(value) {
    return normalizeFinanceCategory(value) === 'pengeluaran';
}

function formatFinanceCategoryLabel(value) {
    return normalizeFinanceCategory(value) === 'pengeluaran' ? 'Pengeluaran' : 'Pemasukan';
}

function extractFinanceDetailLabel(description, category = '') {
    const text = String(description || '').trim();
    if (!text) {
        return formatFinanceCategoryLabel(category);
    }

    const match = text.match(/^([^:-]{2,30})\s[-:]\s/);
    if (match && match[1]) {
        return capitalize(match[1].trim());
    }

    return formatFinanceCategoryLabel(category);
}

function renderFinanceDistribution(rows) {
    const donut = document.getElementById('financeDonutChart');
    const totalLabel = document.getElementById('financeDistributionTotal');
    const donutCenter = document.getElementById('financeDonutCenter');
    const list = document.getElementById('financeDistributionList');
    if (!donut || !totalLabel || !donutCenter || !list) {
        return;
    }

    const grouped = {
        Pemasukan: 0,
        Pengeluaran: 0,
    };

    rows.forEach((row) => {
        const label = formatFinanceCategoryLabel(row.category);
        grouped[label] = (grouped[label] || 0) + Number(row.amount);
    });

    const entries = [
        ['Pemasukan', grouped.Pemasukan || 0],
        ['Pengeluaran', grouped.Pengeluaran || 0],
    ];

    const total = entries.reduce((sum, [, value]) => sum + Number(value), 0);
    const colors = ['#6b7bff', '#fb7ba1'];
    const dots = ['dot-a', 'dot-c'];

    totalLabel.textContent = `Rp ${formatCurrency(total)}`;

    if (total <= 0) {
        donut.style.background = 'conic-gradient(#dbe3f4 0 100%)';
        donutCenter.textContent = '0%';
        list.innerHTML = entries
            .map(([label], index) => `
                <li>
                    <span class="label"><i class="dot ${dots[index]}"></i>${escapeHtml(label)}</span>
                    <strong>0%</strong>
                </li>
            `)
            .join('');
        return;
    }

    let offset = 0;
    const gradient = entries
        .map(([, value], index) => {
            const pct = (Number(value) / total) * 100;
            const start = offset;
            offset += pct;
            return `${colors[index]} ${start}% ${offset}%`;
        })
        .join(', ');

    donut.style.background = `conic-gradient(${gradient})`;
    const leadingPct = Math.max(...entries.map(([, value]) => Math.round((Number(value) / total) * 100)), 0);
    donutCenter.textContent = `${leadingPct}%`;
    list.innerHTML = entries
        .map(([label, value], index) => {
            const pct = Math.round((Number(value) / total) * 100);
            return `
                <li>
                    <span class="label"><i class="dot ${dots[index]}"></i>${escapeHtml(label)}</span>
                    <strong>${pct}%</strong>
                </li>
            `;
        })
        .join('');
}

function animateCounter(element, target, format) {
    const duration = 850;
    const start = performance.now();

    const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = target * eased;
        element.textContent = formatCounterValue(value, format);

        if (progress < 1) {
            requestAnimationFrame(tick);
        }
    };

    requestAnimationFrame(tick);
}

function openEntityModal(table, mode = 'add', id = null) {
    if (!tableDefinitions[table]) {
        return;
    }

    state.modalState.table = table;
    state.modalState.mode = mode;
    state.modalState.id = id;

    const modal = document.getElementById('entityModal');
    const modalCard = document.getElementById('entityModalCard');
    const formElement = document.getElementById('entityForm');
    const title = document.getElementById('entityModalTitle');
    const fieldsWrap = document.getElementById('entityFields');
    const error = document.getElementById('entityFormError');
    const tableNameInput = document.getElementById('entityTableName');
    const rowIdInput = document.getElementById('entityRowId');
    if (!modal || !title || !fieldsWrap || !tableNameInput || !rowIdInput) {
        return;
    }

    const definition = tableDefinitions[table];
    const editingRow = mode === 'edit' ? state.data[table].find((row) => row.id === id) : null;
    const isFinanceModal = table === 'finance';

    if (isFinanceModal) {
        title.textContent = mode === 'edit' ? 'Edit Riwayat Transaksi' : 'Tambahkan Riwayat Transaksi';
    } else {
        title.textContent = mode === 'edit' ? `Edit ${definition.entityName}` : `Tambah ${definition.entityName}`;
    }

    if (modalCard) {
        modalCard.classList.toggle('finance-entry-modal', isFinanceModal);
    }

    if (fieldsWrap) {
        fieldsWrap.classList.toggle('finance-entry-grid', isFinanceModal);
    }

    if (formElement) {
        formElement.classList.toggle('finance-entry-form', isFinanceModal);
    }

    const submitButton = document.querySelector('#entityForm button[type="submit"]');
    if (submitButton instanceof HTMLButtonElement) {
        const submitLabel = 'Simpan';
        submitButton.textContent = submitLabel;
        submitButton.dataset.defaultLabel = submitLabel;
    }

    tableNameInput.value = table;
    rowIdInput.value = id ? String(id) : '';
    if (error) {
        error.textContent = '';
    }

    fieldsWrap.innerHTML = definition.fields
        .map((field) => {
            const value = resolveEntityFieldValue(table, field, editingRow);
            const fieldId = `field-${field.key}`;

            if (field.type === 'hidden') {
                return `
                    <input
                        id="${fieldId}"
                        type="hidden"
                        name="${field.key}"
                        value="${escapeHtml(String(value ?? ''))}"
                    >
                `;
            }

            if (field.type === 'select') {
                const options = (field.options || [])
                    .map((option) => `<option value="${option}" ${String(value) === option ? 'selected' : ''}>${capitalize(option)}</option>`)
                    .join('');

                const hiddenClass = field.hideInForm ? ' is-hidden' : '';
                const fullClass = table === 'finance' ? (field.full ? ' full' : '') : ' full';

                return `
                    <label class="field-block${fullClass}${hiddenClass}" data-field-key="${field.key}" for="${fieldId}">
                        <span class="input-label">${field.label}</span>
                        <select id="${fieldId}" name="${field.key}" ${field.required ? 'required' : ''}>${options}</select>
                    </label>
                `;
            }

            if (field.type === 'textarea') {
                const fullClass = field.full ? 'full' : '';
                const hiddenClass = field.hideInForm ? ' is-hidden' : '';
                const placeholder = field.placeholder
                    ? String(field.placeholder)
                    : getDefaultFieldPlaceholder(field, table);
                const placeholderAttr = placeholder ? `placeholder="${escapeHtml(placeholder)}"` : '';
                const readonlyAttr = field.readonly ? 'readonly' : '';

                return `
                    <label class="field-block ${fullClass}${hiddenClass}" data-field-key="${field.key}" for="${fieldId}">
                        <span class="input-label">${field.label}</span>
                        <textarea
                            id="${fieldId}"
                            class="text-input text-area-input"
                            name="${field.key}"
                            ${placeholderAttr}
                            ${readonlyAttr}
                            ${field.required ? 'required' : ''}
                        >${escapeHtml(String(value ?? ''))}</textarea>
                    </label>
                `;
            }

            const fullClass = field.full || (field.key === 'name' && table !== 'customers') ? 'full' : '';
            const hiddenClass = field.hideInForm ? ' is-hidden' : '';
            const placeholder = field.placeholder
                ? String(field.placeholder)
                : getDefaultFieldPlaceholder(field, table);
            const placeholderAttr = placeholder ? `placeholder="${escapeHtml(placeholder)}"` : '';
            const suggestions = resolveFieldSuggestions(table, field);
            const datalistId = suggestions.length ? `${fieldId}-datalist` : '';
            const datalistAttr = datalistId ? `list="${datalistId}"` : '';
            const readonlyAttr = field.readonly ? 'readonly' : '';
            const inputType = field.numericFormat ? 'text' : field.type;
            const inputModeAttr = field.numericFormat ? 'inputmode="numeric" autocomplete="off"' : '';
            const minAttr = field.min !== undefined ? `min="${field.min}"` : '';
            const stepAttr = field.step !== undefined ? `step="${field.step}"` : '';
            const datalistMarkup = datalistId
                ? `<datalist id="${datalistId}">${suggestions.map((item) => `<option value="${escapeHtml(item)}"></option>`).join('')}</datalist>`
                : '';

            return `
                <label class="field-block ${fullClass}${hiddenClass}" data-field-key="${field.key}" for="${fieldId}">
                    <span class="input-label">${field.label}</span>
                    <input
                        id="${fieldId}"
                        class="text-input"
                        type="${inputType}"
                        name="${field.key}"
                        value="${escapeHtml(String(value ?? ''))}"
                        ${placeholderAttr}
                        ${datalistAttr}
                        ${inputModeAttr}
                        ${readonlyAttr}
                        ${minAttr}
                        ${stepAttr}
                        ${field.required ? 'required' : ''}
                    >
                    ${datalistMarkup}
                </label>
            `;
        })
        .join('');

    bindOrderItemsBuilder(table, editingRow);
    bindStockCodeAutoFill(table);
    bindFormattedNumericInputs(table);
    captureEntityFormSnapshot();

    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
}

function serializeEntityForm(form) {
    if (!(form instanceof HTMLFormElement)) {
        return '';
    }

    const rows = [];
    const formData = new FormData(form);
    formData.forEach((value, key) => {
        rows.push([key, String(value)]);
    });

    return JSON.stringify(rows);
}

function captureEntityFormSnapshot() {
    const form = document.getElementById('entityForm');
    state.modalState.formSnapshot = serializeEntityForm(form);
}

function hasEntityFormUnsavedChanges() {
    if (!state.modalState.table) {
        return false;
    }

    const form = document.getElementById('entityForm');
    if (!(form instanceof HTMLFormElement)) {
        return false;
    }

    const currentSnapshot = serializeEntityForm(form);
    return currentSnapshot !== String(state.modalState.formSnapshot || '');
}

function resetEntityModalState() {
    state.modalState.mode = 'add';
    state.modalState.table = null;
    state.modalState.id = null;
    state.modalState.formSnapshot = '';
}

function resetConfirmDialogUi() {
    window.clearTimeout(state.confirmDialog.submitDelayTimerId);
    state.confirmDialog.submitDelayTimerId = 0;
    state.confirmDialog.isSubmitting = false;
    state.confirmDialog.pendingLabel = '';
    state.confirmDialog.delayMs = 0;

    const modal = document.getElementById('confirmModal');
    if (modal) {
        modal.classList.remove('is-submitting');
    }

    const confirmButton = document.getElementById('confirmModalConfirmBtn');
    setButtonBusy(confirmButton, false);

    const cancelButton = document.getElementById('confirmModalCancelBtn');
    if (cancelButton instanceof HTMLButtonElement) {
        cancelButton.disabled = false;
        cancelButton.classList.remove('is-busy');
    }

    document.querySelectorAll('[data-close-confirm]').forEach((button) => {
        if (!(button instanceof HTMLButtonElement)) {
            return;
        }

        button.disabled = false;
        button.classList.remove('is-busy');
    });
}

function requestConfirmDialog(options = {}) {
    const modal = document.getElementById('confirmModal');
    const titleNode = document.getElementById('confirmModalTitle');
    const messageNode = document.getElementById('confirmModalMessage');
    const confirmButton = document.getElementById('confirmModalConfirmBtn');
    const cancelButton = document.getElementById('confirmModalCancelBtn');

    const title = String(options.title || 'Konfirmasi');
    const message = String(options.message || 'Lanjutkan proses ini?');
    const confirmLabel = String(options.confirmLabel || 'Oke');
    const cancelLabel = String(options.cancelLabel || 'Batal');
    const isDanger = Boolean(options.danger);
    const confirmPendingLabel = String(options.confirmPendingLabel || '').trim();
    const confirmDelayMs = Math.max(0, Number(options.confirmDelayMs) || 0);

    state.confirmDialog.restoreFocusEl = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    if (!modal || !titleNode || !messageNode || !confirmButton || !cancelButton) {
        return Promise.resolve(window.confirm(message));
    }

    if (typeof state.confirmDialog.resolve === 'function') {
        state.confirmDialog.resolve(false);
        state.confirmDialog.resolve = null;
    }

    resetConfirmDialogUi();

    titleNode.textContent = title;
    messageNode.textContent = message;
    confirmButton.textContent = confirmLabel;
    cancelButton.textContent = cancelLabel;
    confirmButton.classList.toggle('is-danger', isDanger);
    modal.classList.toggle('is-danger', isDanger);

    state.confirmDialog.pendingLabel = confirmPendingLabel;
    state.confirmDialog.delayMs = confirmDelayMs;

    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');

    requestAnimationFrame(() => {
        cancelButton.focus();
    });

    return new Promise((resolve) => {
        state.confirmDialog.resolve = resolve;
    });
}

function closeConfirmModal(confirmed = false) {
    if (state.confirmDialog.isSubmitting && !confirmed) {
        return;
    }

    const modal = document.getElementById('confirmModal');
    if (modal) {
        modal.classList.remove('show');
        modal.classList.remove('is-danger');
        modal.setAttribute('aria-hidden', 'true');
    }

    resetConfirmDialogUi();

    const restoreFocusEl = state.confirmDialog.restoreFocusEl;
    state.confirmDialog.restoreFocusEl = null;

    const resolver = state.confirmDialog.resolve;
    state.confirmDialog.resolve = null;
    if (typeof resolver === 'function') {
        resolver(Boolean(confirmed));
    }

    if (restoreFocusEl && restoreFocusEl.isConnected && typeof restoreFocusEl.focus === 'function') {
        restoreFocusEl.focus();
    }
}

function bindOrderItemsBuilder(table, editingRow) {
    if (table !== 'orders') {
        return;
    }

    const fieldsWrap = document.getElementById('entityFields');
    const nominalField = fieldsWrap?.querySelector('label[for="field-nominal"]');
    const productInput = document.getElementById('field-product');
    const nominalInput = document.getElementById('field-nominal');
    if (!fieldsWrap || !nominalField || !productInput || !nominalInput) {
        return;
    }

    document.getElementById('orderItemsBuilder')?.remove();

    const products = getOrderProductCatalog();
    const datalistId = 'orderItemsProductList';
    const options = products
        .map((item) => `<option value="${escapeHtml(item.name)}"></option>`)
        .join('');

    nominalField.insertAdjacentHTML('beforebegin', `
        <div class="field-block full order-items-block" id="orderItemsBuilder">
            <span class="input-label">Daftar Barang</span>
            <datalist id="${datalistId}">${options}</datalist>
            <div class="order-items-list" id="orderItemsRows"></div>
            <details class="order-items-total" id="orderItemsTotal" open>
                <summary>
                    <span>Total Harga</span>
                    <strong id="orderItemsTotalValue">Rp 0</strong>
                </summary>
            </details>
            <div class="order-items-actions">
                <button class="mini-btn" type="button" id="addOrderItemBtn">+ Tambah Barang</button>
            </div>
        </div>
    `);

    const rowsWrap = document.getElementById('orderItemsRows');
    const addButton = document.getElementById('addOrderItemBtn');
    const totalValueNode = document.getElementById('orderItemsTotalValue');
    if (!rowsWrap || !addButton || !totalValueNode) {
        return;
    }

    const initialItems = resolveInitialOrderItems(editingRow, products);
    rowsWrap.innerHTML = initialItems
        .map((item) => renderOrderItemRow(item, datalistId))
        .join('');
    syncOrderItemTotals(productInput, nominalInput, rowsWrap, totalValueNode);

    addButton.addEventListener('click', () => {
        rowsWrap.insertAdjacentHTML('beforeend', renderOrderItemRow({
            product: '',
            quantity: 1,
            unitPrice: 0,
        }, datalistId));

        syncOrderItemTotals(productInput, nominalInput, rowsWrap, totalValueNode);
    });

    rowsWrap.addEventListener('click', (event) => {
        const removeButton = event.target.closest('[data-order-item-remove]');
        if (!removeButton) {
            return;
        }

        const rows = rowsWrap.querySelectorAll('[data-order-item-row]');
        if (rows.length <= 1) {
            const first = rows[0];
            first?.querySelector('[data-order-item-product]')?.setAttribute('value', '');
            const firstProduct = first?.querySelector('[data-order-item-product]');
            const firstQty = first?.querySelector('[data-order-item-qty]');
            const firstPrice = first?.querySelector('[data-order-item-price]');
            if (firstProduct) {
                firstProduct.value = '';
            }
            if (firstQty) {
                firstQty.value = '1';
            }
            if (firstPrice) {
                firstPrice.value = '0';
            }
        } else {
            removeButton.closest('[data-order-item-row]')?.remove();
        }

        syncOrderItemTotals(productInput, nominalInput, rowsWrap, totalValueNode);
    });

    rowsWrap.addEventListener('input', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) {
            return;
        }

        if (target.matches('[data-order-item-product]')) {
            applyCatalogPriceToRow(target, products);
        }

        syncOrderItemTotals(productInput, nominalInput, rowsWrap, totalValueNode);
    });

    rowsWrap.addEventListener('blur', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) {
            return;
        }

        if (target.matches('[data-order-item-product]')) {
            applyCatalogPriceToRow(target, products);
            syncOrderItemTotals(productInput, nominalInput, rowsWrap, totalValueNode);
        }
    }, true);
}

function getOrderProductCatalog() {
    return (state.data.stock || [])
        .map((item) => ({
            name: String(item.name || '').trim(),
            price: Number(item.priceSell || item.price || 0),
        }))
        .filter((item) => item.name)
        .sort((a, b) => a.name.localeCompare(b.name, 'id'));
}

function resolveInitialOrderItems(editingRow, products) {
    if (editingRow && Array.isArray(editingRow.items) && editingRow.items.length) {
        return editingRow.items.map((item) => ({
            product: String(item.product || '').trim(),
            quantity: Math.max(1, Number(item.quantity || 1)),
            unitPrice: Number(item.unitPrice ?? resolveProductPrice(item.product, products) ?? 0),
        }));
    }

    if (editingRow && String(editingRow.product || '').trim()) {
        const parsedItems = parseOrderSummaryItems(
            String(editingRow.product || ''),
            Number(editingRow.nominal || 0),
            products,
        );

        if (parsedItems.length) {
            return parsedItems;
        }
    }

    return [{
        product: '',
        quantity: 1,
        unitPrice: 0,
    }];
}

function parseOrderSummaryItems(summary, totalNominal, products) {
    const tokens = String(summary || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

    if (!tokens.length) {
        return [];
    }

    const hasMultiple = tokens.length > 1;
    return tokens.map((token) => {
        const match = token.match(/^(.*)\s+x(\d+)$/i);
        const name = match ? String(match[1] || '').trim() : token;
        const quantity = match ? Math.max(1, Number(match[2] || 1)) : 1;

        let unitPrice = resolveProductPrice(name, products);
        if (unitPrice === null) {
            unitPrice = hasMultiple ? 0 : Math.max(0, Number(totalNominal || 0));
        }

        return {
            product: name,
            quantity,
            unitPrice,
        };
    });
}

function renderOrderItemRow(item, datalistId) {
    const product = escapeHtml(String(item.product || '').trim());
    const quantity = Math.max(1, Number(item.quantity || 1));
    const unitPrice = Math.max(0, Number(item.unitPrice || 0));
    const subtotal = quantity * unitPrice;

    return `
        <div class="order-item-row" data-order-item-row>
            <input class="text-input" type="text" data-order-item-product list="${datalistId}" placeholder="Pilih nama barang" value="${product}">
            <input class="text-input" type="number" data-order-item-qty min="1" step="1" placeholder="Qty" value="${quantity}">
            <input type="hidden" data-order-item-price value="${unitPrice}">
            <strong class="order-item-subtotal" data-order-item-subtotal>Rp ${formatCurrency(subtotal)}</strong>
            <button class="mini-btn order-item-remove" type="button" data-order-item-remove>Hapus</button>
        </div>
    `;
}

function applyCatalogPriceToRow(productInput, products) {
    const row = productInput.closest('[data-order-item-row]');
    if (!row) {
        return;
    }

    const priceInput = row.querySelector('[data-order-item-price]');
    if (!(priceInput instanceof HTMLInputElement)) {
        return;
    }

    const matchedPrice = resolveProductPrice(productInput.value, products);
    priceInput.value = String(matchedPrice !== null ? matchedPrice : 0);
}

function resolveProductPrice(name, products = getOrderProductCatalog()) {
    const target = normalizeComparableText(name);
    if (!target) {
        return null;
    }

    const matched = products.find((item) => normalizeComparableText(item.name) === target);
    return matched ? Number(matched.priceSell || matched.price || 0) : null;
}

function syncOrderItemTotals(productInput, nominalInput, rowsWrap, totalValueNode = null) {
    const rows = rowsWrap.querySelectorAll('[data-order-item-row]');
    let total = 0;
    const summary = [];

    rows.forEach((row) => {
        const productInputNode = row.querySelector('[data-order-item-product]');
        const qtyInput = row.querySelector('[data-order-item-qty]');
        const priceInput = row.querySelector('[data-order-item-price]');
        const subtotalNode = row.querySelector('[data-order-item-subtotal]');

        const product = String(productInputNode?.value || '').trim();
        const quantity = Math.max(0, Number(qtyInput?.value || 0));
        const unitPrice = Math.max(0, Number(priceInput?.value || 0));
        const subtotal = product && quantity > 0 ? quantity * unitPrice : 0;

        if (subtotalNode) {
            subtotalNode.textContent = `Rp ${formatCurrency(subtotal)}`;
        }

        if (product && quantity > 0) {
            total += subtotal;
            summary.push(`${product} x${quantity}`);
        }
    });

    productInput.value = summary.join(', ');
    nominalInput.value = summary.length ? String(round2(total)) : '';

    if (totalValueNode) {
        totalValueNode.textContent = `Rp ${formatCurrency(round2(total))}`;
    }
}

function collectOrderItemsFromBuilder() {
    const rowsWrap = document.getElementById('orderItemsRows');
    if (!rowsWrap) {
        return [];
    }

    return [...rowsWrap.querySelectorAll('[data-order-item-row]')]
        .map((row) => {
            const product = String(row.querySelector('[data-order-item-product]')?.value || '').trim();
            const quantity = Math.max(0, Number(row.querySelector('[data-order-item-qty]')?.value || 0));
            const unitPrice = Math.max(0, Number(row.querySelector('[data-order-item-price]')?.value || 0));

            return {
                product,
                quantity,
                unitPrice,
            };
        })
        .filter((item) => item.product && item.quantity > 0);
}

function bindStockCodeAutoFill(table) {
    if (table !== 'stock') {
        return;
    }

    const codeInput = document.getElementById('field-code');
    const nameInput = document.getElementById('field-name');
    const priceInput = document.getElementById('field-price');
    const stockInput = document.getElementById('field-stock');
    const title = document.getElementById('entityModalTitle');
    const rowIdInput = document.getElementById('entityRowId');
    const error = document.getElementById('entityFormError');

    if (!codeInput || !nameInput || !priceInput || !stockInput || !rowIdInput) {
        return;
    }

    const isAddMode = state.modalState.mode === 'add' && !state.modalState.id;

    let lastAutoCode = '';
    let isManualCodeOverride = false;
    const applyGeneratedCode = () => {
        const name = nameInput.value.trim();
        if (!name) {
            lastAutoCode = '';
            codeInput.value = '';
            return;
        }
        lastAutoCode = generateNextStockCode(name);
        codeInput.value = lastAutoCode;
    };

    if (isAddMode && !String(codeInput.value || '').trim() && String(nameInput.value || '').trim()) {
        applyGeneratedCode();
    }

    if (isAddMode) {
        nameInput.addEventListener('input', () => {
            if (!isManualCodeOverride) {
                applyGeneratedCode();
            }
        });
    }

    codeInput.addEventListener('input', () => {
        if (isAddMode) {
            const currentCode = String(codeInput.value || '').trim().toUpperCase();
            isManualCodeOverride = Boolean(currentCode) && currentCode !== lastAutoCode;
        }

        if (error) {
            error.textContent = '';
        }
    });

    const applyStockAutoFill = ({ focusStock = false, notifyNotFound = false, notifySuccess = false } = {}) => {
        const code = codeInput.value.trim();
        if (!code) {
            return false;
        }

        const matched = (state.data.stock || []).find(
            (item) => String(item.code || '').toLowerCase() === code.toLowerCase(),
        );

        if (!matched) {
            if (notifyNotFound) {
                showToast('Kode barang tidak ditemukan. Silakan isi manual jika barang baru.');
            }
            return false;
        }

        const buyPriceInput = document.getElementById('field-priceBuy');
        const sellPriceInput = document.getElementById('field-priceSell');

        codeInput.value = String(matched.code ?? '');
        nameInput.value = String(matched.name ?? '');
        
        if (buyPriceInput) buyPriceInput.value = formatCurrency(Number(matched.priceBuy || 0));
        if (sellPriceInput) sellPriceInput.value = formatCurrency(Number(matched.priceSell || 0));
        if (priceInput) priceInput.value = formatCurrency(Number(matched.priceSell || 0));
        
        stockInput.value = String(Number(matched.stock || 0));

        state.modalState.mode = 'edit';
        state.modalState.id = Number(matched.id);
        rowIdInput.value = String(matched.id);
        if (title) {
            title.textContent = 'Edit Barang';
        }
        if (error) {
            error.textContent = '';
        }

        if (focusStock) {
            stockInput.focus();
            stockInput.select();
        }

        if (notifySuccess) {
            showToast(`Data ${matched.code} terisi otomatis.`);
        }

        return true;
    };

    codeInput.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') {
            return;
        }

        event.preventDefault();
        applyStockAutoFill({
            focusStock: true,
            notifyNotFound: true,
            notifySuccess: true,
        });
    });

    codeInput.addEventListener('blur', () => {
        applyStockAutoFill();
    });
}

async function closeEntityModal(options = null) {
    const modal = document.getElementById('entityModal');
    const modalCard = document.getElementById('entityModalCard');
    const formElement = document.getElementById('entityForm');
    const fieldsWrap = document.getElementById('entityFields');
    if (!modal) {
        return false;
    }

    const forceClose = Boolean(options && typeof options === 'object' && options.force === true);
    if (!forceClose && hasEntityFormUnsavedChanges()) {
        const confirmed = await requestConfirmDialog({
            title: 'Perubahan Belum Disimpan',
            message: 'Perubahan belum disimpan. Tutup formulir ini?',
            confirmLabel: 'Tutup Form',
            cancelLabel: 'Lanjut Edit',
        });
        if (!confirmed) {
            return false;
        }
    }

    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');

    if (modalCard) {
        modalCard.classList.remove('finance-entry-modal');
    }

    if (formElement) {
        formElement.classList.remove('finance-entry-form');
    }

    if (fieldsWrap) {
        fieldsWrap.classList.remove('finance-entry-grid');
    }

    resetEntityModalState();
    return true;
}

function openRecordDetailModal(table, id) {
    const row = (state.data[table] || []).find((item) => item.id === id);
    const modal = document.getElementById('recordDetailModal');
    const title = document.getElementById('recordDetailTitle');
    const grid = document.getElementById('recordDetailGrid');
    if (!row || !modal || !title || !grid) {
        return;
    }

    const details = getRecordDetailConfig(table, row);
    if (!details) {
        showToast('Detail untuk data ini belum tersedia.');
        return;
    }

    title.textContent = details.title;
    grid.innerHTML = details.items
        .map((item) => {
            const value = item.allowHtml
                ? String(item.value || '-')
                : escapeHtml(String(item.value ?? '-'));

            return `
                <div class="finance-detail-item ${item.full ? 'full' : ''}">
                    <span>${escapeHtml(item.label)}</span>
                    <strong>${value}</strong>
                </div>
            `;
        })
        .join('');

    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
}

function closeRecordDetailModal() {
    const modal = document.getElementById('recordDetailModal');
    if (!modal) {
        return;
    }

    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
}

function getRecordDetailConfig(table, row) {
    if (table === 'calendarEvents') {
        return {
            title: 'Detail Agenda',
            items: [
                { label: 'ID Agenda', value: `AGD-${String(row.id).padStart(4, '0')}` },
                { label: 'Tanggal', value: formatDateHuman(row.date) },
                { label: 'Jam', value: row.time },
                { label: 'Tipe', value: row.type },
                { label: 'Lokasi', value: row.location },
                {
                    label: 'Status',
                    value: `<span class="status-pill ${resolveCalendarStatusClass(row.status)}">${escapeHtml(capitalize(row.status))}</span>`,
                    allowHtml: true,
                },
                { label: 'Judul Agenda', value: row.title, full: true },
            ],
        };
    }

    if (table === 'stock') {
        return {
            title: 'Detail Barang',
            items: [
                { label: 'ID Barang', value: `STK-${String(row.id).padStart(4, '0')}` },
                { label: 'Kode Barang', value: row.code },
                { label: 'Nama Barang', value: row.name },
                { label: 'Harga Satuan', value: `Rp ${formatCurrency(row.price)}` },
                { label: 'Stok (pcs)', value: formatCurrency(row.stock) },
            ],
        };
    }

    if (table === 'orders') {
        const orderItemSummary = Array.isArray(row.items) && row.items.length
            ? row.items.map((item) => `${item.product} x${item.quantity}`).join(', ')
            : row.product;

        return {
            title: 'Detail Pesanan',
            items: [
                { label: 'ID Pesanan', value: `ORD-${String(row.id).padStart(4, '0')}` },
                { label: 'Tanggal', value: row.date },
                { label: 'Pelanggan', value: row.author },
                { label: 'Dicatat Oleh', value: row.recorder || '-' },
                { label: 'Daftar Barang', value: orderItemSummary, full: true },
                { label: 'Nominal', value: `Rp ${formatCurrency(row.nominal)}` },
                {
                    label: 'Status',
                    value: `<span class="status-pill ${escapeHtml(String(row.status).toLowerCase())}">${escapeHtml(capitalize(row.status))}</span>`,
                    allowHtml: true,
                },
            ],
        };
    }

    if (table === 'customers') {
        const customerOrders = getOrdersByCustomer(row);
        const boughtProducts = [...new Set(customerOrders.map((item) => String(item.product || '').trim()).filter(Boolean))];
        const productSummary = boughtProducts.length ? boughtProducts.join(', ') : 'Belum ada pesanan.';

        return {
            title: 'Detail Pelanggan',
            items: [
                { label: 'ID Pelanggan', value: `CST-${String(row.id).padStart(4, '0')}` },
                { label: 'Nama', value: row.name },
                { label: 'No. HP', value: row.phone },
                { label: 'Alamat', value: row.address || '-' },
                { label: 'Riwayat Pesanan', value: formatCurrency(row.history) },
                { label: 'Total Pengeluaran (Terkirim)', value: `Rp ${formatCurrency(row.total)}` },
                { label: 'Produk Dibeli', value: productSummary, full: true },
            ],
        };
    }

    if (table === 'activity') {
        return {
            title: 'Detail Aktivitas',
            items: [
                { label: 'ID Log', value: `LOG-${String(row.id).padStart(4, '0')}` },
                { label: 'Tanggal & Jam', value: row.dateTime },
                { label: 'User', value: row.user },
                { label: 'Aktivitas', value: row.action },
                { label: 'Modul', value: row.module },
                {
                    label: 'Status',
                    value: `<span class="status-pill ${resolveLogStatusClass(row.status)}">${escapeHtml(capitalize(row.status))}</span>`,
                    allowHtml: true,
                },
            ],
        };
    }

    if (table === 'users') {
        return {
            title: 'Detail Karyawan',
            items: [
                { label: 'ID Karyawan', value: `KRY-${String(row.id).padStart(4, '0')}` },
                { label: 'Nama', value: row.name },
                { label: 'Role', value: capitalize(String(row.role || '').toLowerCase()) },
                { label: 'Jabatan', value: row.position },
                { label: 'Divisi', value: row.division },
                { label: 'No. HP', value: row.phone },
                { label: 'Shift', value: row.shift },
                {
                    label: 'Status',
                    value: `<span class="status-pill ${resolveUserStatusClass(row.status)}">${escapeHtml(capitalize(row.status))}</span>`,
                    allowHtml: true,
                },
            ],
        };
    }

    return null;
}

function openFinanceDetailModal(id) {
    const row = (state.data.finance || []).find((item) => item.id === id);
    const modal = document.getElementById('financeDetailModal');
    if (!row || !modal) {
        return;
    }

    const amountNode = document.getElementById('financeDetailAmount');
    const isOutgoing = isFinanceOutgoingCategory(row.category);
    const nominalClass = isOutgoing ? 'is-negative' : 'is-positive';
    const nominalSign = isOutgoing ? '-' : '+';

    document.getElementById('financeDetailId').textContent = `TRX-${String(row.id).padStart(4, '0')}`;
    document.getElementById('financeDetailDate').textContent = row.date;
    document.getElementById('financeDetailDescription').textContent = row.description;
    document.getElementById('financeDetailCategory').textContent = formatFinanceCategoryLabel(row.category);

    if (amountNode) {
        amountNode.classList.remove('is-positive', 'is-negative');
        amountNode.classList.add(nominalClass);
        amountNode.textContent = `${nominalSign} Rp ${formatCurrency(row.amount)}`;
    }

    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
}

function closeFinanceDetailModal() {
    const modal = document.getElementById('financeDetailModal');
    if (!modal) {
        return;
    }

    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
}

function refreshTableView(table) {
    if (!state.tableState[table]) {
        return;
    }

    const body = document.getElementById(`${table}TableBody`);
    if (!body) {
        return;
    }

    renderTable(table);
}

function ensureTablePage(table, preferredPage) {
    if (!state.tableState[table]) {
        return;
    }

    state.tableState[table].page = Math.max(1, Math.floor(Number(preferredPage) || 1));
    refreshTableView(table);
}

function setButtonBusy(button, isBusy, busyLabel = '') {
    if (!(button instanceof HTMLButtonElement)) {
        return;
    }

    if (!button.dataset.defaultLabel) {
        button.dataset.defaultLabel = button.textContent || '';
    }

    button.disabled = Boolean(isBusy);
    button.classList.toggle('is-busy', Boolean(isBusy));

    if (isBusy && busyLabel) {
        button.textContent = busyLabel;
        return;
    }

    if (!isBusy) {
        button.textContent = button.dataset.defaultLabel;
    }
}

function setEntityModalBusy(isBusy) {
    const submitButton = document.querySelector('#entityForm button[type="submit"]');
    setButtonBusy(submitButton, isBusy, 'Menyimpan...');

    document.querySelectorAll('[data-close-entity]').forEach((button) => {
        if (!(button instanceof HTMLButtonElement)) {
            return;
        }

        button.disabled = Boolean(isBusy);
        button.classList.toggle('is-busy', Boolean(isBusy));
    });
}

function getDeleteRequestKey(table, id) {
    return `${String(table || '')}:${String(id)}`;
}

function setDeleteActionBusy(table, id, isBusy) {
    const selector = `[data-row-action="delete"][data-row-table="${table}"][data-row-id="${id}"]`;
    document.querySelectorAll(selector).forEach((button) => {
        if (!(button instanceof HTMLButtonElement)) {
            return;
        }

        if (!button.dataset.defaultAriaLabel) {
            button.dataset.defaultAriaLabel = String(button.getAttribute('aria-label') || 'Hapus');
        }

        button.disabled = Boolean(isBusy);
        button.classList.toggle('is-busy', Boolean(isBusy));
        button.setAttribute(
            'aria-label',
            isBusy ? 'Menghapus...' : String(button.dataset.defaultAriaLabel || 'Hapus'),
        );
    });
}

function setImportButtonBusy(table, isBusy) {
    const button = document.querySelector(`[data-table-import="${table}"]`);
    setButtonBusy(button, isBusy, 'Mengimpor...');
}

function setExportButtonsBusy(table, isBusy, formatLabel = '') {
    const excelButton = document.querySelector(`[data-table-export="${table}"]`);
    const pdfButton = document.querySelector(`[data-table-export-pdf="${table}"]`);

    if (isBusy) {
        const normalizedFormat = String(formatLabel || '').trim().toLowerCase();
        const excelBusyLabel = normalizedFormat === 'excel' ? 'Menyiapkan Excel...' : 'Menyiapkan...';
        const pdfBusyLabel = normalizedFormat === 'pdf' ? 'Menyiapkan PDF...' : 'Menyiapkan...';

        setButtonBusy(excelButton, true, excelBusyLabel);
        setButtonBusy(pdfButton, true, pdfBusyLabel);
        return;
    }

    setButtonBusy(excelButton, false);
    setButtonBusy(pdfButton, false);
}

async function submitEntityForm() {
    if (state.requestLocks.submitForm) {
        return;
    }

    const table = state.modalState.table;
    if (!table || !tableDefinitions[table]) {
        return;
    }

    const preservedPage = state.tableState[table]?.page || 1;

    const definition = tableDefinitions[table];
    const form = document.getElementById('entityForm');
    const error = document.getElementById('entityFormError');
    if (!form) {
        return;
    }

    const formData = new FormData(form);
    const payload = {};

    for (const field of definition.fields) {
        const raw = String(formData.get(field.key) || '').trim();
        if (field.required && !raw) {
            if (error) {
                error.textContent = `${field.label} wajib diisi.`;
            }
            return;
        }

        if (!field.required && raw === '') {
            continue;
        }

        if (field.type === 'number') {
            if (field.numericFormat === 'id-thousands') {
                const parsed = parseIdThousandsNumber(raw);
                if (!Number.isFinite(parsed) || parsed < 0) {
                    if (error) {
                        error.textContent = `${field.label} harus berupa angka valid.`;
                    }
                    return;
                }

                payload[field.key] = parsed;
                continue;
            }

            const number = Number(raw);
            if (!Number.isFinite(number) || number < 0) {
                if (error) {
                    error.textContent = `${field.label} harus berupa angka valid.`;
                }
                return;
            }
            payload[field.key] = number;
        } else {
            payload[field.key] = raw;
        }
    }

    if (table === 'orders') {
        const orderItems = collectOrderItemsFromBuilder();
        if (!orderItems.length) {
            if (error) {
                error.textContent = 'Tambahkan minimal 1 barang pesanan beserta jumlahnya.';
            }
            return;
        }

        payload.items = orderItems.map((item) => ({
            product: item.product,
            quantity: item.quantity,
            unit_price: item.unitPrice,
        }));

        const totalNominal = orderItems.reduce((sum, item) => sum + (Number(item.unitPrice) * Number(item.quantity)), 0);
        payload.nominal = round2(totalNominal);
        payload.product = orderItems.map((item) => `${item.product} x${item.quantity}`).join(', ');

        const nominalInput = document.getElementById('field-nominal');
        const productInput = document.getElementById('field-product');
        if (nominalInput) {
            nominalInput.value = String(payload.nominal);
        }
        if (productInput) {
            productInput.value = payload.product;
        }
    }

    if (error) {
        error.textContent = '';
    }

    if (table === 'finance') {
        payload.category = String(payload.category || '').toLowerCase();
    }

    if (table === 'calendarEvents') {
        const normalizedDate = normalizeCalendarDate(payload.date);
        if (!normalizedDate) {
            if (error) {
                error.textContent = 'Format tanggal agenda harus YYYY-MM-DD.';
            }
            return;
        }

        payload.date = normalizedDate;
        payload.status = String(payload.status || '').toLowerCase();
    }

    if (table === 'activity') {
        const normalizedDate = normalizeCalendarDate(payload.date);
        const normalizedTime = normalizeTimeField(payload.time);

        if (!normalizedDate || !normalizedTime) {
            if (error) {
                error.textContent = 'Tanggal dan jam aktivitas wajib diisi dengan format valid.';
            }
            return;
        }

        payload.dateTime = `${normalizedDate}T${normalizedTime}`;
        delete payload.date;
        delete payload.time;
        payload.status = String(payload.status || '').toLowerCase();
    }

    if (table === 'stock') {
        payload.code = String(payload.code || '').trim().toUpperCase();

        if (state.modalState.mode === 'edit' && payload.code === '') {
            if (error) {
                error.textContent = 'Kode barang wajib diisi saat edit data.';
            }
            return;
        }

        if (state.modalState.mode === 'add' && payload.code === '') {
            delete payload.code;
        }
    }

    if (table === 'users') {
        payload.role = String(payload.role || '').trim().toLowerCase();

        const password = String(payload.password || '').trim();
        if (state.modalState.mode === 'add' && !isStrongPassword(password)) {
            if (error) {
                error.textContent = 'Password karyawan minimal 8 karakter, wajib huruf besar, huruf kecil, dan angka.';
            }
            return;
        }

        if (state.modalState.mode === 'edit' && password === '') {
            delete payload.password;
        } else if (state.modalState.mode === 'edit' && !isStrongPassword(password)) {
            if (error) {
                error.textContent = 'Password karyawan minimal 8 karakter, wajib huruf besar, huruf kecil, dan angka.';
            }
            return;
        } else {
            payload.password = password;
        }
    }

    state.requestLocks.submitForm = true;
    setEntityModalBusy(true);

    try {
        let savedRow;
        try {
            savedRow = await saveEntityToBackend(table, payload, state.modalState.mode, state.modalState.id);
        } catch (requestError) {
            if (error) {
                error.textContent = requestError.message || 'Terjadi kesalahan saat menyimpan data.';
            }
            return;
        }

        if (state.modalState.mode === 'edit' && state.modalState.id) {
            const index = state.data[table].findIndex((row) => row.id === state.modalState.id);
            if (index >= 0) {
                state.data[table][index] = savedRow;
            }
            showToast(`${definition.entityName} berhasil diperbarui.`);
        } else {
            state.data[table].push(savedRow);
            showToast(`${definition.entityName} berhasil ditambahkan.`);
        }

        refreshTableView(table);
        if (table === 'orders') {
            await refreshStockFromBackend();
            await refreshCustomersFromBackend();
            await refreshFinanceFromBackend();
        }
        renderDashboardMiniTables();
        updateMetricCounters(false);
        if (table === 'calendarEvents') {
            await refreshCalendarEventsFromBackend();
            renderCalendarView();
            renderDashboardMiniCalendar();
        }
        if (table === 'finance') {
            renderFinanceOverview();
        }

        ensureTablePage(table, preservedPage);

        // Update polling fingerprints after local mutation so the next poll
        // cycle doesn't re-render data the user just changed.
        if (typeof liveSync !== 'undefined') {
            liveSync.lastFingerprints[table] = buildDataFingerprint(state.data[table]);
            if (table === 'orders') {
                liveSync.lastFingerprints.stock = buildDataFingerprint(state.data.stock);
                liveSync.lastFingerprints.customers = buildDataFingerprint(state.data.customers);
                liveSync.lastFingerprints.finance = buildDataFingerprint(state.data.finance);
            }
        }

        await closeEntityModal({ force: true });
    } finally {
        state.requestLocks.submitForm = false;
        setEntityModalBusy(false);
    }
}

function cloneDeleteSnapshotRow(row) {
    if (typeof structuredClone === 'function') {
        return structuredClone(row);
    }

    try {
        return JSON.parse(JSON.stringify(row));
    } catch (error) {
        return { ...row };
    }
}

async function refreshAfterEntityDelete(table, preservedPage, options = {}) {
    refreshTableView(table);

    if (table === 'orders' && options.syncOrderRelatedData) {
        await refreshStockFromBackend();
        await refreshCustomersFromBackend();
        await refreshFinanceFromBackend();
    }

    renderDashboardMiniTables();
    updateMetricCounters(false);

    if (table === 'calendarEvents') {
        renderCalendarView();
    }
    if (table === 'finance') {
        renderFinanceOverview();
    }

    ensureTablePage(table, preservedPage);
}

function clearUndoDeleteTimers() {
    if (state.undoDelete.timerId) {
        window.clearTimeout(state.undoDelete.timerId);
        state.undoDelete.timerId = 0;
    }

    if (state.undoDelete.tickId) {
        window.clearInterval(state.undoDelete.tickId);
        state.undoDelete.tickId = 0;
    }
}

function renderUndoToast() {
    const toast = document.getElementById('undoToast');
    const messageNode = document.getElementById('undoToastMessage');
    if (!toast || !messageNode) {
        return;
    }

    const pending = state.undoDelete.item;
    if (!pending) {
        toast.classList.remove('show');
        messageNode.textContent = '';
        return;
    }

    const remainMs = Math.max(0, Number(pending.expiresAt || 0) - Date.now());
    const remainSec = Math.max(1, Math.ceil(remainMs / 1000));
    messageNode.textContent = `${pending.entityName} dihapus. Urungkan dalam ${remainSec} dtk.`;
    toast.classList.add('show');
}

function queuePendingDeletion(payload) {
    clearUndoDeleteTimers();

    state.undoDelete.item = {
        ...payload,
        expiresAt: Date.now() + DELETE_UNDO_TIMEOUT_MS,
    };

    renderUndoToast();

    state.undoDelete.tickId = window.setInterval(() => {
        renderUndoToast();
    }, DELETE_UNDO_TICK_MS);

    state.undoDelete.timerId = window.setTimeout(() => {
        void finalizePendingDeletion();
    }, DELETE_UNDO_TIMEOUT_MS);
}

async function undoPendingDeletion(options = {}) {
    const pending = state.undoDelete.item;
    if (!pending) {
        return false;
    }

    clearUndoDeleteTimers();
    state.undoDelete.item = null;
    renderUndoToast();

    const rows = state.data[pending.table] || [];
    const exists = rows.some((row) => row.id === pending.id);
    if (!exists) {
        const index = Math.min(Math.max(0, Number(pending.index) || 0), rows.length);
        rows.splice(index, 0, pending.row);
    }

    await refreshAfterEntityDelete(pending.table, pending.preservedPage, {
        syncOrderRelatedData: false,
    });

    if (!options.silent) {
        showToast(`Penghapusan ${String(pending.entityName || 'data').toLowerCase()} dibatalkan.`);
    }

    return true;
}

async function finalizePendingDeletion(options = {}) {
    const pending = state.undoDelete.item;
    if (!pending) {
        return true;
    }

    const showSuccessToast = options.showSuccessToast !== false;
    const showErrorToast = options.showErrorToast !== false;

    clearUndoDeleteTimers();
    state.undoDelete.item = null;
    renderUndoToast();

    try {
        await deleteEntityFromBackend(pending.table, pending.id);

        await refreshAfterEntityDelete(pending.table, pending.preservedPage, {
            syncOrderRelatedData: pending.table === 'orders',
        });

        if (showSuccessToast) {
            showToast(`${pending.entityName} berhasil dihapus.`);
        }

        return true;
    } catch (error) {
        const rows = state.data[pending.table] || [];
        const exists = rows.some((row) => row.id === pending.id);
        if (!exists) {
            const index = Math.min(Math.max(0, Number(pending.index) || 0), rows.length);
            rows.splice(index, 0, pending.row);
        }

        await refreshAfterEntityDelete(pending.table, pending.preservedPage, {
            syncOrderRelatedData: false,
        });

        if (showErrorToast) {
            const baseMessage = error instanceof Error && error.message
                ? error.message
                : 'Gagal menghapus data.';
            showToast(`${baseMessage} Data dikembalikan.`);
        }

        return false;
    }
}

async function deleteEntityRow(table, id) {
    if (!tableDefinitions[table]) {
        return;
    }

    const numericId = Number(id);
    if (!Number.isFinite(numericId)) {
        return;
    }

    const deleteKey = getDeleteRequestKey(table, numericId);
    if (state.requestLocks.deletingKeys.has(deleteKey)) {
        return;
    }

    state.requestLocks.deletingKeys.add(deleteKey);
    setDeleteActionBusy(table, numericId, true);

    try {
        const preservedPage = state.tableState[table]?.page || 1;

        const ok = await requestConfirmDialog({
            title: 'Hapus Data',
            message: 'Data ini akan dihapus. Lanjutkan?',
            confirmLabel: 'Hapus',
            cancelLabel: 'Batal',
            danger: true,
            confirmPendingLabel: 'Menghapus...',
            confirmDelayMs: 260,
        });
        if (!ok) {
            return;
        }

        const finalized = await finalizePendingDeletion({
            showSuccessToast: false,
            showErrorToast: true,
        });
        if (!finalized) {
            return;
        }

        const rows = state.data[table] || [];
        const index = rows.findIndex((row) => row.id === numericId);
        if (index < 0) {
            showToast('Data tidak ditemukan.');
            return;
        }

        const deletedRow = cloneDeleteSnapshotRow(rows[index]);
        rows.splice(index, 1);

        await refreshAfterEntityDelete(table, preservedPage, {
            syncOrderRelatedData: false,
        });

        queuePendingDeletion({
            table,
            id: numericId,
            row: deletedRow,
            index,
            preservedPage,
            entityName: tableDefinitions[table].entityName || 'Data',
        });

        // Update polling fingerprint after local delete
        if (typeof liveSync !== 'undefined') {
            liveSync.lastFingerprints[table] = buildDataFingerprint(state.data[table]);
        }
    } finally {
        state.requestLocks.deletingKeys.delete(deleteKey);
        setDeleteActionBusy(table, numericId, false);
    }
}

async function saveEntityToBackend(table, payload, mode, id) {
    const endpoint = apiEndpoints[table];
    if (!endpoint) {
        if (mode === 'edit' && id) {
            return { id, ...payload };
        }

        const nextId = (state.data[table].reduce((max, row) => Math.max(max, Number(row.id)), 0) || 0) + 1;
        return { id: nextId, ...payload };
    }

    const url = mode === 'edit' && id ? `${endpoint}/${id}` : endpoint;
    const method = mode === 'edit' && id ? 'PUT' : 'POST';

    const response = await fetch(url, {
        method,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...buildActorRequestHeaders(),
        },
        body: JSON.stringify(payload),
    });

    const result = await parseJsonResponse(response);
    if (!response.ok) {
        throw new Error(resolveApiErrorMessage(result) || 'Gagal menyimpan data.');
    }

    return result.data || (mode === 'edit' ? { id, ...payload } : payload);
}

async function deleteEntityFromBackend(table, id) {
    const endpoint = apiEndpoints[table];
    if (!endpoint) {
        return;
    }

    const response = await fetch(`${endpoint}/${id}`, {
        method: 'DELETE',
        headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...buildActorRequestHeaders(),
        },
    });

    const result = await parseJsonResponse(response);
    if (!response.ok) {
        throw new Error(resolveApiErrorMessage(result) || 'Gagal menghapus data.');
    }
}

async function refreshCustomersFromBackend() {
    const endpoint = apiEndpoints.customers;
    if (!endpoint) {
        return;
    }

    try {
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        });

        const result = await parseJsonResponse(response);
        if (!response.ok || !Array.isArray(result.data)) {
            return;
        }

        state.data.customers = result.data;
        refreshTableView('customers');
    } catch (error) {
        // Keep current customer data if refresh fails.
    }
}

async function refreshCalendarEventsFromBackend() {
    const endpoint = apiEndpoints.calendarEvents;
    if (!endpoint) {
        return;
    }

    try {
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...buildActorRequestHeaders(),
            },
        });

        const result = await parseJsonResponse(response);
        if (!response.ok || !Array.isArray(result.data)) {
            return;
        }

        state.data.calendarEvents = result.data;
    } catch (error) {
        // Keep current data if refresh fails.
    }
}

async function refreshStockFromBackend() {
    const endpoint = apiEndpoints.stock;
    if (!endpoint) {
        return;
    }

    try {
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        });

        const result = await parseJsonResponse(response);
        if (!response.ok || !Array.isArray(result.data)) {
            return;
        }

        state.data.stock = result.data;
        refreshTableView('stock');
    } catch (error) {
        // Keep current stock data if refresh fails.
    }
}

async function refreshFinanceFromBackend() {
    const endpoint = apiEndpoints.finance;
    if (!endpoint) {
        return;
    }

    try {
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        });

        const result = await parseJsonResponse(response);
        if (!response.ok || !Array.isArray(result.data)) {
            return;
        }

        state.data.finance = result.data;
        refreshTableView('finance');
        renderFinanceOverview();
    } catch (error) {
        // Keep current finance data if refresh fails.
    }
}

async function parseJsonResponse(response) {
    try {
        return await response.json();
    } catch (error) {
        return {};
    }
}

function resolveApiErrorMessage(result) {
    if (!result || typeof result !== 'object') {
        return '';
    }

    if (result.errors && typeof result.errors === 'object') {
        const keys = Object.keys(result.errors);
        if (keys.length > 0) {
            const first = result.errors[keys[0]];
            if (Array.isArray(first) && first.length > 0) {
                return String(first[0]);
            }
            if (typeof first === 'string') {
                return first;
            }
        }
    }

    if (typeof result.message === 'string') {
        return result.message;
    }

    return '';
}

function closePasswordModal() {
    const modal = document.getElementById('passwordModal');
    if (!modal) {
        return;
    }

    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');

    const form = document.getElementById('passwordForm');
    const input = document.getElementById('passwordInput');
    const error = document.getElementById('passwordError');
    if (form) {
        form.reset();
    }
    if (input) {
        input.value = '';
    }
    if (error) {
        error.textContent = '';
    }

    resetPasswordVisibilityToggles();

    state.pendingAccount = null;
}

function updateProfileInfo() {
    const topUserName = document.getElementById('topUserName');
    const topUserRole = document.getElementById('topUserRole');
    const sidebarRoleLabel = document.getElementById('sidebarRoleLabel');
    const normalizedRole = normalizeRole(state.selectedAccount.role);

    if (topUserName) {
        topUserName.textContent = state.selectedAccount.name;
    }
    if (topUserRole) {
        topUserRole.textContent = normalizedRole;
    }
    if (sidebarRoleLabel) {
        sidebarRoleLabel.textContent = normalizedRole;
    }
}

function normalizeRole(role) {
    const value = String(role || '').trim().toLowerCase();
    if (value === 'owner') {
        return 'Owner';
    }
    return 'Karyawan';
}

function buildActorRequestHeaders() {
    const actorId = Number(state.selectedAccount?.id || 0);
    const actorName = String(state.selectedAccount?.name || '').trim();
    const actorRole = normalizeRole(state.selectedAccount?.role || '');
    const actorPhone = String(state.selectedAccount?.phone || '').trim();
    const headers = {};

    if (Number.isFinite(actorId) && actorId > 0) {
        headers['X-BSA-Actor-Id'] = String(Math.round(actorId));
    }

    if (actorName) {
        headers['X-BSA-Actor-Name'] = actorName;
    }

    if (actorRole) {
        headers['X-BSA-Actor-Role'] = actorRole;
    }

    if (actorPhone) {
        headers['X-BSA-Actor-Phone'] = actorPhone;
    }

    return headers;
}

function restoreAccountSession() {
    const stored = readAccountSession();
    if (!stored) {
        return false;
    }

    state.selectedAccount = stored;
    return true;
}

function readAccountSession() {
    try {
        const raw = window.sessionStorage.getItem(ACCOUNT_SESSION_KEY);
        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw);
        const name = String(parsed?.name || '').trim();
        if (!name) {
            return null;
        }

        const sessionId = Number(parsed?.id || 0);
        const role = normalizeRole(parsed?.role);
        const users = state.data.users || [];
        let matchedUser = null;

        if (Number.isFinite(sessionId) && sessionId > 0) {
            matchedUser = users.find((user) => Number(user?.id) === sessionId) || null;
        }

        if (!matchedUser) {
            matchedUser = users.find((user) => {
                const sameName = normalizeComparableText(user?.name) === normalizeComparableText(name);
                const sameRole = normalizeRole(user?.role) === role;
                return sameName && sameRole;
            }) || null;
        }

        const resolvedName = String(matchedUser?.name || name).trim();
        const resolvedRole = normalizeRole(matchedUser?.role || role);
        const resolvedId = Number(matchedUser?.id || 0) || (Number.isFinite(sessionId) && sessionId > 0 ? sessionId : 0);

        return {
            id: resolvedId,
            name: resolvedName || name,
            role: resolvedRole,
        };
    } catch (error) {
        return null;
    }
}

function persistAccountSession(account) {
    try {
        const parsedId = Number(account?.id || 0);
        const payload = {
            id: Number.isFinite(parsedId) && parsedId > 0 ? Math.round(parsedId) : 0,
            name: String(account?.name || '').trim(),
            role: normalizeRole(account?.role),
        };

        if (!payload.name) {
            return;
        }

        window.sessionStorage.setItem(ACCOUNT_SESSION_KEY, JSON.stringify(payload));
    } catch (error) {
        // Ignore storage errors.
    }
}

function clearAccountSession() {
    try {
        window.sessionStorage.removeItem(ACCOUNT_SESSION_KEY);
    } catch (error) {
        // Ignore storage errors.
    }
}

function sanitizeTableQuery(value) {
    return String(value || '').trim().toLowerCase();
}

function sanitizeSortKey(value) {
    const key = String(value || '').trim();
    if (!/^[A-Za-z0-9_]+$/.test(key)) {
        return '';
    }

    return key;
}

function resolveSafeFilterIndex(table, rawIndex = 0) {
    const filterOptions = tableDefinitions[table]?.filterOptions || [];
    if (!filterOptions.length) {
        return 0;
    }

    const index = Math.floor(Number(rawIndex) || 0);
    return Math.min(filterOptions.length - 1, Math.max(0, index));
}

function syncTableFilterControl(table, control) {
    const filterOptions = tableDefinitions[table]?.filterOptions || [];
    if (!control || !filterOptions.length) {
        return;
    }

    const tableState = state.tableState[table];
    if (!tableState) {
        return;
    }

    const safeFilterIndex = resolveSafeFilterIndex(table, tableState.filterIndex);
    tableState.filterIndex = safeFilterIndex;

    if (control instanceof HTMLSelectElement) {
        const needsRebuild = control.options.length !== filterOptions.length
            || filterOptions.some((option, index) => control.options[index]?.textContent !== String(option.label || ''));

        if (needsRebuild) {
            control.innerHTML = '';
            filterOptions.forEach((option, index) => {
                const optionNode = document.createElement('option');
                optionNode.value = String(index);
                optionNode.textContent = String(option.label || `Opsi ${index + 1}`);
                control.appendChild(optionNode);
            });
        }

        control.value = String(safeFilterIndex);
        return;
    }

    control.textContent = String(filterOptions[safeFilterIndex].label || 'Filter');
}

function syncTableControlsFromState() {
    Object.keys(state.tableState).forEach((table) => {
        syncTableControlsForTable(table);
    });
}

function syncTableControlsForTable(table) {
    const tableState = state.tableState[table];
    if (!tableState) {
        return;
    }

    const searchInput = document.querySelector(`[data-table-search="${table}"]`);
    if (searchInput) {
        searchInput.value = String(tableState.query || '');
    }

    const filterControl = document.querySelector(`[data-table-filter="${table}"]`);
    if (!filterControl) {
        return;
    }

    syncTableFilterControl(table, filterControl);
}

function restoreTableStateSession() {
    const saved = readTableStateSession();
    if (!saved || typeof saved !== 'object') {
        return;
    }

    Object.keys(state.tableState).forEach((table) => {
        const savedItem = saved[table];
        if (!savedItem || typeof savedItem !== 'object') {
            return;
        }

        state.tableState[table].query = sanitizeTableQuery(savedItem.query);

        const page = Number(savedItem.page);
        if (Number.isFinite(page) && page >= 1) {
            state.tableState[table].page = Math.floor(page);
        }

        const perPage = Number(savedItem.perPage);
        if (Number.isFinite(perPage) && perPage >= 1) {
            state.tableState[table].perPage = Math.floor(perPage);
        }

        const sortDir = String(savedItem.sortDir || '').toLowerCase();
        if (sortDir === 'asc' || sortDir === 'desc') {
            state.tableState[table].sortDir = sortDir;
        }

        const sortKey = sanitizeSortKey(savedItem.sortKey);
        if (sortKey) {
            state.tableState[table].sortKey = sortKey;
        }

        const filterOptions = tableDefinitions[table]?.filterOptions || [];
        const filterIndex = Number(savedItem.filterIndex);
        if (filterOptions.length && Number.isFinite(filterIndex) && filterIndex >= 0) {
            state.tableState[table].filterIndex = Math.min(
                filterOptions.length - 1,
                Math.floor(filterIndex),
            );
        }
    });
}

function readTableStateSession() {
    try {
        const raw = String(window.sessionStorage.getItem(TABLE_STATE_SESSION_KEY) || '').trim();
        if (!raw) {
            return null;
        }

        return JSON.parse(raw);
    } catch (error) {
        return null;
    }
}

function persistTableStateSession() {
    try {
        const payload = {};

        Object.keys(state.tableState).forEach((table) => {
            const tableState = state.tableState[table] || {};

            payload[table] = {
                query: sanitizeTableQuery(tableState.query),
                filterIndex: Math.max(0, Math.floor(Number(tableState.filterIndex) || 0)),
                sortKey: sanitizeSortKey(tableState.sortKey),
                sortDir: String(tableState.sortDir || '').toLowerCase() === 'desc' ? 'desc' : 'asc',
                perPage: Math.max(1, Math.floor(Number(tableState.perPage) || 1)),
                page: Math.max(1, Math.floor(Number(tableState.page) || 1)),
            };
        });

        window.sessionStorage.setItem(TABLE_STATE_SESSION_KEY, JSON.stringify(payload));
    } catch (error) {
        // Ignore storage errors.
    }
}

function clearTableStateSession() {
    try {
        window.sessionStorage.removeItem(TABLE_STATE_SESSION_KEY);
    } catch (error) {
        // Ignore storage errors.
    }
}

function resolveInitialView() {
    const storedView = readViewSession();
    if (!storedView) {
        return 'dashboard';
    }

    if (!hasOwnerAccess() && isOwnerOnlyView(storedView)) {
        return 'dashboard';
    }

    return storedView;
}

function readViewSession() {
    try {
        const raw = String(window.sessionStorage.getItem(VIEW_SESSION_KEY) || '').trim();
        if (!raw) {
            return null;
        }

        if (!Object.prototype.hasOwnProperty.call(pageMeta, raw)) {
            return null;
        }

        return raw;
    } catch (error) {
        return null;
    }
}

function persistViewSession(viewName) {
    const value = String(viewName || '').trim();
    if (!value || !Object.prototype.hasOwnProperty.call(pageMeta, value)) {
        return;
    }

    try {
        window.sessionStorage.setItem(VIEW_SESSION_KEY, value);
    } catch (error) {
        // Ignore storage errors.
    }
}

function clearViewSession() {
    try {
        window.sessionStorage.removeItem(VIEW_SESSION_KEY);
    } catch (error) {
        // Ignore storage errors.
    }
}

function hasOwnerAccess() {
    return normalizeRole(state.selectedAccount.role) === 'Owner';
}

function isOwnerOnlyView(viewName) {
    return OWNER_ONLY_VIEWS.has(String(viewName || ''));
}

function applyRoleAccessControl() {
    const ownerAccess = hasOwnerAccess();
    const ownerSection = document.getElementById('ownerOnlySidebarSection');

    if (ownerSection) {
        ownerSection.hidden = !ownerAccess;
    }

    document.querySelectorAll('[data-owner-only="true"]').forEach((button) => {
        button.hidden = !ownerAccess;
    });

    if (!ownerAccess && isOwnerOnlyView(state.currentView)) {
        openView('dashboard');
        showToast(OWNER_ONLY_MESSAGE);
    }
}

function showToast(message) {
    const toast = document.getElementById('appToast');
    if (!toast) {
        return;
    }

    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
        toast.classList.remove('show');
    }, 1800);
}

function compareValue(a, b, dir) {
    const leftDate = parseFlexibleDate(a);
    const rightDate = parseFlexibleDate(b);
    if (leftDate && rightDate) {
        const dateResult = leftDate.getTime() - rightDate.getTime();
        return dir === 'asc' ? dateResult : dateResult * -1;
    }

    const leftNum = Number(a);
    const rightNum = Number(b);

    let result;
    if (Number.isFinite(leftNum) && Number.isFinite(rightNum)) {
        result = leftNum - rightNum;
    } else {
        result = String(a).localeCompare(String(b), 'id');
    }

    return dir === 'asc' ? result : result * -1;
}

function capitalize(value) {
    const text = String(value || '');
    if (!text) {
        return '';
    }
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatCurrency(value) {
    return new Intl.NumberFormat('id-ID').format(Number(value || 0));
}

function getDefaultFieldPlaceholder(field, table) {
    if (field.readonly || field.type === 'hidden' || field.type === 'select') {
        return '';
    }

    if (field.type === 'email') {
        return `Contoh: ${field.key}@domain.com`;
    }

    if (field.type === 'password') {
        return 'Masukkan password';
    }

    if (field.numericFormat === 'id-thousands') {
        return 'Contoh: 10.000';
    }

    if (field.type === 'number') {
        return 'Masukkan angka';
    }

    if (field.type === 'date') {
        return 'YYYY-MM-DD';
    }

    if (field.type === 'time') {
        return 'HH:MM';
    }

    const label = String(field.label || '').trim();
    if (!label) {
        return '';
    }

    const labelMap = {
        'Nama Barang': 'Masukkan nama barang',
        'Nama': 'Masukkan nama',
        'No.hp': 'Contoh: 081234567890',
        'Alamat': 'Masukkan alamat pelanggan',
        'Jabatan': 'Masukkan jabatan',
        'Divisi': 'Masukkan divisi',
        'Periode': 'Contoh: Apr 2026',
        'Catatan': 'Tulis catatan singkat',
        'Judul Agenda': 'Masukkan judul agenda',
        'Lokasi': 'Masukkan lokasi',
        'Keterangan': 'Tulis keterangan',
        'Kode Barang': 'Terisi otomatis atau isi manual',
        'Harga': 'Contoh: 10.000',
        'Stok(pcs)': 'Contoh: 20',
        'Riwayat Pesanan': 'Masukkan jumlah pesanan',
        'Total Pengeluaran (Terkirim)': 'Masukkan total pengeluaran yang sudah terkirim',
    };

    return labelMap[label] || `Masukkan ${label.toLowerCase()}`;
}

function parseIdThousandsNumber(value) {
    const digits = String(value || '').replace(/[^0-9]/g, '');
    if (!digits) {
        return 0;
    }

    return Number(digits);
}

function bindFormattedNumericInputs(table) {
    const fields = tableDefinitions[table]?.fields || [];
    const formattedFields = fields.filter((field) => field.numericFormat === 'id-thousands');
    if (!formattedFields.length) {
        return;
    }

    formattedFields.forEach((field) => {
        const input = document.getElementById(`field-${field.key}`);
        if (!(input instanceof HTMLInputElement)) {
            return;
        }

        const applyFormat = () => {
            const digits = String(input.value || '').replace(/[^0-9]/g, '');
            input.value = digits ? formatCurrency(digits) : '';
        };

        applyFormat();
        input.addEventListener('input', applyFormat);
        input.addEventListener('blur', applyFormat);
    });
}

function formatCounterValue(value, format) {
    if (format === 'signed-percent') {
        const numberValue = Number(value || 0);
        const sign = numberValue > 0 ? '+' : (numberValue < 0 ? '-' : '');
        const formatted = new Intl.NumberFormat('id-ID', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(Math.abs(numberValue));

        return `${sign}${formatted}%`;
    }

    if (format === 'rupiah') {
        return `Rp ${formatCurrency(value)}`;
    }

    if (format === 'id-integer') {
        return new Intl.NumberFormat('id-ID', {
            maximumFractionDigits: 0,
        }).format(Number(value || 0));
    }

    if (format === 'id-number') {
        return new Intl.NumberFormat('id-ID', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(Number(value || 0));
    }
    return String(value || 0);
}

function syncMockDateLabelsToWib(data) {
    if (!data || typeof data !== 'object') {
        return;
    }

    const today = getWibTodayDate();

    if (Array.isArray(data.orders)) {
        const orderDate = formatShortDate(today);
        data.orders = data.orders.map((row) => ({
            ...row,
            date: orderDate,
        }));
    }

    if (Array.isArray(data.activity)) {
        const offsets = [0, 0, 0, 0, 0, 0, 0, 0];
        data.activity = data.activity.map((row, index) => {
            const offset = offsets[Math.min(index, offsets.length - 1)] || 0;
            const shifted = shiftDate(today, offset);
            const time = extractClock(row.dateTime, '08:00');

            return {
                ...row,
                dateTime: `${formatShortDate(shifted)} ${time}`,
            };
        });
    }

    if (Array.isArray(data.finance)) {
        const offsets = [0, 0, -1, -1, -2, -3, -4, -5, -8, -11];
        data.finance = data.finance.map((row, index) => {
            const offset = offsets[Math.min(index, offsets.length - 1)] || 0;
            return {
                ...row,
                date: formatShortDate(shiftDate(today, offset)),
            };
        });
    }

    if (Array.isArray(data.calendarEvents)) {
        const offsets = [0, 0, 1, 2, 4, 8, 13];
        data.calendarEvents = data.calendarEvents.map((row, index) => {
            const offset = offsets[Math.min(index, offsets.length - 1)] || 0;
            return {
                ...row,
                date: formatIsoDate(shiftDate(today, offset)),
            };
        });
    }
}

function shiftDate(baseDate, offsetDays = 0) {
    const shifted = new Date(baseDate);
    shifted.setDate(shifted.getDate() + Number(offsetDays || 0));
    return shifted;
}

function extractClock(value, fallback = '08:00') {
    const match = String(value || '').match(/(\d{2}:\d{2})$/);
    if (match) {
        return match[1];
    }

    return fallback;
}

function formatShortDate(dateObj) {
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = String(dateObj.getFullYear()).slice(-2);
    return `${day}.${month}.${year}`;
}

function formatMonthYearLabel(dateObj) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const month = monthNames[dateObj.getMonth()] || 'Jan';
    return `${month} ${dateObj.getFullYear()}`;
}

function getWibDateParts(referenceDate = new Date()) {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: WIB_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).formatToParts(referenceDate);

    const values = {};
    parts.forEach((part) => {
        if (part.type !== 'literal') {
            values[part.type] = part.value;
        }
    });

    return {
        year: Number(values.year),
        month: Number(values.month),
        day: Number(values.day),
        hour: Number(values.hour),
        minute: Number(values.minute),
        second: Number(values.second),
    };
}

function getWibTodayIso() {
    const nowWib = getWibDateParts();
    return `${String(nowWib.year).padStart(4, '0')}-${String(nowWib.month).padStart(2, '0')}-${String(nowWib.day).padStart(2, '0')}`;
}

function getWibTodayDate() {
    const nowWib = getWibDateParts();
    return new Date(nowWib.year, nowWib.month - 1, nowWib.day);
}

function getWibDateTimeLabel(referenceDate = new Date()) {
    const nowWib = getWibDateParts(referenceDate);
    const weekday = capitalize(new Intl.DateTimeFormat('id-ID', {
        timeZone: WIB_TIMEZONE,
        weekday: 'long',
    }).format(referenceDate));

    const day = String(nowWib.day).padStart(2, '0');
    const month = String(nowWib.month).padStart(2, '0');
    const year = String(nowWib.year);
    const hour = String(nowWib.hour).padStart(2, '0');
    const minute = String(nowWib.minute).padStart(2, '0');
    const second = String(nowWib.second).padStart(2, '0');

    return `${weekday}, ${day}/${month}/${year} ${hour}:${minute}:${second} WIB (GMT+7)`;
}

function startWibClock() {
    const updateClock = () => {
        const pageDate = document.getElementById('pageDate');
        if (pageDate) {
            pageDate.textContent = getWibDateTimeLabel();
        }
    };

    updateClock();
    window.clearInterval(startWibClock.timer);
    startWibClock.timer = window.setInterval(updateClock, 1000);
}

function round2(value) {
    return Math.round(Number(value) * 100) / 100;
}

function isStrongPassword(value) {
    const text = String(value || '');
    if (text.length < 8) {
        return false;
    }

    const hasLower = /[a-z]/.test(text);
    const hasUpper = /[A-Z]/.test(text);
    const hasNumber = /\d/.test(text);

    return hasLower && hasUpper && hasNumber;
}

function parseFinanceDate(value) {
    const parts = String(value || '').split('.').map(Number);
    if (parts.length !== 3 || parts.some((item) => !Number.isFinite(item))) {
        return null;
    }

    const [day, month, yearShort] = parts;
    const year = yearShort < 100 ? 2000 + yearShort : yearShort;
    const parsed = new Date(year, month - 1, day);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return parsed;
}

function formatCompactRupiah(amount) {
    const value = Number(amount || 0);
    if (value >= 1000000) {
        return `Rp ${(value / 1000000).toFixed(1).replace('.', ',')} jt`;
    }
    if (value >= 1000) {
        return `Rp ${Math.round(value / 1000)} rb`;
    }
    return `Rp ${formatCurrency(value)}`;
}

async function exportTableAsExcel(table) {
    await exportTableByFormat(table, 'xlsx');
}

async function exportTableAsPdf(table) {
    await exportTableByFormat(table, 'pdf');
}

async function exportTableByFormat(table, format) {
    const tableKey = String(table || '').trim();
    if (!tableKey) {
        return;
    }

    if (state.requestLocks.exportingTables.has(tableKey)) {
        return;
    }

    state.requestLocks.exportingTables.add(tableKey);

    if (!exportEndpoint) {
        showToast('Endpoint export belum tersedia.');
        state.requestLocks.exportingTables.delete(tableKey);
        return;
    }

    const normalizedFormat = String(format || '').toLowerCase() === 'pdf' ? 'pdf' : 'xlsx';
    const formatLabel = normalizedFormat === 'pdf' ? 'PDF' : 'Excel';
    setExportButtonsBusy(tableKey, true, formatLabel);

    const rows = state.tableState[tableKey]
        ? getProcessedRows(tableKey)
        : [...(state.data[tableKey] || [])];

    if (!rows.length) {
        showToast('Tidak ada data yang bisa diexport.');
        state.requestLocks.exportingTables.delete(tableKey);
        setExportButtonsBusy(tableKey, false);
        return;
    }

    const url = `${exportEndpoint}/${encodeURIComponent(tableKey)}?format=${encodeURIComponent(normalizedFormat)}`;
    showToast(`Sedang menyiapkan file ${formatLabel}...`);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...buildActorRequestHeaders(),
            },
        });

        if (!response.ok) {
            throw new Error(`Export gagal (${response.status})`);
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        const disposition = response.headers.get('content-disposition');

        link.href = downloadUrl;
        link.download = resolveExportFileName(disposition, tableKey, normalizedFormat);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        link.remove();

        window.URL.revokeObjectURL(downloadUrl);
        showToast(`File ${formatLabel} berhasil diunduh.`);
    } catch (error) {
        showToast('Export gagal. Coba lagi.');
    } finally {
        state.requestLocks.exportingTables.delete(tableKey);
        setExportButtonsBusy(tableKey, false);
    }
}

async function downloadImportTemplate(table) {
    if (!importTemplateEndpoint) {
        showToast('Endpoint template import belum tersedia.');
        return;
    }

    const url = `${importTemplateEndpoint}/${encodeURIComponent(table)}`;
    showToast('Sedang menyiapkan template import...');

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...buildActorRequestHeaders(),
            },
        });

        if (!response.ok) {
            throw new Error(`Gagal mengunduh template (${response.status})`);
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        const disposition = response.headers.get('content-disposition');

        link.href = downloadUrl;
        link.download = resolveExportFileName(disposition, `template-${table}`);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        link.remove();

        window.URL.revokeObjectURL(downloadUrl);
        showToast('Template import berhasil diunduh.');
    } catch (error) {
        showToast('Gagal mengunduh template import.');
    }
}

function openImportPicker(table) {
    if (!importEndpoint) {
        showToast('Endpoint import Excel belum tersedia.');
        return;
    }

    if (state.requestLocks.importingTables.has(table)) {
        return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    input.style.display = 'none';

    input.addEventListener('change', () => {
        const file = input.files && input.files[0] ? input.files[0] : null;
        input.remove();

        if (!file) {
            return;
        }

        void importTableFromExcel(table, file);
    }, { once: true });

    document.body.appendChild(input);
    input.click();
}

async function importTableFromExcel(table, file) {
    if (!state.data[table]) {
        showToast('Tabel untuk import tidak ditemukan.');
        return;
    }

    if (state.requestLocks.importingTables.has(table)) {
        return;
    }

    state.requestLocks.importingTables.add(table);
    setImportButtonBusy(table, true);

    try {
        const preservedPage = state.tableState[table]?.page || 1;

        const url = `${importEndpoint}/${encodeURIComponent(table)}`;
        const formData = new FormData();
        formData.append('file', file);

        showToast('Sedang mengimpor data Excel...');

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    ...buildActorRequestHeaders(),
                },
                body: formData,
            });

            const result = await parseJsonResponse(response);
            if (!response.ok) {
                throw new Error(resolveApiErrorMessage(result) || `Import gagal (${response.status}).`);
            }

            if (Array.isArray(result.data)) {
                state.data[table] = result.data;
                refreshTableView(table);
                ensureTablePage(table, preservedPage);
            }

            if (table === 'orders') {
                await refreshStockFromBackend();
                await refreshCustomersFromBackend();
                await refreshFinanceFromBackend();
            }

            renderDashboardMiniTables();
            updateMetricCounters(false);

            if (table === 'calendarEvents') {
                renderCalendarView();
            }
            if (table === 'finance') {
                renderFinanceOverview();
            }

            showToast(typeof result.message === 'string' ? result.message : 'Import data berhasil.');

            // Update polling fingerprints after import
            if (typeof liveSync !== 'undefined') {
                liveSync.lastFingerprints[table] = buildDataFingerprint(state.data[table]);
                if (table === 'orders') {
                    liveSync.lastFingerprints.stock = buildDataFingerprint(state.data.stock);
                    liveSync.lastFingerprints.customers = buildDataFingerprint(state.data.customers);
                    liveSync.lastFingerprints.finance = buildDataFingerprint(state.data.finance);
                }
            }
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Import gagal. Coba lagi.');
        }
    } finally {
        state.requestLocks.importingTables.delete(table);
        setImportButtonBusy(table, false);
    }
}

function resolveExportFileName(contentDisposition, table, format = 'xlsx') {
    const extension = String(format || '').toLowerCase() === 'pdf' ? 'pdf' : 'xlsx';
    const fallback = `${table}-${new Date().toISOString().slice(0, 10)}.${extension}`;
    if (!contentDisposition) {
        return fallback;
    }

    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match && utf8Match[1]) {
        return decodeURIComponent(utf8Match[1]);
    }

    const quotedMatch = contentDisposition.match(/filename="([^"]+)"/i);
    if (quotedMatch && quotedMatch[1]) {
        return quotedMatch[1];
    }

    const plainMatch = contentDisposition.match(/filename=([^;]+)/i);
    if (plainMatch && plainMatch[1]) {
        return plainMatch[1].trim();
    }

    return fallback;
}

function mergeBootstrapData(baseData, incomingData) {
    const merged = { ...baseData };

    Object.keys(baseData).forEach((key) => {
        if (Array.isArray(incomingData[key])) {
            merged[key] = incomingData[key];
        }
    });

    return merged;
}

function resolveLogStatusClass(status) {
    if (status === 'warning') {
        return 'warning';
    }
    if (status === 'gagal') {
        return 'danger';
    }
    return 'success';
}

function resolveUserStatusClass(status) {
    if (status === 'cuti') {
        return 'warning';
    }
    if (status === 'nonaktif') {
        return 'inactive';
    }
    return 'active';
}

function resolveCalendarStatusClass(status) {
    if (status === 'berlangsung') {
        return 'info';
    }
    if (status === 'selesai') {
        return 'success';
    }
    return 'pending';
}

function parseFlexibleDate(value) {
    const text = String(value || '').trim();
    if (!text) {
        return null;
    }

    const finance = parseFinanceDate(text);
    if (finance) {
        return finance;
    }

    const dateTimeMatch = text.match(/^(\d{2})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2})$/);
    if (dateTimeMatch) {
        const [, dd, mm, yy, hh, mi] = dateTimeMatch;
        return new Date(2000 + Number(yy), Number(mm) - 1, Number(dd), Number(hh), Number(mi), 0, 0);
    }

    return null;
}

function formatIsoDate(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateHuman(isoDate) {
    const parsed = new Date(`${isoDate}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
        return isoDate;
    }
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(parsed);
}

function normalizeCalendarDate(value) {
    const text = String(value || '').trim();
    if (!text) {
        return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        return text;
    }

    const dotMatch = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
    if (dotMatch) {
        const [, dd, mm, yy] = dotMatch;
        const year = yy.length === 2 ? `20${yy}` : yy;
        const month = String(mm).padStart(2, '0');
        const day = String(dd).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    return null;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function resolveEntityFieldValue(table, field, editingRow) {
    if (table === 'users' && field.key === 'password') {
        return '';
    }

    if (table === 'stock' && field.key === 'code' && !editingRow) {
        return '';
    }

    const rawValue = editingRow ? editingRow[field.key] : '';

    if (table === 'activity' && editingRow && (field.key === 'date' || field.key === 'time')) {
        const parts = resolveActivityDateTimeParts(editingRow.dateTime);
        if (parts) {
            return field.key === 'date' ? parts.date : parts.time;
        }
    }

    if (field.numericFormat === 'id-thousands') {
        return rawValue === '' ? '' : formatCurrency(rawValue);
    }

    if (field.type === 'date') {
        if (editingRow) {
            return normalizeCalendarDate(String(rawValue || '')) || '';
        }

        if (field.key === 'date' && (table === 'orders' || table === 'finance' || table === 'calendarEvents' || table === 'activity')) {
            return getWibTodayIso();
        }

        return '';
    }

    if (field.type === 'time') {
        if (editingRow) {
            return normalizeTimeField(String(rawValue || ''));
        }

        return getWibCurrentTimeHHMM();
    }

    return rawValue ?? '';
}

function resolveActivityDateTimeParts(value) {
    const text = String(value || '').trim();
    if (!text) {
        return null;
    }

    const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:T|\s)(\d{2}):(\d{2})/);
    if (isoMatch) {
        return {
            date: `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`,
            time: `${isoMatch[4]}:${isoMatch[5]}`,
        };
    }

    const parsed = parseFlexibleDate(text);
    if (!parsed || Number.isNaN(parsed.getTime())) {
        return null;
    }

    const date = `${String(parsed.getFullYear()).padStart(4, '0')}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
    const time = `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`;

    return { date, time };
}

function resolveFieldSuggestions(table, field) {
    const sourceName = String(field.suggestionSource || '').trim();
    const sourceKey = String(field.suggestionKey || '').trim();
    if (!sourceName || !sourceKey || !Array.isArray(state.data[sourceName])) {
        return [];
    }

    const currentValue = state.modalState.mode === 'edit'
        ? String((state.data[table] || []).find((item) => item.id === state.modalState.id)?.[field.key] || '')
        : '';

    const names = state.data[sourceName]
        .map((item) => String(item?.[sourceKey] || '').trim())
        .filter(Boolean);

    if (currentValue.trim()) {
        names.push(currentValue.trim());
    }

    return [...new Set(names)].sort((a, b) => a.localeCompare(b, 'id'));
}

function getOrdersByCustomer(customer) {
    const customerId = Number(customer?.id);
    const customerName = normalizeComparableText(customer?.name);

    return (state.data.orders || []).filter((order) => {
        const orderCustomerId = Number(order?.customerId);
        if (Number.isFinite(customerId) && customerId > 0 && Number.isFinite(orderCustomerId) && orderCustomerId > 0) {
            return orderCustomerId === customerId;
        }

        return normalizeComparableText(order?.author) === customerName;
    });
}

function normalizeComparableText(value) {
    return String(value || '').trim().toLowerCase();
}

function generateNextStockCode(productName = '') {
    const base = buildStockCodeBase(productName);
    const existingCodes = new Set(
        (state.data.stock || [])
            .map((item) => String(item?.code || '').trim().toUpperCase())
            .filter(Boolean),
    );

    if (!existingCodes.has(base)) {
        return base;
    }

    let maxSequence = 0;
    const escapedBase = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const sequencePattern = new RegExp(`^${escapedBase}-(\\d{1,6})$`);

    existingCodes.forEach((code) => {
        const match = code.match(sequencePattern);
        if (!match) {
            return;
        }

        const value = Number(match[1]);
        if (Number.isFinite(value)) {
            maxSequence = Math.max(maxSequence, value);
        }
    });

    const start = Math.max(2, maxSequence + 1);

    for (let offset = 0; offset < 10000; offset += 1) {
        const candidate = `${base}-${start + offset}`;
        if (!existingCodes.has(candidate)) {
            return candidate;
        }
    }

    return `${base}-${Date.now()}`;
}

function buildStockCodeBase(productName = '') {
    const normalizedName = String(productName || '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '');

    const namePart = normalizedName || 'BARANG';

    return `PRD-${namePart}`.slice(0, 45);
}

function normalizeTimeField(value) {
    const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})/);
    if (!match) {
        return '';
    }

    const hour = String(Number(match[1])).padStart(2, '0');
    return `${hour}:${match[2]}`;
}

function getWibCurrentTimeHHMM() {
    const nowWib = getWibDateParts();
    const hour = String(nowWib.hour).padStart(2, '0');
    const minute = String(nowWib.minute).padStart(2, '0');
    return `${hour}:${minute}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Real-Time Polling Engine
// Automatically syncs data from the backend every POLL_INTERVAL_MS milliseconds
// without requiring a page refresh.
// ═══════════════════════════════════════════════════════════════════════════════

const POLL_INTERVAL_MS = 3000;
const POLL_VISIBILITY_DELAY_MS = 500;

const liveSync = {
    enabled: true,
    timerId: 0,
    isSyncing: false,
    lastFingerprints: {},
    visibilityResumeTimerId: 0,
};

/**
 * Builds a fast fingerprint string for an array of data rows.
 * Used to detect whether backend data has actually changed.
 */
function buildDataFingerprint(dataArray) {
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
        return '[]';
    }

    return JSON.stringify(dataArray.map(row => row.id).sort((a, b) => a - b))
        + ':' + dataArray.length
        + ':' + JSON.stringify(dataArray[0])
        + ':' + JSON.stringify(dataArray[dataArray.length - 1]);
}

/**
 * Checks whether any modal or form overlay is currently visible.
 * We skip polling while modals are open to avoid UI glitches mid-edit.
 */
function isAnyModalOpen() {
    const visibleModals = document.querySelectorAll('.modal-backdrop.show');
    if (visibleModals.length > 0) {
        return true;
    }

    const accountGate = document.getElementById('accountGate');
    if (accountGate && accountGate.classList.contains('is-open')) {
        return true;
    }

    return false;
}

/**
 * Checks whether any request lock is currently active (user is submitting,
 * deleting, importing, or exporting data).
 */
function isAnyRequestActive() {
    return state.requestLocks.submitForm
        || state.requestLocks.deletingKeys.size > 0
        || state.requestLocks.importingTables.size > 0
        || state.requestLocks.exportingTables.size > 0
        || state.requestLocks.loadingTables.size > 0;
}

/**
 * Updates the visual state of the live sync badge in the topbar.
 */
function updateSyncBadgeUI() {
    const badge = document.getElementById('liveSyncToggle');
    if (!badge) {
        return;
    }

    const label = badge.querySelector('.live-sync-label');

    if (!liveSync.enabled) {
        badge.classList.remove('is-active', 'is-syncing');
        badge.title = 'Sinkronisasi otomatis dijeda. Klik untuk melanjutkan.';
        if (label) {
            label.textContent = 'Paused';
        }
        return;
    }

    if (liveSync.isSyncing) {
        badge.classList.add('is-active', 'is-syncing');
        badge.title = 'Sedang menyinkronkan data...';
        if (label) {
            label.textContent = 'Syncing';
        }
        return;
    }

    badge.classList.add('is-active');
    badge.classList.remove('is-syncing');
    badge.title = 'Sinkronisasi data otomatis aktif. Klik untuk menjeda.';
    if (label) {
        label.textContent = 'Live';
    }
}

/**
 * Fetches all table data from the backend and updates the UI for any
 * tables that have changed. Skips tables that haven't been loaded yet
 * (they will be lazy-loaded when the user navigates to them).
 */
async function pollAllData() {
    if (liveSync.isSyncing || !liveSync.enabled) {
        return;
    }

    if (isAnyModalOpen() || isAnyRequestActive()) {
        return;
    }

    liveSync.isSyncing = true;
    updateSyncBadgeUI();

    const tablesToPoll = Object.keys(apiEndpoints).filter(table => {
        if (table === 'accountLogin' || table === 'accountLogout') {
            return false;
        }

        const endpoint = apiEndpoints[table];
        if (!endpoint) {
            return false;
        }

        if (state.tableState[table] && !state.tableState[table].loaded) {
            return false;
        }

        if (table === 'calendarEvents' && !state.calendarView.loaded) {
            return false;
        }

        return true;
    });

    const fetchPromises = tablesToPoll.map(async (table) => {
        try {
            const endpoint = apiEndpoints[table];
            const response = await fetch(endpoint, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    ...buildActorRequestHeaders(),
                },
            });

            const result = await parseJsonResponse(response);
            if (!response.ok || !result || !Array.isArray(result.data)) {
                return null;
            }

            return { table, data: result.data };
        } catch (error) {
            return null;
        }
    });

    try {
        const results = await Promise.allSettled(fetchPromises);
        let hasChanges = false;

        results.forEach(settledResult => {
            if (settledResult.status !== 'fulfilled' || !settledResult.value) {
                return;
            }

            const { table, data } = settledResult.value;
            const newFingerprint = buildDataFingerprint(data);
            const oldFingerprint = liveSync.lastFingerprints[table];

            if (newFingerprint !== oldFingerprint) {
                state.data[table] = data;
                liveSync.lastFingerprints[table] = newFingerprint;
                hasChanges = true;

                if (state.tableState[table]) {
                    refreshTableView(table);
                }
            }
        });

        if (hasChanges) {
            renderDashboardMiniTables();
            renderDashboardMiniCalendar();
            updateMetricCounters(false);
            renderFinanceOverview();

            if (state.currentView === 'calendar') {
                renderCalendarView();
            }
        }
    } catch (error) {
        // Silently ignore polling errors — the next cycle will retry.
    } finally {
        liveSync.isSyncing = false;
        updateSyncBadgeUI();
    }
}

/**
 * Starts the polling loop. Called once on DOMContentLoaded.
 */
function startLiveSync() {
    stopLiveSync();

    Object.keys(state.data).forEach(table => {
        if (Array.isArray(state.data[table]) && state.data[table].length > 0) {
            liveSync.lastFingerprints[table] = buildDataFingerprint(state.data[table]);
        }
    });

    liveSync.enabled = true;
    updateSyncBadgeUI();
    schedulePollCycle();
}

/**
 * Stops the polling loop.
 */
function stopLiveSync() {
    clearTimeout(liveSync.timerId);
    liveSync.timerId = 0;
}

/**
 * Schedules the next poll cycle.
 */
function schedulePollCycle() {
    stopLiveSync();

    if (!liveSync.enabled) {
        return;
    }

    liveSync.timerId = setTimeout(async () => {
        await pollAllData();
        schedulePollCycle();
    }, POLL_INTERVAL_MS);
}

/**
 * Handles page visibility changes to pause/resume polling when the
 * tab is hidden/visible, saving resources.
 */
function bindVisibilitySync() {
    document.addEventListener('visibilitychange', () => {
        clearTimeout(liveSync.visibilityResumeTimerId);

        if (document.hidden) {
            stopLiveSync();
        } else if (liveSync.enabled) {
            liveSync.visibilityResumeTimerId = setTimeout(() => {
                pollAllData().then(() => schedulePollCycle());
            }, POLL_VISIBILITY_DELAY_MS);
        }
    });
}

// Integrate into existing DOMContentLoaded handler
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('bsaApp')) {
        return;
    }

    bindVisibilitySync();
    startLiveSync();
});

function bindThemeToggle() {
    const toggleBtn = document.getElementById('themeToggle');
    const iconDark = document.getElementById('themeIconDark');
    const iconLight = document.getElementById('themeIconLight');
    
    if (!toggleBtn) return;
    
    const currentTheme = localStorage.getItem('bsa.theme') || 'light';
    if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        iconDark.style.display = 'block';
        iconLight.style.display = 'none';
    } else {
        iconDark.style.display = 'none';
        iconLight.style.display = 'block';
    }
    
    toggleBtn.addEventListener('click', () => {
        const theme = document.documentElement.getAttribute('data-theme');
        if (theme === 'dark') {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('bsa.theme', 'light');
            iconDark.style.display = 'none';
            iconLight.style.display = 'block';
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('bsa.theme', 'dark');
            iconDark.style.display = 'block';
            iconLight.style.display = 'none';
        }
    });
}
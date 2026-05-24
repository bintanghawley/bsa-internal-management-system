@php
    $tableId = $tableId ?? 'table';
    $title = $title ?? 'Data';
    $addLabel = $addLabel ?? 'Tambah Data';
    $searchPlaceholder = $searchPlaceholder ?? 'Cari data...';
    $columns = $columns ?? [];
@endphp

<section class="panel data-panel" data-table-panel="{{ $tableId }}">
    <h2 class="panel-title">{{ $title }}</h2>

    <div class="toolbar-row">
        <label class="search-input-wrap">
            <span class="search-icon">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="6" stroke="currentColor" stroke-width="2"/><path d="M16 16L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </span>
            <input type="text" data-table-search="{{ $tableId }}" placeholder="{{ $searchPlaceholder }}">
        </label>

        <div class="toolbar-actions">
            <select class="filter-select" data-table-filter="{{ $tableId }}" aria-label="Filter {{ $title }}"></select>
            <button class="ghost-btn icon-btn" type="button" data-table-reset="{{ $tableId }}" title="Reset" aria-label="Reset">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
                <span>Segarkan</span>
            </button>
            <button class="ghost-btn icon-btn" type="button" data-table-template="{{ $tableId }}" title="Template" aria-label="Download Template">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
                <span>Template</span>
            </button>
            <button class="ghost-btn icon-btn" type="button" data-table-export="{{ $tableId }}" title="Export Excel" aria-label="Export to Excel">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3z"/><path d="M8 11h8M8 15h4" stroke="white" stroke-width="2" fill="none"/></svg>
                <span>Excel</span>
            </button>
            <button class="ghost-btn icon-btn" type="button" data-table-export-pdf="{{ $tableId }}" title="Export PDF" aria-label="Export to PDF">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/><text x="7" y="15" font-size="8" font-weight="bold" fill="currentColor">PDF</text></svg>
                <span>PDF</span>
            </button>
            <button class="ghost-btn icon-btn" type="button" data-table-import="{{ $tableId }}" title="Import" aria-label="Import Data">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <span>Unggah</span>
            </button>
        </div>
    </div>

    <div class="table-wrap">
        <table class="bsa-table">
            <thead>
                <tr>
                    @foreach ($columns as $column)
                        @php
                            $key = $column['key'] ?? '';
                            $label = $column['label'] ?? '';
                            $sortable = $column['sortable'] ?? true;
                            $class = $column['class'] ?? '';
                        @endphp
                        <th
                            class="{{ $class }} {{ $sortable ? 'is-sortable' : '' }}"
                            @if ($sortable)
                                data-sort-table="{{ $tableId }}"
                                data-sort-key="{{ $key }}"
                            @endif
                        >
                            <span>{{ $label }}</span>
                            @if ($sortable)
                                <i class="sort-caret" aria-hidden="true"></i>
                            @endif
                        </th>
                    @endforeach
                </tr>
            </thead>
            <tbody id="{{ $tableId }}TableBody"></tbody>
        </table>
    </div>

    <div class="table-footer-row">
        <p class="table-meta" id="{{ $tableId }}DataInfo">Menampilkan 0 data</p>
        <div class="pagination-controls">
            <button class="mini-btn" type="button" data-page-nav="prev" data-page-table="{{ $tableId }}">&lt;</button>
            <span class="page-indicator" id="{{ $tableId }}PageInfo">1 / 1</span>
            <button class="mini-btn" type="button" data-page-nav="next" data-page-table="{{ $tableId }}">&gt;</button>
        </div>
    </div>

    <button class="primary-action" type="button" data-open-entity-modal="{{ $tableId }}" data-mode="add">+ {{ $addLabel }}</button>
</section>
<aside class="bsa-sidebar" id="bsaSidebar">
    <div class="sidebar-brand" aria-label="BSA - System">
        <img class="sidebar-brand-logo" src="{{ asset('images/logo-bsa-full.webp') }}" alt="BSA - System">
        <img class="sidebar-brand-mark" src="{{ asset('images/logo-bsa-mark.webp') }}" alt="BSA">
    </div>

    <nav class="sidebar-nav" aria-label="Main Navigation">
        <button class="sidebar-link is-active" data-view-target="dashboard" type="button">
            <span class="sidebar-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3.5L4 9.1V20a1 1 0 0 0 1 1h5v-6h4v6h5a1 1 0 0 0 1-1V9.1z"/></svg>
            </span>
            <span class="sidebar-label">Dasbor</span>
        </button>
        <button class="sidebar-link" data-view-target="stock" type="button">
            <span class="sidebar-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 6.8A2.8 2.8 0 0 1 5.8 4h12.4A2.8 2.8 0 0 1 21 6.8v10.4a2.8 2.8 0 0 1-2.8 2.8H5.8A2.8 2.8 0 0 1 3 17.2zm3 1.2v8h12V8zm2 2h4v4H8z"/></svg>
            </span>
            <span class="sidebar-label">Stok Barang</span>
        </button>
        <button class="sidebar-link" data-view-target="orders" type="button">
            <span class="sidebar-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 7a2 2 0 0 1 2-2h7.1a2 2 0 0 1 1.4.6l4.9 4.9a2 2 0 0 1 .6 1.4V17a2 2 0 0 1-2 2h-1.2a2.8 2.8 0 0 1-5.6 0H9.8a2.8 2.8 0 0 1-5.6 0H4zm12 4h2.2l-3.2-3.2z"/></svg>
            </span>
            <span class="sidebar-label">Pesanan</span>
        </button>
        <button class="sidebar-link" data-view-target="finance" type="button">
            <span class="sidebar-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4h12a2 2 0 0 1 2 2v2H4V6a2 2 0 0 1 2-2m14 6v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8zm-9 2v2h2v-2zm4 0v2h3v-2z"/></svg>
            </span>
            <span class="sidebar-label">Keuangan</span>
        </button>
        <button class="sidebar-link" data-view-target="customers" type="button">
            <span class="sidebar-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.5 12a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9m8 2a3.5 3.5 0 1 0-2.7-5.7A6.6 6.6 0 0 1 17.5 14M2 19a6 6 0 0 1 12 0v1H2zm13.5 1v-1.2a5.3 5.3 0 0 0-1.4-3.6 5.8 5.8 0 0 1 7.9 5z"/></svg>
            </span>
            <span class="sidebar-label">Pelanggan</span>
        </button>
        <button class="sidebar-link" data-view-target="calendar" type="button">
            <span class="sidebar-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 2h2v2h6V2h2v2h2a2 2 0 0 1 2 2v12.5A2.5 2.5 0 0 1 18.5 21h-13A2.5 2.5 0 0 1 3 18.5V6a2 2 0 0 1 2-2h2zm12 8H5v8.5a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5z"/></svg>
            </span>
            <span class="sidebar-label">Kalender</span>
        </button>
    </nav>

    <div class="sidebar-footer" id="ownerOnlySidebarSection">
        <div style="margin: 14px 0 6px; padding: 0 10px; pointer-events: none; user-select: none;">
            <span id="sidebarRoleLabel" style="font-size: 0.92rem; font-weight: 800; color: #111827; display: block; letter-spacing: 0.01em;">Karyawan</span>
        </div>

        <button class="sidebar-link sidebar-muted" type="button" data-view-target="activity" data-owner-only="true">
            <span class="sidebar-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9h-2a7 7 0 1 1-7-7zm1 4h-2v6l5 3 1-1.7-4-2.3z"/></svg>
            </span>
            <span class="sidebar-label">Log Aktifitas</span>
        </button>
        <button class="sidebar-link sidebar-muted" type="button" data-view-target="users" data-owner-only="true">
            <span class="sidebar-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2L1 9l11 7 9-5.7V17h2V9zM6 14.8V18a6 6 0 0 0 12 0v-3.2l-6 3.8z"/></svg>
            </span>
            <span class="sidebar-label">Karyawan</span>
        </button>
    </div>
</aside>
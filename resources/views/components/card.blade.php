@php
    $title = $title ?? 'Kartu';
    $value = $value ?? 0;
    $subtitle = $subtitle ?? '';
    $counterId = $counterId ?? 'metric';
    $chartType = $chartType ?? 'line';
    $format = $format ?? 'id-number';
    $showDropdown = $showDropdown ?? false;
@endphp

<article class="metric-card" data-metric-card="{{ $counterId }}">
    <div class="metric-header">
        <h3>{{ $title }}</h3>
        @if ($showDropdown)
            <select class="metric-dropdown" data-metric-period-select="{{ $counterId }}" aria-label="Pilih periode {{ $title }}">
                <option value="day">Hari ini</option>
                <option value="week">Minggu ini</option>
                <option value="month" selected>Bulan ini</option>
            </select>
        @endif
    </div>

    <p class="metric-value" data-counter="{{ $counterId }}" data-target="{{ $value }}" data-format="{{ $format }}">0</p>
    <p class="metric-subtitle" data-metric-subtitle="{{ $counterId }}">{{ $subtitle }}</p>

    @if ($chartType === 'line')
        <div class="sparkline-block">
            <svg viewBox="0 0 260 84" fill="none" aria-hidden="true" data-metric-line-chart="{{ $counterId }}">
                <path data-line-series="a" d="M5 55 L255 23" stroke="#6B7BFF" stroke-width="2.2" stroke-linecap="round"/>
                <path data-line-series="b" d="M5 62 L255 36" stroke="#E08CFF" stroke-width="2.2" stroke-linecap="round"/>
                <path data-line-series="c" d="M5 64 L255 56" stroke="#FB7BA1" stroke-width="2.2" stroke-linecap="round"/>
            </svg>
            <div class="chart-legend" data-line-legend="{{ $counterId }}">
                <span data-legend-series="a"><i class="dot dot-a"></i><span class="legend-text">-</span></span>
                <span data-legend-series="b"><i class="dot dot-b"></i><span class="legend-text">-</span></span>
                <span data-legend-series="c"><i class="dot dot-c"></i><span class="legend-text">-</span></span>
            </div>
        </div>
    @elseif ($chartType === 'line-soft')
        <div class="sparkline-block">
            <svg viewBox="0 0 260 84" fill="none" aria-hidden="true" data-metric-line-chart="{{ $counterId }}">
                <path data-line-series="a" d="M5 43 L255 36" stroke="#6B7BFF" stroke-width="2.2" stroke-linecap="round"/>
                <path data-line-series="b" d="M5 53 L255 44" stroke="#E08CFF" stroke-width="2.2" stroke-linecap="round"/>
                <path data-line-series="c" d="M5 58 L255 23" stroke="#FB7BA1" stroke-width="2.2" stroke-linecap="round"/>
            </svg>
            <div class="chart-legend" data-line-legend="{{ $counterId }}">
                <span data-legend-series="a"><i class="dot dot-a"></i><span class="legend-text">-</span></span>
                <span data-legend-series="b"><i class="dot dot-b"></i><span class="legend-text">-</span></span>
                <span data-legend-series="c"><i class="dot dot-c"></i><span class="legend-text">-</span></span>
            </div>
        </div>
    @else
        <div class="donut-wrap" aria-hidden="true">
            <div class="donut-chart" data-metric-donut-chart="{{ $counterId }}">
                <div class="donut-hole" data-metric-donut-center="{{ $counterId }}">0%</div>
            </div>
            <ul class="donut-legend" data-metric-donut-legend="{{ $counterId }}">
                <li data-donut-index="0"><i class="dot dot-a"></i><span class="donut-label">-</span></li>
                <li data-donut-index="1"><i class="dot dot-b"></i><span class="donut-label">-</span></li>
                <li data-donut-index="2"><i class="dot dot-c"></i><span class="donut-label">-</span></li>
            </ul>
        </div>
    @endif
</article>
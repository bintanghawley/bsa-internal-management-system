<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>{{ $title }}</title>
    <style>
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 10px;
            color: #1f2937;
            margin: 18px;
        }

        .header {
            margin-bottom: 12px;
        }

        .title {
            margin: 0;
            font-size: 16px;
            font-weight: 700;
            color: #111827;
        }

        .meta {
            margin: 4px 0 0;
            font-size: 9px;
            color: #6b7280;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }

        th,
        td {
            border: 1px solid #d1d5db;
            padding: 6px;
            vertical-align: top;
            word-break: break-word;
        }

        th {
            background: #f3f4f6;
            font-weight: 700;
            text-align: left;
        }

        .empty {
            text-align: center;
            color: #6b7280;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1 class="title">{{ $title }}</h1>
        <p class="meta">Digenerate: {{ $generatedAt }}</p>
    </div>

    <table>
        <thead>
            <tr>
                @foreach ($headings as $heading)
                    <th>{{ $heading }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @forelse ($rows as $row)
                <tr>
                    @foreach ($row as $value)
                        <td>{{ is_scalar($value) || $value === null ? (string) $value : json_encode($value) }}</td>
                    @endforeach
                </tr>
            @empty
                <tr>
                    <td class="empty" colspan="{{ count($headings) }}">Tidak ada data.</td>
                </tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>

<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <meta name="description" content="BSA Management System - Sistem Manajemen Usaha untuk stok, pesanan, keuangan, karyawan, dan pelanggan.">

        <title>BSA Management System</title>
        <link rel="dns-prefetch" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
        <noscript><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"></noscript>

        @vite(['resources/css/app.css', 'resources/js/app.js'])
    </head>
    <body class="bsa-body">
        @yield('content')
    </body>
</html>
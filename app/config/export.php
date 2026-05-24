<?php

return [
    'orientation' => [
        // Allowed values: portrait, landscape
        'default' => 'portrait',

        // Per-table orientation used by BOTH Excel and PDF exports.
        'tables' => [
            'stock' => 'portrait',
            'customers' => 'portrait',
            'orders' => 'portrait',
            'activity' => 'landscape',
            'users' => 'portrait',
            'finance' => 'landscape',
            'calendarEvents' => 'landscape',
        ],
    ],

    'paper' => [
        // Allowed values: a4, letter, legal, folio
        'default' => 'a4',

        // Per-table paper size used by BOTH Excel and PDF exports.
        'tables' => [
            'stock' => 'a4',
            'customers' => 'a4',
            'orders' => 'a4',
            'activity' => 'legal',
            'users' => 'a4',
            'finance' => 'legal',
            'calendarEvents' => 'legal',
        ],
    ],
];

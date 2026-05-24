<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Pastikan Role tersedia
        $ownerRole = Role::updateOrCreate(
            ['name' => 'Owner'],
            ['description' => 'Pemilik Usaha / Administrator Utama']
        );

        Role::updateOrCreate(
            ['name' => 'Karyawan'],
            ['description' => 'Staff Operasional Toko']
        );

        // 2. Buat Akun Owner (1 Akun)
        User::updateOrCreate(
            ['phone' => '081234567890'],
            [
                'name' => 'admin',
                'role_id' => $ownerRole->id,
                'password' => Hash::make('password'),
                'position' => 'Owner',
                'division' => 'Management',
                'shift' => 'Pagi',
                'employment_status' => 'aktif',
            ]
        );
    }
}

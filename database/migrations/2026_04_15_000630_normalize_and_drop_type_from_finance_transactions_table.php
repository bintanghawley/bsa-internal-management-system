<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('finance_transactions')) {
            return;
        }

        $hasType = Schema::hasColumn('finance_transactions', 'type');
        $columns = ['id', 'description', 'category'];
        if ($hasType) {
            $columns[] = 'type';
        }

        DB::table('finance_transactions')
            ->select($columns)
            ->orderBy('id')
            ->chunkById(200, function ($rows) use ($hasType): void {
                foreach ($rows as $row) {
                    $rawDescription = trim((string) ($row->description ?? ''));
                    $rawCategory = trim((string) ($row->category ?? ''));
                    $normalizedCategory = strtolower($rawCategory);

                    $newCategory = $normalizedCategory === 'pemasukan' ? 'pemasukan' : 'pengeluaran';
                    if ($hasType) {
                        $type = strtolower((string) ($row->type ?? ''));
                        if ($type === 'masuk') {
                            $newCategory = 'pemasukan';
                        }
                        if ($type === 'keluar') {
                            $newCategory = 'pengeluaran';
                        }
                    }

                    $newDescription = $rawDescription;
                    $isLegacyDetailCategory = $rawCategory !== '' && !in_array($normalizedCategory, ['pemasukan', 'pengeluaran'], true);

                    if ($isLegacyDetailCategory) {
                        $prefix = ucfirst(strtolower($rawCategory));
                        $lowerDescription = strtolower($newDescription);
                        $prefixHyphen = strtolower($prefix.' - ');
                        $prefixColon = strtolower($prefix.': ');

                        if ($newDescription === '') {
                            $newDescription = $prefix;
                        } elseif (!str_starts_with($lowerDescription, $prefixHyphen) && !str_starts_with($lowerDescription, $prefixColon)) {
                            $newDescription = $prefix.' - '.$newDescription;
                        }
                    }

                    DB::table('finance_transactions')
                        ->where('id', $row->id)
                        ->update([
                            'category' => $newCategory,
                            'description' => $newDescription,
                        ]);
                }
            }, 'id');

        if (!$hasType) {
            return;
        }

        Schema::table('finance_transactions', function (Blueprint $table) {
            $table->dropColumn('type');
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('finance_transactions')) {
            return;
        }

        if (!Schema::hasColumn('finance_transactions', 'type')) {
            Schema::table('finance_transactions', function (Blueprint $table) {
                $table->enum('type', ['masuk', 'keluar'])->default('keluar')->after('category');
            });
        }

        DB::table('finance_transactions')
            ->select(['id', 'category'])
            ->orderBy('id')
            ->chunkById(200, function ($rows): void {
                foreach ($rows as $row) {
                    $category = strtolower(trim((string) ($row->category ?? '')));
                    $type = $category === 'pemasukan' ? 'masuk' : 'keluar';

                    DB::table('finance_transactions')
                        ->where('id', $row->id)
                        ->update(['type' => $type]);
                }
            }, 'id');
    }
};

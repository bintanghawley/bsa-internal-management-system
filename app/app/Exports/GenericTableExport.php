<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class GenericTableExport implements FromArray, WithHeadings, WithStyles, ShouldAutoSize, WithEvents
{
    public function __construct(
        private readonly array $headings,
        private readonly array $rows,
        private readonly string $orientation = 'portrait',
        private readonly string $paperSize = 'a4',
    ) {
    }

    public function headings(): array
    {
        return $this->headings;
    }

    public function array(): array
    {
        return $this->rows;
    }

    public function styles(Worksheet $sheet): array
    {
        $highestColumn = $sheet->getHighestColumn();
        $highestRow = max(1, $sheet->getHighestRow());
        $headerRange = "A1:{$highestColumn}1";
        $fullRange = "A1:{$highestColumn}{$highestRow}";

        $sheet->getStyle($headerRange)->applyFromArray([
            'font' => [
                'bold' => true,
                'color' => ['argb' => 'FFFFFFFF'],
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['argb' => 'FF1E40AF'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
                'wrapText' => true,
            ],
        ]);

        $sheet->getStyle($fullRange)->applyFromArray([
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['argb' => 'FFBFDBFE'],
                ],
            ],
            'alignment' => [
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
        ]);

        if ($highestRow >= 2) {
            $bodyRange = "A2:{$highestColumn}{$highestRow}";
            $sheet->getStyle($bodyRange)->applyFromArray([
                'font' => [
                    'color' => ['argb' => 'FF1E293B'],
                ],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['argb' => 'FFEFF6FF'],
                ],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_LEFT,
                ],
            ]);

            for ($row = 2; $row <= $highestRow; $row += 1) {
                if ($row % 2 !== 0) {
                    $sheet->getStyle("A{$row}:{$highestColumn}{$row}")->applyFromArray([
                        'fill' => [
                            'fillType' => Fill::FILL_SOLID,
                            'startColor' => ['argb' => 'FFDBEAFE'],
                        ],
                    ]);
                }
            }
        }

        $sheet->getRowDimension(1)->setRowHeight(24);

        return [];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event): void {
                $setup = $event->sheet->getPageSetup();
                $setup->setPaperSize($this->resolvePaperSizeConstant($this->paperSize));
                $setup->setOrientation($this->orientation === 'landscape'
                    ? PageSetup::ORIENTATION_LANDSCAPE
                    : PageSetup::ORIENTATION_PORTRAIT);
                $setup->setFitToWidth(1);
                $setup->setFitToHeight(0);
            },
        ];
    }

    private function resolvePaperSizeConstant(string $paperSize): int
    {
        return match (strtolower(trim($paperSize))) {
            'letter' => PageSetup::PAPERSIZE_LETTER,
            'legal' => PageSetup::PAPERSIZE_LEGAL,
            'folio' => PageSetup::PAPERSIZE_FOLIO,
            default => PageSetup::PAPERSIZE_A4,
        };
    }
}

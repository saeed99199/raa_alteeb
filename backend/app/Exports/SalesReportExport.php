<?php

namespace App\Exports;

use App\Models\Sale;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class SalesReportExport implements FromQuery, WithHeadings, WithMapping, WithStyles
{
    public function __construct(
        private string $dateFrom,
        private string $dateTo,
        private ?array $branchIds = null
    ) {}

    public function query()
    {
        return Sale::with(['branch', 'customer', 'cashier'])
            ->when($this->branchIds, fn($q) => $q->whereIn('branch_id', $this->branchIds))
            ->whereBetween(\Illuminate\Support\Facades\DB::raw('DATE(created_at)'), [$this->dateFrom, $this->dateTo])
            ->orderByDesc('created_at');
    }

    public function headings(): array
    {
        return [
            'Invoice #',
            'Date',
            'Branch',
            'Customer',
            'Cashier',
            'Subtotal',
            'Discount',
            'Tax',
            'Total',
            'Payment Method',
            'Status',
        ];
    }

    public function map($sale): array
    {
        return [
            $sale->invoice_number,
            $sale->created_at->format('Y-m-d H:i'),
            $sale->branch->name,
            $sale->customer?->name ?? 'Walk-in',
            $sale->cashier->name,
            $sale->subtotal,
            $sale->discount_amount,
            $sale->tax_amount,
            $sale->total_amount,
            $sale->payment_method,
            $sale->status,
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}

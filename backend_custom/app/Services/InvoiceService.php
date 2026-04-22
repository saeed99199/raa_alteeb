<?php

namespace App\Services;

use App\Models\Sale;
use Barryvdh\DomPDF\Facade\Pdf;

class InvoiceService
{
    public function generate(Sale $sale): string
    {
        $data = [
            'sale'     => $sale,
            'items'    => $sale->items,
            'payments' => $sale->payments,
            'customer' => $sale->customer,
            'branch'   => $sale->branch,
            'cashier'  => $sale->cashier,
        ];

        $pdf = Pdf::loadView('invoices.sale', $data)
            ->setPaper('a4', 'portrait');

        return $pdf->output();
    }
}

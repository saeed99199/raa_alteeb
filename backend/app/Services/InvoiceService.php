<?php

namespace App\Services;

use App\Models\Sale;
use Illuminate\Support\Carbon;

class InvoiceService
{
    public function __construct(private readonly ChromePdfService $chromePdfService)
    {
    }

    public function generate(Sale $sale): string
    {
        $branch = $sale->branch;
        $sellerName = (string) ($branch?->name_ar ?: $branch?->name ?: config('app.name'));
        $sellerVatNumber = (string) ($branch?->vat_number ?: env('SHOP_VAT_NUMBER', ''));
        $sellerCrNumber = (string) ($branch?->commercial_register ?: env('SHOP_CR_NUMBER', ''));

        $timestamp = $sale->created_at
            ? Carbon::parse($sale->created_at)->utc()->format('Y-m-d\TH:i:s\Z')
            : now()->utc()->format('Y-m-d\TH:i:s\Z');

        $zatcaPayload = $this->buildZatcaTlvBase64(
            sellerName: $sellerName,
            vatNumber: $sellerVatNumber,
            invoiceTimestamp: $timestamp,
            invoiceTotal: (string) number_format((float) $sale->total_amount, 2, '.', ''),
            vatTotal: (string) number_format((float) $sale->tax_amount, 2, '.', '')
        );

        $data = [
            'sale' => $sale,
            'items' => $sale->items,
            'payments' => $sale->payments,
            'customer' => $sale->customer,
            'branch' => $branch,
            'cashier' => $sale->cashier,
            'seller_name' => $sellerName,
            'seller_vat_number' => $sellerVatNumber,
            'seller_cr_number' => $sellerCrNumber,
            'zatca_qr_payload' => $zatcaPayload,
            'zatca_qr_image' => $this->buildQrDataUriFromPayload($zatcaPayload),
        ];

        return $this->chromePdfService->renderViewToPdf('invoices.sale', $data);
    }

    private function buildZatcaTlvBase64(
        string $sellerName,
        string $vatNumber,
        string $invoiceTimestamp,
        string $invoiceTotal,
        string $vatTotal
    ): string {
        $tlv = '';
        $tlv .= $this->encodeTlvField(1, $sellerName);
        $tlv .= $this->encodeTlvField(2, $vatNumber);
        $tlv .= $this->encodeTlvField(3, $invoiceTimestamp);
        $tlv .= $this->encodeTlvField(4, $invoiceTotal);
        $tlv .= $this->encodeTlvField(5, $vatTotal);

        return base64_encode($tlv);
    }

    private function encodeTlvField(int $tag, string $value): string
    {
        $bytes = (string) $value;

        return chr($tag) . chr(strlen($bytes)) . $bytes;
    }

    private function buildQrDataUriFromPayload(string $payload): ?string
    {
        if ($payload === '') {
            return null;
        }

        $providers = [
            'https://quickchart.io/qr?' . http_build_query([
                'text' => $payload,
                'size' => 220,
                'format' => 'png',
                'ecLevel' => 'M',
            ]),
            'https://api.qrserver.com/v1/create-qr-code/?' . http_build_query([
                'size' => '220x220',
                'data' => $payload,
            ]),
        ];

        foreach ($providers as $url) {
            $image = $this->fetchBinary($url, false) ?? $this->fetchBinary($url, true);

            if ($image === null || $image === '') {
                continue;
            }

            return 'data:image/png;base64,' . base64_encode($image);
        }

        return null;
    }

    private function fetchBinary(string $url, bool $allowInsecureSsl): ?string
    {
        if (function_exists('curl_init')) {
            $ch = curl_init($url);

            if ($ch === false) {
                return null;
            }

            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_CONNECTTIMEOUT => 3,
                CURLOPT_TIMEOUT => 5,
                CURLOPT_SSL_VERIFYPEER => !$allowInsecureSsl,
                CURLOPT_SSL_VERIFYHOST => $allowInsecureSsl ? 0 : 2,
                CURLOPT_HTTPHEADER => ['Accept: image/png,image/*;q=0.8,*/*;q=0.5'],
            ]);

            $body = curl_exec($ch);
            $httpCode = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
            $err = curl_errno($ch);
            curl_close($ch);

            if ($err === 0 && is_string($body) && $body !== '' && $httpCode >= 200 && $httpCode < 300) {
                return $body;
            }
        }

        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'timeout' => 5,
                'ignore_errors' => true,
                'header' => "Accept: image/png,image/*;q=0.8,*/*;q=0.5\r\n",
            ],
            'ssl' => [
                'verify_peer' => !$allowInsecureSsl,
                'verify_peer_name' => !$allowInsecureSsl,
            ],
        ]);

        $body = @file_get_contents($url, false, $context);

        return is_string($body) && $body !== '' ? $body : null;
    }
}

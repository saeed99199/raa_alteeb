<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>فاتورة {{ $sale->invoice_number }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'DejaVu Sans', sans-serif; }
        body { font-size: 12px; color: #1a1a2e; direction: rtl; text-align: right; }
        .header { background: #8B5E3C; color: white; padding: 18px 24px; display: table; width: 100%; }
        .header > div { display: table-cell; vertical-align: top; }
        .header .invoice-info { text-align: left; }
        .header h1 { font-size: 21px; font-weight: 700; margin-bottom: 4px; }
        .header h2 { font-size: 16px; margin-bottom: 4px; }
        .header .meta { font-size: 11px; line-height: 1.6; }
        .content { padding: 20px 24px; }
        .parties { display: table; width: 100%; margin: 16px 0 12px; }
        .party { display: table-cell; width: 50%; vertical-align: top; }
        .party h3 { font-size: 11px; color: #777; margin-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; margin: 14px 0; }
        thead th { background: #f4ede8; padding: 8px 10px; text-align: right; font-size: 11px; border-bottom: 2px solid #dfd4cb; }
        tbody td { padding: 8px 10px; border-bottom: 1px solid #f0e8e2; }
        .totals { width: 320px; margin-right: auto; }
        .totals tr td { padding: 6px 10px; }
        .totals .total-row td { font-weight: 700; font-size: 14px; background: #8B5E3C; color: white; }
        .badge { display: inline-block; padding: 3px 8px; border-radius: 99px; font-size: 10px; font-weight: 700; }
        .badge-green { background: #dcfce7; color: #166534; }
        .legal-box {
            margin-top: 14px;
            padding: 10px;
            border: 1px solid #e7ddd6;
            background: #faf7f4;
            border-radius: 6px;
            line-height: 1.8;
        }
        .qr-wrap { margin-top: 14px; display: table; width: 100%; }
        .qr-box { display: table-cell; width: 180px; vertical-align: top; text-align: center; }
        .qr-box img { width: 150px; height: 150px; border: 1px solid #e6ddd7; padding: 4px; background: white; }
        .qr-note { display: table-cell; vertical-align: top; padding-right: 12px; font-size: 11px; color: #555; line-height: 1.7; }
        .footer { text-align: center; margin-top: 20px; color: #777; font-size: 10px; }
        .ltr { direction: ltr; unicode-bidi: embed; display: inline-block; }
    </style>
</head>
<body>
<div class="header">
    <div>
        <h1>{{ $seller_name }}</h1>
        <div class="meta">{{ $branch->address ?: '—' }}</div>
        <div class="meta">{{ $branch->phone ?: '—' }}</div>
        <div class="meta">{{ $branch->email ?: '—' }}</div>
    </div>
    <div class="invoice-info">
        <h2>فاتورة ضريبية مبسطة</h2>
        <div><span class="ltr">{{ $sale->invoice_number }}</span></div>
        <div><span class="ltr">{{ $sale->created_at->format('Y-m-d h:i A') }}</span></div>
        <div><span class="badge badge-green">{{ strtoupper($sale->status) }}</span></div>
    </div>
</div>

<div class="content">
    <div class="legal-box">
        <div><strong>الاسم التجاري:</strong> {{ $seller_name }}</div>
        <div><strong>رقم السجل التجاري:</strong> {{ $seller_cr_number ?: 'غير مسجل' }}</div>
        <div><strong>الرقم الضريبي:</strong> {{ $seller_vat_number ?: 'غير مسجل' }}</div>
        <div><strong>العنوان:</strong> {{ $branch->address ?: 'غير متوفر' }}</div>
    </div>

    <div class="parties">
        <div class="party">
            <h3>بيانات العميل</h3>
            <div>{{ $customer?->name ?? 'عميل نقدي' }}</div>
            <div>{{ $customer?->phone ?: '—' }}</div>
            <div>{{ $customer?->email ?: '—' }}</div>
        </div>
        <div class="party" style="text-align:left;">
            <h3>الموظف</h3>
            <div>{{ $cashier->name }}</div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>المنتج</th>
                <th>سعر الوحدة</th>
                <th>الكمية</th>
                <th>الخصم</th>
                <th>الضريبة</th>
                <th>الإجمالي</th>
            </tr>
        </thead>
        <tbody>
            @foreach($items as $i => $item)
            <tr>
                <td>{{ $i + 1 }}</td>
                <td>{{ $item->product_name }}</td>
                <td>{{ number_format($item->unit_price, 2) }}</td>
                <td>{{ $item->quantity }}</td>
                <td>{{ $item->discount_percent }}%</td>
                <td>{{ $item->tax_rate }}%</td>
                <td>{{ number_format($item->line_total, 2) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <table class="totals">
        <tr>
            <td>المجموع قبل الضريبة</td>
            <td>{{ number_format($sale->subtotal, 2) }} ر.س</td>
        </tr>
        <tr>
            <td>الخصم</td>
            <td>- {{ number_format($sale->discount_amount, 2) }} ر.س</td>
        </tr>
        <tr>
            <td>ضريبة القيمة المضافة</td>
            <td>{{ number_format($sale->tax_amount, 2) }} ر.س</td>
        </tr>
        <tr class="total-row">
            <td>الإجمالي شامل الضريبة</td>
            <td>{{ number_format($sale->total_amount, 2) }} ر.س</td>
        </tr>
        <tr>
            <td>المدفوع</td>
            <td>{{ number_format($sale->paid_amount, 2) }} ر.س</td>
        </tr>
        <tr>
            <td>المتبقي / الباقي</td>
            <td>{{ number_format($sale->change_amount, 2) }} ر.س</td>
        </tr>
    </table>

    <div style="margin-top: 8px;">
        <strong>طرق الدفع:</strong>
        @foreach($payments as $p)
            <span class="ltr">{{ ucfirst($p->method) }}</span>: <span class="ltr">{{ number_format($p->amount, 2) }}</span>@if(!$loop->last)، @endif
        @endforeach
    </div>

    <div class="qr-wrap">
        <div class="qr-box">
            @if($zatca_qr_image)
                <img src="{{ $zatca_qr_image }}" alt="ZATCA QR" />
            @else
                <div style="border:1px dashed #d9cec5;padding:25px 10px;color:#888;">QR غير متاح</div>
            @endif
        </div>
        <div class="qr-note">
            <div><strong>كود الفاتورة الضريبي (QR)</strong></div>
            <div>تم توليد الكود بصيغة TLV Base64 حسب متطلبات الفاتورة الضريبية المبسطة في السعودية.</div>
            <div style="margin-top: 6px; word-break: break-all;"><strong>Payload:</strong> {{ $zatca_qr_payload }}</div>
        </div>
    </div>
</div>

<div class="footer">
    <p>شكراً لتعاملكم معنا - {{ $seller_name }}</p>
    <p>هذه الفاتورة تم إنشاؤها إلكترونياً ولا تحتاج توقيع.</p>
</div>
</body>
</html>

<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="UTF-8">
    <title>Invoice {{ $sale->invoice_number }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 12px; color: #1a1a2e; }
        .header { background: #1a1a2e; color: white; padding: 20px 30px; display: flex; justify-content: space-between; }
        .header h1 { font-size: 24px; font-weight: 700; }
        .header .invoice-info { text-align: right; }
        .header .invoice-info h2 { font-size: 18px; }
        .content { padding: 20px 30px; }
        .parties { display: flex; justify-content: space-between; margin: 20px 0; }
        .party h3 { font-size: 11px; color: #888; text-transform: uppercase; margin-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        thead th { background: #f5f5f5; padding: 8px 10px; text-align: left; font-size: 11px; border-bottom: 2px solid #ddd; }
        tbody td { padding: 8px 10px; border-bottom: 1px solid #eee; }
        .totals { width: 280px; margin-left: auto; }
        .totals tr td { padding: 5px 10px; }
        .totals .total-row td { font-weight: 700; font-size: 14px; background: #1a1a2e; color: white; }
        .footer { text-align: center; margin-top: 30px; color: #888; font-size: 10px; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: 600; }
        .badge-green { background: #dcfce7; color: #166534; }
    </style>
</head>
<body>
<div class="header">
    <div>
        <h1>{{ $branch->name }}</h1>
        <div>{{ $branch->address }}</div>
        <div>{{ $branch->phone }}</div>
    </div>
    <div class="invoice-info">
        <h2>INVOICE</h2>
        <div>{{ $sale->invoice_number }}</div>
        <div>{{ $sale->created_at->format('d M Y, h:i A') }}</div>
        <div><span class="badge badge-green">{{ strtoupper($sale->status) }}</span></div>
    </div>
</div>

<div class="content">
    <div class="parties">
        <div class="party">
            <h3>Bill To</h3>
            <div>{{ $customer?->name ?? 'Walk-in Customer' }}</div>
            <div>{{ $customer?->phone }}</div>
            <div>{{ $customer?->email }}</div>
        </div>
        <div class="party">
            <h3>Served By</h3>
            <div>{{ $cashier->name }}</div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Product</th>
                <th>Unit Price</th>
                <th>Qty</th>
                <th>Discount</th>
                <th>Tax</th>
                <th>Total</th>
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
            <td>Subtotal</td>
            <td>{{ number_format($sale->subtotal, 2) }}</td>
        </tr>
        <tr>
            <td>Discount</td>
            <td>- {{ number_format($sale->discount_amount, 2) }}</td>
        </tr>
        <tr>
            <td>Tax (VAT)</td>
            <td>{{ number_format($sale->tax_amount, 2) }}</td>
        </tr>
        <tr class="total-row">
            <td>TOTAL</td>
            <td>{{ number_format($sale->total_amount, 2) }}</td>
        </tr>
        <tr>
            <td>Paid</td>
            <td>{{ number_format($sale->paid_amount, 2) }}</td>
        </tr>
        <tr>
            <td>Change</td>
            <td>{{ number_format($sale->change_amount, 2) }}</td>
        </tr>
    </table>

    <div style="margin-top: 15px;">
        <strong>Payment Methods:</strong>
        @foreach($payments as $p)
            {{ ucfirst($p->method) }}: {{ number_format($p->amount, 2) }}@if(!$loop->last), @endif
        @endforeach
    </div>
</div>

<div class="footer">
    <p>Thank you for your business! — {{ $branch->name }}</p>
    <p>This is a computer-generated invoice and requires no signature.</p>
</div>
</body>
</html>

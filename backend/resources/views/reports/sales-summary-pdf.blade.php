<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>تقرير المبيعات</title>
    <style>
        * { box-sizing: border-box; font-family: 'DejaVu Sans', sans-serif; }
        body { font-size: 12px; color: #1f2937; direction: rtl; text-align: right; }
        .header { margin-bottom: 14px; border-bottom: 2px solid #8B5E3C; padding-bottom: 8px; }
        .title { font-size: 18px; font-weight: 700; color: #8B5E3C; }
        .meta { margin-top: 6px; color: #555; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th { background: #f3ece6; border: 1px solid #e5d9cf; padding: 8px; text-align: right; }
        td { border: 1px solid #eee3da; padding: 8px; }
        .totals { margin-top: 12px; width: 55%; margin-right: auto; }
        .totals td { border: 1px solid #e5d9cf; }
        .totals .label { background: #f8f4f1; font-weight: 700; }
        .totals .value { text-align: left; direction: ltr; unicode-bidi: embed; }
        .period { direction: ltr; unicode-bidi: embed; display: inline-block; }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">تقرير المبيعات</div>
        <div class="meta">من: <span class="period">{{ $date_from }}</span> إلى: <span class="period">{{ $date_to }}</span></div>
        <div class="meta">التجميع: {{ $group_by === 'month' ? 'شهري' : ($group_by === 'branch' ? 'حسب الفرع' : 'يومي') }}</div>
    </div>

    <table>
        <thead>
            <tr>
                <th>الفترة</th>
                <th>عدد المعاملات</th>
                <th>الإيرادات</th>
                <th>الضريبة</th>
                <th>الخصم</th>
                <th>صافي الإيراد</th>
            </tr>
        </thead>
        <tbody>
            @forelse($rows as $row)
                <tr>
                    <td><span class="period">{{ $row->period }}</span></td>
                    <td>{{ (int) $row->transactions }}</td>
                    <td>{{ number_format((float) $row->revenue, 2) }} ر.س</td>
                    <td>{{ number_format((float) $row->tax, 2) }} ر.س</td>
                    <td>{{ number_format((float) $row->discount, 2) }} ر.س</td>
                    <td>{{ number_format((float) $row->net_revenue, 2) }} ر.س</td>
                </tr>
            @empty
                <tr>
                    <td colspan="6" style="text-align:center;">لا توجد بيانات ضمن الفترة المحددة</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <table class="totals">
        <tr>
            <td class="label">إجمالي المعاملات</td>
            <td class="value">{{ (int) $totals['transactions'] }}</td>
        </tr>
        <tr>
            <td class="label">إجمالي الإيرادات</td>
            <td class="value">{{ number_format((float) $totals['revenue'], 2) }} ر.س</td>
        </tr>
        <tr>
            <td class="label">إجمالي الضريبة</td>
            <td class="value">{{ number_format((float) $totals['tax'], 2) }} ر.س</td>
        </tr>
        <tr>
            <td class="label">صافي الإيرادات</td>
            <td class="value">{{ number_format((float) $totals['net_revenue'], 2) }} ر.س</td>
        </tr>
    </table>

    @if(!empty($sold_items) && count($sold_items) > 0)
        <div class="meta" style="margin-top: 16px; font-weight: 700;">الأصناف المباعة (أعلى 20 صنف)</div>
        <table>
            <thead>
                <tr>
                    <th>الصنف</th>
                    <th>الكمية المباعة</th>
                    <th>عدد الفواتير</th>
                    <th>الإيراد</th>
                </tr>
            </thead>
            <tbody>
                @foreach($sold_items as $item)
                    <tr>
                        <td>{{ $item->product_name }}</td>
                        <td>{{ (float) $item->total_qty }}</td>
                        <td>{{ (int) $item->transactions }}</td>
                        <td>{{ number_format((float) $item->total_revenue, 2) }} ر.س</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif
</body>
</html>

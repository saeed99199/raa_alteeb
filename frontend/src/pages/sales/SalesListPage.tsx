import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Typography, Table, Tag, Space, DatePicker, Input } from 'antd';
import dayjs from 'dayjs';
import api from '@/lib/api';

const { Title } = Typography;

export default function SalesListPage() {
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: ['sales-list', search, dateFrom, dateTo],
    queryFn: () => api.get('/sales', { params: { invoice_number: search, date_from: dateFrom, date_to: dateTo } }).then((r) => r.data),
  });

  const columns = [
    { title: 'رقم الفاتورة', dataIndex: 'invoice_number', key: 'invoice' },
    { title: 'الفرع', key: 'branch', render: (_: any, r: any) => r.branch?.name ?? '-' },
    { title: 'الكاشير', key: 'cashier', render: (_: any, r: any) => r.cashier?.name ?? '-' },
    { title: 'العميل', key: 'customer', render: (_: any, r: any) => r.customer?.name ?? 'زبون عادي' },
    { title: 'المجموع', dataIndex: 'total_amount', key: 'total', render: (v: number) => `${Number(v).toFixed(2)} ر.س` },
    { title: 'طريقة الدفع', dataIndex: 'payment_method', key: 'pay' },
    { title: 'الحالة', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color={v.includes('refund') ? 'orange' : 'green'}>{v}</Tag> },
    { title: 'التاريخ', dataIndex: 'created_at', key: 'created', render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
  ];

  return (
    <Card bordered={false} style={{ borderRadius: 16 }}>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} wrap>
        <Title level={5} style={{ margin: 0 }}>الفواتير</Title>
        <Space wrap>
          <Input.Search placeholder="بحث برقم الفاتورة" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 220 }} allowClear />
          <DatePicker placeholder="من" onChange={(d) => setDateFrom(d?.format('YYYY-MM-DD'))} />
          <DatePicker placeholder="إلى" onChange={(d) => setDateTo(d?.format('YYYY-MM-DD'))} />
        </Space>
      </Space>
      <Table dataSource={data?.data ?? []} columns={columns} rowKey="id" loading={isLoading} pagination={{ pageSize: 20 }} />
    </Card>
  );
}

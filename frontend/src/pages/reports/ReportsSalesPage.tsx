import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card, DatePicker, Button, Table, Typography, Space, Row, Col, Select,
  Statistic, message, Tag,
} from 'antd';
import { DownloadOutlined, FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import dayjs, { Dayjs } from 'dayjs';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const { Title } = Typography;
const { RangePicker } = DatePicker;

export default function ReportsSalesPage() {
  const user = useAuthStore((s) => s.user);
  const isSA = useAuthStore((s) => s.isSuperAdmin)();
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf('month'), dayjs()]);
  const [groupBy, setGroupBy] = useState<'day' | 'month'>('day');
  const [branchIds, setBranchIds] = useState<number[]>([]);

  const { data: branches = [] } = useQuery({
    queryKey: ['meta-branches-reports-sales'],
    queryFn: () => api.get('/meta/branches').then((r) => r.data),
    enabled: isSA,
  });

  const branchOptions = (branches || []).filter((b: any) => b.is_active).map((b: any) => ({
    label: `${b.name} (${b.code})`,
    value: b.id,
  }));

  const params = {
    date_from: range[0].format('YYYY-MM-DD'),
    date_to:   range[1].format('YYYY-MM-DD'),
    group_by:  groupBy,
    branch_id: isSA ? undefined : user?.branch_id,
    branch_ids: isSA && branchIds.length > 0 ? branchIds : undefined,
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['report-sales', params],
    queryFn: () => api.get('/reports/sales-summary', { params }).then((r) => r.data),
  });

  const { data: topProducts } = useQuery({
    queryKey: ['report-top-products', params],
    queryFn: () => api.get('/reports/top-products', { params: { ...params, limit: 10 } }).then((r) => r.data),
  });

  const { data: soldItems, isLoading: isSoldItemsLoading } = useQuery({
    queryKey: ['report-sold-items', params],
    queryFn: () => api.get('/reports/top-products', { params }).then((r) => r.data),
  });

  const chartData = (data ?? []).map((d: any) => ({
    period: d.period,
    الإيرادات: parseFloat(d.revenue),
    المعاملات: d.transactions,
    Tax: parseFloat(d.tax),
  }));

  const totals = (data ?? []).reduce(
    (acc: any, d: any) => ({
      revenue:      acc.revenue + parseFloat(d.revenue),
      transactions: acc.transactions + parseInt(d.transactions),
      tax:          acc.tax + parseFloat(d.tax),
    }),
    { revenue: 0, transactions: 0, tax: 0 }
  );

  const exportExcel = () => {
    const query = new URLSearchParams({
      date_from: params.date_from,
      date_to: params.date_to,
    });
    if (params.branch_id) {
      query.append('branch_id', String(params.branch_id));
    }
    if (params.branch_ids) {
      params.branch_ids.forEach((id: number) => query.append('branch_ids[]', String(id)));
    }
    const url = `/api/reports/export/sales-excel?${query.toString()}`;
    window.open(url, '_blank');
  };

  const exportPdf = async () => {
    try {
      const { data: blob } = await api.get('/reports/export/sales-pdf', {
        params,
        responseType: 'blob',
      });

      const fileUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const opened = window.open(fileUrl, '_blank');

      if (!opened) {
        window.location.href = fileUrl;
      }

      window.setTimeout(() => URL.revokeObjectURL(fileUrl), 60_000);
    } catch {
      message.error('تعذر تصدير تقرير PDF.');
    }
  };

  const tableColumns = [
    { title: 'الفترة', dataIndex: 'period', key: 'period' },
    { title: 'المعاملات', dataIndex: 'transactions', key: 'tx' },
    { title: 'الإيرادات', dataIndex: 'revenue', key: 'rev', render: (v: number) => `${parseFloat(v as any).toFixed(2)} ر.س` },
    { title: 'الضريبة', dataIndex: 'tax', key: 'tax', render: (v: number) => `${parseFloat(v as any).toFixed(2)} ر.س` },
    { title: 'الصافي', key: 'net', render: (_: any, r: any) => `${(parseFloat(r.revenue) - parseFloat(r.tax)).toFixed(2)} ر.س` },
  ];

  return (
    <div>
      <Title level={4}>تقارير المبيعات</Title>

      <Card bordered={false} style={{ borderRadius: 12, marginBottom: 16 }}>
        <Space wrap>
          <RangePicker value={range} onChange={(v) => v && setRange(v as [Dayjs, Dayjs])} />
          {isSA && (
            <Space>
              <Select
                mode="multiple"
                allowClear
                placeholder="اختر الفروع"
                value={branchIds}
                options={branchOptions}
                onChange={(v) => setBranchIds(v as number[])}
                style={{ minWidth: 240 }}
                maxTagCount="responsive"
              />
              <Tag color={branchIds.length > 0 ? 'blue' : 'default'}>
                {branchIds.length > 0 ? `الفروع المختارة: ${branchIds.length}` : 'كل الفروع'}
              </Tag>
            </Space>
          )}
          <Select
            value={groupBy}
            onChange={setGroupBy}
            options={[{ label: 'يومي', value: 'day' }, { label: 'شهري', value: 'month' }]}
            style={{ width: 120 }}
          />
          <Button type="primary" onClick={() => refetch()} style={{ background: '#8B5E3C' }}>إنشاء التقرير</Button>
          <Button icon={<FileExcelOutlined />} onClick={exportExcel} style={{ color: '#217346', borderColor: '#217346' }}>
            Export Excel
          </Button>
          <Button icon={<FilePdfOutlined />} onClick={exportPdf} danger>
            Export PDF
          </Button>
        </Space>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic title="إجمالي الإيرادات" value={`${totals.revenue.toFixed(2)} ر.س`} />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic title="إجمالي المعاملات" value={totals.transactions} />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic title="الضريبة المحصلة" value={`${totals.tax.toFixed(2)} ر.س`} />
          </Card>
        </Col>
      </Row>

      <Card bordered={false} style={{ borderRadius: 12, marginBottom: 16 }}>
        <Title level={5}>اتجاه الإيرادات</Title>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1a1a2e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#1a1a2e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => `${v.toFixed(2)} ر.س`} />
            <Area type="monotone" dataKey="الإيرادات" stroke="#1a1a2e" fill="url(#revGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <Row gutter={16}>
        <Col xs={24} lg={14}>
          <Card bordered={false} style={{ borderRadius: 12 }} title="التفصيل الدقيق">
            <Table
              dataSource={data ?? []}
              columns={tableColumns}
              rowKey="period"
              loading={isLoading}
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card bordered={false} style={{ borderRadius: 12 }} title="أكثر 10 منتجات مبيعاً">
            <Table
              dataSource={topProducts ?? []}
              columns={[
                { title: 'المنتج', dataIndex: 'product_name', key: 'p' },
                { title: 'الكمية', dataIndex: 'total_qty', key: 'q' },
                { title: 'الإيرادات', dataIndex: 'total_revenue', key: 'r', render: (v: number) => `${parseFloat(v as any).toFixed(2)} ر.س` },
              ]}
              rowKey="product_id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      <Card bordered={false} style={{ borderRadius: 12, marginTop: 16 }} title="الأصناف المباعة خلال الفترة">
        <Table
          dataSource={soldItems ?? []}
          columns={[
            { title: 'الصنف', dataIndex: 'product_name', key: 'product_name' },
            { title: 'الكمية المباعة', dataIndex: 'total_qty', key: 'total_qty' },
            { title: 'عدد الفواتير', dataIndex: 'transactions', key: 'transactions' },
            {
              title: 'إجمالي الإيراد',
              dataIndex: 'total_revenue',
              key: 'total_revenue',
              render: (v: number) => `${parseFloat(v as any).toFixed(2)} ر.س`,
            },
          ]}
          rowKey="product_id"
          loading={isSoldItemsLoading}
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Card>
    </div>
  );
}

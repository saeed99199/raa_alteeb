import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Row, Col, Card, Statistic, Typography, Table, Tag, Select, Space } from 'antd';
import {
  ShoppingCartOutlined, DollarOutlined,
  TeamOutlined, WarningOutlined, InboxOutlined, SwapOutlined,
} from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import dayjs from 'dayjs';

const { Title } = Typography;

function StatCard({ title, value, prefix, color, suffix }: any) {
  return (
    <Card bordered={false} style={{ borderRadius: 12, background: color ?? 'white' }}>
      <Statistic
        title={<span style={{ color: color ? 'rgba(255,255,255,0.8)' : undefined }}>{title}</span>}
        value={value}
        prefix={prefix}
        suffix={suffix}
        valueStyle={{ color: color ? 'white' : '#1a1a2e', fontWeight: 700 }}
      />
    </Card>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const [selectedBranchId, setSelectedBranchId] = useState<number | undefined>(undefined);
  const [compareBranchId, setCompareBranchId] = useState<number | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', selectedBranchId, compareBranchId],
    queryFn: () =>
      api.get('/dashboard', {
        params: {
          branch_id: selectedBranchId,
          compare_branch_id: compareBranchId,
        },
      }).then((r) => r.data),
    refetchInterval: 60_000,
  });

  const branchOptions = useMemo(() => {
    const rows = data?.available_branches ?? [];
    return rows.map((b: any) => ({ value: b.id, label: `${b.name} (${b.code})` }));
  }, [data?.available_branches]);

  const compareBranchOptions = useMemo(
    () => branchOptions.filter((b: any) => b.value !== selectedBranchId),
    [branchOptions, selectedBranchId]
  );

  const chartData = data?.sales_chart?.map((d: any) => ({
    date: dayjs(d.date).format('MMM DD'),
    revenue: parseFloat(d.revenue),
    transactions: d.transactions,
  })) ?? [];

  const topProductColumns = [
    { title: 'المنتج', dataIndex: 'name', key: 'name' },
    { title: 'الكمية المباعة', dataIndex: 'qty', key: 'qty' },
    { title: 'الإيراد', dataIndex: 'revenue', key: 'revenue', render: (v: number) => `${v?.toFixed(2)} ر.س` },
  ];

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>{t('dashboard')}</Title>
        {branchOptions.length > 0 && (
          <Space>
            <Select
              allowClear
              placeholder="اختر الفرع الأساسي"
              style={{ width: 240 }}
              options={branchOptions}
              value={selectedBranchId}
              onChange={(v) => {
                setSelectedBranchId(v);
                if (v && compareBranchId === v) {
                  setCompareBranchId(undefined);
                }
              }}
            />
            <Select
              allowClear
              placeholder="مقارنة مع فرع"
              style={{ width: 220 }}
              options={compareBranchOptions}
              value={compareBranchId}
              onChange={(v) => setCompareBranchId(v)}
            />
          </Space>
        )}
      </Space>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title={t('today_sales')}
            value={`${parseFloat(data?.today?.revenue ?? 0).toFixed(2)} ر.س`}
            prefix={<DollarOutlined />}
            color="#1a1a2e"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title={t('monthly_revenue')}
            value={`${parseFloat(data?.month?.revenue ?? 0).toFixed(2)} ر.س`}
            prefix={<DollarOutlined />}
            color="#0f3460"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="عمليات اليوم"
            value={data?.today?.count ?? 0}
            prefix={<ShoppingCartOutlined />}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title={t('low_stock_alert')}
            value={data?.low_stock ?? 0}
            prefix={<WarningOutlined />}
            color={data?.low_stock > 0 ? '#ff4d4f' : undefined}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="متوسط فاتورة اليوم"
            value={`${parseFloat(data?.today_avg_ticket ?? 0).toFixed(2)} ر.س`}
            prefix={<DollarOutlined />}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="متوسط فاتورة الشهر"
            value={`${parseFloat(data?.month_avg_ticket ?? 0).toFixed(2)} ر.س`}
            prefix={<DollarOutlined />}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="المنتجات الفعالة"
            value={data?.active_products ?? 0}
            prefix={<InboxOutlined />}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="المخزون المنتهي"
            value={data?.out_of_stock ?? 0}
            prefix={<WarningOutlined />}
            color={data?.out_of_stock > 0 ? '#ff4d4f' : undefined}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="نمو الشهر الحالي"
              value={parseFloat(data?.month_growth_percent ?? 0).toFixed(2)}
              suffix="%"
              valueStyle={{ color: Number(data?.month_growth_percent ?? 0) >= 0 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="تحويلات المخزون المعلقة"
              value={data?.pending_transfers ?? 0}
              prefix={<SwapOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="أوامر شراء مفتوحة"
              value={data?.open_purchase_orders ?? 0}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
        <Col xs={24} sm={12}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title={t('total_employees')}
              value={data?.employees ?? 0}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="مرتجعات هذا الشهر"
              value={parseFloat(data?.month_refunds ?? 0).toFixed(2)}
              suffix=" ر.س"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      {data?.comparison && (
        <Card title="مقارنة بين الفروع" bordered={false} style={{ borderRadius: 12, marginTop: 16 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Statistic
                title="فرق إيراد الشهر"
                value={Number(data?.comparison_delta?.month_revenue_diff ?? 0).toFixed(2)}
                suffix=" ر.س"
                valueStyle={{ color: Number(data?.comparison_delta?.month_revenue_diff ?? 0) >= 0 ? '#3f8600' : '#cf1322' }}
              />
            </Col>
            <Col xs={24} md={8}>
              <Statistic
                title="فرق إيراد اليوم"
                value={Number(data?.comparison_delta?.today_revenue_diff ?? 0).toFixed(2)}
                suffix=" ر.س"
                valueStyle={{ color: Number(data?.comparison_delta?.today_revenue_diff ?? 0) >= 0 ? '#3f8600' : '#cf1322' }}
              />
            </Col>
            <Col xs={24} md={8}>
              <Statistic
                title="فرق النمو الشهري"
                value={Number(data?.comparison_delta?.month_growth_diff ?? 0).toFixed(2)}
                suffix="%"
                valueStyle={{ color: Number(data?.comparison_delta?.month_growth_diff ?? 0) >= 0 ? '#3f8600' : '#cf1322' }}
              />
            </Col>
          </Row>
        </Card>
      )}

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={16}>
          <Card title="الإيرادات — آخر 7 أيام" bordered={false} style={{ borderRadius: 12 }}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => `${v.toFixed(2)} ر.س`} />
                <Line type="monotone" dataKey="revenue" stroke="#8B5E3C" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="أكثر المنتجات مبيعاً هذا الشهر" bordered={false} style={{ borderRadius: 12 }}>
            <Table
              dataSource={data?.top_products ?? []}
              columns={topProductColumns}
              rowKey="product_id"
              pagination={false}
              size="small"
              loading={isLoading}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

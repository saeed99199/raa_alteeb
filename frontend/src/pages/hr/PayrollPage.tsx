import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card, Table, Tag, Typography, Space, Button, Select, Modal, message,
} from 'antd';
import { CheckOutlined, CloseOutlined, DollarOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const { Title } = Typography;

const MONTHS = [...Array(12)].map((_, i) => ({
  label: new Date(2000, i).toLocaleString('ar-SA', { month: 'long' }),
  value: i + 1,
}));
const YEARS = [2023, 2024, 2025, 2026].map((y) => ({ label: y.toString(), value: y }));

export default function PayrollPage() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isSA = useAuthStore((s) => s.isSuperAdmin)();
  const [year, setYear]   = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const branchId = isSA ? undefined : user?.branch_id;

  const { data, isLoading } = useQuery({
    queryKey: ['payroll', year, month, branchId],
    queryFn: () =>
      api.get('/hr/payroll', { params: { year, month, branch_id: branchId } }).then((r) => r.data.data),
  });

  const generateMutation = useMutation({
    mutationFn: () => api.post('/hr/payroll/generate', { branch_id: branchId, year, month }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll'] }); message.success('تم توليد الرواتب.'); },
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => api.post(`/hr/payroll/${id}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll'] }),
  });

  const paidMutation = useMutation({
    mutationFn: (id: number) => api.post(`/hr/payroll/${id}/mark-paid`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll'] }),
  });

  const statusColor: Record<string, string> = { draft: 'default', approved: 'blue', paid: 'green' };

  const columns = [
    { title: 'الموظف', key: 'emp', render: (_: any, r: any) => r.employee?.user?.name },
    { title: 'الراتب الأساسي', dataIndex: 'base_salary', render: (v: number) => `${v} ر.س` },
    { title: 'إضافي', dataIndex: 'overtime_pay', render: (v: number) => `${v} ر.س` },
    { title: 'الخصومات', dataIndex: 'deductions', render: (v: number) => <Tag color="red">- {v} ر.س</Tag> },
    { title: 'صافي الراتب', dataIndex: 'net_salary', render: (v: number) => <strong>{v} ر.س</strong> },
    { title: 'الحالة', dataIndex: 'status', render: (v: string) => <Tag color={statusColor[v]}>{v.toUpperCase()}</Tag> },
    {
      title: 'الإجراءات', key: 'act',
      render: (_: any, r: any) => (
        <Space>
          {r.status === 'draft' && (
            <Button size="small" icon={<CheckOutlined />} onClick={() => approveMutation.mutate(r.id)}>موافقة</Button>
          )}
          {r.status === 'approved' && (
            <Button size="small" type="primary" icon={<DollarOutlined />} style={{ background: '#52c41a' }} onClick={() => paidMutation.mutate(r.id)}>
              Mark Paid
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card bordered={false} style={{ borderRadius: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Title level={5} style={{ margin: 0 }}>الرواتب</Title>
          <Space>
            <Select value={year} onChange={setYear} options={YEARS} style={{ width: 100 }} />
            <Select value={month} onChange={setMonth} options={MONTHS} style={{ width: 140 }} />
            <Button
              type="primary"
              onClick={() => generateMutation.mutate()}
              loading={generateMutation.isPending}
              style={{ background: '#8B5E3C' }}
            >
              توليد الرواتب
            </Button>
          </Space>
        </div>
        <Table
          dataSource={data ?? []}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </div>
  );
}

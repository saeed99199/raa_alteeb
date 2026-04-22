import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Table, Tag, Typography, Space, DatePicker, Button, Select, Badge } from 'antd';
import dayjs from 'dayjs';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const { Title } = Typography;

export default function AttendancePage() {
  const user = useAuthStore((s) => s.user);
  const isSA = useAuthStore((s) => s.isSuperAdmin)();
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', date],
    queryFn: () =>
      api.get('/hr/attendance', {
        params: { date, branch_id: isSA ? undefined : user?.branch_id },
      }).then((r) => r.data.data),
  });

  // Self check-in/out
  const checkIn  = () => api.post('/hr/attendance/check-in').then(() => window.location.reload());
  const checkOut = () => api.post('/hr/attendance/check-out').then(() => window.location.reload());

  const statusColor: Record<string, string> = {
    present: 'green', absent: 'red', late: 'orange',
    half_day: 'gold', holiday: 'blue', leave: 'purple',
  };

  const columns = [
    { title: 'الموظف', key: 'emp', render: (_: any, r: any) => r.employee?.user?.name },
    { title: 'التاريخ', dataIndex: 'date', key: 'date' },
    { title: 'حضور', dataIndex: 'check_in', key: 'ci', render: (v: string) => v ?? '—' },
    { title: 'انصراف', dataIndex: 'check_out', key: 'co', render: (v: string) => v ?? '—' },
    { title: 'ساعات', dataIndex: 'worked_hours', key: 'hrs', render: (v: number) => v ? `${v}h` : '—' },
    { title: 'إضافي', dataIndex: 'overtime_hours', key: 'ot', render: (v: number) => v ? <Tag color="blue">{v}h</Tag> : '—' },
    {
      title: 'الحالة', dataIndex: 'status', key: 'status',
      render: (v: string) => <Tag color={statusColor[v] ?? 'default'}>{v}</Tag>,
    },
  ];

  return (
    <div>
      <Card bordered={false} style={{ borderRadius: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Title level={5} style={{ margin: 0 }}>الحضور</Title>
          <Space>
            <DatePicker
              value={dayjs(date)}
              onChange={(d) => d && setDate(d.format('YYYY-MM-DD'))}
              allowClear={false}
            />
            <Button type="primary" style={{ background: '#52c41a', color: '#fff' }} onClick={checkIn}>تسجيل حضور</Button>
            <Button danger onClick={checkOut}>تسجيل انصراف</Button>
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

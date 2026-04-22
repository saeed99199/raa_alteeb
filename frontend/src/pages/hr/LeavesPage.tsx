import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { CheckOutlined, CloseOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type LeaveType = { id: number; name: string; name_ar: string; days_per_year: number; is_paid: boolean };
type LeaveRequest = {
  id: number;
  leave_type_id: number;
  start_date: string;
  end_date: string;
  days_count: number;
  reason?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  manager_notes?: string | null;
  employee?: { id: number; user?: { name: string } };
  leaveType?: LeaveType;
};

const statusColor: Record<string, string> = { pending: 'orange', approved: 'green', rejected: 'red' };
const statusLabel: Record<string, string> = { pending: 'قيد الانتظار', approved: 'موافق عليه', rejected: 'مرفوض' };

export default function LeavesPage() {
  const qc = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const user = useAuthStore((s) => s.user);
  const [form] = Form.useForm();
  const [reviewForm] = Form.useForm();
  const [openNew, setOpenNew] = useState(false);
  const [reviewing, setReviewing] = useState<LeaveRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected'>('approved');

  const canManage = hasPermission('hr.edit');

  const { data: leavesResp, isLoading } = useQuery({
    queryKey: ['leaves'],
    queryFn: () => api.get('/hr/leaves', { params: { per_page: 100 } }).then((r) => r.data),
  });

  const { data: typesResp } = useQuery({
    queryKey: ['leave-types'],
    queryFn: () => api.get('/hr/leaves/types').then((r) => r.data),
  });

  const leaves: LeaveRequest[] = leavesResp?.data ?? [];
  const leaveTypes: LeaveType[] = Array.isArray(typesResp) ? typesResp : (typesResp?.data ?? []);

  const storeMut = useMutation({
    mutationFn: (vals: any) =>
      api.post('/hr/leaves', {
        leave_type_id: vals.leave_type_id,
        start_date: vals.dates[0].format('YYYY-MM-DD'),
        end_date: vals.dates[1].format('YYYY-MM-DD'),
        reason: vals.reason,
      }),
    onSuccess: () => {
      message.success('تم تقديم الطلب');
      qc.invalidateQueries({ queryKey: ['leaves'] });
      setOpenNew(false);
      form.resetFields();
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'حدث خطأ'),
  });

  const reviewMut = useMutation({
    mutationFn: ({ id, status, notes }: { id: number; status: string; notes?: string }) =>
      api.patch(`/hr/leaves/${id}/review`, { status, manager_notes: notes }),
    onSuccess: () => {
      message.success('تم تحديث حالة الطلب');
      qc.invalidateQueries({ queryKey: ['leaves'] });
      setReviewing(null);
      reviewForm.resetFields();
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'حدث خطأ'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/hr/leaves/${id}`),
    onSuccess: () => {
      message.success('تم الحذف');
      qc.invalidateQueries({ queryKey: ['leaves'] });
    },
  });

  const columns = [
    ...(canManage
      ? [{ title: 'الموظف', dataIndex: ['employee', 'user', 'name'], key: 'emp', render: (v: any) => v ?? '-' }]
      : []),
    {
      title: 'نوع الإجازة',
      key: 'type',
      render: (_: any, r: LeaveRequest) => r.leaveType?.name_ar ?? r.leaveType?.name ?? '-',
    },
    { title: 'من', dataIndex: 'start_date', key: 'start' },
    { title: 'إلى', dataIndex: 'end_date', key: 'end' },
    { title: 'أيام', dataIndex: 'days_count', key: 'days', width: 70 },
    { title: 'السبب', dataIndex: 'reason', key: 'reason', render: (v: any) => v ?? '-' },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <Tag color={statusColor[s]}>{statusLabel[s] ?? s}</Tag>,
    },
    {
      title: 'ملاحظات المدير',
      dataIndex: 'manager_notes',
      key: 'notes',
      render: (v: any) => v ?? '-',
    },
    {
      title: 'إجراءات',
      key: 'actions',
      render: (_: any, r: LeaveRequest) => (
        <Space>
          {canManage && r.status === 'pending' && (
            <>
              <Button
                size="small"
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => { setReviewing(r); setReviewAction('approved'); reviewForm.resetFields(); }}
              >
                موافقة
              </Button>
              <Button
                size="small"
                danger
                icon={<CloseOutlined />}
                onClick={() => { setReviewing(r); setReviewAction('rejected'); reviewForm.resetFields(); }}
              >
                رفض
              </Button>
            </>
          )}
          {r.status === 'pending' && (
            <Popconfirm title="حذف الطلب؟" onConfirm={() => deleteMut.mutate(r.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>طلبات الإجازة</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setOpenNew(true); }}>
          طلب إجازة جديد
        </Button>
      </div>

      <Card>
        <Table
          dataSource={leaves}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      {/* New Request Modal */}
      <Modal
        open={openNew}
        title="تقديم طلب إجازة"
        onCancel={() => setOpenNew(false)}
        onOk={() => form.submit()}
        confirmLoading={storeMut.isPending}
        okText="تقديم"
        cancelText="إلغاء"
      >
        <Form form={form} layout="vertical" onFinish={(v) => storeMut.mutate(v)}>
          <Form.Item name="leave_type_id" label="نوع الإجازة" rules={[{ required: true, message: 'مطلوب' }]}>
            <Select
              placeholder="اختر نوع الإجازة"
              options={leaveTypes.map((t) => ({
                value: t.id,
                label: `${t.name_ar} (${t.days_per_year} يوم${t.is_paid ? ' - مدفوع' : ' - غير مدفوع'})`,
              }))}
            />
          </Form.Item>
          <Form.Item name="dates" label="الفترة" rules={[{ required: true, message: 'مطلوب' }]}>
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reason" label="السبب">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Review Modal */}
      <Modal
        open={!!reviewing}
        title={reviewAction === 'approved' ? 'الموافقة على الطلب' : 'رفض الطلب'}
        onCancel={() => setReviewing(null)}
        onOk={() => reviewForm.submit()}
        confirmLoading={reviewMut.isPending}
        okText={reviewAction === 'approved' ? 'موافقة' : 'رفض'}
        okButtonProps={{ danger: reviewAction === 'rejected' }}
        cancelText="إلغاء"
      >
        {reviewing && (
          <div style={{ marginBottom: 12 }}>
            <Text>
              الموظف: <strong>{reviewing.employee?.user?.name ?? '-'}</strong> |{' '}
              نوع: <strong>{reviewing.leaveType?.name_ar ?? '-'}</strong> |{' '}
              من <strong>{reviewing.start_date}</strong> إلى <strong>{reviewing.end_date}</strong>{' '}
              ({reviewing.days_count} يوم)
            </Text>
          </div>
        )}
        <Form
          form={reviewForm}
          layout="vertical"
          onFinish={(v) =>
            reviewing && reviewMut.mutate({ id: reviewing.id, status: reviewAction, notes: v.manager_notes })
          }
        >
          <Form.Item name="manager_notes" label="ملاحظات">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

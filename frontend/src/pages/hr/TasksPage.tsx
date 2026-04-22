import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
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
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const { Title } = Typography;

type TaskRecord = {
  id: number;
  assigned_to: number;
  title: string;
  description?: string | null;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date?: string | null;
  assignee?: {
    id: number;
    user?: { name: string; email: string };
  };
};

export default function TasksPage() {
  const qc = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TaskRecord | null>(null);

  const { data: tasksResp, isLoading } = useQuery({
    queryKey: ['employee-tasks'],
    queryFn: () => api.get('/hr/tasks', { params: { per_page: 100 } }).then((r) => r.data),
  });

  const canManageAll = hasPermission('tasks.manage_all');

  const { data: employeesResp } = useQuery({
    queryKey: ['employees-for-tasks'],
    enabled: canManageAll,
    queryFn: () => api.get('/hr/employees', { params: { per_page: 200 } }).then((r) => r.data),
  });

  const employees = employeesResp?.data ?? [];
  const employeeOptions = useMemo(
    () => employees.map((e: any) => ({ value: e.id, label: `${e.user?.name ?? '-'} (${e.employee_code})` })),
    [employees]
  );

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post('/hr/tasks', payload),
    onSuccess: () => {
      message.success('تم إضافة المهمة.');
      setOpen(false);
      setEditing(null);
      form.resetFields();
      qc.invalidateQueries({ queryKey: ['employee-tasks'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'فشل في إضافة المهمة.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => api.patch(`/hr/tasks/${id}`, payload),
    onSuccess: () => {
      message.success('تم تحديث المهمة.');
      setOpen(false);
      setEditing(null);
      form.resetFields();
      qc.invalidateQueries({ queryKey: ['employee-tasks'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'فشل في تحديث المهمة.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/hr/tasks/${id}`),
    onSuccess: () => {
      message.success('تم حذف المهمة.');
      qc.invalidateQueries({ queryKey: ['employee-tasks'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'فشل في حذف المهمة.'),
  });

  const tasks: TaskRecord[] = tasksResp?.data ?? [];

  const onCreate = () => {
    if (!canManageAll) return;
    setEditing(null);
    form.setFieldsValue({ status: 'todo', priority: 'medium' });
    setOpen(true);
  };

  const onEdit = (record: TaskRecord) => {
    if (!canManageAll) return;
    setEditing(record);
    form.setFieldsValue({
      assigned_to: record.assigned_to,
      title: record.title,
      description: record.description,
      status: record.status,
      priority: record.priority,
      due_date: record.due_date,
    });
    setOpen(true);
  };

  const onSubmit = (values: any) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload: values });
      return;
    }
    createMutation.mutate(values);
  };

  const columns = [
    { title: 'العنوان', dataIndex: 'title', key: 'title' },
    { title: 'المسؤول', key: 'assignee', render: (_: any, r: TaskRecord) => r.assignee?.user?.name || '-' },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => {
        const map: Record<string, { color: string; label: string }> = {
          todo: { color: 'default', label: 'قيد الانتظار' },
          in_progress: { color: 'blue', label: 'جاري' },
          review: { color: 'gold', label: 'مراجعة' },
          done: { color: 'green', label: 'منتهية' },
        };
        const cfg = map[value] || { color: 'default', label: value };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: 'الأولوية',
      dataIndex: 'priority',
      key: 'priority',
      render: (value: string) => <Tag color={value === 'high' ? 'red' : value === 'medium' ? 'orange' : 'green'}>{value}</Tag>,
    },
    { title: 'تاريخ الاستحقاق', dataIndex: 'due_date', key: 'due_date', render: (v: string) => v || '-' },
    {
      title: 'الإجراءات',
      key: 'actions',
      render: (_: any, r: TaskRecord) => (
        <Space>
          {canManageAll ? (
            <>
              <Button icon={<EditOutlined />} onClick={() => onEdit(r)} />
              <Popconfirm title="هل تريد حذف هذه المهمة؟" onConfirm={() => deleteMutation.mutate(r.id)}>
                <Button danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </>
          ) : (
            <Tag>قراءة فقط</Tag>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card bordered={false} style={{ borderRadius: 16 }}>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}>
          My Tasks
        </Title>
        {canManageAll ? (
          <Button type="primary" icon={<PlusOutlined />} onClick={onCreate} style={{ background: '#8B5E3C' }}>
            إضافة مهمة
          </Button>
        ) : null}
      </Space>

      <Table dataSource={tasks} columns={columns} rowKey="id" loading={isLoading} pagination={{ pageSize: 20 }} />

      <Modal
        title={editing ? 'تعديل مهمة' : 'إضافة مهمة'}
        open={open}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={onSubmit}>
          <Form.Item name="title" label="العنوان" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="assigned_to" label="المسؤول" rules={[{ required: true }]}>
            <Select options={employeeOptions} placeholder="اختر موظفاً" />
          </Form.Item>
          <Form.Item name="description" label="الوصف">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="status" label="الحالة" style={{ flex: 1 }}>
              <Select
                options={[
                  { label: 'قيد الانتظار', value: 'todo' },
                  { label: 'جاري', value: 'in_progress' },
                  { label: 'مراجعة', value: 'review' },
                  { label: 'منتهية', value: 'done' },
                ]}
              />
            </Form.Item>
            <Form.Item name="priority" label="الأولوية" style={{ flex: 1 }}>
              <Select
                options={[
                  { label: 'منخفضة', value: 'low' },
                  { label: 'متوسطة', value: 'medium' },
                  { label: 'عالية', value: 'high' },
                ]}
              />
            </Form.Item>
          </Space>
          <Form.Item name="due_date" label="تاريخ الاستحقاق">
            <Input placeholder="YYYY-MM-DD" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

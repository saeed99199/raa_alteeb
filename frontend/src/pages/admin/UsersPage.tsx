import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { EditOutlined } from '@ant-design/icons';
import api from '@/lib/api';

const { Title } = Typography;

type UserRecord = {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  roles?: { name: string; display_name?: string }[];
  branch?: { id: number; name: string } | null;
};

const ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'branch_manager', label: 'مدير فرع' },
  { value: 'hr_manager', label: 'مدير موارد بشرية' },
  { value: 'cashier', label: 'كاشير' },
  { value: 'inventory_manager', label: 'مدير مخزون' },
  { value: 'employee', label: 'موظف' },
];

export default function UsersPage() {
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const [editing, setEditing] = useState<UserRecord | null>(null);
  const [search, setSearch] = useState('');

  const { data: usersResp, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users', { params: { per_page: 100 } }).then((r) => r.data),
  });

  const { data: branchesResp } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get('/admin/branches').then((r) => r.data),
  });

  const users: UserRecord[] = usersResp?.data ?? [];
  const branches = branchesResp?.data ?? [];

  const filteredUsers = users.filter((u) =>
    !search ||
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const updateMut = useMutation({
    mutationFn: ({ id, ...vals }: any) => api.patch(`/admin/users/${id}`, vals),
    onSuccess: () => {
      message.success('تم التحديث');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setEditing(null);
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'حدث خطأ'),
  });

  const toggleMut = useMutation({
    mutationFn: (id: number) => api.post(`/admin/users/${id}/toggle-active`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'حدث خطأ'),
  });

  const openEdit = (u: UserRecord) => {
    setEditing(u);
    form.setFieldsValue({
      name: u.name,
      email: u.email,
      role: u.roles?.[0]?.name ?? undefined,
      branch_id: u.branch?.id ?? undefined,
    });
  };

  const columns = [
    { title: 'الاسم', dataIndex: 'name', key: 'name' },
    { title: 'البريد', dataIndex: 'email', key: 'email' },
    {
      title: 'الدور',
      key: 'role',
      render: (_: any, r: UserRecord) => {
        const role = r.roles?.[0]?.name ?? '-';
        return <Tag>{ROLES.find((x) => x.value === role)?.label ?? role}</Tag>;
      },
    },
    { title: 'الفرع', key: 'branch', render: (_: any, r: UserRecord) => r.branch?.name ?? '-' },
    {
      title: 'النشاط',
      key: 'active',
      render: (_: any, r: UserRecord) => (
        <Switch
          checked={r.is_active}
          loading={toggleMut.isPending}
          onChange={() => toggleMut.mutate(r.id)}
          checkedChildren="نشط"
          unCheckedChildren="معطل"
        />
      ),
    },
    {
      title: 'إجراءات',
      key: 'actions',
      render: (_: any, r: UserRecord) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>
          تعديل
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>إدارة المستخدمين</Title>
        <Input.Search
          placeholder="بحث بالاسم أو البريد..."
          style={{ width: 280 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
        />
      </div>

      <Card>
        <Table
          dataSource={filteredUsers}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Modal
        open={!!editing}
        title="تعديل المستخدم"
        onCancel={() => setEditing(null)}
        onOk={() => form.submit()}
        confirmLoading={updateMut.isPending}
        okText="حفظ"
        cancelText="إلغاء"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(vals) => editing && updateMut.mutate({ id: editing.id, ...vals })}
        >
          <Form.Item name="name" label="الاسم" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="البريد الإلكتروني" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="role" label="الدور">
            <Select options={ROLES} placeholder="اختر الدور" allowClear />
          </Form.Item>
          <Form.Item name="branch_id" label="الفرع">
            <Select
              options={branches.map((b: any) => ({ value: b.id, label: b.name }))}
              placeholder="اختر الفرع"
              allowClear
            />
          </Form.Item>
          <Form.Item name="password" label="كلمة المرور الجديدة (اتركها فارغة لعدم التغيير)">
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}


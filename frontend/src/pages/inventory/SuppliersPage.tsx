import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button, Card, Form, Input, Modal, Popconfirm, Space, Switch,
  Table, Tag, Typography, message,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const { Title } = Typography;

type SupplierRecord = {
  id: number;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  tax_number?: string | null;
  balance?: number;
  is_active: boolean;
};

export default function SuppliersPage() {
  const qc = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission('inventory.create');
  const canEdit = hasPermission('inventory.edit');
  const canDelete = hasPermission('inventory.delete');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierRecord | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', page, search],
    queryFn: () =>
      api.get('/inventory/suppliers', { params: { page, search, per_page: 20 } }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post('/inventory/suppliers', payload),
    onSuccess: () => {
      message.success('تم إضافة المورد بنجاح.');
      setOpen(false);
      form.resetFields();
      qc.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'فشل إضافة المورد.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      api.patch(`/inventory/suppliers/${id}`, payload),
    onSuccess: () => {
      message.success('تم تحديث المورد بنجاح.');
      setOpen(false);
      setEditing(null);
      form.resetFields();
      qc.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'فشل تحديث المورد.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/inventory/suppliers/${id}`),
    onSuccess: () => {
      message.success('تم حذف المورد.');
      qc.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'فشل حذف المورد.'),
  });

  const onCreate = () => {
    setEditing(null);
    form.setFieldsValue({ is_active: true });
    setOpen(true);
  };

  const onEdit = (record: SupplierRecord) => {
    setEditing(record);
    form.setFieldsValue({
      name: record.name,
      company: record.company,
      email: record.email,
      phone: record.phone,
      address: record.address,
      tax_number: record.tax_number,
      is_active: record.is_active,
    });
    setOpen(true);
  };

  const onSubmit = (values: any) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload: values });
    } else {
      createMutation.mutate({ ...values, is_active: values.is_active ?? true });
    }
  };

  const records: SupplierRecord[] = data?.data ?? [];

  return (
    <Card bordered={false} style={{ borderRadius: 16 }}>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} wrap>
        <Title level={5} style={{ margin: 0 }}>الموردون</Title>
        <Space>
          <Input.Search
            placeholder="بحث بالاسم أو الشركة أو الهاتف"
            allowClear
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ width: 260 }}
          />
          {canCreate && (
            <Button type="primary" icon={<PlusOutlined />} onClick={onCreate} style={{ background: '#8B5E3C' }}>
              إضافة مورد
            </Button>
          )}
        </Space>
      </Space>

      <Table
        dataSource={records}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          total: data?.total ?? 0,
          pageSize: data?.per_page ?? 20,
          onChange: setPage,
          showSizeChanger: false,
          showTotal: (total) => `إجمالي ${total} مورد`,
        }}
        scroll={{ x: 700 }}
        columns={[
          { title: 'الاسم', dataIndex: 'name', key: 'name' },
          { title: 'الشركة', dataIndex: 'company', key: 'company', render: (v) => v || '-' },
          { title: 'الهاتف', dataIndex: 'phone', key: 'phone', render: (v) => v || '-' },
          { title: 'البريد الإلكتروني', dataIndex: 'email', key: 'email', render: (v) => v || '-' },
          { title: 'الرقم الضريبي', dataIndex: 'tax_number', key: 'tax_number', render: (v) => v || '-' },
          {
            title: 'الحالة',
            dataIndex: 'is_active',
            key: 'is_active',
            render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'نشط' : 'غير نشط'}</Tag>,
          },
          {
            title: 'الإجراءات',
            key: 'actions',
            render: (_: any, r: SupplierRecord) => (
              <Space>
                {canEdit && <Button icon={<EditOutlined />} size="small" onClick={() => onEdit(r)} />}
                {canDelete && (
                  <Popconfirm title="هل أنت متأكد من حذف هذا المورد؟" okText="حذف" cancelText="إلغاء" onConfirm={() => deleteMutation.mutate(r.id)}>
                    <Button danger icon={<DeleteOutlined />} size="small" />
                  </Popconfirm>
                )}
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? 'تعديل المورد' : 'إضافة مورد جديد'}
        open={open}
        onCancel={() => { setOpen(false); setEditing(null); form.resetFields(); }}
        onOk={() => form.submit()}
        okText={editing ? 'حفظ التعديلات' : 'إضافة'}
        cancelText="إلغاء"
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={onSubmit} style={{ marginTop: 8 }}>
          <Form.Item name="name" label="الاسم" rules={[{ required: true, message: 'الاسم مطلوب' }]}>
            <Input placeholder="اسم المورد" />
          </Form.Item>
          <Form.Item name="company" label="الشركة">
            <Input placeholder="اسم الشركة" />
          </Form.Item>
          <Form.Item name="phone" label="الهاتف">
            <Input placeholder="رقم الهاتف" />
          </Form.Item>
          <Form.Item name="email" label="البريد الإلكتروني" rules={[{ type: 'email', message: 'بريد إلكتروني غير صحيح' }]}>
            <Input placeholder="example@email.com" />
          </Form.Item>
          <Form.Item name="address" label="العنوان">
            <Input.TextArea rows={2} placeholder="العنوان الكامل" />
          </Form.Item>
          <Form.Item name="tax_number" label="الرقم الضريبي">
            <Input placeholder="الرقم الضريبي" />
          </Form.Item>
          <Form.Item name="is_active" label="الحالة" valuePropName="checked">
            <Switch checkedChildren="نشط" unCheckedChildren="غير نشط" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ApartmentOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const { Title } = Typography;

type ProductRecord = {
  id: number;
  name: string;
  name_ar: string;
  unit?: string | null;
  sku: string;
  category_id: number | null;
  category?: { id: number; name: string };
  cost_price: number;
  sale_price: number;
  tax_rate: number;
  is_active: boolean;
  branch_stock?: number;
};

export default function ProductsPage() {
  const qc = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRecord | null>(null);
  const [form] = Form.useForm();

  const [adjustModal, setAdjustModal] = useState<ProductRecord | null>(null);
  const [adjustForm] = Form.useForm();

  const canCreate = hasPermission('inventory.create');
  const canEdit = hasPermission('inventory.edit');
  const canDelete = hasPermission('inventory.delete');

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search],
    queryFn: () =>
      api.get('/inventory/products', { params: { page, search, per_page: 20 } }).then((r) => r.data),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories-all'],
    queryFn: () => api.get('/inventory/categories', { params: { per_page: 200 } }).then((r) => r.data.data),
  });

  const categoryOptions = (categoriesData ?? []).map((c: any) => ({ value: c.id, label: c.name }));
  const unitOptions = [
    { value: 'اوقيه', label: 'اوقيه' },
    { value: 'ثمن كيلو', label: 'ثمن كيلو' },
    { value: 'ربع كيلو', label: 'ربع كيلو' },
    { value: 'نصف كيلو', label: 'نصف كيلو' },
    { value: 'كيلو', label: 'كيلو' },
  ];

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post('/inventory/products', payload),
    onSuccess: () => {
      message.success('تم إضافة المنتج.');
      setOpen(false);
      form.resetFields();
      qc.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'فشل في إضافة المنتج.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => api.patch(`/inventory/products/${id}`, payload),
    onSuccess: () => {
      message.success('تم تحديث المنتج.');
      setOpen(false);
      setEditing(null);
      form.resetFields();
      qc.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'فشل في تحديث المنتج.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/inventory/products/${id}`),
    onSuccess: () => {
      message.success('تم حذف المنتج.');
      qc.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'فشل في حذف المنتج.'),
  });

  const adjustMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      api.post(`/inventory/products/${id}/adjust-stock`, { ...payload, branch_id: user?.branch_id }),
    onSuccess: () => {
      message.success('تم تعديل المخزون.');
      setAdjustModal(null);
      adjustForm.resetFields();
      qc.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'فشل في تعديل المخزون.'),
  });

  const onCreate = () => {
    setEditing(null);
    form.setFieldsValue({ is_active: true, tax_rate: 15, cost_price: 0, sale_price: 0 });
    setOpen(true);
  };

  const onEdit = (record: ProductRecord) => {
    setEditing(record);
    form.setFieldsValue(record);
    setOpen(true);
  };

  const onSubmit = (values: any) => {
    // if English name not provided, use Arabic name as fallback
    if (!values.name) {
      values.name = values.name_ar;
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload: values });
      return;
    }
    createMutation.mutate(values);
  };

  const rows: ProductRecord[] = data?.data ?? [];

  const columns = [
    { title: 'الباركود', dataIndex: 'sku', key: 'sku' },
    {
      title: 'اسم المنتج',
      key: 'name',
      render: (_: any, r: ProductRecord) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.name_ar || r.name}</div>
          {r.name_ar && r.name && <div style={{ fontSize: 12, color: '#888' }}>{r.name}</div>}
          {r.unit && <div style={{ fontSize: 12, color: '#666' }}>الوحدة: {r.unit}</div>}
        </div>
      ),
    },
    { title: 'الفئة', key: 'cat', render: (_: any, r: ProductRecord) => r.category?.name || 'لا يوجد' },
    { title: 'سعر التكلفة', dataIndex: 'cost_price', key: 'cost', render: (v: number) => `${v} ر.س` },
    { title: 'سعر البيع', dataIndex: 'sale_price', key: 'sale', render: (v: number) => `${v} ر.س` },
    { title: 'الضريبة %', dataIndex: 'tax_rate', key: 'tax', render: (v: number) => `${v}%` },
    {
      title: 'المخزون',
      dataIndex: 'branch_stock',
      key: 'stock',
      render: (v: number) => (
        <Tag color={v > 10 ? 'green' : v > 0 ? 'orange' : 'red'}>{v ?? 0}</Tag>
      ),
    },
    {
      title: 'الحالة',
      dataIndex: 'is_active',
      key: 'status',
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'نشط' : 'معطل'}</Tag>,
    },
    {
      title: 'الإجراءات',
      key: 'actions',
      render: (_: any, r: ProductRecord) => (
        <Space>
          {canEdit && <Button icon={<EditOutlined />} onClick={() => onEdit(r)} />}
          {canEdit && (
            <Button
              icon={<ApartmentOutlined />}
              onClick={() => { setAdjustModal(r); adjustForm.resetFields(); }}
              title="تعديل المخزون"
            />
          )}
          {canDelete && (
            <Popconfirm title="هل تريد حذف هذا المنتج؟" onConfirm={() => deleteMutation.mutate(r.id)}>
              <Button danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card bordered={false} style={{ borderRadius: 16 }}>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}>
          المنتجات
        </Title>
        <Space>
          <Input.Search
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="بحث عن منتج..."
            allowClear
            style={{ width: 240 }}
          />
          {canCreate && (
            <Button type="primary" icon={<PlusOutlined />} onClick={onCreate} style={{ background: '#8B5E3C' }}>
              إضافة منتج
            </Button>
          )}
        </Space>
      </Space>

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={rows}
        columns={columns}
        pagination={{
          current: page,
          total: data?.total ?? 0,
          pageSize: data?.per_page ?? 20,
          onChange: setPage,
          showSizeChanger: false,
          showTotal: (total) => `إجمالي ${total} منتج`,
        }}
      />

      <Modal
        title={editing ? 'تعديل منتج' : 'إضافة منتج'}
        open={open}
        onCancel={() => { setOpen(false); setEditing(null); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={onSubmit} initialValues={{ is_active: true, tax_rate: 15 }}>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="name_ar" label="اسم المنتج (عربي)" style={{ flex: 1 }} rules={[{ required: true, message: 'أدخل الاسم العربي' }]}>
              <Input placeholder="مثال: دهن الخالديّة" dir="rtl" />
            </Form.Item>
            <Form.Item name="name" label="اسم المنتج (إنجليزي)" style={{ flex: 1 }}>
              <Input placeholder="e.g. Khalidiya Oud Oil" dir="ltr" />
            </Form.Item>
          </Space>
          <Form.Item name="sku" label="الباركود / SKU">
            <Input />
          </Form.Item>
          <Form.Item name="category_id" label="الفئة">
            <Select options={categoryOptions} allowClear placeholder="اختر الفئة" />
          </Form.Item>
          <Form.Item name="unit" label="الوحدة">
            <Select options={unitOptions} allowClear placeholder="اختر وحدة المنتج" />
          </Form.Item>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="cost_price" label="سعر التكلفة" style={{ flex: 1 }} rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: '100%' }} suffix="ر.س" />
            </Form.Item>
            <Form.Item name="sale_price" label="سعر البيع" style={{ flex: 1 }} rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: '100%' }} suffix="ر.س" />
            </Form.Item>
          </Space>
          <Form.Item name="tax_rate" label="نسبة الضريبة %">
            <InputNumber min={0} max={100} style={{ width: '100%' }} suffix="%" />
          </Form.Item>
          {!editing && (
            <Form.Item name="initial_stock" label="الكمية الابتدائية في المخزون">
              <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
            </Form.Item>
          )}
          <Form.Item name="description" label="الوصف">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="is_active" label="نشط" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`تعديل مخزون — ${adjustModal?.name_ar || adjustModal?.name || ''}`}
        open={!!adjustModal}
        onCancel={() => { setAdjustModal(null); adjustForm.resetFields(); }}
        onOk={() => adjustForm.submit()}
        confirmLoading={adjustMutation.isPending}
        okText="حفظ"
        cancelText="إلغاء"
      >
        <div style={{ background: '#f5f5f5', borderRadius: 8, padding: '10px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#555' }}>الكمية الحالية في المخزون</span>
          <Tag color={(adjustModal?.branch_stock ?? 0) > 10 ? 'green' : (adjustModal?.branch_stock ?? 0) > 0 ? 'orange' : 'red'} style={{ fontSize: 16, padding: '4px 14px' }}>
            {adjustModal?.branch_stock ?? 0}
          </Tag>
        </div>
        <Form
          form={adjustForm}
          layout="vertical"
          onFinish={(values) => adjustMutation.mutate({ id: adjustModal!.id, payload: values })}
        >
          <Form.Item name="type" label="نوع التعديل" rules={[{ required: true, message: 'اختر نوع التعديل' }]}>
            <Select
              placeholder="اختر نوع التعديل"
              options={[
                { label: '➕ إضافة إلى المخزون', value: 'add' },
                { label: '➖ خصم من المخزون', value: 'subtract' },
                { label: '📝 تعيين الكمية مباشرة', value: 'set' },
              ]}
            />
          </Form.Item>
          <Form.Item name="quantity" label="الكمية" rules={[{ required: true, message: 'أدخل الكمية' }]}>
            <InputNumber min={0} style={{ width: '100%' }} size="large" placeholder="0" />
          </Form.Item>
          <Form.Item name="note" label="ملاحظة (اختياري)">
            <Input.TextArea rows={2} placeholder="سبب التعديل..." />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

import { useMemo, useState } from 'react';
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
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import api from '@/lib/api';

const { Title } = Typography;

type Offer = {
  id: number;
  name: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  min_subtotal: number;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  starts_at: string | null;
  ends_at: string | null;
  branch_id: number | null;
  branch?: { id: number; name: string; code: string };
  is_active: boolean;
  notes?: string | null;
};

export default function OffersPage() {
  const qc = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [form] = Form.useForm();

  const { data: offersResponse, isLoading } = useQuery({
    queryKey: ['sales-offers'],
    queryFn: () => api.get('/sales/offers', { params: { per_page: 100 } }).then((r) => r.data),
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['meta-branches'],
    queryFn: () => api.get('/meta/branches').then((r) => r.data),
  });

  const branchOptions = useMemo(
    () => [
      { label: 'كل الفروع', value: null },
      ...(branches || []).filter((b: any) => b.is_active).map((b: any) => ({ label: `${b.name} (${b.code})`, value: b.id })),
    ],
    [branches]
  );

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post('/sales/offers', payload),
    onSuccess: () => {
      message.success('تم إنشاء العرض بنجاح.');
      setIsModalOpen(false);
      form.resetFields();
      qc.invalidateQueries({ queryKey: ['sales-offers'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'فشل إنشاء العرض.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => api.patch(`/sales/offers/${id}`, payload),
    onSuccess: () => {
      message.success('تم تحديث العرض بنجاح.');
      setEditingOffer(null);
      setIsModalOpen(false);
      form.resetFields();
      qc.invalidateQueries({ queryKey: ['sales-offers'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'فشل تحديث العرض.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/sales/offers/${id}`),
    onSuccess: () => {
      message.success('تم حذف العرض.');
      qc.invalidateQueries({ queryKey: ['sales-offers'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'فشل حذف العرض.'),
  });

  const records: Offer[] = offersResponse?.data || [];

  const onCreate = () => {
    setEditingOffer(null);
    form.resetFields();
    form.setFieldsValue({
      discount_type: 'percent',
      min_subtotal: 0,
      is_active: true,
      branch_id: null,
    });
    setIsModalOpen(true);
  };

  const onEdit = (record: Offer) => {
    setEditingOffer(record);
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      discount_type: record.discount_type,
      discount_value: Number(record.discount_value),
      min_subtotal: Number(record.min_subtotal || 0),
      max_discount: record.max_discount !== null ? Number(record.max_discount) : null,
      usage_limit: record.usage_limit,
      starts_at: record.starts_at ? record.starts_at.slice(0, 16) : null,
      ends_at: record.ends_at ? record.ends_at.slice(0, 16) : null,
      branch_id: record.branch_id,
      is_active: record.is_active,
      notes: record.notes,
    });
    setIsModalOpen(true);
  };

  const onSubmit = (values: any) => {
    const payload = {
      ...values,
      code: String(values.code || '').trim().toUpperCase(),
      starts_at: values.starts_at || null,
      ends_at: values.ends_at || null,
      max_discount: values.max_discount ?? null,
      usage_limit: values.usage_limit ?? null,
      branch_id: values.branch_id ?? null,
    };

    if (editingOffer) {
      updateMutation.mutate({ id: editingOffer.id, payload });
      return;
    }

    createMutation.mutate(payload);
  };

  return (
    <Card bordered={false} style={{ borderRadius: 16 }}>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}>العروض وأكواد الخصم</Title>
        <Button type="primary" icon={<PlusOutlined />} style={{ background: '#8B5E3C' }} onClick={onCreate}>
          إضافة عرض / كود
        </Button>
      </Space>

      <Table
        dataSource={records}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: 'الاسم', dataIndex: 'name', key: 'name' },
          { title: 'الكود', dataIndex: 'code', key: 'code', render: (v: string) => <Tag color="purple">{v}</Tag> },
          {
            title: 'نوع الخصم',
            dataIndex: 'discount_type',
            key: 'discount_type',
            render: (v: string) => (v === 'percent' ? 'نسبة مئوية' : 'مبلغ ثابت'),
          },
          {
            title: 'قيمة الخصم',
            key: 'discount_value',
            render: (_: any, r: Offer) => r.discount_type === 'percent'
              ? `${Number(r.discount_value).toFixed(2)}%`
              : `${Number(r.discount_value).toFixed(2)} ر.س`,
          },
          { title: 'الحد الأدنى', dataIndex: 'min_subtotal', key: 'min_subtotal', render: (v: number) => `${Number(v || 0).toFixed(2)} ر.س` },
          { title: 'الاستخدام', key: 'usage', render: (_: any, r: Offer) => `${r.used_count}/${r.usage_limit ?? '∞'}` },
          { title: 'الفرع', key: 'branch', render: (_: any, r: Offer) => r.branch?.name || 'كل الفروع' },
          { title: 'الحالة', dataIndex: 'is_active', key: 'is_active', render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'نشط' : 'موقوف'}</Tag> },
          {
            title: 'الإجراءات',
            key: 'actions',
            render: (_: any, r: Offer) => (
              <Space>
                <Button icon={<EditOutlined />} onClick={() => onEdit(r)} />
                <Popconfirm title="حذف العرض؟" onConfirm={() => deleteMutation.mutate(r.id)} okText="حذف" cancelText="إلغاء">
                  <Button danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editingOffer ? 'تعديل عرض / كود خصم' : 'إضافة عرض / كود خصم'}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingOffer(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText={editingOffer ? 'حفظ' : 'إضافة'}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={760}
      >
        <Form form={form} layout="vertical" onFinish={onSubmit}>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="name" label="اسم العرض" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item name="code" label="كود الخصم" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="مثل: EID25" />
            </Form.Item>
          </Space>

          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="discount_type" label="نوع الخصم" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select options={[{ label: 'نسبة مئوية', value: 'percent' }, { label: 'مبلغ ثابت', value: 'fixed' }]} />
            </Form.Item>
            <Form.Item name="discount_value" label="قيمة الخصم" rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber min={0.01} style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="min_subtotal" label="الحد الأدنى للطلب" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="max_discount" label="الحد الأعلى للخصم (اختياري)" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="usage_limit" label="حد الاستخدام (اختياري)" style={{ flex: 1 }}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="branch_id" label="الفرع" style={{ flex: 1 }}>
              <Select options={branchOptions} allowClear />
            </Form.Item>
          </Space>

          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="starts_at" label="بداية الصلاحية" style={{ flex: 1 }}>
              <Input type="datetime-local" />
            </Form.Item>
            <Form.Item name="ends_at" label="نهاية الصلاحية" style={{ flex: 1 }}>
              <Input type="datetime-local" />
            </Form.Item>
          </Space>

          <Form.Item name="notes" label="ملاحظات">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Form.Item name="is_active" label="الحالة" valuePropName="checked">
            <Switch checkedChildren="نشط" unCheckedChildren="موقوف" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

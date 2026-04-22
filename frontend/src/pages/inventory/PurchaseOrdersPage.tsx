import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, DatePicker, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const { Title } = Typography;

export default function PurchaseOrdersPage() {
	const qc = useQueryClient();
	const user = useAuthStore((s) => s.user);
	const hasPermission = useAuthStore((s) => s.hasPermission);
	const [open, setOpen] = useState(false);
	const [form] = Form.useForm();

	const canCreate = hasPermission('inventory.create');

	const { data, isLoading } = useQuery({
		queryKey: ['purchase-orders'],
		queryFn: () => api.get('/inventory/purchase-orders', { params: { per_page: 100 } }).then((r) => r.data),
	});

	const { data: suppliers = [] } = useQuery({
		queryKey: ['suppliers-all'],
		queryFn: () => api.get('/inventory/suppliers', { params: { per_page: 200 } }).then((r) => r.data.data),
	});

	const { data: products = [] } = useQuery({
		queryKey: ['products-all-po'],
		queryFn: () => api.get('/inventory/products', { params: { per_page: 300 } }).then((r) => r.data.data),
	});

	const supplierOptions = useMemo(
		() => (suppliers || []).map((s: any) => ({ value: s.id, label: s.name_ar || s.name })),
		[suppliers]
	);

	const productOptions = useMemo(
		() => (products || []).map((p: any) => ({
			value: p.id,
			label: `${p.name_ar || p.name} (${Number(p.cost_price || 0).toFixed(2)} ر.س)`,
			cost: Number(p.cost_price || 0),
		})),
		[products]
	);

	const createMutation = useMutation({
		mutationFn: (payload: any) => api.post('/inventory/purchase-orders', payload),
		onSuccess: () => {
			message.success('تم إنشاء أمر الشراء.');
			setOpen(false);
			form.resetFields();
			qc.invalidateQueries({ queryKey: ['purchase-orders'] });
		},
		onError: (err: any) => message.error(err?.response?.data?.message || 'فشل إنشاء أمر الشراء.'),
	});

	const onSubmit = (values: any) => {
		const payload = {
			supplier_id: values.supplier_id,
			branch_id: values.branch_id || user?.branch_id,
			expected_date: values.expected_date ? dayjs(values.expected_date).format('YYYY-MM-DD') : undefined,
			notes: values.notes,
			items: (values.items || []).map((i: any) => ({
				product_id: i.product_id,
				quantity_ordered: Number(i.quantity_ordered || 1),
				unit_cost: Number(i.unit_cost || 0),
			})),
		};
		createMutation.mutate(payload);
	};

	const rows = data?.data ?? [];

	const columns = [
		{ title: 'رقم الأمر', dataIndex: 'po_number', key: 'po_number' },
		{ title: 'المورد', dataIndex: 'supplier_name', key: 'supplier_name' },
		{ title: 'الفرع', dataIndex: 'branch_name', key: 'branch_name' },
		{
			title: 'الحالة',
			dataIndex: 'status',
			key: 'status',
			render: (v: string) => {
				const colorMap: any = { draft: 'default', ordered: 'blue', partial: 'orange', received: 'green', cancelled: 'red' };
				return <Tag color={colorMap[v] || 'default'}>{v}</Tag>;
			},
		},
		{ title: 'الإجمالي', dataIndex: 'total_amount', key: 'total', render: (v: number) => `${Number(v).toFixed(2)} ر.س` },
		{ title: 'تاريخ الإنشاء', dataIndex: 'created_at', key: 'created_at', render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
	];

	return (
		<Card bordered={false} style={{ borderRadius: 16 }}>
			<Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
				<Title level={5} style={{ margin: 0 }}>أوامر الشراء</Title>
				{canCreate && (
					<Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)} style={{ background: '#8B5E3C' }}>
						أمر شراء جديد
					</Button>
				)}
			</Space>

			<Table
				rowKey="id"
				loading={isLoading}
				dataSource={rows}
				columns={columns}
				pagination={{ pageSize: 20, showSizeChanger: false }}
			/>

			<Modal
				title="إنشاء أمر شراء"
				open={open}
				onCancel={() => { setOpen(false); form.resetFields(); }}
				onOk={() => form.submit()}
				confirmLoading={createMutation.isPending}
				width={760}
			>
				<Form form={form} layout="vertical" onFinish={onSubmit} initialValues={{ items: [{ quantity_ordered: 1 }] }}>
					<Form.Item name="supplier_id" label="المورد" rules={[{ required: true, message: 'اختر المورد' }]}>
						<Select options={supplierOptions} placeholder="اختر المورد" showSearch optionFilterProp="label" />
					</Form.Item>
					<Form.Item name="expected_date" label="تاريخ التوريد المتوقع">
						<DatePicker style={{ width: '100%' }} />
					</Form.Item>

					<Form.List name="items">
						{(fields, { add, remove }) => (
							<Space direction="vertical" style={{ width: '100%' }} size={8}>
								{fields.map((field) => (
									<Space key={field.key} style={{ display: 'flex' }} align="start">
										<Form.Item
											{...field}
											name={[field.name, 'product_id']}
											label="المنتج"
											rules={[{ required: true, message: 'اختر المنتج' }]}
											style={{ width: 330 }}
										>
											<Select
												options={productOptions}
												showSearch
												optionFilterProp="label"
												placeholder="اختر المنتج"
												onChange={(value) => {
													const selected = productOptions.find((p: any) => p.value === value);
													form.setFieldValue(['items', field.name, 'unit_cost'], selected?.cost ?? 0);
												}}
											/>
										</Form.Item>
										<Form.Item
											{...field}
											name={[field.name, 'quantity_ordered']}
											label="الكمية"
											rules={[{ required: true }]}
											style={{ width: 120 }}
										>
											<InputNumber min={1} style={{ width: '100%' }} />
										</Form.Item>
										<Form.Item
											{...field}
											name={[field.name, 'unit_cost']}
											label="تكلفة الوحدة"
											rules={[{ required: true }]}
											style={{ width: 140 }}
										>
											<InputNumber min={0} style={{ width: '100%' }} />
										</Form.Item>
										<Button danger style={{ marginTop: 30 }} onClick={() => remove(field.name)}>حذف</Button>
									</Space>
								))}
								<Button onClick={() => add({ quantity_ordered: 1, unit_cost: 0 })}>إضافة منتج</Button>
							</Space>
						)}
					</Form.List>

					<Form.Item name="notes" label="ملاحظات" style={{ marginTop: 12 }}>
						<Input.TextArea rows={2} />
					</Form.Item>
				</Form>
			</Modal>
		</Card>
	);
}

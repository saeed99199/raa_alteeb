import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const { Title } = Typography;

export default function StockTransfersPage() {
	const qc = useQueryClient();
	const hasPermission = useAuthStore((s) => s.hasPermission);
	const user = useAuthStore((s) => s.user);
	const [open, setOpen] = useState(false);
	const [form] = Form.useForm();

	const canCreate = hasPermission('inventory.create');

	const { data, isLoading } = useQuery({
		queryKey: ['stock-transfers'],
		queryFn: () => api.get('/inventory/stock-transfers', { params: { per_page: 100 } }).then((r) => r.data),
	});

	const { data: branches = [] } = useQuery({
		queryKey: ['meta-branches-transfer'],
		queryFn: () => api.get('/meta/branches').then((r) => r.data),
	});

	const { data: products = [] } = useQuery({
		queryKey: ['products-all-transfer'],
		queryFn: () => api.get('/inventory/products', { params: { per_page: 300 } }).then((r) => r.data.data),
	});

	const branchOptions = useMemo(
		() => (branches || []).filter((b: any) => b.is_active).map((b: any) => ({ value: b.id, label: `${b.name} (${b.code})` })),
		[branches]
	);

	const productOptions = useMemo(
		() => (products || []).map((p: any) => ({ value: p.id, label: p.name_ar || p.name })),
		[products]
	);

	const createMutation = useMutation({
		mutationFn: (payload: any) => api.post('/inventory/stock-transfers', payload),
		onSuccess: () => {
			message.success('تم إنشاء تحويل مخزون.');
			setOpen(false);
			form.resetFields();
			qc.invalidateQueries({ queryKey: ['stock-transfers'] });
		},
		onError: (err: any) => message.error(err?.response?.data?.message || 'فشل إنشاء التحويل.'),
	});

	const onSubmit = (values: any) => {
		createMutation.mutate({
			from_branch_id: values.from_branch_id,
			to_branch_id: values.to_branch_id,
			notes: values.notes,
			items: (values.items || []).map((i: any) => ({
				product_id: i.product_id,
				quantity: Number(i.quantity || 1),
			})),
		});
	};

	const rows = data?.data ?? [];

	const columns = [
		{ title: 'رقم التحويل', dataIndex: 'transfer_number', key: 'transfer_number' },
		{ title: 'من فرع', dataIndex: 'from_branch_name', key: 'from_branch_name' },
		{ title: 'إلى فرع', dataIndex: 'to_branch_name', key: 'to_branch_name' },
		{
			title: 'الحالة',
			dataIndex: 'status',
			key: 'status',
			render: (v: string) => {
				const colorMap: any = { pending: 'orange', approved: 'blue', in_transit: 'purple', completed: 'green', rejected: 'red' };
				return <Tag color={colorMap[v] || 'default'}>{v}</Tag>;
			},
		},
		{ title: 'المنشئ', dataIndex: 'requested_by_name', key: 'requested_by_name' },
		{ title: 'التاريخ', dataIndex: 'created_at', key: 'created_at', render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
	];

	return (
		<Card bordered={false} style={{ borderRadius: 16 }}>
			<Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
				<Title level={5} style={{ margin: 0 }}>تحويلات المخزون</Title>
				{canCreate && (
					<Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)} style={{ background: '#8B5E3C' }}>
						تحويل جديد
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
				title="إنشاء تحويل مخزون"
				open={open}
				onCancel={() => { setOpen(false); form.resetFields(); }}
				onOk={() => form.submit()}
				confirmLoading={createMutation.isPending}
				width={760}
			>
				<Form
					form={form}
					layout="vertical"
					onFinish={onSubmit}
					initialValues={{ from_branch_id: user?.branch_id, items: [{ quantity: 1 }] }}
				>
					<Space style={{ width: '100%' }} size={12}>
						<Form.Item name="from_branch_id" label="من فرع" style={{ flex: 1 }} rules={[{ required: true }]}>
							<Select options={branchOptions} placeholder="اختر الفرع المصدر" />
						</Form.Item>
						<Form.Item name="to_branch_id" label="إلى فرع" style={{ flex: 1 }} rules={[{ required: true }]}>
							<Select options={branchOptions} placeholder="اختر الفرع المستهدف" />
						</Form.Item>
					</Space>

					<Form.List name="items">
						{(fields, { add, remove }) => (
							<Space direction="vertical" style={{ width: '100%' }} size={8}>
								{fields.map((field) => (
									<Space key={field.key} style={{ display: 'flex' }} align="start">
										<Form.Item
											{...field}
											name={[field.name, 'product_id']}
											label="المنتج"
											rules={[{ required: true }]}
											style={{ width: 430 }}
										>
											<Select options={productOptions} showSearch optionFilterProp="label" placeholder="اختر المنتج" />
										</Form.Item>
										<Form.Item
											{...field}
											name={[field.name, 'quantity']}
											label="الكمية"
											rules={[{ required: true }]}
											style={{ width: 140 }}
										>
											<InputNumber min={1} style={{ width: '100%' }} />
										</Form.Item>
										<Button danger style={{ marginTop: 30 }} onClick={() => remove(field.name)}>حذف</Button>
									</Space>
								))}
								<Button onClick={() => add({ quantity: 1 })}>إضافة منتج</Button>
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

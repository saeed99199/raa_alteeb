import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const { Title } = Typography;

export default function RefundsPage() {
	const qc = useQueryClient();
	const hasPermission = useAuthStore((s) => s.hasPermission);
	const [open, setOpen] = useState(false);
	const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
	const [form] = Form.useForm();

	const canCreate = hasPermission('sales.refund');

	const { data, isLoading } = useQuery({
		queryKey: ['refunds'],
		queryFn: () => api.get('/refunds', { params: { per_page: 100 } }).then((r) => r.data),
	});

	const { data: salesData } = useQuery({
		queryKey: ['sales-for-refunds'],
		queryFn: () => api.get('/sales', { params: { per_page: 200 } }).then((r) => r.data),
	});

	const { data: saleDetails } = useQuery({
		queryKey: ['sale-refund-details', selectedSaleId],
		queryFn: () => api.get(`/sales/${selectedSaleId}`).then((r) => r.data),
		enabled: !!selectedSaleId,
	});

	const salesOptions = (salesData?.data ?? []).map((s: any) => ({
		value: s.id,
		label: `${s.invoice_number} - ${Number(s.total_amount).toFixed(2)} ر.س`,
	}));

	const createMutation = useMutation({
		mutationFn: (payload: any) => api.post('/refunds', payload),
		onSuccess: () => {
			message.success('تم تسجيل المرتجع.');
			setOpen(false);
			setSelectedSaleId(null);
			form.resetFields();
			qc.invalidateQueries({ queryKey: ['refunds'] });
			qc.invalidateQueries({ queryKey: ['sales-list'] });
		},
		onError: (err: any) => message.error(err?.response?.data?.message || 'فشل تسجيل المرتجع.'),
	});

	const onSubmit = (values: any) => {
		createMutation.mutate({
			sale_id: values.sale_id,
			reason: values.reason,
			method: values.method,
			items: (values.items || []).map((i: any) => ({
				sale_item_id: i.sale_item_id,
				quantity: Number(i.quantity || 1),
			})),
		});
	};

	const rows = data?.data ?? [];

	const columns = [
		{ title: 'رقم المرتجع', dataIndex: 'refund_number', key: 'refund_number' },
		{ title: 'رقم الفاتورة', key: 'invoice', render: (_: any, r: any) => r.sale?.invoice_number || '-' },
		{ title: 'المبلغ', dataIndex: 'refund_amount', key: 'refund_amount', render: (v: number) => `${Number(v).toFixed(2)} ر.س` },
		{
			title: 'طريقة الإرجاع',
			dataIndex: 'method',
			key: 'method',
			render: (v: string) => {
				const map: any = { cash: 'نقدي', card: 'بطاقة', bank_transfer: 'تحويل', store_credit: 'رصيد متجر' };
				return <Tag>{map[v] || v}</Tag>;
			},
		},
		{ title: 'السبب', dataIndex: 'reason', key: 'reason' },
		{ title: 'التاريخ', dataIndex: 'created_at', key: 'created_at', render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
	];

	const saleItemOptions = (saleDetails?.items ?? []).map((item: any) => ({
		value: item.id,
		label: `${item.product_name} (الكمية: ${item.quantity})`,
		maxQty: item.quantity,
	}));

	return (
		<Card bordered={false} style={{ borderRadius: 16 }}>
			<Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
				<Title level={5} style={{ margin: 0 }}>المرتجعات</Title>
				{canCreate && (
					<Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)} style={{ background: '#8B5E3C' }}>
						مرتجع جديد
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
				title="إنشاء مرتجع"
				open={open}
				onCancel={() => { setOpen(false); setSelectedSaleId(null); form.resetFields(); }}
				onOk={() => form.submit()}
				confirmLoading={createMutation.isPending}
				width={760}
			>
				<Form form={form} layout="vertical" onFinish={onSubmit} initialValues={{ method: 'cash', items: [{ quantity: 1 }] }}>
					<Form.Item name="sale_id" label="الفاتورة" rules={[{ required: true, message: 'اختر الفاتورة' }]}>
						<Select
							options={salesOptions}
							showSearch
							optionFilterProp="label"
							placeholder="اختر فاتورة"
							onChange={(v) => {
								setSelectedSaleId(v);
								form.setFieldValue('items', [{ quantity: 1 }]);
							}}
						/>
					</Form.Item>

					<Space style={{ width: '100%' }} size={12}>
						<Form.Item name="method" label="طريقة الإرجاع" style={{ flex: 1 }} rules={[{ required: true }]}>
							<Select
								options={[
									{ value: 'cash', label: 'نقدي' },
									{ value: 'card', label: 'بطاقة' },
									{ value: 'bank_transfer', label: 'تحويل بنكي' },
									{ value: 'store_credit', label: 'رصيد متجر' },
								]}
							/>
						</Form.Item>
						<Form.Item name="reason" label="سبب الإرجاع" style={{ flex: 2 }} rules={[{ required: true }]}>
							<Input placeholder="سبب المرتجع" />
						</Form.Item>
					</Space>

					<Form.List name="items">
						{(fields, { add, remove }) => (
							<Space direction="vertical" style={{ width: '100%' }} size={8}>
								{fields.map((field) => (
									<Space key={field.key} style={{ display: 'flex' }} align="start">
										<Form.Item
											{...field}
											name={[field.name, 'sale_item_id']}
											label="منتج الفاتورة"
											rules={[{ required: true }]}
											style={{ width: 440 }}
										>
											<Select options={saleItemOptions} showSearch optionFilterProp="label" placeholder="اختر منتج" />
										</Form.Item>
										<Form.Item
											{...field}
											name={[field.name, 'quantity']}
											label="كمية الإرجاع"
											rules={[{ required: true }]}
											style={{ width: 160 }}
										>
											<InputNumber min={1} style={{ width: '100%' }} />
										</Form.Item>
										<Button danger style={{ marginTop: 30 }} onClick={() => remove(field.name)}>حذف</Button>
									</Space>
								))}
								<Button onClick={() => add({ quantity: 1 })} disabled={!selectedSaleId}>إضافة عنصر مرتجع</Button>
							</Space>
						)}
					</Form.List>
				</Form>
			</Modal>
		</Card>
	);
}

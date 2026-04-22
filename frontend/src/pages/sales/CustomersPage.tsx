import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
	Button,
	Card,
	Form,
	Input,
	Modal,
	Popconfirm,
	Space,
	Table,
	Typography,
	message,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import api from '@/lib/api';

const { Title } = Typography;

type CustomerRecord = {
	id: number;
	name: string;
	email?: string | null;
	phone?: string | null;
	address?: string | null;
};

export default function CustomersPage() {
	const qc = useQueryClient();
	const [search, setSearch] = useState('');
	const [page, setPage] = useState(1);
	const [open, setOpen] = useState(false);
	const [editing, setEditing] = useState<CustomerRecord | null>(null);
	const [form] = Form.useForm();

	const { data, isLoading } = useQuery({
		queryKey: ['customers', page, search],
		queryFn: () =>
			api
				.get('/customers', {
					params: { page, search, per_page: 20 },
				})
				.then((r) => r.data),
	});

	const createMutation = useMutation({
		mutationFn: (payload: any) => api.post('/customers', payload),
		onSuccess: () => {
			message.success('تم إضافة العميل.');
			setOpen(false);
			form.resetFields();
			qc.invalidateQueries({ queryKey: ['customers'] });
		},
		onError: (err: any) => message.error(err?.response?.data?.message || 'فشل إضافة العميل.'),
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, payload }: { id: number; payload: any }) => api.patch(`/customers/${id}`, payload),
		onSuccess: () => {
			message.success('تم تحديث بيانات العميل.');
			setOpen(false);
			setEditing(null);
			form.resetFields();
			qc.invalidateQueries({ queryKey: ['customers'] });
		},
		onError: (err: any) => message.error(err?.response?.data?.message || 'فشل تحديث العميل.'),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: number) => api.delete(`/customers/${id}`),
		onSuccess: () => {
			message.success('تم حذف العميل.');
			qc.invalidateQueries({ queryKey: ['customers'] });
		},
		onError: (err: any) => message.error(err?.response?.data?.message || 'فشل حذف العميل.'),
	});

	const onCreate = () => {
		setEditing(null);
		form.resetFields();
		setOpen(true);
	};

	const onEdit = (record: CustomerRecord) => {
		setEditing(record);
		form.setFieldsValue(record);
		setOpen(true);
	};

	const onSubmit = (values: any) => {
		if (editing) {
			updateMutation.mutate({ id: editing.id, payload: values });
			return;
		}
		createMutation.mutate(values);
	};

	const records: CustomerRecord[] = data?.data ?? [];

	return (
		<Card bordered={false} style={{ borderRadius: 16 }}>
			<Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
				<Title level={5} style={{ margin: 0 }}>
					العملاء
				</Title>
				<Space>
					<Input.Search
						placeholder="بحث بالاسم أو الهاتف"
						allowClear
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							setPage(1);
						}}
						style={{ width: 260 }}
					/>
					<Button type="primary" icon={<PlusOutlined />} onClick={onCreate} style={{ background: '#15315f' }}>
						إضافة عميل
					</Button>
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
				}}
				columns={[
					{ title: 'الاسم', dataIndex: 'name', key: 'name' },
					{ title: 'البريد الإلكتروني', dataIndex: 'email', key: 'email', render: (v: string) => v || '-' },
					{ title: 'الهاتف', dataIndex: 'phone', key: 'phone', render: (v: string) => v || '-' },
					{ title: 'العنوان', dataIndex: 'address', key: 'address', render: (v: string) => v || '-' },
					{
						title: 'الإجراءات',
						key: 'actions',
						render: (_: any, r: CustomerRecord) => (
							<Space>
								<Button icon={<EditOutlined />} onClick={() => onEdit(r)} />
								<Popconfirm title="هل تريد حذف هذا العميل؟" onConfirm={() => deleteMutation.mutate(r.id)}>
									<Button danger icon={<DeleteOutlined />} />
								</Popconfirm>
							</Space>
						),
					},
				]}
			/>

			<Modal
				title={editing ? 'تعديل العميل' : 'إضافة عميل'}
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
					<Form.Item name="name" label="الاسم" rules={[{ required: true }]}>
						<Input />
					</Form.Item>
					<Form.Item name="email" label="البريد الإلكتروني" rules={[{ type: 'email' }]}>
						<Input />
					</Form.Item>
					<Form.Item name="phone" label="الهاتف">
						<Input />
					</Form.Item>
					<Form.Item name="address" label="العنوان">
						<Input.TextArea rows={2} />
					</Form.Item>
				</Form>
			</Modal>
		</Card>
	);
}

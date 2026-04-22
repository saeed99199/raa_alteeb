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
	Switch,
	Table,
	Tag,
	Typography,
	message,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import api from '@/lib/api';

const { Title } = Typography;

type BranchRecord = {
	id: number;
	name: string;
	name_ar?: string | null;
	code: string;
	city?: string | null;
	phone?: string | null;
	email?: string | null;
	address?: string | null;
	commercial_register?: string | null;
	vat_number?: string | null;
	is_active: boolean;
};

export default function BranchesPage() {
	const qc = useQueryClient();
	const [search, setSearch] = useState('');
	const [page, setPage] = useState(1);
	const [open, setOpen] = useState(false);
	const [editing, setEditing] = useState<BranchRecord | null>(null);
	const [form] = Form.useForm();

	const { data, isLoading } = useQuery({
		queryKey: ['admin-branches', page, search],
		queryFn: () =>
			api
				.get('/admin/branches', {
					params: { page, search, per_page: 20 },
				})
				.then((r) => r.data),
	});

	const createMutation = useMutation({
		mutationFn: (payload: any) => api.post('/admin/branches', payload),
		onSuccess: () => {
			message.success('تم إضافة الفرع.');
			setOpen(false);
			form.resetFields();
			qc.invalidateQueries({ queryKey: ['admin-branches'] });
			qc.invalidateQueries({ queryKey: ['meta-branches'] });
		},
		onError: (err: any) => message.error(err?.response?.data?.message || 'فشل في إضافة الفرع.'),
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, payload }: { id: number; payload: any }) => api.patch(`/admin/branches/${id}`, payload),
		onSuccess: () => {
			message.success('تم تحديث الفرع.');
			setOpen(false);
			setEditing(null);
			form.resetFields();
			qc.invalidateQueries({ queryKey: ['admin-branches'] });
			qc.invalidateQueries({ queryKey: ['meta-branches'] });
		},
		onError: (err: any) => message.error(err?.response?.data?.message || 'فشل في تحديث الفرع.'),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: number) => api.delete(`/admin/branches/${id}`),
		onSuccess: () => {
			message.success('تم حذف الفرع.');
			qc.invalidateQueries({ queryKey: ['admin-branches'] });
			qc.invalidateQueries({ queryKey: ['meta-branches'] });
		},
		onError: (err: any) => message.error(err?.response?.data?.message || 'فشل في حذف الفرع.'),
	});

	const onCreate = () => {
		setEditing(null);
		form.setFieldsValue({ is_active: true });
		setOpen(true);
	};

	const onEdit = (record: BranchRecord) => {
		setEditing(record);
		form.setFieldsValue(record);
		setOpen(true);
	};

	const onSubmit = (values: any) => {
		const payload = {
			...values,
			is_active: values.is_active ?? true,
		};
		if (editing) {
			updateMutation.mutate({ id: editing.id, payload });
			return;
		}
		createMutation.mutate(payload);
	};

	const rows: BranchRecord[] = data?.data ?? [];

	return (
		<Card bordered={false} style={{ borderRadius: 16 }}>
			<Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
				<Title level={5} style={{ margin: 0 }}>
					Branches
				</Title>
				<Space>
					<Input.Search
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							setPage(1);
						}}
						placeholder="بحث عن فرع"
						allowClear
						style={{ width: 240 }}
					/>
					<Button type="primary" icon={<PlusOutlined />} onClick={onCreate} style={{ background: '#8B5E3C' }}>
						إضافة فرع
					</Button>
				</Space>
			</Space>

			<Table
				rowKey="id"
				loading={isLoading}
				dataSource={rows}
				pagination={{
					current: page,
					total: data?.total ?? 0,
					pageSize: data?.per_page ?? 20,
					onChange: setPage,
					showSizeChanger: false,
				}}
				columns={[
					{ title: 'الكود', dataIndex: 'code', key: 'code' },
					{ title: 'الاسم', dataIndex: 'name', key: 'name' },
					{ title: 'الاسم (عربي)', dataIndex: 'name_ar', key: 'name_ar', render: (v: string) => v || '-' },
					{ title: 'المدينة', dataIndex: 'city', key: 'city', render: (v: string) => v || '-' },
					{ title: 'الهاتف', dataIndex: 'phone', key: 'phone', render: (v: string) => v || '-' },
					{ title: 'البريد', dataIndex: 'email', key: 'email', render: (v: string) => v || '-' },
					{ title: 'السجل التجاري', dataIndex: 'commercial_register', key: 'commercial_register', render: (v: string) => v || '-' },
					{ title: 'الرقم الضريبي', dataIndex: 'vat_number', key: 'vat_number', render: (v: string) => v || '-' },
					{
						title: 'الحالة',
						dataIndex: 'is_active',
						key: 'status',
						render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'نشط' : 'معطل'}</Tag>,
					},
					{
						title: 'الإجراءات',
						key: 'actions',
						render: (_: any, r: BranchRecord) => (
							<Space>
								<Button icon={<EditOutlined />} onClick={() => onEdit(r)} />
								<Popconfirm title="هل تريد حذف هذا الفرع؟" onConfirm={() => deleteMutation.mutate(r.id)}>
									<Button danger icon={<DeleteOutlined />} />
								</Popconfirm>
							</Space>
						),
					},
				]}
			/>

			<Modal
				title={editing ? 'تعديل فرع' : 'إضافة فرع'}
				open={open}
				onCancel={() => {
					setOpen(false);
					setEditing(null);
					form.resetFields();
				}}
				onOk={() => form.submit()}
				confirmLoading={createMutation.isPending || updateMutation.isPending}
			>
				<Form form={form} layout="vertical" onFinish={onSubmit} initialValues={{ is_active: true }}>
					<Form.Item name="code" label="الكود" rules={[{ required: true }]}>
						<Input placeholder="MAIN" />
					</Form.Item>
					<Form.Item name="name" label="الاسم" rules={[{ required: true }]}>
						<Input />
					</Form.Item>
					<Form.Item name="name_ar" label="الاسم (عربي)">
						<Input dir="rtl" />
					</Form.Item>
					<Form.Item name="city" label="المدينة">
						<Input />
					</Form.Item>
					<Form.Item name="phone" label="الهاتف">
						<Input />
					</Form.Item>
					<Form.Item name="email" label="البريد الإلكتروني" rules={[{ type: 'email' }]}>
						<Input />
					</Form.Item>
					<Form.Item name="commercial_register" label="رقم السجل التجاري">
						<Input placeholder="1010XXXXXX" />
					</Form.Item>
					<Form.Item name="vat_number" label="الرقم الضريبي">
						<Input placeholder="3XXXXXXXXXXXXXX" />
					</Form.Item>
					<Form.Item name="address" label="العنوان">
						<Input.TextArea rows={2} />
					</Form.Item>
					<Form.Item name="is_active" label="نشط" valuePropName="checked">
						<Switch />
					</Form.Item>
				</Form>
			</Modal>
		</Card>
	);
}

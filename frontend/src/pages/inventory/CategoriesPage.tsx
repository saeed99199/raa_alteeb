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
	Switch,
	Table,
	Tag,
	Typography,
	message,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import api from '@/lib/api';

const { Title } = Typography;

type CategoryRecord = {
	id: number;
	name: string;
	name_ar?: string | null;
	parent_id?: number | null;
	is_active: boolean;
};

export default function CategoriesPage() {
	const qc = useQueryClient();
	const [search, setSearch] = useState('');
	const [page, setPage] = useState(1);
	const [open, setOpen] = useState(false);
	const [editing, setEditing] = useState<CategoryRecord | null>(null);
	const [form] = Form.useForm();

	const { data, isLoading } = useQuery({
		queryKey: ['inventory-categories', page, search],
		queryFn: () =>
			api
				.get('/inventory/categories', {
					params: { page, search, per_page: 20 },
				})
				.then((r) => r.data),
	});

	const { data: allData } = useQuery({
		queryKey: ['inventory-categories-all'],
		queryFn: () => api.get('/inventory/categories', { params: { per_page: 200 } }).then((r) => r.data),
	});

	const createMutation = useMutation({
		mutationFn: (payload: any) => api.post('/inventory/categories', payload),
		onSuccess: () => {
			message.success('تم إضافة الفئة بنجاح.');
			setOpen(false);
			form.resetFields();
			qc.invalidateQueries({ queryKey: ['inventory-categories'] });
			qc.invalidateQueries({ queryKey: ['inventory-categories-all'] });
		},
		onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to add category.'),
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, payload }: { id: number; payload: any }) => api.patch(`/inventory/categories/${id}`, payload),
		onSuccess: () => {
			message.success('تم تحديث الفئة بنجاح.');
			setOpen(false);
			setEditing(null);
			form.resetFields();
			qc.invalidateQueries({ queryKey: ['inventory-categories'] });
			qc.invalidateQueries({ queryKey: ['inventory-categories-all'] });
		},
		onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to update category.'),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: number) => api.delete(`/inventory/categories/${id}`),
		onSuccess: () => {
			message.success('تم حذف الفئة.');
			qc.invalidateQueries({ queryKey: ['inventory-categories'] });
			qc.invalidateQueries({ queryKey: ['inventory-categories-all'] });
		},
		onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to delete category.'),
	});

	const allCategories: CategoryRecord[] = allData?.data ?? [];
	const parentOptions = useMemo(
		() =>
			allCategories
				.filter((c) => !editing || c.id !== editing.id)
				.map((c) => ({ value: c.id, label: c.name })),
		[allCategories, editing]
	);

	const onCreate = () => {
		setEditing(null);
		form.setFieldsValue({ is_active: true });
		setOpen(true);
	};

	const onEdit = (record: CategoryRecord) => {
		setEditing(record);
		form.setFieldsValue({
			name: record.name,
			name_ar: record.name_ar,
			parent_id: record.parent_id,
			is_active: record.is_active,
		});
		setOpen(true);
	};

	const onSubmit = (values: any) => {
		const payload = {
			...values,
			parent_id: values.parent_id || null,
			is_active: values.is_active ?? true,
		};
		if (editing) {
			updateMutation.mutate({ id: editing.id, payload });
			return;
		}
		createMutation.mutate(payload);
	};

	const records: CategoryRecord[] = data?.data ?? [];

	return (
		<Card bordered={false} style={{ borderRadius: 16 }}>
			<Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
				<Title level={5} style={{ margin: 0 }}>
					الفئات
				</Title>
				<Space>
					<Input.Search
						placeholder="بحث في الفئات"
						allowClear
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							setPage(1);
						}}
						style={{ width: 240 }}
					/>
					<Button type="primary" icon={<PlusOutlined />} onClick={onCreate} style={{ background: '#15315f' }}>
						إضافة فئة
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
					{ title: 'الاسم بالعربي', dataIndex: 'name_ar', key: 'name_ar', render: (v: string) => v || '-' },
					{
						title: 'الفئة الأب',
						key: 'parent_id',
						render: (_: any, r: CategoryRecord) => allCategories.find((x) => x.id === r.parent_id)?.name || '-',
					},
					{
						title: 'الحالة',
						dataIndex: 'is_active',
						key: 'is_active',
						render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'نشط' : 'غير نشط'}</Tag>,
					},
					{
						title: 'الإجراءات',
						key: 'actions',
						render: (_: any, r: CategoryRecord) => (
							<Space>
								<Button icon={<EditOutlined />} onClick={() => onEdit(r)} />
								<Popconfirm title="هل تريد حذف هذه الفئة؟" onConfirm={() => deleteMutation.mutate(r.id)}>
									<Button danger icon={<DeleteOutlined />} />
								</Popconfirm>
							</Space>
						),
					},
				]}
			/>

			<Modal
				title={editing ? 'تعديل الفئة' : 'إضافة فئة'}
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
					<Form.Item name="name" label="الاسم" rules={[{ required: true }]}>
						<Input />
					</Form.Item>
					<Form.Item name="name_ar" label="الاسم بالعربي">
						<Input dir="rtl" />
					</Form.Item>
					<Form.Item name="parent_id" label="الفئة الأب">
						<Select allowClear options={parentOptions} placeholder="اختياري" />
					</Form.Item>
					<Form.Item name="is_active" label="نشط" valuePropName="checked">
						<Switch />
					</Form.Item>
				</Form>
			</Modal>
		</Card>
	);
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Table, Typography, Statistic, Row, Col, Select, Space, Tag } from 'antd';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const { Title } = Typography;

export default function ReportsInventoryPage() {
	const isSA = useAuthStore((s) => s.isSuperAdmin)();
	const user = useAuthStore((s) => s.user);
	const [branchIds, setBranchIds] = useState<number[]>([]);

	const { data: branches = [] } = useQuery({
		queryKey: ['meta-branches-reports-inventory'],
		queryFn: () => api.get('/meta/branches').then((r) => r.data),
		enabled: isSA,
	});

	const branchOptions = (branches || []).filter((b: any) => b.is_active).map((b: any) => ({
		label: `${b.name} (${b.code})`,
		value: b.id,
	}));

	const params = {
		branch_id: isSA ? undefined : user?.branch_id,
		branch_ids: isSA && branchIds.length > 0 ? branchIds : undefined,
	};

	const { data, isLoading } = useQuery({
		queryKey: ['report-inventory', params],
		queryFn: () => api.get('/reports/inventory-valuation', { params }).then((r) => r.data),
	});

	const columns = [
		{ title: 'المنتج', dataIndex: 'product_name', key: 'name' },
		{ title: 'الفئة', dataIndex: 'category', key: 'cat' },
		{ title: 'الكمية', dataIndex: 'quantity', key: 'qty' },
		{ title: 'قيمة التكلفة', dataIndex: 'cost_valuation', key: 'cost', render: (v: number) => `${Number(v).toFixed(2)} ر.س` },
		{ title: 'قيمة البيع', dataIndex: 'sale_valuation', key: 'retail', render: (v: number) => `${Number(v).toFixed(2)} ر.س` },
	];

	return (
		<Card bordered={false} style={{ borderRadius: 16 }}>
			<Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 10 }}>
				<Title level={5} style={{ margin: 0 }}>Inventory Valuation</Title>
				{isSA && (
					<Space>
						<Select
							mode="multiple"
							allowClear
							placeholder="اختر الفروع"
							value={branchIds}
							options={branchOptions}
							onChange={(v) => setBranchIds(v as number[])}
							style={{ minWidth: 240 }}
							maxTagCount="responsive"
						/>
						<Tag color={branchIds.length > 0 ? 'blue' : 'default'}>
							{branchIds.length > 0 ? `الفروع المختارة: ${branchIds.length}` : 'كل الفروع'}
						</Tag>
					</Space>
				)}
			</Space>
			<Row gutter={12} style={{ marginBottom: 16 }}>
				<Col span={12}>
					<Card><Statistic title="إجمالي قيمة التكلفة" value={Number(data?.total_cost_value ?? 0)} precision={2} suffix=" ر.س" /></Card>
				</Col>
				<Col span={12}>
					<Card><Statistic title="إجمالي قيمة البيع" value={Number(data?.total_retail_value ?? 0)} precision={2} suffix=" ر.س" /></Card>
				</Col>
			</Row>
			<Table dataSource={data?.items ?? []} columns={columns} rowKey={(r: any) => `${r.product_id}-${r.branch_id}`} loading={isLoading} />
		</Card>
	);
}

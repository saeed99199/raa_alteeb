import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Typography, Row, Col, Statistic, Table, Select, Space, Tag } from 'antd';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const { Title } = Typography;

export default function ReportsHRPage() {
	const isSA = useAuthStore((s) => s.isSuperAdmin)();
	const user = useAuthStore((s) => s.user);
	const [branchIds, setBranchIds] = useState<number[]>([]);

	const { data: branches = [] } = useQuery({
		queryKey: ['meta-branches-reports-hr'],
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
		queryKey: ['report-hr', params],
		queryFn: () => api.get('/reports/hr-summary', { params }).then((r) => r.data),
	});

	const attendanceRows = Object.entries(data?.attendance ?? {}).map(([status, count]) => ({
		status,
		count,
	}));

	return (
		<Card bordered={false} style={{ borderRadius: 16 }}>
			<Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 10 }}>
				<Title level={5} style={{ margin: 0 }}>HR Summary</Title>
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
				<Col span={8}><Card><Statistic title="الموظفون النشطون" value={Number(data?.employees ?? 0)} /></Card></Col>
				<Col span={8}><Card><Statistic title="إجمالي الرواتب" value={Number(data?.payroll?.total_payroll ?? 0)} precision={2} suffix=" ر.س" /></Card></Col>
				<Col span={8}><Card><Statistic title="إجمالي الخصومات" value={Number(data?.payroll?.total_deductions ?? 0)} precision={2} suffix=" ر.س" /></Card></Col>
			</Row>
			<Table
				dataSource={attendanceRows}
				loading={isLoading}
				rowKey="status"
				columns={[
					{ title: 'حالة الحضور', dataIndex: 'status', key: 'status' },
					{ title: 'العدد', dataIndex: 'count', key: 'count' },
				]}
				pagination={false}
			/>
		</Card>
	);
}

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  Checkbox,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, EyeOutlined, FilePdfOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '@/lib/api';

const { Title } = Typography;

type EmployeeRecord = {
  id: number;
  user_id: number;
  employee_code: string;
  job_title: string;
  base_salary: number;
  salary_type: 'monthly' | 'daily' | 'hourly';
  hire_date: string;
  is_active: boolean;
  user?: {
    name: string;
    email: string;
    role?: { id: number; name: string; display_name: string };
  };
  permission_names?: string[];
  branch?: { id: number; name: string };
  identity_pdf?: string | null;
  contract_pdf?: string | null;
  cv_pdf?: string | null;
  qualifications_pdf?: string | null;
};

const TAB_PERMISSION_OPTIONS = [
  { label: 'Dashboard', value: 'tab.dashboard' },
  { label: 'Kanban', value: 'tab.kanban' },
  { label: 'Inventory / Products', value: 'tab.inventory.products' },
  { label: 'Inventory / Categories', value: 'tab.inventory.categories' },
  { label: 'Inventory / Suppliers', value: 'tab.inventory.suppliers' },
  { label: 'Inventory / Purchase Orders', value: 'tab.inventory.purchase_orders' },
  { label: 'Inventory / Stock Transfers', value: 'tab.inventory.stock_transfers' },
  { label: 'Sales / POS', value: 'tab.sales.pos' },
  { label: 'Sales / Invoices', value: 'tab.sales.invoices' },
  { label: 'Sales / Refunds', value: 'tab.sales.refunds' },
  { label: 'Sales / Customers', value: 'tab.sales.customers' },
  { label: 'Sales / Offers & Discount Codes', value: 'tab.sales.offers' },
  { label: 'HR / Employees', value: 'tab.hr.employees' },
  { label: 'HR / Attendance', value: 'tab.hr.attendance' },
  { label: 'HR / Payroll', value: 'tab.hr.payroll' },
  { label: 'HR / Leaves', value: 'tab.hr.leaves' },
  { label: 'HR / Tasks', value: 'tab.hr.tasks' },
  { label: 'Reports / Sales', value: 'tab.reports.sales' },
  { label: 'Reports / Inventory', value: 'tab.reports.inventory' },
  { label: 'Reports / HR', value: 'tab.reports.hr' },
  { label: 'Admin / Branches', value: 'tab.admin.branches' },
  { label: 'Admin / Users', value: 'tab.admin.users' },
];

const PERMISSION_GROUP_LABELS: Record<string, string> = {
  dashboard: 'لوحة التحكم',
  kanban: 'المهام',
  inventory: 'المخزون',
  sales: 'المبيعات',
  hr: 'الموارد البشرية',
  reports: 'التقارير',
  admin: 'الإدارة',
};

export default function EmployeesPage() {
  const qc = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRecord | null>(null);
  const [removedDocs, setRemovedDocs] = useState<Record<string, boolean>>({});
  const [form] = Form.useForm();

  const apiUrl = String(import.meta.env.VITE_API_URL ?? '/api');
  const storageBase = apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : '';

  const getStorageUrl = (path?: string | null) => {
    if (!path) return '#';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${storageBase}/storage/${path}`;
  };

  const { data: employeesResponse, isLoading } = useQuery({
    queryKey: ['employees-page'],
    queryFn: () => api.get('/hr/employees', { params: { per_page: 100 } }).then((r) => r.data),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['meta-roles'],
    queryFn: () => api.get('/meta/roles').then((r) => r.data),
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['meta-branches'],
    queryFn: () => api.get('/meta/branches').then((r) => r.data),
  });

  const roleOptions = useMemo(
    () => (roles || []).map((r: any) => ({ label: r.display_name, value: r.id })),
    [roles]
  );

  const branchOptions = useMemo(
    () => (branches || []).filter((b: any) => b.is_active).map((b: any) => ({ label: `${b.name} (${b.code})`, value: b.id })),
    [branches]
  );

  const createMutation = useMutation({
    mutationFn: (payload: FormData) => api.post('/hr/employees', payload, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => {
      message.success('تم إضافة الموظف بنجاح.');
      setIsModalOpen(false);
      form.resetFields();
      qc.invalidateQueries({ queryKey: ['employees-page'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'فشل إضافة الموظف.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: FormData }) =>
      api.post(`/hr/employees/${id}`, payload, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => {
      message.success('تم تحديث بيانات الموظف بنجاح.');
      setIsModalOpen(false);
      setEditingEmployee(null);
      form.resetFields();
      qc.invalidateQueries({ queryKey: ['employees-page'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'فشل تحديث الموظف.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/hr/employees/${id}`),
    onSuccess: () => {
      message.success('تم حذف الموظف.');
      qc.invalidateQueries({ queryKey: ['employees-page'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'فشل حذف الموظف.'),
  });

  const onCreate = () => {
    setEditingEmployee(null);
    setRemovedDocs({});
    form.resetFields();
    if (branchOptions.length > 0) {
      form.setFieldValue('branch_id', branchOptions[0].value);
    }
    form.setFieldValue('permission_names', ['tab.dashboard']);
    setIsModalOpen(true);
  };

  const onEdit = (record: EmployeeRecord) => {
    setEditingEmployee(record);
    setRemovedDocs({});
    form.setFieldsValue({
      name: record.user?.name,
      email: record.user?.email,
      role_id: record.user?.role?.id,
      permission_names: record.permission_names || [],
      branch_id: record.branch?.id,
      job_title: record.job_title,
      base_salary: Number(record.base_salary),
      salary_type: record.salary_type,
      hire_date: record.hire_date,
      is_active: record.is_active,
      remove_identity_pdf: false,
      remove_contract_pdf: false,
      remove_cv_pdf: false,
      remove_qualifications_pdf: false,
    });
    setIsModalOpen(true);
  };

  const getUploadFile = (value: any): File | null => {
    const fileEntry = Array.isArray(value) && value.length > 0 ? value[0] : null;
    return fileEntry?.originFileObj ?? null;
  };

  const appendIfPresent = (fd: FormData, key: string, value: any) => {
    if (value === undefined || value === null || value === '') return;
    fd.append(key, String(value));
  };

  const buildEmployeeFormData = (values: any, isEdit: boolean) => {
    const fd = new FormData();

    if (isEdit) {
      fd.append('_method', 'PATCH');
    }

    appendIfPresent(fd, 'name', values.name);
    appendIfPresent(fd, 'email', values.email);
    appendIfPresent(fd, 'role_id', values.role_id);
    appendIfPresent(fd, 'branch_id', values.branch_id);
    appendIfPresent(fd, 'job_title', values.job_title);
    appendIfPresent(fd, 'base_salary', values.base_salary);
    appendIfPresent(fd, 'salary_type', values.salary_type);
    appendIfPresent(fd, 'hire_date', values.hire_date);

    if (isEdit) {
      fd.append('is_active', values.is_active ? '1' : '0');
    }

    if (values.password) {
      fd.append('password', values.password);
    }

    const permissions = values.permission_names || [];
    permissions.forEach((permission: string) => fd.append('permission_names[]', permission));

    const identityPdf = getUploadFile(values.identity_pdf_file);
    const contractPdf = getUploadFile(values.contract_pdf_file);
    const cvPdf = getUploadFile(values.cv_pdf_file);
    const qualificationsPdf = getUploadFile(values.qualifications_pdf_file);

    if (identityPdf) fd.append('identity_pdf', identityPdf);
    if (contractPdf) fd.append('contract_pdf', contractPdf);
    if (cvPdf) fd.append('cv_pdf', cvPdf);
    if (qualificationsPdf) fd.append('qualifications_pdf', qualificationsPdf);

    if (isEdit) {
      fd.append('remove_identity_pdf', values.remove_identity_pdf ? '1' : '0');
      fd.append('remove_contract_pdf', values.remove_contract_pdf ? '1' : '0');
      fd.append('remove_cv_pdf', values.remove_cv_pdf ? '1' : '0');
      fd.append('remove_qualifications_pdf', values.remove_qualifications_pdf ? '1' : '0');
    }

    return fd;
  };

  const onSubmit = (values: any) => {
    if (editingEmployee) {
      const payload = buildEmployeeFormData(values, true);
      updateMutation.mutate({ id: editingEmployee.id, payload });
      return;
    }

    const payload = buildEmployeeFormData(values, false);
    createMutation.mutate(payload);
  };

  const markDocumentForRemoval = (field: string) => {
    setRemovedDocs((prev) => ({ ...prev, [field]: true }));
    form.setFieldValue(`remove_${field}`, true);
  };

  const unmarkDocumentForRemoval = (field: string) => {
    setRemovedDocs((prev) => ({ ...prev, [field]: false }));
    form.setFieldValue(`remove_${field}`, false);
  };

  const documentFields = [
    { key: 'identity_pdf', label: 'صورة الهوية (PDF)', formName: 'identity_pdf_file' },
    { key: 'contract_pdf', label: 'عقد العمل (PDF)', formName: 'contract_pdf_file' },
    { key: 'cv_pdf', label: 'السيرة الذاتية (PDF)', formName: 'cv_pdf_file' },
    { key: 'qualifications_pdf', label: 'المؤهلات (PDF)', formName: 'qualifications_pdf_file' },
  ];

  const columns = [
    { title: 'الكود', dataIndex: 'employee_code', key: 'employee_code' },
    { title: 'الاسم', key: 'name', render: (_: any, r: EmployeeRecord) => r.user?.name || '-' },
    { title: 'البريد', key: 'email', render: (_: any, r: EmployeeRecord) => r.user?.email || '-' },
    {
      title: 'الصلاحية',
      key: 'role',
      render: (_: any, r: EmployeeRecord) => (
        <Tag color="blue">{r.user?.role?.display_name || r.user?.role?.name || '-'}</Tag>
      ),
    },
    { title: 'الفرع', key: 'branch', render: (_: any, r: EmployeeRecord) => r.branch?.name || '-' },
    { title: 'المسمى الوظيفي', dataIndex: 'job_title', key: 'job_title' },
    { title: 'تاريخ التوظيف', dataIndex: 'hire_date', key: 'hire_date' },
    {
      title: 'الحالة',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'نشط' : 'غير نشط'}</Tag>,
    },
    {
      title: 'الإجراءات',
      key: 'actions',
      render: (_: any, r: EmployeeRecord) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => onEdit(r)} />
          <Popconfirm title="هل تريد حذف هذا الموظف؟" onConfirm={() => deleteMutation.mutate(r.id)} okText="حذف" cancelText="إلغاء">
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const records: EmployeeRecord[] = employeesResponse?.data || [];
  const allPermissionValues = TAB_PERMISSION_OPTIONS.map((item) => item.value);
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, Array<{ label: string; value: string }>> = {};

    TAB_PERMISSION_OPTIONS.forEach((item) => {
      const parts = item.value.split('.');
      const key = parts[1] || 'dashboard';

      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(item);
    });

    return Object.entries(groups).map(([key, items]) => ({
      key,
      title: PERMISSION_GROUP_LABELS[key] || key,
      items,
    }));
  }, []);

  return (
    <Card bordered={false} style={{ borderRadius: 16 }}>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}>
          الموظفون
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreate} style={{ background: '#8B5E3C' }}>
          إضافة موظف
        </Button>
      </Space>

      <Table
        dataSource={records}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20 }}
      />

      <Modal
        title={editingEmployee ? 'تعديل الموظف والصلاحيات' : 'إضافة موظف'}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingEmployee(null);
          setRemovedDocs({});
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText={editingEmployee ? 'حفظ' : 'إضافة'}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={760}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          initialValues={{ salary_type: 'monthly', is_active: true, hire_date: dayjs().format('YYYY-MM-DD') }}
        >
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="name" label="الاسم" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item name="email" label="البريد الإلكتروني" rules={[{ required: true, type: 'email' }]} style={{ flex: 1 }}>
              <Input />
            </Form.Item>
          </Space>

          <Space style={{ width: '100%' }} size={12}>
            <Form.Item
              name="password"
              label={editingEmployee ? 'كلمة مرور جديدة (اختياري)' : 'كلمة المرور'}
              rules={editingEmployee ? [{ min: 8 }] : [{ required: true, min: 8 }]}
              style={{ flex: 1 }}
            >
              <Input.Password />
            </Form.Item>
            <Form.Item name="role_id" label="الدور / الصلاحيات" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select options={roleOptions} placeholder="اختر الدور" />
            </Form.Item>
          </Space>

          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="branch_id" label="الفرع" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select options={branchOptions} placeholder="اختر الفرع" />
            </Form.Item>
            <Form.Item name="job_title" label="المسمى الوظيفي" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input />
            </Form.Item>
          </Space>

          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="base_salary" label="الراتب الأساسي" rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="salary_type" label="نوع الراتب" style={{ flex: 1 }}>
              <Select
                options={[
                  { label: 'Monthly', value: 'monthly' },
                  { label: 'Daily', value: 'daily' },
                  { label: 'Hourly', value: 'hourly' },
                ]}
              />
            </Form.Item>
            <Form.Item name="hire_date" label="تاريخ التوظيف" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="YYYY-MM-DD" />
            </Form.Item>
          </Space>

          <Divider style={{ margin: '6px 0 14px' }}>مرفقات الموظف (PDF)</Divider>

          {documentFields.map((docField) => {
            const existingPath = editingEmployee?.[docField.key as keyof EmployeeRecord] as string | null | undefined;
            const isMarkedForRemoval = Boolean(removedDocs[docField.key]);

            return (
              <Card key={docField.key} size="small" style={{ marginBottom: 10 }}>
                <Space direction="vertical" style={{ width: '100%' }} size={8}>
                  <Form.Item
                    name={docField.formName}
                    label={docField.label}
                    valuePropName="fileList"
                    getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
                    extra="يسمح برفع ملف PDF فقط - الحد الاقصى 10MB"
                    style={{ marginBottom: 0 }}
                  >
                    <Upload
                      beforeUpload={() => false}
                      accept="application/pdf,.pdf"
                      maxCount={1}
                      listType="text"
                    >
                      <Button icon={<FilePdfOutlined />}>اختيار ملف PDF</Button>
                    </Upload>
                  </Form.Item>

                  {editingEmployee && existingPath && (
                    <Space wrap>
                      {!isMarkedForRemoval && (
                        <Button icon={<EyeOutlined />} href={getStorageUrl(existingPath)} target="_blank">
                          استعراض الملف الحالي
                        </Button>
                      )}

                      {!isMarkedForRemoval ? (
                        <Button danger onClick={() => markDocumentForRemoval(docField.key)}>
                          حذف الملف الحالي
                        </Button>
                      ) : (
                        <Button onClick={() => unmarkDocumentForRemoval(docField.key)}>
                          التراجع عن الحذف
                        </Button>
                      )}
                    </Space>
                  )}

                  <Form.Item name={`remove_${docField.key}`} hidden>
                    <Input type="hidden" />
                  </Form.Item>
                </Space>
              </Card>
            );
          })}

          <Divider style={{ margin: '6px 0 14px' }}>صلاحيات التبويبات</Divider>
          <Form.Item name="permission_names" extra="حدد التبويبات التي يستطيع الموظف الوصول لها من القائمة الجانبية.">
            <div />
          </Form.Item>

          <Form.Item noStyle shouldUpdate>
            {() => {
              const selectedPermissions: string[] = form.getFieldValue('permission_names') || [];

              const togglePermission = (permissionValue: string, checked: boolean) => {
                if (checked) {
                  form.setFieldValue('permission_names', Array.from(new Set([...selectedPermissions, permissionValue])));
                  return;
                }

                form.setFieldValue(
                  'permission_names',
                  selectedPermissions.filter((value) => value !== permissionValue)
                );
              };

              return (
                <Card
                  size="small"
                  style={{ marginBottom: 12, background: '#faf8f6', borderColor: '#e8ddd3' }}
                  bodyStyle={{ padding: 12 }}
                >
                  <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 10 }} wrap>
                    <span style={{ fontWeight: 600 }}>المحدد: {selectedPermissions.length} / {allPermissionValues.length}</span>
                    <Space size={8}>
                      <Button size="small" onClick={() => form.setFieldValue('permission_names', allPermissionValues)}>
                        تحديد الكل
                      </Button>
                      <Button size="small" onClick={() => form.setFieldValue('permission_names', [])}>
                        إلغاء الكل
                      </Button>
                    </Space>
                  </Space>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: 10,
                    }}
                  >
                    {groupedPermissions.map((group) => (
                      <Card
                        key={group.key}
                        size="small"
                        title={<span style={{ fontSize: 13 }}>{group.title}</span>}
                        extra={<Tag color="blue">{group.items.filter((i) => selectedPermissions.includes(i.value)).length}</Tag>}
                        style={{ borderColor: '#eee2d8' }}
                        bodyStyle={{ padding: 10 }}
                      >
                        <Space direction="vertical" size={6} style={{ width: '100%' }}>
                          {group.items.map((item) => (
                            <Checkbox
                              key={item.value}
                              checked={selectedPermissions.includes(item.value)}
                              onChange={(e) => togglePermission(item.value, e.target.checked)}
                            >
                              {item.label}
                            </Checkbox>
                          ))}
                        </Space>
                      </Card>
                    ))}
                  </div>
                </Card>
              );
            }}
          </Form.Item>

          {editingEmployee && (
            <Form.Item name="is_active" label="حالة الحساب" rules={[{ required: true }]}>
              <Select
                options={[
                  { label: 'Active', value: true },
                  { label: 'غير نشط', value: false },
                ]}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </Card>
  );
}

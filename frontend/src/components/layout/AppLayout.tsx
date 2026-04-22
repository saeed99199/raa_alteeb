import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Layout, Menu, Avatar, Dropdown, Badge, Button, Space, Typography, List, Popover, Empty, Spin, Tag,
} from 'antd';
import {
  DashboardOutlined, ShoppingCartOutlined,
  TeamOutlined, BarChartOutlined, BranchesOutlined,
  UserOutlined, LogoutOutlined, BellOutlined, GlobalOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined,
  InboxOutlined,
  AppstoreOutlined,
  CheckSquareOutlined,
  TagsOutlined,
  SunOutlined,
  MoonOutlined,
  SettingOutlined,
  WarningOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import i18n from '@/i18n';
import api from '@/lib/api';
import logoWhite from '@/assets/logo-white.svg';
import logoBrown from '@/assets/logo-brown.svg';

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

const menuItems = (t: Function, hasPermission: Function) => {
  const canTab = (tabPermission: string, fallbackPermissions: string[] = []) =>
    hasPermission(tabPermission) || fallbackPermissions.some((perm) => hasPermission(perm));

  const canInventory = hasPermission('inventory.view') || hasPermission('inventory.create') || hasPermission('inventory.edit') || hasPermission('inventory.delete');
  const canSales = hasPermission('sales.view') || hasPermission('sales.create') || hasPermission('sales.refund');
  const canHr = hasPermission('hr.view') || hasPermission('hr.create') || hasPermission('hr.edit') || hasPermission('hr.payroll') || hasPermission('attendance.self.check_in') || hasPermission('attendance.self.check_out') || hasPermission('leaves.request') || hasPermission('tasks.view');
  const canReports = hasPermission('reports.view') || hasPermission('reports.export');

  return [
    ...(canTab('tab.dashboard', ['sales.view', 'inventory.view', 'hr.view', 'reports.view']) ? [{ key: '/', icon: <DashboardOutlined />, label: t('dashboard') }] : []),
    ...(canTab('tab.kanban', ['tasks.view']) ? [{ key: '/kanban', icon: <AppstoreOutlined />, label: t('kanban') }] : []),
    ...(canTab('tab.hr.tasks', ['tasks.view']) ? [{ key: '/hr/tasks', icon: <CheckSquareOutlined />, label: t('my_tasks') }] : []),
    ...(canInventory ? [{
      key: 'inventory',
      icon: <InboxOutlined />,
      label: t('inventory'),
      children: [
        ...(canTab('tab.inventory.products', ['inventory.view']) ? [{ key: '/inventory/products', label: t('products') }] : []),
        ...(canTab('tab.inventory.categories', ['inventory.view']) ? [{ key: '/inventory/categories', label: t('categories') }] : []),
        ...(canTab('tab.inventory.suppliers', ['inventory.view']) ? [{ key: '/inventory/suppliers', label: t('suppliers') }] : []),
        ...(canTab('tab.inventory.purchase_orders', ['inventory.view']) ? [{ key: '/inventory/purchase-orders', label: t('purchase_orders') }] : []),
        ...(canTab('tab.inventory.stock_transfers', ['inventory.view']) ? [{ key: '/inventory/stock-transfers', label: t('stock_transfers') }] : []),
      ],
    }] : []),
    ...(canSales ? [{
      key: 'sales',
      icon: <ShoppingCartOutlined />,
      label: t('sales'),
      children: [
        ...(canTab('tab.sales.pos', ['sales.create']) ? [{ key: '/sales/pos', label: t('pos') }] : []),
        ...(canTab('tab.sales.invoices', ['sales.view']) ? [{ key: '/sales/list', label: t('invoices') }] : []),
        ...(canTab('tab.sales.refunds', ['sales.refund']) ? [{ key: '/sales/refunds', label: t('refunds') }] : []),
        ...(canTab('tab.sales.customers', ['sales.view']) ? [{ key: '/sales/customers', label: t('customers') }] : []),
        ...(canTab('tab.sales.offers', ['offers.manage']) ? [{ key: '/sales/offers', icon: <TagsOutlined />, label: 'العروض وكوبونات الخصم' }] : []),
      ],
    }] : []),
    ...(canHr ? [{
      key: 'hr',
      icon: <TeamOutlined />,
      label: t('hr'),
      children: [
        ...(canTab('tab.hr.employees', ['hr.view']) ? [{ key: '/hr/employees', label: t('employees') }] : []),
        ...(canTab('tab.hr.attendance', ['hr.view', 'attendance.self.check_in']) ? [{ key: '/hr/attendance', label: t('attendance') }] : []),
        ...(canTab('tab.hr.payroll', ['hr.payroll']) ? [{ key: '/hr/payroll', label: t('payroll') }] : []),
        ...(canTab('tab.hr.leaves', ['leaves.request', 'hr.view']) ? [{ key: '/hr/leaves', label: t('leaves') }] : []),
      ],
    }] : []),
    ...(canReports ? [{
      key: 'reports',
      icon: <BarChartOutlined />,
      label: t('reports'),
      children: [
        ...(canTab('tab.reports.sales', ['reports.view']) ? [{ key: '/reports/sales', label: t('sales') }] : []),
        ...(canTab('tab.reports.inventory', ['reports.view']) ? [{ key: '/reports/inventory', label: t('inventory') }] : []),
        ...(canTab('tab.reports.hr', ['reports.view']) ? [{ key: '/reports/hr', label: t('hr') }] : []),
      ],
    }] : []),
    ...(hasPermission('branches.manage') ? [{
      key: 'admin',
      icon: <BranchesOutlined />,
      label: t('branches'),
      children: [
        ...(canTab('tab.admin.branches', ['branches.manage']) ? [{ key: '/admin/branches', label: t('branches') }] : []),
        ...(canTab('tab.admin.users', ['branches.manage']) ? [{ key: '/admin/users', label: t('users') }] : []),
      ],
    }] : []),
  ];
};

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasPermission } = useAuthStore();
  const mode = useThemeStore((s) => s.mode);
  const toggleMode = useThemeStore((s) => s.toggleMode);
  const isDark = mode === 'dark';

  const { data: notifData, isLoading: notifLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((r) => r.data),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const totalNotif: number = notifData?.total ?? 0;
  const tasks: any[] = notifData?.tasks ?? [];
  const lowStock: any[] = notifData?.low_stock ?? [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleLocale = () => {
    const next = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(next);
    localStorage.setItem('locale', next);
    window.location.reload();
  };

  const userMenu = [
    { key: 'account-settings', label: 'إعدادات الحساب', icon: <SettingOutlined />, onClick: () => navigate('/account/settings') },
    { key: 'locale', label: i18n.language === 'en' ? 'العربية' : 'English', icon: <GlobalOutlined />, onClick: toggleLocale },
    { key: 'theme', label: isDark ? t('light_mode') : t('dark_mode'), icon: isDark ? <SunOutlined /> : <MoonOutlined />, onClick: toggleMode },
    { key: 'logout', label: t('logout'), icon: <LogoutOutlined />, danger: true, onClick: handleLogout },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={230}
        style={{
          background: isDark
            ? 'linear-gradient(180deg, #171717 0%, #1e1e1e 55%, #2a2a2a 100%)'
            : 'linear-gradient(180deg, #0e1628 0%, #12213f 55%, #15315f 100%)',
          overflow: 'hidden',
          position: 'sticky',
          top: 0,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
          {!collapsed && (
            <img src={isDark ? logoBrown : logoWhite} alt="Raa Al Teeb" style={{ width: 148, maxWidth: '100%', height: 'auto' }} />
          )}
        </div>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            maxHeight: 'calc(100vh - 96px)',
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingBottom: 14,
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            scrollbarGutter: 'stable',
          }}
        >
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            defaultOpenKeys={['inventory', 'sales', 'hr', 'reports', 'admin']}
            items={menuItems(t, hasPermission)}
            onClick={({ key }) => navigate(key)}
            style={{ background: 'transparent', borderRight: 0, paddingBottom: 8 }}
          />
        </div>
      </Sider>

      <Layout>
        <Header style={{
          background: isDark ? 'rgba(24,24,24,0.92)' : 'rgba(255,255,255,0.9)', padding: '0 24px', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between',
          borderBottom: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #f0f0f0', position: 'sticky', top: 0, zIndex: 100,
          backdropFilter: 'blur(10px)',
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <Space>
            <Button
              type="text"
              icon={isDark ? <SunOutlined /> : <MoonOutlined />}
              onClick={toggleMode}
              shape="circle"
            />
            <Popover
              open={notifOpen}
              onOpenChange={setNotifOpen}
              trigger="click"
              placement="bottomRight"
              arrow={false}
              content={
                <div style={{ width: 340, maxHeight: 480, overflowY: 'auto' }}>
                  {notifLoading ? (
                    <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
                  ) : totalNotif === 0 ? (
                    <Empty description="لا توجد إشعارات جديدة" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ margin: 24 }} />
                  ) : (
                    <>
                      {tasks.length > 0 && (
                        <>
                          <div style={{ padding: '8px 12px 4px', fontWeight: 700, fontSize: 12, color: '#8B5E3C' }}>
                            <ClockCircleOutlined style={{ marginInlineEnd: 6 }} />
                            المهام المعلقة ({tasks.length})
                          </div>
                          <List
                            size="small"
                            dataSource={tasks}
                            renderItem={(task: any) => (
                              <List.Item
                                style={{ cursor: 'pointer', padding: '6px 12px' }}
                                onClick={() => { navigate('/hr/tasks'); setNotifOpen(false); }}
                              >
                                <List.Item.Meta
                                  title={
                                    <Space size={4}>
                                      <span style={{ fontSize: 13 }}>{task.title}</span>
                                      {task.overdue && <Tag color="error" style={{ fontSize: 10, margin: 0 }}>متأخرة</Tag>}
                                      {task.priority === 'high' && <Tag color="orange" style={{ fontSize: 10, margin: 0 }}>عاجل</Tag>}
                                    </Space>
                                  }
                                  description={task.due_date ? `الموعد: ${task.due_date}` : undefined}
                                />
                              </List.Item>
                            )}
                          />
                        </>
                      )}
                      {lowStock.length > 0 && (
                        <>
                          <div style={{ padding: '8px 12px 4px', fontWeight: 700, fontSize: 12, color: '#dc2626' }}>
                            <WarningOutlined style={{ marginInlineEnd: 6 }} />
                            نقص مخزون ({lowStock.length})
                          </div>
                          <List
                            size="small"
                            dataSource={lowStock}
                            renderItem={(item: any) => (
                              <List.Item
                                style={{ cursor: 'pointer', padding: '6px 12px' }}
                                onClick={() => { navigate('/inventory/products'); setNotifOpen(false); }}
                              >
                                <List.Item.Meta
                                  title={<span style={{ fontSize: 13 }}>{item.title}</span>}
                                  description={`الكمية: ${item.quantity} (الحد الأدنى: ${item.threshold})`}
                                />
                              </List.Item>
                            )}
                          />
                        </>
                      )}
                    </>
                  )}
                </div>
              }
            >
              <Badge count={totalNotif} size="small" overflowCount={99}>
                <Button type="text" icon={<BellOutlined />} shape="circle" />
              </Badge>
            </Popover>
            <Dropdown menu={{ items: userMenu }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} style={{ background: isDark ? '#8B5E3C' : '#15315f' }} />
                <Text style={{ color: isDark ? '#f3f4f6' : undefined }}>{user?.name}</Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ margin: 24, background: 'transparent', minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

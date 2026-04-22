import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import logoWhite from '@/assets/logo-white.svg';
import logoBrown from '@/assets/logo-brown.svg';

const { Title, Text } = Typography;

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const mode = useThemeStore((s) => s.mode);
  const toggleMode = useThemeStore((s) => s.toggleMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDark = mode === 'dark';

  const onFinish = async (values: { email: string; password: string }) => {
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', values);
      setAuth(data.token, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: isDark
        ? 'radial-gradient(circle at 15% 20%, rgba(139,94,60,0.26), transparent 35%), radial-gradient(circle at 85% 10%, rgba(59,130,246,0.2), transparent 40%), linear-gradient(160deg, #0e0e10 0%, #17171b 45%, #1f1f24 100%)'
        : 'radial-gradient(circle at 15% 20%, rgba(37,99,235,0.22), transparent 35%), radial-gradient(circle at 85% 10%, rgba(245,158,11,0.2), transparent 40%), linear-gradient(160deg, #dbeafe 0%, #f8fafc 45%, #ffffff 100%)',
    }}>
      <Card style={{ width: 430, borderRadius: 18, boxShadow: isDark ? '0 26px 70px rgba(5,10,25,0.45)' : '0 16px 40px rgba(15,23,42,0.15)', border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(15,23,42,0.1)', background: isDark ? 'rgba(28,28,30,0.95)' : 'rgba(255,255,255,0.95)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              display: 'inline-flex',
              padding: '10px 14px',
              borderRadius: 12,
              marginBottom: 12,
              background: isDark ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #15315f 0%, #1d4ed8 100%)',
            }}
          >
            <img src={isDark ? logoBrown : logoWhite} alt="Raa Al Teeb" style={{ width: 210, maxWidth: '100%' }} />
          </div>
          <Title level={3} style={{ margin: 0, color: isDark ? '#f3f4f6' : '#0f172a' }}>راع الطيب</Title>
          <Text type="secondary">{t('sign_in_to_continue')}</Text>
        </div>

        {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} showIcon />}

        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            name="email"
            label={t('email')}
            rules={[{ required: true, type: 'email', message: 'Valid email required' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="admin@raa-alteeb.com" size="large" />
          </Form.Item>

          <Form.Item
            name="password"
            label={t('password')}
            rules={[{ required: true, message: 'Password required' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="••••••••" size="large" />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            size="large"
            style={{ background: isDark ? '#8B5E3C' : '#15315f', marginTop: 8, height: 44 }}
          >
            {t('login')}
          </Button>

          <Button
            type="default"
            block
            size="large"
            style={{ marginTop: 10, height: 44 }}
            onClick={toggleMode}
          >
            {isDark ? t('light_mode') : t('dark_mode')}
          </Button>
        </Form>
      </Card>
    </div>
  );
}

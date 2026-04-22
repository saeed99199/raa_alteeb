import { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, Row, Typography, message } from 'antd';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const { Title, Text } = Typography;

export default function AccountSettingsPage() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  useEffect(() => {
    if (!user) return;
    profileForm.setFieldsValue({
      name: user.name,
      email: user.email,
      phone: user.phone,
      locale: user.locale,
      avatar: user.avatar,
    });
  }, [user, profileForm]);

  const profileMutation = useMutation({
    mutationFn: (payload: any) => api.patch('/auth/profile', payload).then((r) => r.data),
    onSuccess: (res) => {
      if (res?.user) {
        updateUser(res.user);
      }
      message.success('تم تحديث بيانات الحساب بنجاح.');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'فشل تحديث بيانات الحساب.');
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (payload: any) => api.post('/auth/change-password', payload),
    onSuccess: () => {
      message.success('تم تغيير كلمة المرور بنجاح.');
      passwordForm.resetFields();
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'فشل تغيير كلمة المرور.');
    },
  });

  const submitProfile = (values: any) => {
    profileMutation.mutate(values);
  };

  const submitPassword = (values: any) => {
    passwordMutation.mutate(values);
  };

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>إعدادات الحساب الشخصي</Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Title level={5}>المعلومات الشخصية وبيانات التواصل</Title>
            <Form form={profileForm} layout="vertical" onFinish={submitProfile}>
              <Form.Item name="name" label="الاسم الكامل" rules={[{ required: true, message: 'أدخل الاسم' }]}>
                <Input />
              </Form.Item>
              <Form.Item name="email" label="البريد الإلكتروني" rules={[{ required: true, type: 'email', message: 'أدخل بريدًا صحيحًا' }]}>
                <Input />
              </Form.Item>
              <Form.Item name="phone" label="رقم الجوال">
                <Input />
              </Form.Item>
              <Form.Item name="locale" label="اللغة المفضلة">
                <Input placeholder="ar أو en" />
              </Form.Item>
              <Form.Item name="avatar" label="رابط الصورة الشخصية (اختياري)">
                <Input />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={profileMutation.isPending} style={{ background: '#8B5E3C' }}>
                حفظ البيانات
              </Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Title level={5}>تغيير كلمة المرور</Title>
            <Text type="secondary">استخدم كلمة مرور قوية لا تقل عن 8 أحرف.</Text>
            <Form form={passwordForm} layout="vertical" onFinish={submitPassword} style={{ marginTop: 12 }}>
              <Form.Item name="current_password" label="كلمة المرور الحالية" rules={[{ required: true, message: 'أدخل كلمة المرور الحالية' }]}>
                <Input.Password />
              </Form.Item>
              <Form.Item name="password" label="كلمة المرور الجديدة" rules={[{ required: true, min: 8, message: '8 أحرف على الأقل' }]}>
                <Input.Password />
              </Form.Item>
              <Form.Item
                name="password_confirmation"
                label="تأكيد كلمة المرور الجديدة"
                dependencies={['password']}
                rules={[
                  { required: true, message: 'أكد كلمة المرور' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('التأكيد غير مطابق لكلمة المرور الجديدة'));
                    },
                  }),
                ]}
              >
                <Input.Password />
              </Form.Item>

              <Button type="primary" htmlType="submit" loading={passwordMutation.isPending} style={{ background: '#15315f' }}>
                تغيير كلمة المرور
              </Button>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

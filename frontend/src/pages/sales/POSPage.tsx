import { useState, useEffect, useMemo } from 'react';
import {
  Card, Input, Button, Table, InputNumber, Select,
  Typography, Divider, Space, Tag, Modal, Form, Radio, Row, Col, message,
} from 'antd';
import {
  PlusOutlined, MinusOutlined, DeleteOutlined, BarcodeOutlined,
  PrinterOutlined, CheckCircleOutlined, SearchOutlined, ShopOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const { Title, Text } = Typography;

interface CartItem {
  cart_key: string;
  product_id: number;
  name: string;
  unit?: string;
  unit_price: number;
  quantity: number;
  discount_percent: number;
  tax_rate: number;
  line_total: number;
}

const WEIGHT_UNIT_TO_KILO: Record<string, number> = {
  'اوقيه': 1 / 35,
  'اوقيتين': 2 / 35,
  'ثمنكيلو': 1 / 8,
  'ربعكيلو': 1 / 4,
  'نصفكيلو': 1 / 2,
  'كيلو': 1,
  'توله': 0.011664,
  'نصفتوله': 0.005832,
  'ربعتوله': 0.002916,
};

function normalizeUnit(unit?: string): string {
  if (!unit) return '';
  return unit
    .toLowerCase()
    .replace(/[\u064b-\u0652]/g, '')
    .replace(/[\s\-_/]/g, '')
    .replace(/أ|إ|آ/g, 'ا')
    .replace(/ة/g, 'ه');
}

function resolveUnitPrice(basePrice: number, baseUnit?: string, selectedUnit?: string): number {
  const normalizedBaseUnit = normalizeUnit(baseUnit);
  const normalizedSelectedUnit = normalizeUnit(selectedUnit);
  const baseKilo = WEIGHT_UNIT_TO_KILO[normalizedBaseUnit];
  const selectedKilo = WEIGHT_UNIT_TO_KILO[normalizedSelectedUnit];

  if (baseKilo && selectedKilo) {
    return Number((basePrice * (selectedKilo / baseKilo)).toFixed(2));
  }

  // If product does not have a weight base unit, treat its base price as ounce price.
  if (!baseKilo && selectedKilo) {
    const ounceKilo = WEIGHT_UNIT_TO_KILO['اوقيه'];
    return Number((basePrice * (selectedKilo / ounceKilo)).toFixed(2));
  }

  return basePrice;
}

function calcLineTotal(item: CartItem): number {
  const gross    = item.unit_price * item.quantity;
  const discount = gross * (item.discount_percent / 100);
  const net      = gross - discount;
  return net + net * (item.tax_rate / 100);
}

export default function POSPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | undefined>(user?.branch_id ?? undefined);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<any>(null);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedOffer, setAppliedOffer] = useState<any | null>(null);
  const [unitPickerProduct, setUnitPickerProduct] = useState<any | null>(null);
  const [unitPickerOpen, setUnitPickerOpen] = useState(false);

  // Roles that can switch branches in POS
  const canChangeBranch = user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'branch_manager';
  const [payForm] = Form.useForm();
  const [unitForm] = Form.useForm();

  const unitWeightOptions = [
    { value: 'اوقيه', label: 'اوقيه' },
    { value: 'ثمن كيلو', label: 'ثمن كيلو' },
    { value: 'ربع كيلو', label: 'ربع كيلو' },
    { value: 'نصف كيلو', label: 'نصف كيلو' },
    { value: 'كيلو', label: 'كيلو' },
  ];

  const selectedUnitInPicker = Form.useWatch('unit', unitForm);
  const previewUnitPrice = useMemo(() => {
    if (!unitPickerProduct) return 0;
    return resolveUnitPrice(
      parseFloat(unitPickerProduct.sale_price),
      unitPickerProduct.unit,
      selectedUnitInPicker
    );
  }, [unitPickerProduct, selectedUnitInPicker]);

  const { data: branches = [] } = useQuery({
    queryKey: ['meta-branches'],
    queryFn: () => api.get('/meta/branches').then((r) => r.data),
  });

  const branchOptions = useMemo(
    () => (branches || []).filter((b: any) => b.is_active).map((b: any) => ({ label: `${b.name} (${b.code})`, value: b.id })),
    [branches]
  );

  useEffect(() => {
    if (user?.branch_id) {
      setSelectedBranchId(user.branch_id);
      return;
    }

    if (!selectedBranchId && branchOptions.length > 0) {
      setSelectedBranchId(branchOptions[0].value);
    }
  }, [user?.branch_id, selectedBranchId, branchOptions]);

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['pos-products', search, selectedBranchId],
    queryFn: () =>
      api.get('/inventory/products', {
        params: { search, is_active: true, per_page: 24, branch_id: selectedBranchId },
      }).then((r) => r.data.data),
    enabled: true,
  });

  const addToCart = (product: any, selectedUnit?: string) => {
    const normalizedUnit = selectedUnit || product.unit || undefined;
    const cartKey = `${product.id}-${normalizedUnit ?? 'default'}`;
    const calculatedUnitPrice = resolveUnitPrice(
      parseFloat(product.sale_price),
      product.unit,
      normalizedUnit
    );

    setCart((prev) => {
      const existing = prev.find((i) => i.cart_key === cartKey);
      if (existing) {
        return prev.map((i) =>
          i.cart_key === cartKey
            ? { ...i, quantity: i.quantity + 1, line_total: calcLineTotal({ ...i, quantity: i.quantity + 1 }) }
            : i
        );
      }
      const item: CartItem = {
        cart_key: cartKey,
        product_id: product.id,
        name: product.name,
        unit: normalizedUnit,
        unit_price: calculatedUnitPrice,
        quantity: 1,
        discount_percent: 0,
        tax_rate: parseFloat(product.tax_rate ?? 0),
        line_total: 0,
      };
      item.line_total = calcLineTotal(item);
      return [...prev, item];
    });
  };

  const openUnitPicker = (product: any) => {
    setUnitPickerProduct(product);
    unitForm.setFieldsValue({ unit: product.unit || undefined });
    setUnitPickerOpen(true);
  };

  const submitUnitPicker = (values: { unit: string }) => {
    if (!unitPickerProduct) return;
    addToCart(unitPickerProduct, values.unit);
    setUnitPickerOpen(false);
    setUnitPickerProduct(null);
    unitForm.resetFields();
  };

  const updateQty = (cartKey: string, qty: number) => {
    if (qty < 1) return removeFromCart(cartKey);
    setCart((prev) =>
      prev.map((i) =>
        i.cart_key === cartKey
          ? { ...i, quantity: qty, line_total: calcLineTotal({ ...i, quantity: qty }) }
          : i
      )
    );
  };

  const removeFromCart = (cartKey: string) => {
    setCart((prev) => prev.filter((i) => i.cart_key !== cartKey));
  };

  const subtotal = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const subtotalAfterItemDiscounts = cart.reduce((s, i) => {
    const gross = i.unit_price * i.quantity;
    const itemDiscount = gross * (i.discount_percent / 100);
    return s + (gross - itemDiscount);
  }, 0);

  const promoDiscountAmount = useMemo(() => {
    if (!appliedOffer) return 0;

    let value = 0;
    if (appliedOffer.discount_type === 'percent') {
      value = subtotalAfterItemDiscounts * (Number(appliedOffer.discount_value || 0) / 100);
    } else {
      value = Number(appliedOffer.discount_value || 0);
    }

    if (appliedOffer.max_discount !== null && appliedOffer.max_discount !== undefined) {
      value = Math.min(value, Number(appliedOffer.max_discount || 0));
    }

    return Math.max(0, Math.min(value, subtotalAfterItemDiscounts));
  }, [appliedOffer, subtotalAfterItemDiscounts]);

  const taxTotal = cart.reduce((s, i) => {
    const net = i.unit_price * i.quantity * (1 - i.discount_percent / 100);
    return s + net * (i.tax_rate / 100);
  }, 0);
  const grandTotal = Math.max(0, subtotalAfterItemDiscounts - promoDiscountAmount + taxTotal);

  const createSaleMutation = useMutation({
    mutationFn: (payload: any) => api.post('/sales/', payload).then((r) => r.data),
    onSuccess: (data) => {
      setLastInvoice(data);
      setCart([]);
      setDiscountCode('');
      setAppliedOffer(null);
      setPayModalOpen(false);
      payForm.resetFields();
      qc.invalidateQueries({ queryKey: ['sales-list'] });
      qc.invalidateQueries({ queryKey: ['report-sales'] });
      qc.invalidateQueries({ queryKey: ['report-top-products'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setSuccessModal(true);
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message ?? 'فشلت عملية البيع.');
    },
  });

  const handleCheckout = (values: any) => {
    if (cart.length === 0) return;

    if (!selectedBranchId) {
      message.error('يرجى اختيار الفرع قبل إتمام البيع.');
      return;
    }

    createSaleMutation.mutate({
      branch_id: selectedBranchId,
      discount_code: appliedOffer?.code || undefined,
      items: cart.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        discount_percent: i.discount_percent,
        tax_rate: i.tax_rate,
      })),
      payments: [{ method: values.payment_method, amount: values.paid_amount }],
      notes: values.notes,
    });
  };

  const validateDiscountMutation = useMutation({
    mutationFn: () => api.get('/sales/discount-codes/validate', {
      params: {
        code: discountCode,
        branch_id: selectedBranchId,
        subtotal: subtotalAfterItemDiscounts,
      },
    }).then((r) => r.data),
    onSuccess: (data) => {
      setAppliedOffer(data.offer);
      message.success(`تم تطبيق كود الخصم: ${data.offer.code}`);
    },
    onError: (err: any) => {
      setAppliedOffer(null);
      message.error(err?.response?.data?.message || 'كود الخصم غير صالح.');
    },
  });

  const applyDiscountCode = () => {
    if (!selectedBranchId) {
      message.error('يرجى اختيار الفرع أولاً.');
      return;
    }

    if (!discountCode.trim()) {
      message.warning('أدخل كود الخصم أولاً.');
      return;
    }

    if (cart.length === 0) {
      message.warning('أضف منتجات للسلة قبل تطبيق كود الخصم.');
      return;
    }

    validateDiscountMutation.mutate();
  };

  const handlePrintInvoice = async () => {
    if (!lastInvoice) return;

    try {
      const response = await api.get(`/sales/${lastInvoice.id}/invoice`, {
        responseType: 'blob',
      });

      const fileUrl = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const opened = window.open(fileUrl, '_blank');

      if (!opened) {
        window.location.href = fileUrl;
      }

      window.setTimeout(() => URL.revokeObjectURL(fileUrl), 60_000);
    } catch {
      message.error('تعذر فتح الفاتورة. حاول مرة أخرى.');
    }
  };

  const cartColumns = [
    { title: 'المنتج', dataIndex: 'name', key: 'name', width: '35%', render: (v: string) => <Text style={{ fontSize: 13 }}>{v}</Text> },
    {
      title: 'الكمية', key: 'qty', width: '28%',
      render: (_: any, r: CartItem) => (
        <div>
          <Space size={4}>
            <Button
              size="middle"
              icon={<MinusOutlined />}
              onClick={() => updateQty(r.cart_key, r.quantity - 1)}
              style={{ width: 36, height: 36, minWidth: 36 }}
            />
            <Text style={{ minWidth: 24, textAlign: 'center', display: 'inline-block', fontSize: 15, fontWeight: 600 }}>{r.quantity}</Text>
            <Button
              size="middle"
              icon={<PlusOutlined />}
              onClick={() => updateQty(r.cart_key, r.quantity + 1)}
              style={{ width: 36, height: 36, minWidth: 36 }}
            />
          </Space>
          {r.unit && <Text type="secondary" style={{ fontSize: 11 }}>{r.unit}</Text>}
        </div>
      ),
    },
    { title: 'المجموع', dataIndex: 'line_total', key: 'total', render: (v: number) => <Text strong style={{ fontSize: 13 }}>{v.toFixed(2)}</Text> },
    {
      title: '', key: 'del', width: 40,
      render: (_: any, r: CartItem) => (
        <Button danger icon={<DeleteOutlined />} size="middle" type="text" onClick={() => removeFromCart(r.cart_key)} style={{ width: 36, height: 36 }} />
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', gap: 12, height: 'calc(100vh - 112px)', overflow: 'hidden' }}>
      {/* Product Grid */}
      <div style={{ flex: '1 1 60%', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
        {/* Branch selector — always visible, editable only for managers */}
        {canChangeBranch ? (
          <Select
            size="large"
            placeholder="اختر الفرع"
            options={branchOptions}
            value={selectedBranchId}
            onChange={(v) => { setSelectedBranchId(v); setCart([]); setAppliedOffer(null); setDiscountCode(''); }}
            style={{ width: '100%' }}
          />
        ) : (
          <div style={{
            background: '#f5f5f5',
            borderRadius: 8,
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            height: 48,
            border: '1px solid #d9d9d9',
          }}>
            <ShopOutlined style={{ color: '#8B5E3C', fontSize: 18 }} />
            <Text strong style={{ fontSize: 15 }}>
              {branchOptions.find((b: any) => b.value === selectedBranchId)?.label ?? 'لم يتحدد الفرع'}
            </Text>
          </div>
        )}
        <Input
          prefix={<SearchOutlined />}
          placeholder={'بحث عن منتج أو مسح الباركود...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="large"
          allowClear
          style={{ height: 48, fontSize: 15 }}
        />
        <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 8, WebkitOverflowScrolling: 'touch' }}>
          <Row gutter={[12, 12]}>
            {isLoading && <Col span={24} style={{ textAlign: 'center', padding: 40 }}><Text type="secondary">جاري التحميل...</Text></Col>}
            {(productsData ?? []).map((p: any) => (
              <Col xs={12} sm={8} md={8} key={p.id}>
                <Card
                  hoverable
                  onClick={() => openUnitPicker(p)}
                  style={{ textAlign: 'center', cursor: 'pointer', borderRadius: 12, userSelect: 'none', touchAction: 'manipulation' }}
                  styles={{ body: { padding: '14px 10px' } }}
                >
                  <Text strong ellipsis style={{ display: 'block', fontSize: 14, lineHeight: 1.4 }}>
                    {p.name_ar || p.name}
                  </Text>
                  {p.name_ar && p.name && p.name_ar !== p.name && (
                    <Text type="secondary" ellipsis style={{ display: 'block', fontSize: 11 }}>{p.name}</Text>
                  )}
                  {p.unit && (
                    <Text type="secondary" style={{ display: 'block', fontSize: 11, marginTop: 2 }}>
                      الوحدة: {p.unit}
                    </Text>
                  )}
                  <Tag color="blue" style={{ marginTop: 6, fontSize: 13, padding: '2px 8px' }}>
                    {parseFloat(p.sale_price).toFixed(2)} ر.س
                  </Tag>
                  <br />
                  <Text type="secondary" style={{ fontSize: 11 }}>مخزون: {p.branch_stock ?? '—'}</Text>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </div>

      {/* Cart */}
      <div style={{ flex: '0 0 380px', display: 'flex', flexDirection: 'column', minWidth: 320 }}>
        <Card
          style={{ height: '100%', borderRadius: 12 }}
          styles={{ body: { display: 'flex', flexDirection: 'column', height: '100%', padding: '12px 16px' } }}
        >
          <Title level={5} style={{ margin: 0 }}>🛒 السلة</Title>
          <Divider style={{ margin: '10px 0' }} />

          <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <Table
              dataSource={cart}
              columns={cartColumns}
              rowKey="cart_key"
              pagination={false}
              size="small"
              locale={{ emptyText: 'اضغط على المنتجات للإضافة' }}
              style={{ minHeight: 60 }}
            />
          </div>

          <Divider style={{ margin: '10px 0' }} />

          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Row justify="space-between">
              <Text type="secondary">المجموع الجزئي</Text>
              <Text>{subtotal.toFixed(2)} ر.س</Text>
            </Row>
            <Row justify="space-between">
              <Text type="secondary">بعد خصم الأصناف</Text>
              <Text>{subtotalAfterItemDiscounts.toFixed(2)} ر.س</Text>
            </Row>
            <Row justify="space-between">
              <Text type="secondary">خصم الكوبون</Text>
              <Text style={{ color: promoDiscountAmount > 0 ? '#cf1322' : undefined }}>
                - {promoDiscountAmount.toFixed(2)} ر.س
              </Text>
            </Row>
            <Row justify="space-between">
              <Text type="secondary">الضريبة</Text>
              <Text>{taxTotal.toFixed(2)} ر.س</Text>
            </Row>
            <Row justify="space-between" style={{ marginTop: 4 }}>
              <Text strong style={{ fontSize: 17 }}>الإجمالي</Text>
              <Text strong style={{ fontSize: 17, color: '#8B5E3C' }}>{grandTotal.toFixed(2)} ر.س</Text>
            </Row>
          </Space>

          <Space.Compact style={{ width: '100%', marginTop: 10 }}>
            <Input
              placeholder="كود الخصم"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
              allowClear
              size="large"
            />
            <Button size="large" loading={validateDiscountMutation.isPending} onClick={applyDiscountCode}>
              تطبيق
            </Button>
            <Button size="large" onClick={() => { setAppliedOffer(null); setDiscountCode(''); }}>
              إزالة
            </Button>
          </Space.Compact>

          {appliedOffer && (
            <div style={{ marginTop: 6 }}>
              <Tag color="green">{appliedOffer.name} ({appliedOffer.code})</Tag>
            </div>
          )}

          <Button
            type="primary"
            size="large"
            block
            style={{ marginTop: 12, background: '#8B5E3C', height: 54, fontSize: 16, borderRadius: 10 }}
            disabled={cart.length === 0}
            onClick={() => setPayModalOpen(true)}
          >
            الدفع — {grandTotal.toFixed(2)} ر.س
          </Button>

          <Button danger block style={{ marginTop: 8, height: 44, borderRadius: 10 }} onClick={() => setCart([])}>
            تفريغ السلة
          </Button>
        </Card>
      </div>

      {/* Payment Modal */}
      <Modal
        title={`اختر الوحدة / الوزن — ${unitPickerProduct?.name_ar || unitPickerProduct?.name || ''}`}
        open={unitPickerOpen}
        onCancel={() => {
          setUnitPickerOpen(false);
          setUnitPickerProduct(null);
          unitForm.resetFields();
        }}
        onOk={() => unitForm.submit()}
        okText="إضافة للسلة"
        cancelText="إلغاء"
      >
        <Form form={unitForm} layout="vertical" onFinish={submitUnitPicker}>
          <Form.Item
            name="unit"
            label="الوحدة / الوزن"
            rules={[{ required: true, message: 'اختر الوحدة أو الوزن' }]}
          >
            <Select options={unitWeightOptions} placeholder="اختر الوحدة / الوزن" />
          </Form.Item>
          <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8, padding: '10px 12px' }}>
            <Text type="secondary">سعر الوحدة المختارة</Text>
            <br />
            <Text strong style={{ fontSize: 18, color: '#8B5E3C' }}>{previewUnitPrice.toFixed(2)} ر.س</Text>
          </div>
        </Form>
      </Modal>

      <Modal
        title="إتمام الدفع"
        open={payModalOpen}
        onCancel={() => setPayModalOpen(false)}
        footer={null}
        width={480}
      >
        <Form form={payForm} layout="vertical" onFinish={handleCheckout} initialValues={{ payment_method: 'cash' }}>
          {canChangeBranch && (
            <Form.Item label="الفرع">
              <Select
                options={branchOptions}
                value={selectedBranchId}
                onChange={(value) => setSelectedBranchId(value)}
                placeholder="اختر الفرع"
              />
            </Form.Item>
          )}
          <Form.Item label="طريقة الدفع" name="payment_method" rules={[{ required: true }]}>
            <Radio.Group>
              <Radio.Button value="cash">نقدي</Radio.Button>
              <Radio.Button value="card">بطاقة</Radio.Button>
              <Radio.Button value="bank_transfer">تحويل بنكي</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="المبلغ المطلوب">
            <Input value={`${grandTotal.toFixed(2)} ر.س`} readOnly size="large" style={{ fontWeight: 700 }} />
          </Form.Item>
          <Form.Item label="المبلغ المدفوع" name="paid_amount" rules={[{ required: true, message: 'أدخل المبلغ المدفوع' }]}>
            <InputNumber min={grandTotal} style={{ width: '100%' }} size="large" suffix=" ر.س" />
          </Form.Item>
          <Form.Item label="ملاحظات" name="notes">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            loading={createSaleMutation.isPending}
            style={{ background: '#8B5E3C' }}
          >
            تأكيد وإتمام البيع
          </Button>
        </Form>
      </Modal>

      {/* Success Modal */}
      <Modal
        open={successModal}
        onCancel={() => setSuccessModal(false)}
        footer={null}
        centered
        width={400}
      >
        <div style={{ textAlign: 'center', padding: 24 }}>
          <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a' }} />
          <Title level={4} style={{ marginTop: 16 }}>تمت عملية البيع!</Title>
          <Text>Invoice: {lastInvoice?.invoice_number}</Text>
          <br />
          <Text strong style={{ fontSize: 18 }}>{parseFloat(lastInvoice?.total_amount ?? 0).toFixed(2)} ر.س</Text>
          <br /><br />
          <Button icon={<PrinterOutlined />} onClick={handlePrintInvoice} style={{ marginRight: 8 }}>
            طباعة الفاتورة
          </Button>
          <Button type="primary" onClick={() => setSuccessModal(false)} style={{ background: '#8B5E3C' }}>
            بيع جديد
          </Button>
        </div>
      </Modal>
    </div>
  );
}

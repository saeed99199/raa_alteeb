import { Card, Typography, Space, Tag, Button } from 'antd';
import { ToolOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

interface Props {
  title: string;
  description: string;
  status?: 'ready' | 'partial' | 'planned';
}

const statusColor = {
  ready: 'green',
  partial: 'gold',
  planned: 'blue',
} as const;

export default function ModulePlaceholder({ title, description, status = 'partial' }: Props) {
  return (
    <Card bordered={false} style={{ borderRadius: 16 }}>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Tag color={statusColor[status]} style={{ width: 'fit-content' }}>
          {status.toUpperCase()}
        </Tag>
        <Title level={4} style={{ margin: 0 }}>
          {title}
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          {description}
        </Paragraph>
        <Text type="secondary">
          This page is now stable and no longer blank. You can continue using other modules while this one is expanded.
        </Text>
      </Space>
    </Card>
  );
}

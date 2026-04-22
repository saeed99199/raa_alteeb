import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Grid, Space, Tag, Tabs, Typography, message } from 'antd';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from '@hello-pangea/dnd';
import { ArrowLeftOutlined, ArrowRightOutlined, DragOutlined } from '@ant-design/icons';

const { Text } = Typography;

type TaskRecord = {
  id: number;
  title: string;
  description?: string | null;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date?: string | null;
  assignee?: { user?: { name: string } };
};

const COLUMNS: Array<{ key: TaskRecord['status']; title: string; color: string }> = [
  { key: 'todo',        title: 'قيد الانتظار',       color: '#6366f1' },
  { key: 'in_progress', title: 'جاري', color: '#f59e0b' },
  { key: 'review',      title: 'مراجعة',      color: '#3b82f6' },
  { key: 'done',        title: 'منتهية',        color: '#10b981' },
];

const STATUS_ORDER: TaskRecord['status'][] = ['todo', 'in_progress', 'review', 'done'];

// ── Memoized card — only re-renders when its own props change ──
type CardProps = {
  task: TaskRecord; index: number; canManageAll: boolean;
  isMobile: boolean; isDark: boolean; isSaving: boolean;
  onMove: (task: TaskRecord, step: -1 | 1) => void;
};

const KanbanCard = memo(function KanbanCard({ task, index, canManageAll, isMobile, isDark, isSaving, onMove }: CardProps) {
  return (
    <Draggable draggableId={`task-${task.id}`} index={index} isDragDisabled={!canManageAll}>
      {(dp, ds) => (
        <div
          ref={dp.innerRef}
          {...dp.draggableProps}
          {...dp.dragHandleProps}
          style={{
            borderRadius: 10, marginBottom: 10,
            touchAction: canManageAll ? 'none' : 'auto',
            opacity: isSaving ? 0.7 : 1,
            transition: 'opacity 0.2s',
            background: isDark ? '#26262c' : '#fff',
            border: `1px solid ${ds.isDragging
              ? (isDark ? 'rgba(139,94,60,0.8)' : '#4f8ef7')
              : (isDark ? 'rgba(255,255,255,0.10)' : '#e5e7eb')}`,
            boxShadow: ds.isDragging
              ? (isDark ? '0 16px 32px rgba(0,0,0,0.6)' : '0 16px 32px rgba(21,49,95,0.18)')
              : (isDark ? '0 1px 3px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.07)'),
            padding: '12px 14px',
            cursor: canManageAll ? 'grab' : 'default',
            ...dp.draggableProps.style,
          }}
        >
          <Space direction="vertical" size={6} style={{ width: '100%' }}>
            <Space style={{ width: '100%', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Text strong style={{ color: isDark ? '#f0f0f0' : '#1f2937', fontSize: 13 }}>{task.title}</Text>
              {canManageAll && <DragOutlined style={{ color: isDark ? '#6b6b7a' : '#9ca3af', flexShrink: 0 }} />}
            </Space>
            {task.description
              ? <Text type="secondary" ellipsis={{ tooltip: task.description }} style={{ fontSize: 12, display: 'block' }}>{task.description}</Text>
              : null}
            <Space size={4} wrap>
              <Tag style={{ margin: 0, borderRadius: 6, fontSize: 11 }}
                color={task.priority === 'high' ? 'red' : task.priority === 'medium' ? 'orange' : 'green'}>
                {task.priority}
              </Tag>
              {task.due_date ? <Tag style={{ margin: 0, borderRadius: 6, fontSize: 11 }}>{task.due_date}</Tag> : null}
            </Space>
            {task.assignee?.user?.name
              ? <Text type="secondary" style={{ fontSize: 11 }}>👤 {task.assignee.user.name}</Text>
              : null}
            {isMobile && canManageAll ? (
              <Space style={{ marginTop: 2 }}>
                <Button size="small" icon={<ArrowLeftOutlined />}
                  onClick={() => onMove(task, -1)}
                  disabled={STATUS_ORDER.indexOf(task.status) === 0 || isSaving}
                  style={{ borderRadius: 6 }} />
                <Button size="small" type="primary" icon={<ArrowRightOutlined />}
                  onClick={() => onMove(task, 1)}
                  disabled={STATUS_ORDER.indexOf(task.status) === STATUS_ORDER.length - 1 || isSaving}
                  style={{ borderRadius: 6 }} />
              </Space>
            ) : null}
          </Space>
        </div>
      )}
    </Draggable>
  );
});

// ── Memoized column ──
type ColProps = {
  column: (typeof COLUMNS)[number]; tasks: TaskRecord[];
  canManageAll: boolean; isMobile: boolean; isDark: boolean;
  savingIds: Set<number>; onMove: (task: TaskRecord, step: -1 | 1) => void;
};

const KanbanColumn = memo(function KanbanColumn({ column, tasks, canManageAll, isMobile, isDark, savingIds, onMove }: ColProps) {
  return (
    <div style={{ flex: isMobile ? '0 0 88vw' : '1 1 0', minWidth: isMobile ? 290 : 220 }}>
      <div style={{
        padding: '10px 14px 8px', borderRadius: '10px 10px 0 0',
        background: isDark ? '#18181c' : '#f8f9fc',
        border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e5e7eb',
        borderBottom: `3px solid ${column.color}`,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: column.color, flexShrink: 0, display: 'inline-block' }} />
        <Text strong style={{ color: isDark ? '#e5e7eb' : '#374151', fontSize: 13, flex: 1 }}>{column.title}</Text>
        <Badge count={tasks.length} style={{ background: isDark ? '#2d2d35' : '#e5e7eb', color: isDark ? '#a0a0b0' : '#374151', boxShadow: 'none', fontSize: 11 }} />
      </div>
      <Droppable droppableId={column.key} isDropDisabled={!canManageAll}>
        {(dp, ds) => (
          <div ref={dp.innerRef} {...dp.droppableProps} style={{
            minHeight: 480, padding: 10, borderRadius: '0 0 10px 10px',
            background: ds.isDraggingOver
              ? (isDark ? 'rgba(139,94,60,0.18)' : 'rgba(79,142,247,0.07)')
              : (isDark ? '#1c1c22' : '#f3f4f6'),
            border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e5e7eb',
            borderTop: 'none', transition: 'background 0.15s ease',
          }}>
            {tasks.map((task, index) => (
              <KanbanCard key={task.id} task={task} index={index}
                canManageAll={canManageAll} isMobile={isMobile}
                isDark={isDark} isSaving={savingIds.has(task.id)} onMove={onMove} />
            ))}
            {dp.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
});

// ── Main page ──
export default function KanbanPage() {
  const qc = useQueryClient();
  const screens = Grid.useBreakpoint();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const role = useAuthStore((s) => s.user?.role ?? '');
  const mode = useThemeStore((s) => s.mode);
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<string>('todo');
  const isDark = mode === 'dark';
  const isMobile = !screens.md;

  const canManageAll =
    hasPermission('tasks.manage_all') || role === 'admin' || role === 'super_admin' || role.includes('manager');

  const { data: tasksResp, isLoading } = useQuery({
    queryKey: ['kanban-tasks'],
    queryFn: () => api.get('/hr/tasks', { params: { per_page: 200 } }).then((r) => r.data),
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  const [localTasks, setLocalTasks] = useState<TaskRecord[]>([]);
  useEffect(() => { setLocalTasks(tasksResp?.data ?? []); }, [tasksResp]);

  const grouped = useMemo(() => {
    const map: Record<string, TaskRecord[]> = { todo: [], in_progress: [], review: [], done: [] };
    for (const t of localTasks) { if (map[t.status]) map[t.status].push(t); }
    return map;
  }, [localTasks]);

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: TaskRecord['status']; previousStatus: TaskRecord['status'] }) =>
      api.patch(`/hr/tasks/${id}`, { status }),
    onSuccess: (_r, vars) => {
      const updater = (old: any) => {
        if (!old?.data) return old;
        return { ...old, data: old.data.map((t: TaskRecord) => t.id === vars.id ? { ...t, status: vars.status } : t) };
      };
      qc.setQueryData(['kanban-tasks'], updater);
      qc.setQueryData(['employee-tasks'], updater);
    },
    onError: (_e: any, vars) => {
      setLocalTasks((prev) => prev.map((t) => t.id === vars.id ? { ...t, status: vars.previousStatus } : t));
      message.error('Failed to move task.');
    },
    onSettled: (_r, _e, vars) => {
      setSavingIds((prev) => { const next = new Set(prev); next.delete(vars.id); return next; });
    },
  });

  const handleMove = useCallback((task: TaskRecord, step: -1 | 1) => {
    if (!canManageAll || savingIds.has(task.id)) return;
    const nextIndex = STATUS_ORDER.indexOf(task.status) + step;
    if (nextIndex < 0 || nextIndex >= STATUS_ORDER.length) return;
    const targetStatus = STATUS_ORDER[nextIndex];
    setLocalTasks((prev) => prev.map((x) => x.id === task.id ? { ...x, status: targetStatus } : x));
    setSavingIds((prev) => new Set(prev).add(task.id));
    updateMutation.mutate({ id: task.id, status: targetStatus, previousStatus: task.status });
  }, [canManageAll, savingIds, updateMutation]);

  const onDragEnd = useCallback((result: DropResult) => {
    if (!canManageAll) return;
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    const taskId = Number(draggableId.replace('task-', ''));
    const targetStatus = destination.droppableId as TaskRecord['status'];
    const previousStatus = localTasks.find((t) => t.id === taskId)?.status ?? 'todo';
    setLocalTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: targetStatus } : t));
    setSavingIds((prev) => new Set(prev).add(taskId));
    updateMutation.mutate({ id: taskId, status: targetStatus, previousStatus });
  }, [canManageAll, localTasks, updateMutation]);

  // ── Mobile: tabs layout ──
  if (isMobile) {
    return (
      <div style={{ padding: '0 2px' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
          size="small"
          items={COLUMNS.map((column) => ({
            key: column.key,
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: column.color, display: 'inline-block' }} />
                {column.title}
                <Badge count={grouped[column.key]?.length ?? 0}
                  style={{ background: column.color, fontSize: 10, height: 16, lineHeight: '16px', minWidth: 16 }} />
              </span>
            ),
            children: (
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId={column.key} isDropDisabled={!canManageAll}>
                  {(dp, ds) => (
                    <div ref={dp.innerRef} {...dp.droppableProps} style={{
                      minHeight: '65vh', padding: 10, borderRadius: '0 0 12px 12px',
                      background: ds.isDraggingOver
                        ? (isDark ? 'rgba(139,94,60,0.15)' : 'rgba(79,142,247,0.06)')
                        : (isDark ? '#1c1c22' : '#f3f4f6'),
                      transition: 'background 0.15s',
                    }}>
                      {(grouped[column.key] || []).length === 0
                        ? <div style={{ textAlign: 'center', padding: '40px 20px', color: isDark ? '#555' : '#bbb', fontSize: 13 }}>لا توجد مهام</div>
                        : null}
                      {(grouped[column.key] || []).map((task, index) => (
                        <KanbanCard key={task.id} task={task} index={index}
                          canManageAll={canManageAll} isMobile={true}
                          isDark={isDark} isSaving={savingIds.has(task.id)} onMove={handleMove} />
                      ))}
                      {dp.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            ),
          }))}
        />
      </div>
    );
  }

  // ── Desktop: horizontal columns ──
  return (
    <Card bordered={false} style={{ borderRadius: 16, background: isDark ? '#141418' : '#f8f9fc' }}
      loading={isLoading} bodyStyle={{ padding: '16px 20px' }}>
      <Text strong style={{ fontSize: 16, color: isDark ? '#e5e7eb' : '#1f2937', marginBottom: 16, display: 'block' }}>
        لوحة كانبان
      </Text>
      <DragDropContext onDragEnd={onDragEnd}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          {COLUMNS.map((column) => (
            <KanbanColumn key={column.key} column={column} tasks={grouped[column.key] || []}
              canManageAll={canManageAll} isMobile={false}
              isDark={isDark} savingIds={savingIds} onMove={handleMove} />
          ))}
        </div>
      </DragDropContext>
    </Card>
  );
}

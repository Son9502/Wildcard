import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { listTasks, createTask, completeTask } from '../data/tasks';
import { listTodaysEvents, createEvent } from '../data/schedule';
import { logEvent } from '../data/eventLog';
import { COLORS } from '../constants/colors';
import type { Task, ScheduleEvent } from '../types';

function formatDate(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDue(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'today';
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return 'tomorrow';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function parseDue(s: string): string | null {
  if (!s.trim()) return null;
  const d = new Date(s.trim());
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function parseTime(s: string): string {
  const match = s.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return new Date().toISOString();
  const d = new Date();
  d.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return d.toISOString();
}

export default function HomeScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [taskModal, setTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [taskBusy, setTaskBusy] = useState(false);

  const [eventModal, setEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventBusy, setEventBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [t, e] = await Promise.all([listTasks(), listTodaysEvents()]);
      setTasks(t.filter((x) => !x.completedAt));
      setEvents(e);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  async function handleCompleteTask(task: Task) {
    try {
      await completeTask(task.id);
      await logEvent({ type: 'task_completed', taskId: task.id });
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleCreateTask() {
    if (!taskTitle.trim()) return;
    setTaskBusy(true);
    try {
      const task = await createTask({
        title: taskTitle.trim(),
        dueAt: parseDue(taskDue),
      });
      setTasks((prev) => [...prev, task]);
      setTaskTitle('');
      setTaskDue('');
      setTaskModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setTaskBusy(false);
    }
  }

  async function handleCreateEvent() {
    if (!eventTitle.trim()) return;
    setEventBusy(true);
    try {
      const ev = await createEvent({
        title: eventTitle.trim(),
        startsAt: parseTime(eventTime),
      });
      setEvents((prev) =>
        [...prev, ev].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
      );
      setEventTitle('');
      setEventTime('');
      setEventModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setEventBusy(false);
    }
  }

  function closeTaskModal() {
    setTaskModal(false);
    setTaskTitle('');
    setTaskDue('');
  }

  function closeEventModal() {
    setEventModal(false);
    setEventTitle('');
    setEventTime('');
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.pageHeader}>
        <Text style={s.heading}>Today</Text>
        <Text style={s.date}>{formatDate()}</Text>
      </View>

      {error ? <Text style={s.errorBanner}>{error}</Text> : null}

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
          />
        }
      >
        {/* ── Schedule ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionLabel}>Schedule</Text>
          <TouchableOpacity onPress={() => setEventModal(true)}>
            <Text style={s.addLink}>+ Add</Text>
          </TouchableOpacity>
        </View>
        {events.length === 0 ? (
          <Text style={s.empty}>Nothing scheduled today.</Text>
        ) : (
          events.map((ev) => (
            <View key={ev.id} style={s.eventRow}>
              <Text style={s.eventTime}>{formatTime(ev.startsAt)}</Text>
              <Text style={s.eventTitle} numberOfLines={1}>{ev.title}</Text>
            </View>
          ))
        )}

        {/* ── Tasks ── */}
        <View style={[s.sectionHeader, { marginTop: 28 }]}>
          <Text style={s.sectionLabel}>Tasks</Text>
        </View>
        {tasks.length === 0 ? (
          <Text style={s.empty}>No open tasks. Tap + to add one.</Text>
        ) : (
          tasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={s.taskRow}
              onPress={() => handleCompleteTask(task)}
              activeOpacity={0.55}
            >
              <View style={s.taskCircle} />
              <View style={s.taskBody}>
                <Text style={s.taskTitle}>{task.title}</Text>
                {task.dueAt && (
                  <Text style={s.taskDue}>Due {formatDue(task.dueAt)}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* FAB — new task */}
      <TouchableOpacity style={s.fab} onPress={() => setTaskModal(true)}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>

      {/* ── Task Modal ── */}
      <Modal
        visible={taskModal}
        transparent
        animationType="slide"
        onRequestClose={closeTaskModal}
      >
        <KeyboardAvoidingView
          style={s.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>New Task</Text>
            <TextInput
              style={s.sheetInput}
              value={taskTitle}
              onChangeText={setTaskTitle}
              placeholder="What needs doing?"
              placeholderTextColor={COLORS.textDim}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreateTask}
            />
            <TextInput
              style={s.sheetInput}
              value={taskDue}
              onChangeText={setTaskDue}
              placeholder="Due date (YYYY-MM-DD) — optional"
              placeholderTextColor={COLORS.textDim}
            />
            <View style={s.sheetActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={closeTaskModal}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.confirmBtn}
                onPress={handleCreateTask}
                disabled={taskBusy}
              >
                {taskBusy ? (
                  <ActivityIndicator color={COLORS.bg} />
                ) : (
                  <Text style={s.confirmText}>Add Task</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Event Modal ── */}
      <Modal
        visible={eventModal}
        transparent
        animationType="slide"
        onRequestClose={closeEventModal}
      >
        <KeyboardAvoidingView
          style={s.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>New Event</Text>
            <TextInput
              style={s.sheetInput}
              value={eventTitle}
              onChangeText={setEventTitle}
              placeholder="Event title"
              placeholderTextColor={COLORS.textDim}
              autoFocus
            />
            <TextInput
              style={s.sheetInput}
              value={eventTime}
              onChangeText={setEventTime}
              placeholder="Time (HH:MM) — optional"
              placeholderTextColor={COLORS.textDim}
              keyboardType="numbers-and-punctuation"
            />
            <View style={s.sheetActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={closeEventModal}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.confirmBtn}
                onPress={handleCreateEvent}
                disabled={eventBusy}
              >
                {eventBusy ? (
                  <ActivityIndicator color={COLORS.bg} />
                ) : (
                  <Text style={s.confirmText}>Add Event</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  pageHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  date: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  errorBanner: {
    color: COLORS.error,
    fontSize: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'rgba(224,85,85,0.08)',
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textDim,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  addLink: { fontSize: 13, color: COLORS.accent },
  empty: { fontSize: 13, color: COLORS.textMuted, paddingVertical: 8 },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  eventTime: {
    fontSize: 12,
    color: COLORS.accent,
    fontVariant: ['tabular-nums'],
    width: 52,
  },
  eventTitle: { fontSize: 15, color: COLORS.text, flex: 1 },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  taskCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: COLORS.textDim,
    marginTop: 2,
  },
  taskBody: { flex: 1 },
  taskTitle: { fontSize: 15, color: COLORS.text, lineHeight: 21 },
  taskDue: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: { fontSize: 26, color: COLORS.bg, fontWeight: '300', lineHeight: 30 },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: COLORS.bgElevated,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  sheetInput: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelText: { fontSize: 14, color: COLORS.textMuted },
  confirmBtn: {
    flex: 2,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: COLORS.accent,
  },
  confirmText: { fontSize: 14, fontWeight: '600', color: COLORS.bg },
});

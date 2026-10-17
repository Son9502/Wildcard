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
import { supabase } from '../lib/supabase';
import { listTasks, createTask, completeTask, deleteTask } from '../data/tasks';
import { listTodaysEvents, createEvent } from '../data/schedule';
import { listOverdueConfidants } from '../data/confidants';
import { logEvent } from '../data/eventLog';
import { COLORS } from '../constants/colors';
import type { Task, ScheduleEvent, Confidant } from '../types';

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
  const [overdue, setOverdue] = useState<Confidant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Task creation modal
  const [taskModal, setTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [taskBusy, setTaskBusy] = useState(false);

  // Task detail modal
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);

  // Event creation modal
  const [eventModal, setEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventBusy, setEventBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [t, e, od] = await Promise.all([listTasks(), listTodaysEvents(), listOverdueConfidants()]);
      setTasks(t.filter((x) => !x.completedAt));
      setEvents(e);
      setOverdue(od);
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
    setDetailBusy(true);
    try {
      await completeTask(task.id);
      // Update UI immediately after the DB write succeeds.
      // logEvent is best-effort — a failure there shouldn't keep the task on screen.
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      setDetailTask(null);
      logEvent({ type: 'task_completed', taskId: task.id }).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDetailBusy(false);
    }
  }

  async function handleDeleteTask(task: Task) {
    setDetailBusy(true);
    try {
      await deleteTask(task.id);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      setDetailTask(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDetailBusy(false);
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

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* ── Page header ── */}
      <View style={s.pageHeader}>
        <View>
          <Text style={s.heading}>Today</Text>
          <Text style={s.date}>{formatDate()}</Text>
        </View>
        <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
          <Text style={s.signOutText}>Sign out</Text>
        </TouchableOpacity>
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
        {/* ── Overdue check-ins ── */}
        {overdue.length > 0 && (
          <View style={s.nudgeCard}>
            <Text style={s.nudgeLabel}>
              {overdue.length === 1 ? 'Overdue check-in' : `${overdue.length} overdue check-ins`}
            </Text>
            {overdue.map((c) => (
              <View key={c.id} style={s.nudgeRow}>
                <View style={s.nudgeDot} />
                <View style={s.nudgeBody}>
                  <Text style={s.nudgeName}>{c.name}</Text>
                  {c.questionsQueued.length > 0 && (
                    <Text style={s.nudgeQuestion} numberOfLines={1}>
                      Ask: {c.questionsQueued[0]}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

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
              onPress={() => setDetailTask(task)}
              activeOpacity={0.55}
            >
              <View style={s.taskCircle} />
              <View style={s.taskBody}>
                <Text style={s.taskTitle}>{task.title}</Text>
                {task.dueAt && (
                  <Text style={s.taskDue}>Due {formatDue(task.dueAt)}</Text>
                )}
              </View>
              <Text style={s.taskChevron}>›</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* FAB — new task */}
      <TouchableOpacity style={s.fab} onPress={() => setTaskModal(true)}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>

      {/* ── Task Detail Modal ── */}
      <Modal
        visible={!!detailTask}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailTask(null)}
      >
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />

            {detailTask && (
              <>
                <Text style={s.sheetTitle} numberOfLines={2}>
                  {detailTask.title}
                </Text>
                {detailTask.dueAt && (
                  <Text style={s.detailDue}>Due {formatDue(detailTask.dueAt)}</Text>
                )}

                <View style={s.detailStatus}>
                  <View style={s.statusDot} />
                  <Text style={s.statusText}>Open</Text>
                </View>

                <View style={s.sheetActions}>
                  <TouchableOpacity
                    style={s.deleteBtn}
                    onPress={() => handleDeleteTask(detailTask)}
                    disabled={detailBusy}
                  >
                    {detailBusy ? (
                      <ActivityIndicator color={COLORS.error} />
                    ) : (
                      <Text style={s.deleteText}>Delete</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.confirmBtn}
                    onPress={() => handleCompleteTask(detailTask)}
                    disabled={detailBusy}
                  >
                    {detailBusy ? (
                      <ActivityIndicator color={COLORS.bg} />
                    ) : (
                      <Text style={s.confirmText}>Mark Complete</Text>
                    )}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={s.cancelBtn} onPress={() => setDetailTask(null)}>
                  <Text style={s.cancelText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Task Creation Modal ── */}
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
            <View style={s.sheetHandle} />
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

      {/* ── Event Creation Modal ── */}
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
            <View style={s.sheetHandle} />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  date: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  signOutBtn: { paddingTop: 4 },
  signOutText: { fontSize: 13, color: COLORS.textDim },
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
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  taskCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: COLORS.textDim,
  },
  taskBody: { flex: 1 },
  taskTitle: { fontSize: 15, color: COLORS.text, lineHeight: 21 },
  taskDue: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  taskChevron: { fontSize: 20, color: COLORS.textDim, lineHeight: 22 },
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
    paddingTop: 12,
    paddingBottom: 36,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
    lineHeight: 24,
  },
  detailDue: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 16,
  },
  detailStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
  },
  statusText: { fontSize: 13, color: COLORS.accent },
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
    marginBottom: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelText: { fontSize: 14, color: COLORS.textMuted },
  deleteBtn: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  deleteText: { fontSize: 14, color: COLORS.error },
  confirmBtn: {
    flex: 2,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: COLORS.accent,
  },
  confirmText: { fontSize: 14, fontWeight: '600', color: COLORS.bg },
  nudgeCard: {
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: 'rgba(224,85,85,0.05)',
    padding: 14,
    marginBottom: 24,
    gap: 8,
  },
  nudgeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.error,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  nudgeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  nudgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.error,
    marginTop: 6,
    flexShrink: 0,
  },
  nudgeBody: { flex: 1 },
  nudgeName: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  nudgeQuestion: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
});

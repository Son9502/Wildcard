import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { listConfidants, createConfidant } from '../data/confidants';
import { COLORS } from '../constants/colors';
import type { Confidant } from '../types';
import ConfidantDetailScreen from './ConfidantDetailScreen';

function daysSince(iso: string | null): string {
  if (!iso) return 'Never';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function isOverdue(c: Confidant): boolean {
  if (!c.lastContactAt) return true;
  const days = (Date.now() - new Date(c.lastContactAt).getTime()) / 86_400_000;
  return days > 14;
}

export default function ConfidantsScreen() {
  const [confidants, setConfidants] = useState<Confidant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [addModal, setAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addBusy, setAddBusy] = useState(false);

  const [selected, setSelected] = useState<Confidant | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setConfidants(await listConfidants());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  async function handleAdd() {
    const name = addName.trim();
    if (!name) return;
    setAddBusy(true);
    try {
      const c = await createConfidant(name);
      setConfidants((prev) => [...prev, c]);
      setAddName('');
      setAddModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAddBusy(false);
    }
  }

  function handleUpdate(updated: Confidant) {
    setConfidants((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setSelected(updated);
  }

  function handleDelete() {
    setConfidants((prev) => prev.filter((c) => c.id !== selected?.id));
    setSelected(null);
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.pageHeader}>
        <Text style={s.heading}>Confidant Log</Text>
        <TouchableOpacity style={s.addHeaderBtn} onPress={() => setAddModal(true)}>
          <Text style={s.addHeaderText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={s.errorBanner}>{error}</Text> : null}

      <FlatList
        data={confidants}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
        }
        contentContainerStyle={s.listContent}
        renderItem={({ item }) => {
          const overdue = isOverdue(item);
          return (
            <TouchableOpacity
              style={s.row}
              onPress={() => setSelected(item)}
              activeOpacity={0.6}
            >
              <View style={s.rowLeft}>
                {overdue && <View style={s.overdueIndicator} />}
                <View style={s.rowBody}>
                  <Text style={s.name}>{item.name}</Text>
                  <View style={s.metaRow}>
                    <Text style={[s.meta, overdue && s.metaOverdue]}>
                      {daysSince(item.lastContactAt)}
                    </Text>
                    {item.questionsQueued.length > 0 && (
                      <Text style={s.questionBadge} numberOfLines={1}>
                        Ask: {item.questionsQueued[0]}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
              <Text style={s.chevron}>›</Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={s.empty}>No confidants yet. Tap + Add to create one.</Text>
        }
      />

      {/* Add Modal */}
      <Modal
        visible={addModal}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModal(false)}
      >
        <KeyboardAvoidingView
          style={s.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Add Confidant</Text>
            <TextInput
              style={s.sheetInput}
              value={addName}
              onChangeText={setAddName}
              placeholder="Name"
              placeholderTextColor={COLORS.textDim}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
            <View style={s.sheetActions}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => { setAddModal(false); setAddName(''); }}
              >
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.confirmBtn}
                onPress={handleAdd}
                disabled={addBusy}
              >
                {addBusy
                  ? <ActivityIndicator color={COLORS.bg} />
                  : <Text style={s.confirmText}>Add</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Detail — full-screen modal */}
      <Modal
        visible={!!selected}
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        {selected && (
          <ConfidantDetailScreen
            confidant={selected}
            onBack={() => setSelected(null)}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        )}
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  heading: { fontSize: 26, fontWeight: '700', color: COLORS.text, letterSpacing: 0.3 },
  addHeaderBtn: { paddingVertical: 4, paddingHorizontal: 2 },
  addHeaderText: { fontSize: 14, color: COLORS.accent },
  errorBanner: {
    color: COLORS.error,
    fontSize: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'rgba(224,85,85,0.08)',
  },
  listContent: { paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  overdueIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.error,
    flexShrink: 0,
  },
  rowBody: { flex: 1 },
  name: { fontSize: 15, fontWeight: '500', color: COLORS.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 3, flexWrap: 'wrap' },
  meta: { fontSize: 12, color: COLORS.textMuted },
  metaOverdue: { color: COLORS.error },
  questionBadge: { fontSize: 12, color: COLORS.textDim, flex: 1 },
  chevron: { fontSize: 20, color: COLORS.textDim, lineHeight: 22, marginLeft: 8 },
  empty: {
    fontSize: 13,
    color: COLORS.textMuted,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
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
  sheetTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: 14 },
  sheetInput: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  sheetActions: { flexDirection: 'row', gap: 10 },
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

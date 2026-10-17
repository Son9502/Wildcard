import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  logContact,
  updateFollowUps,
  updateQuestionsQueued,
  deleteConfidant,
} from '../data/confidants';
import { logEvent } from '../data/eventLog';
import { COLORS } from '../constants/colors';
import type { Confidant } from '../types';

interface Props {
  confidant: Confidant;
  onBack: () => void;
  onUpdate: (updated: Confidant) => void;
  onDelete: () => void;
}

function daysSince(iso: string | null): string {
  if (!iso) return 'Never contacted';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

export default function ConfidantDetailScreen({ confidant, onBack, onUpdate, onDelete }: Props) {
  const [local, setLocal] = useState<Confidant>(confidant);
  const [logBusy, setLogBusy] = useState(false);
  const [newFollowUp, setNewFollowUp] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogContact() {
    setLogBusy(true);
    setError(null);
    try {
      const updated = await logContact(local.id);
      setLocal(updated);
      onUpdate(updated);
      logEvent({ type: 'confidant_contacted', confidantId: local.id }).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLogBusy(false);
    }
  }

  async function addFollowUp() {
    const text = newFollowUp.trim();
    if (!text) return;
    try {
      const updated = await updateFollowUps(local.id, [...local.followUpsOwed, text]);
      setLocal(updated);
      onUpdate(updated);
      setNewFollowUp('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function removeFollowUp(idx: number) {
    try {
      const updated = await updateFollowUps(
        local.id,
        local.followUpsOwed.filter((_, i) => i !== idx),
      );
      setLocal(updated);
      onUpdate(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function addQuestion() {
    const text = newQuestion.trim();
    if (!text) return;
    try {
      const updated = await updateQuestionsQueued(local.id, [...local.questionsQueued, text]);
      setLocal(updated);
      onUpdate(updated);
      setNewQuestion('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function removeQuestion(idx: number) {
    try {
      const updated = await updateQuestionsQueued(
        local.id,
        local.questionsQueued.filter((_, i) => i !== idx),
      );
      setLocal(updated);
      onUpdate(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleDelete() {
    setDeleteBusy(true);
    try {
      await deleteConfidant(local.id);
      onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setDeleteBusy(false);
      setConfirmDelete(false);
    }
  }

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.heading} numberOfLines={1}>{local.name}</Text>
        <View style={{ width: 52 }} />
      </View>

      {error ? <Text style={s.errorBanner}>{error}</Text> : null}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

          {/* Last contact */}
          <View style={s.contactCard}>
            <View>
              <Text style={s.contactLabel}>Last contact</Text>
              <Text style={s.contactValue}>{daysSince(local.lastContactAt)}</Text>
            </View>
            <TouchableOpacity style={s.logBtn} onPress={handleLogContact} disabled={logBusy}>
              {logBusy
                ? <ActivityIndicator color={COLORS.bg} size="small" />
                : <Text style={s.logBtnText}>Log Contact</Text>}
            </TouchableOpacity>
          </View>

          {/* Follow-ups */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Follow-ups owed</Text>
            {local.followUpsOwed.length === 0 && (
              <Text style={s.empty}>Nothing pending.</Text>
            )}
            {local.followUpsOwed.map((item, i) => (
              <View key={i} style={s.itemRow}>
                <Text style={s.itemText} numberOfLines={2}>{item}</Text>
                <TouchableOpacity onPress={() => removeFollowUp(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={s.removeText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
            <View style={s.addRow}>
              <TextInput
                style={s.addInput}
                value={newFollowUp}
                onChangeText={setNewFollowUp}
                placeholder="Add follow-up…"
                placeholderTextColor={COLORS.textDim}
                returnKeyType="done"
                onSubmitEditing={addFollowUp}
              />
              <TouchableOpacity style={s.addBtn} onPress={addFollowUp}>
                <Text style={s.addBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Questions */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Questions to ask</Text>
            {local.questionsQueued.length === 0 && (
              <Text style={s.empty}>No questions queued.</Text>
            )}
            {local.questionsQueued.map((q, i) => (
              <View key={i} style={s.itemRow}>
                <Text style={s.itemText} numberOfLines={2}>{q}</Text>
                <TouchableOpacity onPress={() => removeQuestion(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={s.removeText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
            <View style={s.addRow}>
              <TextInput
                style={s.addInput}
                value={newQuestion}
                onChangeText={setNewQuestion}
                placeholder="Add question…"
                placeholderTextColor={COLORS.textDim}
                returnKeyType="done"
                onSubmitEditing={addQuestion}
              />
              <TouchableOpacity style={s.addBtn} onPress={addQuestion}>
                <Text style={s.addBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Delete */}
          <View style={s.section}>
            {!confirmDelete ? (
              <TouchableOpacity style={s.deleteBtn} onPress={() => setConfirmDelete(true)}>
                <Text style={s.deleteText}>Delete Confidant</Text>
              </TouchableOpacity>
            ) : (
              <View style={s.confirmRow}>
                <Text style={s.confirmPrompt}>Remove {local.name} permanently?</Text>
                <View style={s.confirmActions}>
                  <TouchableOpacity
                    style={s.cancelConfirm}
                    onPress={() => setConfirmDelete(false)}
                    disabled={deleteBusy}
                  >
                    <Text style={s.cancelConfirmText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.confirmDeleteBtn}
                    onPress={handleDelete}
                    disabled={deleteBusy}
                  >
                    {deleteBusy
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={s.confirmDeleteText}>Yes, delete</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  back: { fontSize: 14, color: COLORS.accent, width: 52 },
  heading: { fontSize: 17, fontWeight: '600', color: COLORS.text, flex: 1, textAlign: 'center' },
  errorBanner: {
    color: COLORS.error,
    fontSize: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'rgba(224,85,85,0.08)',
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60 },
  contactCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 24,
  },
  contactLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textDim,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  contactValue: { fontSize: 16, color: COLORS.text, fontWeight: '500' },
  logBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 110,
    alignItems: 'center',
  },
  logBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.bg },
  section: { marginBottom: 28 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textDim,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  empty: { fontSize: 13, color: COLORS.textMuted, paddingVertical: 4, marginBottom: 8 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  itemText: { flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 20 },
  removeText: { fontSize: 20, color: COLORS.textDim, lineHeight: 22, paddingHorizontal: 4 },
  addRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  addInput: {
    flex: 1,
    height: 44,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 14,
    paddingHorizontal: 12,
  },
  addBtn: {
    width: 42,
    height: 44,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { fontSize: 20, color: COLORS.accent, lineHeight: 24 },
  deleteBtn: {
    borderWidth: 1,
    borderColor: COLORS.error,
    paddingVertical: 13,
    alignItems: 'center',
  },
  deleteText: { fontSize: 14, color: COLORS.error },
  confirmRow: {
    borderWidth: 1,
    borderColor: COLORS.error,
    padding: 16,
    gap: 12,
  },
  confirmPrompt: { fontSize: 14, color: COLORS.text },
  confirmActions: { flexDirection: 'row', gap: 10 },
  cancelConfirm: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 11,
    alignItems: 'center',
  },
  cancelConfirmText: { fontSize: 13, color: COLORS.textMuted },
  confirmDeleteBtn: {
    flex: 2,
    backgroundColor: COLORS.error,
    paddingVertical: 11,
    alignItems: 'center',
  },
  confirmDeleteText: { fontSize: 13, fontWeight: '600', color: '#fff' },
});

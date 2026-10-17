import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sendChatMessage, type ChatMessage } from '../lib/anthropic';
import { COLORS } from '../constants/colors';

export default function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  async function submit() {
    const text = draft.trim();
    if (!text || sending) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setDraft('');
    setSending(true);
    setError(null);

    try {
      const reply = await sendChatMessage(next);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get a response.');
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.pageHeader}>
        <Text style={s.heading}>Chat</Text>
        <Text style={s.sub}>Protagonist agent</Text>
      </View>

      <KeyboardAvoidingView
        style={s.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          style={s.list}
          contentContainerStyle={s.listContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => (
            <View style={[s.bubble, item.role === 'user' ? s.bubbleUser : s.bubbleAgent]}>
              <Text style={[s.bubbleText, item.role === 'user' ? s.textUser : s.textAgent]}>
                {item.content}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={s.empty}>
              Ask your protagonist agent anything — tasks, scheduling, decisions.
            </Text>
          }
        />

        {error && <Text style={s.error}>{error}</Text>}
        {sending && (
          <View style={s.typing}>
            <ActivityIndicator size="small" color={COLORS.accent} />
            <Text style={s.typingText}>Thinking…</Text>
          </View>
        )}

        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Message… (Shift+Enter for newline)"
            placeholderTextColor={COLORS.textDim}
            multiline
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={submit}
            onKeyPress={(e: any) => {
              if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                e.nativeEvent.preventDefault();
                submit();
              }
            }}
          />
          <TouchableOpacity style={s.sendBtn} onPress={submit} disabled={sending}>
            <Text style={s.sendIcon}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  heading: { fontSize: 26, fontWeight: '700', color: COLORS.text, letterSpacing: 0.3 },
  sub: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  kav: { flex: 1 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  empty: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 60,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  bubble: {
    maxWidth: '82%',
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.accent,
  },
  bubbleAgent: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  textUser: { color: COLORS.bg },
  textAgent: { color: COLORS.text },
  error: {
    color: COLORS.error,
    fontSize: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: 'rgba(224,85,85,0.08)',
  },
  typing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: { fontSize: 12, color: COLORS.textMuted },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxHeight: 120,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: { fontSize: 18, color: COLORS.bg, fontWeight: '600' },
});

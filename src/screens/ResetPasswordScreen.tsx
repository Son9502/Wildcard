import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { COLORS } from '../constants/colors';

function passwordRequirements(pw: string) {
  return [
    { met: pw.length >= 8, label: '8+ characters' },
    { met: /[A-Z]/.test(pw), label: 'Uppercase letter' },
    { met: /[0-9]/.test(pw), label: 'Number' },
    { met: /[^A-Za-z0-9]/.test(pw), label: 'Special character' },
  ];
}

interface Props {
  onDone: () => void;
}

export default function ResetPasswordScreen({ onDone }: Props) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const reqs = passwordRequirements(password);
  const allMet = reqs.every((r) => r.met);
  const matches = password === confirm;

  async function handleReset() {
    if (!allMet) {
      setMessage({ text: 'Password does not meet all requirements.', isError: true });
      return;
    }
    if (!matches) {
      setMessage({ text: 'Passwords do not match.', isError: true });
      return;
    }
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setMessage({ text: error.message, isError: true });
    } else {
      setMessage({ text: 'Password updated! Signing you in…', isError: false });
      setTimeout(onDone, 1500);
    }
  }

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView
        style={s.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.brand}>
          <Text style={s.title}>WILDCARD</Text>
          <Text style={s.tagline}>Set a new password</Text>
        </View>

        {message && (
          <Text style={[s.message, message.isError ? s.messageError : s.messageOk]}>
            {message.text}
          </Text>
        )}

        <TextInput
          style={s.input}
          value={password}
          onChangeText={setPassword}
          placeholder="New password"
          placeholderTextColor={COLORS.textDim}
          secureTextEntry
          autoComplete="new-password"
          returnKeyType="next"
        />
        <TextInput
          style={s.input}
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Confirm new password"
          placeholderTextColor={COLORS.textDim}
          secureTextEntry
          autoComplete="new-password"
          returnKeyType="done"
          onSubmitEditing={handleReset}
        />

        {password.length > 0 && (
          <View style={s.requirements}>
            {reqs.map((r) => (
              <View key={r.label} style={s.reqRow}>
                <Text style={[s.reqDot, r.met ? s.reqMet : s.reqUnmet]}>
                  {r.met ? '✓' : '○'}
                </Text>
                <Text style={[s.reqLabel, r.met ? s.reqMet : s.reqUnmet]}>{r.label}</Text>
              </View>
            ))}
            {confirm.length > 0 && (
              <View style={s.reqRow}>
                <Text style={[s.reqDot, matches ? s.reqMet : s.reqUnmet]}>
                  {matches ? '✓' : '○'}
                </Text>
                <Text style={[s.reqLabel, matches ? s.reqMet : s.reqUnmet]}>
                  Passwords match
                </Text>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[s.primaryBtn, (!allMet || !matches) && s.btnDisabled]}
          onPress={handleReset}
          disabled={loading || !allMet || !matches}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.bg} />
          ) : (
            <Text style={s.primaryBtnText}>Update Password</Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  brand: { marginBottom: 36 },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: 5,
    marginBottom: 6,
  },
  tagline: { fontSize: 14, color: COLORS.textMuted },
  message: { fontSize: 13, marginBottom: 14, lineHeight: 18 },
  messageError: { color: COLORS.error },
  messageOk: { color: COLORS.green },
  input: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 12,
  },
  requirements: {
    marginBottom: 16,
    gap: 6,
  },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reqDot: { fontSize: 13, width: 16 },
  reqLabel: { fontSize: 12 },
  reqMet: { color: COLORS.green },
  reqUnmet: { color: COLORS.textDim },
  primaryBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.45 },
  primaryBtnText: {
    color: COLORS.bg,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
  },
});

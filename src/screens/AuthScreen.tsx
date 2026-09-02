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

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  async function signIn() {
    if (!email.trim() || !password) return;
    setMessage(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) setMessage({ text: error.message, isError: true });
  }

  async function signUp() {
    if (!email.trim() || !password) return;
    setMessage(null);
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      setMessage({ text: error.message, isError: true });
    } else {
      setMessage({ text: 'Check your email to confirm your account.', isError: false });
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
          <Text style={s.tagline}>Your protagonist layer</Text>
        </View>

        {message && (
          <Text style={[s.message, message.isError ? s.messageError : s.messageOk]}>
            {message.text}
          </Text>
        )}

        <TextInput
          style={s.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={COLORS.textDim}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          returnKeyType="next"
        />
        <TextInput
          style={s.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={COLORS.textDim}
          secureTextEntry
          autoComplete="password"
          returnKeyType="done"
          onSubmitEditing={signIn}
        />

        <TouchableOpacity style={s.primaryBtn} onPress={signIn} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={COLORS.bg} />
          ) : (
            <Text style={s.primaryBtnText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={s.ghostBtn} onPress={signUp} disabled={loading}>
          <Text style={s.ghostBtnText}>Create account</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  brand: { marginBottom: 40 },
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
  primaryBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  primaryBtnText: {
    color: COLORS.bg,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  ghostBtn: { paddingVertical: 12, alignItems: 'center' },
  ghostBtnText: { color: COLORS.textMuted, fontSize: 14 },
});

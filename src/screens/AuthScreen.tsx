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

type Screen = 'signIn' | 'signUp' | 'forgot';

function passwordRequirements(pw: string) {
  return [
    { met: pw.length >= 8, label: '8+ characters' },
    { met: /[A-Z]/.test(pw), label: 'Uppercase letter' },
    { met: /[0-9]/.test(pw), label: 'Number' },
    { met: /[^A-Za-z0-9]/.test(pw), label: 'Special character' },
  ];
}

export default function AuthScreen() {
  const [screen, setScreen] = useState<Screen>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const reqs = passwordRequirements(password);
  const passwordStrong = reqs.every((r) => r.met);
  const passwordsMatch = password === confirm;

  function switchTo(s: Screen) {
    setScreen(s);
    setMessage(null);
    setPassword('');
    setConfirm('');
  }

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
    if (!passwordStrong) {
      setMessage({ text: 'Please meet all password requirements.', isError: true });
      return;
    }
    if (!passwordsMatch) {
      setMessage({ text: 'Passwords do not match.', isError: true });
      return;
    }
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
      setMessage({
        text: 'Account created! Check your email for a confirmation link, then sign in.',
        isError: false,
      });
      switchTo('signIn');
    }
  }

  async function sendResetEmail() {
    if (!email.trim()) {
      setMessage({ text: 'Enter your email address first.', isError: true });
      return;
    }
    setMessage(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    });
    setLoading(false);
    if (error) {
      setMessage({ text: error.message, isError: true });
    } else {
      setMessage({
        text: 'Reset link sent! Check your email and click the link to set a new password.',
        isError: false,
      });
    }
  }

  // ── Forgot password screen ────────────────────────────────────────────────
  if (screen === 'forgot') {
    return (
      <SafeAreaView style={s.container}>
        <KeyboardAvoidingView
          style={s.inner}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={s.brand}>
            <Text style={s.title}>WILDCARD</Text>
            <Text style={s.tagline}>Reset your password</Text>
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
            returnKeyType="send"
            onSubmitEditing={sendResetEmail}
          />

          <TouchableOpacity style={s.primaryBtn} onPress={sendResetEmail} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={COLORS.bg} />
            ) : (
              <Text style={s.primaryBtnText}>Send Reset Link</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={s.ghostBtn} onPress={() => switchTo('signIn')}>
            <Text style={s.ghostBtnText}>Back to sign in</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Sign up screen ────────────────────────────────────────────────────────
  if (screen === 'signUp') {
    return (
      <SafeAreaView style={s.container}>
        <KeyboardAvoidingView
          style={s.inner}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={s.brand}>
            <Text style={s.title}>WILDCARD</Text>
            <Text style={s.tagline}>Create your account</Text>
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
            autoComplete="new-password"
            returnKeyType="next"
          />
          <TextInput
            style={s.input}
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Confirm password"
            placeholderTextColor={COLORS.textDim}
            secureTextEntry
            autoComplete="new-password"
            returnKeyType="done"
            onSubmitEditing={signUp}
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
                  <Text style={[s.reqDot, passwordsMatch ? s.reqMet : s.reqUnmet]}>
                    {passwordsMatch ? '✓' : '○'}
                  </Text>
                  <Text style={[s.reqLabel, passwordsMatch ? s.reqMet : s.reqUnmet]}>
                    Passwords match
                  </Text>
                </View>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[s.primaryBtn, (!passwordStrong || !passwordsMatch) && s.btnDisabled]}
            onPress={signUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.bg} />
            ) : (
              <Text style={s.primaryBtnText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={s.ghostBtn} onPress={() => switchTo('signIn')}>
            <Text style={s.ghostBtnText}>Already have an account? Sign in</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Sign in screen (default) ──────────────────────────────────────────────
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

        <TouchableOpacity
          style={s.forgotLink}
          onPress={() => switchTo('forgot')}
        >
          <Text style={s.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.primaryBtn} onPress={signIn} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={COLORS.bg} />
          ) : (
            <Text style={s.primaryBtnText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={s.ghostBtn} onPress={() => switchTo('signUp')}>
          <Text style={s.ghostBtnText}>Create account</Text>
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
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    marginTop: -4,
  },
  forgotText: { fontSize: 13, color: COLORS.textMuted },
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
    marginBottom: 10,
  },
  btnDisabled: { opacity: 0.45 },
  primaryBtnText: {
    color: COLORS.bg,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  ghostBtn: { paddingVertical: 12, alignItems: 'center' },
  ghostBtnText: { color: COLORS.textMuted, fontSize: 14 },
});

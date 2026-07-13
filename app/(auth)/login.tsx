import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Screen, Subtitle, Title } from '@/components/ui';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, spacing } from '@/theme';
import type { User } from '@/types';

export default function Login() {
  const router = useRouter();
  const signIn = useAppStore((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  const go = (provider: User['provider']) => {
    const e =
      provider === 'phone'
        ? email || '+10000000000'
        : email || 'demo@fitplan.app';
    signIn(e, name, provider);
    router.replace('/(auth)/consent');
  };

  return (
    <Screen>
      <View style={{ gap: spacing.xs, marginTop: spacing.xl }}>
        <Text style={styles.badge}>FITPLAN</Text>
        <Title>Your realistic{'\n'}fitness plan</Title>
        <Subtitle>
          A plan built on real math and expert templates — and simple daily
          tracking that actually sticks.
        </Subtitle>
      </View>

      <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Alex"
          placeholderTextColor={colors.textDim}
          style={styles.input}
        />
        <Text style={styles.label}>Email or phone</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@email.com"
          placeholderTextColor={colors.textDim}
          style={styles.input}
        />
      </View>

      <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
        <Button label="Continue with Email" onPress={() => go('email')} />
        <Button label="Continue with Google" variant="ghost" onPress={() => go('google')} />
        <Button label="Continue with Phone" variant="ghost" onPress={() => go('phone')} />
      </View>

      <Text style={styles.hint}>
        Demo build — any details work. Use an email starting with “admin@” to
        access the admin panel.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: {
    color: colors.primary,
    fontWeight: '800',
    letterSpacing: 3,
    fontSize: font.small,
  },
  label: { color: colors.textDim, fontSize: font.small, fontWeight: '600' },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    color: colors.text,
    fontSize: font.body,
  },
  hint: {
    color: colors.textDim,
    fontSize: font.tiny,
    marginTop: spacing.md,
    lineHeight: 16,
  },
});

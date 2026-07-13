import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Screen, Subtitle, Title } from '@/components/ui';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, spacing } from '@/theme';

export default function Consent() {
  const router = useRouter();
  const acceptConsent = useAppStore((s) => s.acceptConsent);
  const [checked, setChecked] = useState(false);

  const accept = () => {
    acceptConsent();
    router.replace('/onboarding');
  };

  return (
    <Screen>
      <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
        <Title>Before we start</Title>
        <Subtitle>
          FitPlan gives general fitness and nutrition guidance. It is not medical
          advice. Consult a doctor before starting a new program, especially with
          existing conditions or injuries.
        </Subtitle>
      </View>

      <Card>
        <Text style={styles.point}>• Your data stays on this device.</Text>
        <Text style={styles.point}>• Calorie and protein targets are estimates.</Text>
        <Text style={styles.point}>• Stop and seek help if you feel unwell.</Text>
      </Card>

      <Pressable style={styles.checkRow} onPress={() => setChecked((c) => !c)}>
        <View style={[styles.box, checked && styles.boxOn]}>
          {checked ? <Text style={styles.tick}>✓</Text> : null}
        </View>
        <Text style={styles.checkText}>
          I understand and accept the privacy notice and health disclaimer.
        </Text>
      </Pressable>

      <Button label="Accept & continue" onPress={accept} disabled={!checked} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  point: { color: colors.text, fontSize: font.body, lineHeight: 22 },
  checkRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  box: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tick: { color: colors.bg, fontWeight: '900' },
  checkText: { color: colors.textDim, flex: 1, fontSize: font.small, lineHeight: 19 },
});

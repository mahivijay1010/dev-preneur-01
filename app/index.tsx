import { Redirect } from 'expo-router';
import { Dumbbell, Target } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { EnergyLoader, FloatingLayer, Reveal } from '@/components/motion';
import { useAppStore } from '@/store/appStore';
import { colors, radius, spacing } from '@/theme';

// Entry gate: routes the user to the right stage based on persisted state.
export default function Index() {
  const { hydrated, sessionReady, user, plan } = useAppStore();

  if (!hydrated || !sessionReady) {
    return (
      <View style={styles.loadingScreen}>
        <Reveal style={styles.energyCore}>
          <FloatingLayer distance={10}>
            <View style={styles.loadingTarget}>
              <View style={styles.loadingTargetOuter}><View style={styles.loadingTargetInner}><Dumbbell size={24} color={colors.black} /></View></View>
              <Target size={88} color={colors.primaryDim} strokeWidth={0.8} style={styles.loadingTargetGlyph} />
            </View>
          </FloatingLayer>
          <Text style={styles.loadingLabel}>CALIBRATING YOUR WEEK</Text>
          <EnergyLoader />
        </Reveal>
      </View>
    );
  }

  if (!user) return <Redirect href="/(auth)/login" />;
  if (!user.consentAcceptedAt) return <Redirect href="/(auth)/consent" />;
  if (!plan) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)/today" />;
}

const styles = StyleSheet.create({
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', padding: spacing.lg },
  energyCore: { width: 260, height: 220, alignItems: 'center', justifyContent: 'center', gap: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceSunken, borderWidth: 1, borderColor: colors.primaryDim },
  loadingTarget: { width: 104, height: 104, alignItems: 'center', justifyContent: 'center' },
  loadingTargetGlyph: { position: 'absolute' },
  loadingTargetOuter: { width: 66, height: 66, borderRadius: 33, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  loadingTargetInner: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  loadingLabel: { color: colors.text, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
});

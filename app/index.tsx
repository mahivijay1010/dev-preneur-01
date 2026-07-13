import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAppStore } from '@/store/appStore';
import { colors } from '@/theme';

// Entry gate: routes the user to the right stage based on persisted state.
export default function Index() {
  const { hydrated, user, plan } = useAppStore();

  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!user) return <Redirect href="/(auth)/login" />;
  if (!user.consentAcceptedAt) return <Redirect href="/(auth)/consent" />;
  if (!plan) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)/today" />;
}

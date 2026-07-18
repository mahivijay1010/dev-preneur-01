import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RouteTransition } from '@/components/transition';
import { useAppStore } from '@/store/appStore';
import { colors } from '@/theme';

export default function RootLayout() {
  const hydrated = useAppStore((state) => state.hydrated);
  const sessionReady = useAppStore((state) => state.sessionReady);
  const bootstrapSession = useAppStore((state) => state.bootstrapSession);

  useEffect(() => {
    if (hydrated && !sessionReady) void bootstrapSession();
  }, [bootstrapSession, hydrated, sessionReady]);

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        {/* backgroundColor is Android-only; iOS logs a warning if passed. */}
        <StatusBar style="light" {...(Platform.OS === 'android' ? { backgroundColor: colors.bg } : {})} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
            // Native gets a real slide; web animates via the RouteTransition sweep.
            animation: Platform.OS === 'ios' ? 'slide_from_right' : 'fade_from_bottom',
            animationDuration: 300,
            gestureEnabled: true,
          }}
        />
        <RouteTransition />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});

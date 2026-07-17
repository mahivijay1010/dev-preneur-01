import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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
        <StatusBar style="light" backgroundColor={colors.bg} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
            animation: 'fade_from_bottom',
            animationDuration: 280,
          }}
        />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});

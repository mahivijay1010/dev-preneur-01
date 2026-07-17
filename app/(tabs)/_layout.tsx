import { Tabs } from 'expo-router';
import { CalendarDays, ChartNoAxesCombined, ClipboardList, MessageCircle, Settings, Shield } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { Gradient } from '@/components/depth';
import { useAppStore } from '@/store/appStore';
import { colors, font, gradients, radius } from '@/theme';

function Icon({ icon: Icon, focused }: { icon: typeof CalendarDays; focused: boolean }) {
  const focus = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(focus, {
      toValue: focused ? 1 : 0,
      damping: 13,
      stiffness: 220,
      mass: 0.6,
      useNativeDriver: true,
    }).start();
  }, [focus, focused]);

  return (
    <Animated.View style={[styles.iconWrap, focused && styles.iconWrapFocused, { transform: [{ scale: focus.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.1] }) }, { translateY: focus.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) }] }]}>
      {focused ? <Gradient colors={gradients.primary} direction="diagonal" radius={radius.sm} /> : null}
      <View><Icon size={19} color={focused ? colors.black : colors.textDim} strokeWidth={focused ? 2.5 : 2} /></View>
    </Animated.View>
  );
}

export default function TabsLayout() {
  const isAdmin = useAppStore((state) => state.user?.role === 'admin');

  return (
    <Tabs
      sceneContainerStyle={styles.scene}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.label,
        tabBarStyle: styles.bar,
        tabBarItemStyle: styles.item,
      }}
    >
      <Tabs.Screen name="today" options={{ title: 'Today', tabBarIcon: ({ focused }) => <Icon icon={CalendarDays} focused={focused} /> }} />
      <Tabs.Screen name="plan" options={{ title: 'Plan', tabBarIcon: ({ focused }) => <Icon icon={ClipboardList} focused={focused} /> }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: ({ focused }) => <Icon icon={ChartNoAxesCombined} focused={focused} /> }} />
      <Tabs.Screen name="coach" options={{ title: 'Coach', tabBarIcon: ({ focused }) => <Icon icon={MessageCircle} focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ focused }) => <Icon icon={Settings} focused={focused} /> }} />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          href: isAdmin ? '/(tabs)/admin' : null,
          tabBarIcon: ({ focused }) => <Icon icon={Shield} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scene: { backgroundColor: 'transparent' },
  bar: {
    height: 70,
    backgroundColor: colors.bgElevated,
    borderTopColor: colors.border,
    paddingTop: 7,
    paddingBottom: 7,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 12,
  },
  item: { minWidth: 62 },
  label: { fontSize: font.tiny, fontWeight: '700', marginTop: 2 },
  iconWrap: { width: 33, height: 28, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  iconWrapFocused: { backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.45, shadowRadius: 12, elevation: 6 },
});

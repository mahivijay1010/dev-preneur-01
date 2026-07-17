import { useRouter } from 'expo-router';
import {
  BellRing,
  Check,
  ChevronRight,
  Cloud,
  CloudOff,
  LogOut,
  Pencil,
  RefreshCcw,
  RotateCcw,
  ShieldCheck,
  Stethoscope,
  Watch,
} from 'lucide-react-native';
import { Platform, Pressable, StyleSheet, Switch, Text, useWindowDimensions, View } from 'react-native';

import { Button, Card, ChipGroup, PageHeader, ProgressRing, Screen, StatusPill } from '@/components/ui';
import { Reveal } from '@/components/motion';
import { ProteinPicker } from '@/components/ProteinPicker';
import { goalLabel, recommendedProteinPerKg } from '@/engine/nutrition';
import { isAIEnabled } from '@/services/claude';
import { requestPermission, syncReminders } from '@/services/notifications';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, spacing } from '@/theme';
import type { CoachTone } from '@/types';

export default function Profile() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 820;
  const {
    user,
    profile,
    plan,
    regenerate,
    generating,
    signOut,
    setCoachTone,
    setProteinPerKgOverride,
    syncStatus,
    lastSyncedAt,
    syncNow,
    reminderPrefs,
    setReminderPrefs,
    connectedWearables,
    assignedExpertId,
  } = useAppStore();

  const persistReminders = async (next: typeof reminderPrefs) => {
    setReminderPrefs(next);
    await syncReminders(next);
  };

  const toggleReminders = async (enabled: boolean) => {
    if (enabled && Platform.OS !== 'web') {
      const granted = await requestPermission();
      if (!granted) return;
    }
    await persistReminders({ ...reminderPrefs, enabled });
  };

  const bump = (key: 'workoutHour' | 'mealHour' | 'weightHour') => {
    void persistReminders({ ...reminderPrefs, [key]: (reminderPrefs[key] + 1) % 24 });
  };

  const completion = profile && plan ? 100 : profile ? 60 : 20;
  const initials = (user?.name || 'Fit Plan').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  return (
    <Screen maxWidth={1100}>
      <PageHeader
        eyebrow="ACCOUNT & EXPERIENCE"
        title="Your FitPlan settings"
        subtitle="Everything that shapes your plan, coaching, reminders, and connected data."
        action={<StatusPill label={syncStatus === 'offline' ? 'Saved locally' : syncStatus === 'syncing' ? 'Syncing' : 'Cloud synced'} color={syncStatus === 'offline' ? colors.warning : colors.success} icon={syncStatus === 'offline' ? <CloudOff size={13} color={colors.warning} /> : <Cloud size={13} color={colors.success} />} />}
      />

      <Reveal delay={50} style={[styles.accountHero, compact && styles.accountHeroCompact]}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text><View style={styles.onlineDot} /></View>
        <View style={styles.accountCopy}>
          <Text style={styles.accountName}>{user?.name || 'FitPlan member'}</Text>
          <Text style={styles.accountEmail}>{user?.email || 'No email available'}</Text>
          <View style={styles.accountMeta}><ShieldCheck size={15} color={colors.success} /><Text style={styles.accountMetaText}>Private account · MongoDB cloud backup</Text></View>
        </View>
        <View style={styles.syncBox}>
          <Text style={styles.syncLabel}>LAST SYNC</Text>
          <Text style={styles.syncValue}>{lastSyncedAt ? formatRelativeTime(lastSyncedAt) : 'Waiting for first sync'}</Text>
          <Button label="Sync now" variant="ghost" icon={<RefreshCcw size={16} color={colors.text} />} loading={syncStatus === 'syncing'} onPress={() => void syncNow()} style={styles.syncButton} />
        </View>
      </Reveal>

      <View style={[styles.grid, compact && styles.gridCompact]}>
        <Card tone="raised" style={styles.setupCard}>
          <View style={styles.cardHeader}>
            <View><Text style={styles.cardEyebrow}>PLAN FOUNDATION</Text><Text style={styles.cardTitle}>Your setup</Text></View>
            <ProgressRing progress={completion} value={`${completion}%`} label="complete" size={88} />
          </View>
          {profile ? (
            <View style={styles.setupRows}>
              <InfoRow label="Goal" value={goalLabel(profile.goal)} />
              <InfoRow label="Weight route" value={`${profile.currentWeightKg} → ${profile.targetWeightKg} kg`} />
              <InfoRow label="Training" value={`${capitalize(profile.location)} · ${profile.workoutDays.length} days/week`} />
              <InfoRow label="Nutrition" value={`${capitalize(profile.dietType)} · ${profile.cookingTimeMin} min`} />
              <InfoRow label="Personalization" value={isAIEnabled() ? 'Plan-aware AI' : 'Validated smart rules'} />
            </View>
          ) : <Text style={styles.dim}>Finish onboarding to complete your setup.</Text>}
          <Button label="Edit plan setup" variant="ghost" icon={<Pencil size={17} color={colors.text} />} onPress={() => router.push('/onboarding')} />
        </Card>

        <Card tone="raised" style={styles.coachCard}>
          <View><Text style={styles.cardEyebrow}>COACHING PERSONALITY</Text><Text style={styles.cardTitle}>How guidance should feel</Text></View>
          <Text style={styles.dim}>The delivery changes. Your targets and safety rules stay consistent.</Text>
          {profile ? (
            <ChipGroup<CoachTone>
              value={profile.coachTone}
              onChange={setCoachTone}
              options={[
                { label: 'Supportive', value: 'supportive' },
                { label: 'Direct', value: 'direct' },
                { label: 'Scientific', value: 'scientific' },
                { label: 'Minimal', value: 'minimal' },
                { label: 'Competitive', value: 'competitive' },
              ]}
            />
          ) : null}
          <View style={styles.coachPreview}>
            <View style={styles.coachPreviewIcon}><Check size={17} color={colors.black} strokeWidth={3} /></View>
            <Text style={styles.coachPreviewText}>{coachPreview(profile?.coachTone)}</Text>
          </View>
        </Card>

        {profile ? (
          <Card tone="raised" style={styles.proteinCard}>
            <View><Text style={styles.cardEyebrow}>NUTRITION TUNING</Text><Text style={styles.cardTitle}>Daily protein target</Text></View>
            <Text style={styles.dim}>Slide to set your own intake. This updates your plan’s protein target instantly — calories stay the same.</Text>
            <ProteinPicker
              goal={profile.goal}
              weightKg={profile.currentWeightKg}
              value={profile.proteinPerKgOverride ?? recommendedProteinPerKg(profile.goal)}
              overridden={profile.proteinPerKgOverride !== undefined}
              onChange={(value) => setProteinPerKgOverride(value)}
              onReset={() => setProteinPerKgOverride(undefined)}
            />
          </Card>
        ) : null}

        <Card style={styles.remindersCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleWithIcon}><View style={styles.bellIcon}><BellRing size={19} color={colors.warning} /></View><View><Text style={styles.cardEyebrow}>ROUTINE SUPPORT</Text><Text style={styles.cardTitle}>Smart reminders</Text></View></View>
            <Switch value={reminderPrefs.enabled} onValueChange={(value) => void toggleReminders(value)} trackColor={{ true: colors.primaryDim, false: colors.border }} thumbColor={reminderPrefs.enabled ? colors.primary : colors.textDim} />
          </View>
          <Text style={styles.dim}>Reminder choices sync with your account. Device notifications are scheduled locally.</Text>
          <View style={styles.timeGrid}>
            <TimeCard label="Weigh-in" hour={reminderPrefs.weightHour} active={reminderPrefs.enabled} onPress={() => bump('weightHour')} />
            <TimeCard label="Meals" hour={reminderPrefs.mealHour} active={reminderPrefs.enabled} onPress={() => bump('mealHour')} />
            <TimeCard label="Workout" hour={reminderPrefs.workoutHour} active={reminderPrefs.enabled} onPress={() => bump('workoutHour')} />
          </View>
        </Card>

        <Card style={styles.connectionsCard}>
          <View><Text style={styles.cardEyebrow}>CONNECTED CARE</Text><Text style={styles.cardTitle}>Your support system</Text></View>
          <ActionRow icon={<Watch size={19} color={colors.accent} />} label="Devices & health apps" sub={connectedWearables.length ? `${connectedWearables.length} connected` : 'Connect steps, sleep, or weight'} onPress={() => router.push('/devices')} />
          <ActionRow icon={<Stethoscope size={19} color={colors.success} />} label="Expert support" sub={assignedExpertId ? 'Expert assigned' : 'Trainer, dietitian, physio, or coach'} onPress={() => router.push('/experts')} />
          <ActionRow icon={<RotateCcw size={19} color={colors.peach} />} label="Regenerate your plan" sub="Rebuild from your current preferences" onPress={() => void regenerate()} loading={generating} />
        </Card>
      </View>

      <View style={styles.dangerZone}>
        <View><Text style={styles.dangerTitle}>Sign out of this device</Text><Text style={styles.dangerSub}>Your synced plan and account data remain in MongoDB.</Text></View>
        <Button label="Sign out" variant="danger" icon={<LogOut size={17} color={colors.text} />} onPress={() => { signOut(); router.replace('/(auth)/login'); }} style={compact ? styles.signOutCompact : styles.signOut} />
      </View>
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.infoRow}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>;
}

function TimeCard({ label, hour, active, onPress }: { label: string; hour: number; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.timeCard, active && styles.timeCardActive]} onPress={onPress} disabled={!active}>
      <Text style={styles.timeLabel}>{label}</Text>
      <Text style={[styles.timeValue, !active && styles.timeDisabled]}>{String(hour).padStart(2, '0')}:00</Text>
      <Text style={styles.timeHint}>{active ? 'Tap to change' : 'Reminders off'}</Text>
    </Pressable>
  );
}

function ActionRow({ icon, label, sub, onPress, loading = false }: { icon: React.ReactNode; label: string; sub: string; onPress: () => void; loading?: boolean }) {
  return (
    <Pressable style={({ pressed }) => [styles.actionRow, pressed && styles.actionPressed]} onPress={onPress} disabled={loading}>
      <View style={styles.actionIcon}>{loading ? <RefreshCcw size={18} color={colors.textDim} /> : icon}</View>
      <View style={styles.actionCopy}><Text style={styles.actionLabel}>{label}</Text><Text style={styles.actionSub}>{loading ? 'Building your updated week…' : sub}</Text></View>
      <ChevronRight size={18} color={colors.textMuted} />
    </Pressable>
  );
}

function coachPreview(tone?: CoachTone) {
  const messages: Record<CoachTone, string> = {
    supportive: 'You do not need a perfect day. Let’s protect the next useful action.',
    direct: 'Complete the highest-impact action first, then reassess.',
    scientific: 'Your trend matters more than one reading; use the rolling average.',
    minimal: 'Next: log the meal, drink water, continue.',
    competitive: 'Beat last week’s consistency by one deliberate action.',
  };
  return tone ? messages[tone] : 'Finish your setup to personalize your coach.';
}

function formatRelativeTime(value: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return new Date(value).toLocaleDateString();
}

function capitalize(value: string) { return value.charAt(0).toUpperCase() + value.slice(1).replace('_', ' '); }

const styles = StyleSheet.create({
  accountHero: { minHeight: 154, flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.xl, borderRadius: radius.md, backgroundColor: colors.surfaceSunken, borderWidth: 1, borderColor: colors.borderStrong },
  accountHeroCompact: { flexWrap: 'wrap', padding: spacing.lg },
  avatar: { width: 76, height: 76, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, position: 'relative' },
  avatarText: { color: colors.black, fontSize: font.h2, fontWeight: '900' },
  onlineDot: { position: 'absolute', right: -3, bottom: -3, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.success, borderWidth: 3, borderColor: colors.surfaceSunken },
  accountCopy: { flex: 1, minWidth: 220, gap: 3 },
  accountName: { color: colors.text, fontSize: font.h2, fontWeight: '900' },
  accountEmail: { color: colors.textDim, fontSize: font.small },
  accountMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  accountMetaText: { color: colors.textMuted, fontSize: font.tiny },
  syncBox: { minWidth: 210, gap: 4, paddingLeft: spacing.lg, borderLeftWidth: 1, borderLeftColor: colors.border },
  syncLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  syncValue: { color: colors.text, fontSize: font.small, fontWeight: '800' },
  syncButton: { marginTop: spacing.sm },
  grid: { flexDirection: 'row', alignItems: 'stretch', flexWrap: 'wrap', gap: spacing.md },
  gridCompact: { flexDirection: 'column' },
  setupCard: { flexGrow: 1, flexBasis: 500 },
  coachCard: { flexGrow: 1, flexBasis: 500 },
  proteinCard: { flexGrow: 1, flexBasis: 500, gap: spacing.sm },
  remindersCard: { flexGrow: 1, flexBasis: 500 },
  connectionsCard: { flexGrow: 1, flexBasis: 500 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  cardTitleWithIcon: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bellIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.warningDim },
  cardEyebrow: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '900', letterSpacing: 1 },
  cardTitle: { color: colors.text, fontSize: font.h2, fontWeight: '900', marginTop: 3 },
  dim: { color: colors.textDim, fontSize: font.small, lineHeight: 20 },
  setupRows: { gap: 0 },
  infoRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  infoLabel: { color: colors.textMuted, fontSize: font.tiny },
  infoValue: { color: colors.text, fontSize: font.small, fontWeight: '700', textAlign: 'right' },
  coachPreview: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.primarySoft, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primaryDim, marginTop: 'auto' },
  coachPreviewIcon: { width: 30, height: 30, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  coachPreviewText: { flex: 1, color: colors.text, fontSize: font.small, lineHeight: 19, fontWeight: '600' },
  timeGrid: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  timeCard: { flex: 1, minHeight: 94, justifyContent: 'center', gap: 3, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, opacity: 0.58 },
  timeCardActive: { opacity: 1, borderColor: colors.primaryDim, backgroundColor: colors.primarySoft },
  timeLabel: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '700' },
  timeValue: { color: colors.primary, fontSize: font.h3, fontWeight: '900' },
  timeDisabled: { color: colors.textDim },
  timeHint: { color: colors.textMuted, fontSize: 9 },
  actionRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  actionPressed: { opacity: 0.72 },
  actionIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
  actionCopy: { flex: 1, gap: 2 },
  actionLabel: { color: colors.text, fontSize: font.small, fontWeight: '800' },
  actionSub: { color: colors.textMuted, fontSize: font.tiny },
  dangerZone: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#61322D', backgroundColor: '#261714' },
  dangerTitle: { color: colors.text, fontSize: font.small, fontWeight: '800' },
  dangerSub: { color: colors.textDim, fontSize: font.tiny, marginTop: 3 },
  signOut: { marginLeft: 'auto', minWidth: 140 },
  signOutCompact: { width: '100%' },
});

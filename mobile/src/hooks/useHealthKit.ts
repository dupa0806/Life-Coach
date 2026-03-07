import { useState, useCallback } from 'react';
import AppleHealthKit, { HealthKitPermissions, HealthValue } from 'react-native-health';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

export interface HealthData {
  steps: number; heartRate: number; restingHeartRate: number; sleepHours: number;
  activeCalories: number; exerciseMinutes: number; distanceKm: number; standHours: number; lastSynced: Date | null;
}

const PERMISSIONS: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.Steps,
      AppleHealthKit.Constants.Permissions.HeartRate,
      AppleHealthKit.Constants.Permissions.RestingHeartRate,
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
      AppleHealthKit.Constants.Permissions.AppleExerciseTime,
      AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
      AppleHealthKit.Constants.Permissions.AppleStandHour,
    ],
    write: [],
  },
};

export function useHealthKit() {
  const [healthData, setHealthData] = useState<HealthData>({
    steps: 0, heartRate: 0, restingHeartRate: 0, sleepHours: 0,
    activeCalories: 0, exerciseMinutes: 0, distanceKm: 0, standHours: 0, lastSynced: null,
  });
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPermissions = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (Platform.OS !== 'ios') { setError('Apple Health is only available on iOS.'); resolve(false); return; }
      AppleHealthKit.initHealthKit(PERMISSIONS, (err) => {
        if (err) { setError('Could not access Apple Health. Check Settings > Privacy > Health.'); resolve(false); return; }
        setIsAuthorized(true); resolve(true);
      });
    });
  }, []);

  const fetchTodayData = useCallback(async (): Promise<HealthData | null> => {
    if (!isAuthorized) return null;
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const opts = { startDate: startOfDay.toISOString(), endDate: today.toISOString() };
    const yesterday = new Date(startOfDay);
    yesterday.setDate(yesterday.getDate() - 1);
    return new Promise((resolve) => {
      const data: Partial<HealthData> = {};
      let pending = 8;
      const done = () => { if (--pending === 0) resolve({ steps: data.steps ?? 0, heartRate: data.heartRate ?? 0, restingHeartRate: data.restingHeartRate ?? 0, sleepHours: data.sleepHours ?? 0, activeCalories: data.activeCalories ?? 0, exerciseMinutes: data.exerciseMinutes ?? 0, distanceKm: data.distanceKm ?? 0, standHours: data.standHours ?? 0, lastSynced: new Date() }); };
      AppleHealthKit.getStepCount(opts, (e, r: HealthValue) => { if (!e) data.steps = Math.round(r.value || 0); done(); });
      AppleHealthKit.getHeartRateSamples({ ...opts, limit: 1, ascending: false }, (e, r: HealthValue[]) => { if (!e && r.length) data.heartRate = Math.round(r[0].value); done(); });
      AppleHealthKit.getRestingHeartRate(opts, (e, r: HealthValue) => { if (!e) data.restingHeartRate = Math.round(r.value || 0); done(); });
      AppleHealthKit.getSleepSamples({ startDate: yesterday.toISOString(), endDate: today.toISOString() }, (e, r) => { if (!e && r.length) { const ms = r.reduce((a, s) => (s.value === 'ASLEEP' || s.value === 'INBED') ? a + (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) : a, 0); data.sleepHours = Math.round(ms / 360000) / 10; } done(); });
      AppleHealthKit.getActiveEnergyBurned(opts, (e, r: HealthValue[]) => { if (!e && r.length) data.activeCalories = Math.round(r.reduce((a, x) => a + x.value, 0)); done(); });
      AppleHealthKit.getAppleExerciseTime(opts, (e, r: HealthValue) => { if (!e) data.exerciseMinutes = Math.round(r.value || 0); done(); });
      AppleHealthKit.getDistanceWalkingRunning(opts, (e, r: HealthValue) => { if (!e) data.distanceKm = Math.round((r.value || 0) * 10) / 10; done(); });
      AppleHealthKit.getAppleStandTime(opts, (e, r: HealthValue) => { if (!e) data.standHours = Math.round((r.value || 0) / 60); done(); });
    });
  }, [isAuthorized]);

  const syncToSupabase = useCallback(async (userId: string, d: HealthData) => {
    const today = new Date().toISOString().split('T')[0];
    const s = Math.min(100, Math.round((d.sleepHours / 8) * 100));
    const f = Math.min(100, Math.round((d.steps / 10000) * 60 + (d.exerciseMinutes / 30) * 40));
    const h = d.heartRate > 0 ? Math.min(100, Math.max(0, 100 - Math.abs(d.heartRate - 65))) : 50;
    const p = Math.min(100, Math.round((d.activeCalories / 500) * 100));
    const m = Math.min(100, Math.round((d.standHours / 12) * 100));
    const life = Math.round(s * 0.25 + f * 0.25 + h * 0.15 + p * 0.2 + m * 0.15);
    const { error } = await supabase.from('daily_scores').upsert({ user_id: userId, date: today, sleep_score: s, fitness_score: f, productivity_score: p, money_score: 50, mood_score: m, life_score: life, steps: d.steps, heart_rate: d.heartRate, resting_heart_rate: d.restingHeartRate, sleep_hours: d.sleepHours, active_calories: d.activeCalories, exercise_minutes: d.exerciseMinutes, distance_km: d.distanceKm, stand_hours: d.standHours, health_synced_at: new Date().toISOString() }, { onConflict: 'user_id,date' });
    return !error;
  }, []);

  const sync = useCallback(async (userId: string) => {
    setIsSyncing(true); setError(null);
    try {
      const ok = isAuthorized || await requestPermissions();
      if (!ok) return;
      const data = await fetchTodayData();
      if (!data) return;
      setHealthData(data);
      await syncToSupabase(userId, data);
    } catch (e: any) { setError(e.message); }
    finally { setIsSyncing(false); }
  }, [isAuthorized, requestPermissions, fetchTodayData, syncToSupabase]);

  return { healthData, isAuthorized, isSyncing, error, requestPermissions, sync };
}

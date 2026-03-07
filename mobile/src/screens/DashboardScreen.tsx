import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useHealthKit } from '../hooks/useHealthKit';

const GOALS = { steps: 10000, sleep: 8, calories: 500, exercise: 30, distance: 5, standHours: 12 };
const color = (s: number) => s >= 80 ? '#22d3ee' : s >= 60 ? '#a78bfa' : s >= 40 ? '#fb923c' : '#f87171';

function Ring({ score, size = 160 }: { score: number; size?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const c = color(score), stroke = size * 0.075;
  useEffect(() => { Animated.timing(anim, { toValue: score, duration: 1200, useNativeDriver: false }).start(); }, [score]);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
        <Text style={{ fontSize: size * 0.28, fontWeight: '800', color: c, letterSpacing: -2 }}>{score}</Text>
        <Text style={{ fontSize: size * 0.1, color: '#64748b', fontWeight: '600', marginTop: 2 }}>{score >= 80 ? 'Thriving' : score >= 60 ? 'Solid' : score >= 40 ? 'Getting By' : 'Struggling'}</Text>
      </View>
      <View style={{ width: size, height: size, borderRadius: size/2, borderWidth: stroke, borderColor: 'rgba(255,255,255,0.06)', position: 'absolute' }} />
      <View style={{ width: size, height: size, borderRadius: size/2, borderWidth: stroke, borderColor: c, borderTopColor: 'transparent', borderRightColor: 'transparent', position: 'absolute', transform: [{ rotate: ((score/100)*360-90)+'deg' }], opacity: 0.9 }} />
    </View>
  );
}

function Card({ icon, value, unit, goal, col, sub }: { icon: string; value: any; unit: string; goal?: number; col: string; sub?: string }) {
  const n = typeof value === 'number' ? value : parseFloat(value) || 0;
  const p = goal ? Math.min(1, n / goal) : null;
  return (
    <View style={S.card}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        <View style={[S.badge, { backgroundColor: col + '22' }]}><Ionicons name={icon as any} size={18} color={col} /></View>
        {goal && <Text style={{ fontSize: 10, color: '#475569', fontWeight: '600' }}>{Math.round(p! * 100)}%</Text>}
      </View>
      <Text style={[S.val, { color: col }]}>{value}</Text>
      <Text style={S.unit}>{unit}</Text>
      {sub && <Text style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{sub}</Text>}
      {p !== null && <View style={S.bar}><View style={[S.fill, { width: (p*100)+'%', backgroundColor: col }]} /></View>}
    </View>
  );
}

export default function Dashboard({ userId }: { userId: string }) {
  const { healthData: h, isAuthorized, isSyncing, error, sync } = useHealthKit();
  const [score, setScore] = React.useState(0);
  const [refreshing, setRefreshing] = React.useState(false);
  useEffect(() => { sync(userId); }, []);
  useEffect(() => {
    const s = Math.min(100, Math.round((h.sleepHours/8)*100));
    const f = Math.min(100, Math.round((h.steps/10000)*60+(h.exerciseMinutes/30)*40));
    const hr = h.heartRate > 0 ? Math.min(100, Math.max(0, 100-Math.abs(h.heartRate-65))) : 50;
    const p = Math.min(100, Math.round((h.activeCalories/500)*100));
    const m = Math.min(100, Math.round((h.standHours/12)*100));
    setScore(Math.round(s*0.25+f*0.25+hr*0.15+p*0.2+m*0.15));
  }, [h]);
  return (
    <LinearGradient colors={['#0a0a14','#0f0f1e','#0a1628']} style={S.root}>
      <ScrollView contentContainerStyle={S.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async()=>{setRefreshing(true);await sync(userId);setRefreshing(false);}} tintColor="#a78bfa" />} showsVerticalScrollIndicator={false}>
        <View style={S.header}>
          <View>
            <Text style={S.date}>{new Date().toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'})}</Text>
            <Text style={S.title}>Daily Life Score</Text>
          </View>
          <TouchableOpacity style={[S.syncBtn, isSyncing&&{opacity:0.6}]} onPress={()=>sync(userId)} disabled={isSyncing}>
            {isSyncing ? <ActivityIndicator size="small" color="#a78bfa" /> : <Ionicons name="sync" size={18} color="#a78bfa" />}
          </TouchableOpacity>
        </View>
        {!isAuthorized && (
          <TouchableOpacity style={S.banner} onPress={()=>sync(userId)}>
            <LinearGradient colors={['#7c3aed22','#06b6d422']} start={{x:0,y:0}} end={{x:1,y:0}} style={S.bannerInner}>
              <Ionicons name="heart" size={20} color="#f472b6" />
              <View style={{flex:1,marginLeft:12}}><Text style={{color:'#f1f5f9',fontWeight:'700',fontSize:14}}>Connect Apple Health</Text><Text style={{color:'#64748b',fontSize:12,marginTop:2}}>Auto-sync steps, sleep, heart rate and more</Text></View>
              <Ionicons name="chevron-forward" size={18} color="#64748b" />
            </LinearGradient>
          </TouchableOpacity>
        )}
        {isAuthorized && h.lastSynced && (<View style={S.synced}><Ionicons name="checkmark-circle" size={14} color="#22d3ee" /><Text style={{color:'#22d3ee',fontSize:12,marginLeft:6,fontWeight:'600'}}>Synced from Apple Health</Text></View>)}
        <View style={S.scoreCard}>
          <Text style={S.label}>TODAY'S SCORE</Text>
          <View style={{alignItems:'center',marginVertical:24}}><Ring score={score} size={180} /></View>
          <View style={S.breakdown}>
            {[{l:'Sleep',v:Math.min(100,Math.round((h.sleepHours/8)*100)),c:'#818cf8'},{l:'Fitness',v:Math.min(100,Math.round((h.steps/10000)*100)),c:'#34d399'},{l:'Heart',v:Math.min(100,Math.max(0,100-Math.abs(h.heartRate-65))),c:'#f472b6'},{l:'Calories',v:Math.min(100,Math.round((h.activeCalories/500)*100)),c:'#fbbf24'},{l:'Activity',v:Math.min(100,Math.round((h.standHours/12)*100)),c:'#22d3ee'}].map(i=>(<View key={i.l} style={{alignItems:'center'}}><Text style={{color:i.c,fontSize:15,fontWeight:'800'}}>{i.v}</Text><Text style={{color:'#475569',fontSize:10,fontWeight:'600',marginTop:2}}>{i.l.toUpperCase()}</Text></View>))}
          </View>
        </View>
        {error && <View style={S.err}><Ionicons name="warning" size={16} color="#fca5a5" /><Text style={{color:'#fca5a5',fontSize:13,marginLeft:8}}>{error}</Text></View>}
        <Text style={[S.label,{marginBottom:12}]}>HEALTH METRICS</Text>
        <View style={S.grid}>
          <Card icon="footsteps" value={h.steps.toLocaleString()} unit="steps today" goal={GOALS.steps} col="#34d399" />
          <Card icon="moon" value={h.sleepHours} unit="hours" goal={GOALS.sleep} col="#818cf8" />
          <Card icon="heart" value={h.heartRate||'-'} unit="bpm" col="#f472b6" sub={h.restingHeartRate?'Resting: '+h.restingHeartRate:undefined} />
          <Card icon="flame" value={h.activeCalories.toLocaleString()} unit="active cal" goal={GOALS.calories} col="#fbbf24" />
          <Card icon="barbell" value={h.exerciseMinutes} unit="minutes" goal={GOALS.exercise} col="#a78bfa" />
          <Card icon="map" value={h.distanceKm} unit="km" goal={GOALS.distance} col="#22d3ee" />
          <Card icon="body" value={h.standHours} unit="/ 12 hrs" goal={GOALS.standHours} col="#fb923c" />
          <Card icon="pulse" value={h.restingHeartRate||'-'} unit="bpm avg" col="#f472b6" sub="Resting HR" />
        </View>
        <View style={{height:40}} />
      </ScrollView>
    </LinearGradient>
  );
}

const S = StyleSheet.create({
  root:{flex:1}, scroll:{padding:20,paddingTop:60},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20},
  date:{color:'#475569',fontSize:13,fontWeight:'600'}, title:{color:'#f1f5f9',fontSize:22,fontWeight:'800',marginTop:4,letterSpacing:-0.5},
  syncBtn:{width:40,height:40,borderRadius:12,backgroundColor:'rgba(124,58,237,0.15)',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(124,58,237,0.3)'},
  banner:{marginBottom:16,borderRadius:16,overflow:'hidden',borderWidth:1,borderColor:'rgba(124,58,237,0.2)'},
  bannerInner:{flexDirection:'row',alignItems:'center',padding:16},
  synced:{flexDirection:'row',alignItems:'center',marginBottom:16,paddingHorizontal:12,paddingVertical:6,backgroundColor:'rgba(34,211,238,0.08)',borderRadius:99,alignSelf:'flex-start',borderWidth:1,borderColor:'rgba(34,211,238,0.15)'},
  scoreCard:{backgroundColor:'rgba(255,255,255,0.04)',borderRadius:24,padding:24,marginBottom:20,borderWidth:1,borderColor:'rgba(255,255,255,0.08)'},
  label:{fontSize:11,fontWeight:'700',color:'#475569',letterSpacing:1.5},
  breakdown:{flexDirection:'row',justifyContent:'space-between',paddingTop:16,borderTopWidth:1,borderTopColor:'rgba(255,255,255,0.06)'},
  err:{flexDirection:'row',alignItems:'center',backgroundColor:'rgba(248,113,113,0.1)',borderWidth:1,borderColor:'rgba(248,113,113,0.3)',borderRadius:12,padding:12,marginBottom:16},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:10},
  card:{width:'47.5%',backgroundColor:'rgba(255,255,255,0.04)',borderRadius:18,padding:16,borderWidth:1,borderColor:'rgba(255,255,255,0.07)'},
  badge:{width:36,height:36,borderRadius:10,alignItems:'center',justifyContent:'center'},
  val:{fontSize:24,fontWeight:'800',letterSpacing:-0.5,marginBottom:2},
  unit:{fontSize:12,color:'#64748b',fontWeight:'500'},
  bar:{height:3,backgroundColor:'rgba(255,255,255,0.07)',borderRadius:99,marginTop:12,overflow:'hidden'},
  fill:{height:'100%',borderRadius:99},
});

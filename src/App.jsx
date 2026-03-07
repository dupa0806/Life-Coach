import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase.js";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from "recharts";

function calcLifeScore({ sleep, fitness, productivity, money, mood }) {
  return Math.round(sleep * 0.25 + fitness * 0.2 + productivity * 0.25 + money * 0.15 + mood * 0.15);
}
function getLevel(xp) { return Math.floor(xp / 100) + 1; }
function getXpProgress(xp) { return xp % 100; }
function getScoreColor(s) { return s >= 80 ? "#22d3ee" : s >= 60 ? "#a78bfa" : s >= 40 ? "#fb923c" : "#f87171"; }
function getScoreLabel(s) { return s >= 80 ? "Thriving" : s >= 60 ? "Solid" : s >= 40 ? "Getting By" : "Struggling"; }

const S = {
  app: { minHeight:"100vh", background:"linear-gradient(135deg,#0a0a14 0%,#0f0f1e 50%,#0a1628 100%)", fontFamily:"'DM Sans','Helvetica Neue',sans-serif", color:"#e2e8f0", position:"relative", overflow:"hidden" },
  container: { position:"relative", zIndex:1, maxWidth:480, margin:"0 auto", padding:"0 16px", minHeight:"100vh" },
  card: { background:"rgba(255,255,255,0.04)", backdropFilter:"blur(20px)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:20, padding:"28px 24px", marginBottom:16 },
  input: { width:"100%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, padding:"14px 16px", color:"#e2e8f0", fontSize:15, outline:"none", boxSizing:"border-box" },
  label: { display:"block", fontSize:13, fontWeight:600, color:"#94a3b8", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.08em" },
  btn: { width:"100%", padding:"15px 24px", borderRadius:14, border:"none", fontSize:15, fontWeight:700, cursor:"pointer", transition:"all 0.2s" },
  btnPrimary: { background:"linear-gradient(135deg,#7c3aed,#06b6d4)", color:"#fff" },
  btnSecondary: { background:"rgba(255,255,255,0.07)", color:"#e2e8f0", border:"1px solid rgba(255,255,255,0.1)" },
  error: { background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.3)", borderRadius:10, padding:"10px 14px", color:"#fca5a5", fontSize:14, marginBottom:16 },
};

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [msg, setMsg] = useState("");
  async function handleSubmit() {
    setLoading(true); setError(""); setMsg("");
    try {
      if (mode === "login") { const { data, error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; onAuth(data.user); }
      else { const { error } = await supabase.auth.signUp({ email, password }); if (error) throw error; setMsg("Account created! Check your email to confirm, then log in."); setMode("login"); }
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }
  return (
    <div style={{ ...S.container, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:"100%", paddingTop:60 }}>
        <div style={{ textAlign:"center", marginBottom:48 }}>
          <div style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:72, height:72, borderRadius:20, background:"linear-gradient(135deg,#7c3aed,#06b6d4)", marginBottom:20, fontSize:32 }}>⚡</div>
          <h1 style={{ fontSize:36, fontWeight:800, margin:0, background:"linear-gradient(135deg,#c4b5fd,#67e8f9)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", letterSpacing:"-0.02em" }}>Life Score</h1>
          <p style={{ color:"#64748b", fontSize:15, marginTop:8 }}>Gamify your daily life</p>
        </div>
        <div style={S.card}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", background:"rgba(255,255,255,0.04)", borderRadius:12, padding:4, marginBottom:24 }}>
            {["login","signup"].map(m => <button key={m} onClick={() => setMode(m)} style={{ padding:"10px", borderRadius:10, border:"none", fontSize:14, fontWeight:600, cursor:"pointer", background:mode===m?"rgba(124,58,237,0.5)":"transparent", color:mode===m?"#c4b5fd":"#64748b" }}>{m==="login"?"Log In":"Sign Up"}</button>)}
          </div>
          {error && <div style={S.error}>{error}</div>}
          {msg && <div style={{ ...S.error, background:"rgba(34,211,238,0.1)", border:"1px solid rgba(34,211,238,0.3)", color:"#67e8f9" }}>{msg}</div>}
          <div style={{ marginBottom:16 }}><label style={S.label}>Email</label><input style={S.input} type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} /></div>
          <div style={{ marginBottom:24 }}><label style={S.label}>Password</label><input style={S.input} type="password" placeholder="········" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} /></div>
          <button style={{ ...S.btn, ...S.btnPrimary, opacity:loading?0.7:1 }} onClick={handleSubmit} disabled={loading}>{loading?"...":mode==="login"?"Log In →":"Create Account →"}</button>
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  { key:"name", q:"What's your name?", emoji:"👋", type:"text", placeholder:"Your first name" },
  { key:"age", q:"How old are you?", emoji:"🎂", type:"number", placeholder:"Your age" },
  { key:"main_goal", q:"What's your main goal right now?", emoji:"🎯", type:"select", options:["Get Healthier","Be More Productive","Reduce Stress","Build Wealth","Find Balance"] },
  { key:"fitness_level", q:"How would you rate your fitness?", emoji:"💪", type:"select", options:["Beginner","Light","Moderate","Active","Athlete"] },
  { key:"sleep_hours", q:"How many hours do you sleep on average?", emoji:"😴", type:"number", placeholder:"e.g. 7" },
  { key:"stress_level", q:"On a scale of 1–10, your current stress level?", emoji:"🧘", type:"number", placeholder:"1 (calm) to 10 (very stressed)" },
];

function OnboardingScreen({ user, onComplete }) {
  const [step, setStep] = useState(0); const [answers, setAnswers] = useState({}); const [loading, setLoading] = useState(false); const [saveError, setSaveError] = useState("");
  const current = STEPS[step];
  const rawValue = answers[current.key] ?? "";
  const value = rawValue;
  const hasValue = current.type === "number" ? (rawValue !== "" && rawValue !== null) : !!rawValue;

  async function handleNext() {
    if (!hasValue) return;
    if (step + 1 < STEPS.length) { setStep(step + 1); return; }
    setLoading(true); setSaveError("");
    const payload = { ...answers };
    if (payload.age) payload.age = Number(payload.age);
    if (payload.sleep_hours) payload.sleep_hours = Number(payload.sleep_hours);
    if (payload.stress_level) payload.stress_level = Number(payload.stress_level);
    try {
      const { error } = await supabase.from("profiles").update({ ...payload, onboarding_complete: true }).eq("id", user.id);
      if (error) {
        console.error("Onboarding save error:", error);
        setSaveError("Couldn't save — " + error.message + ". Continuing anyway...");
        setTimeout(() => onComplete({ ...payload, id: user.id, onboarding_complete: true }), 1500);
      } else {
        onComplete({ ...payload, id: user.id, onboarding_complete: true });
      }
    } catch(e) {
      console.error("Onboarding exception:", e);
      onComplete({ ...answers, id: user.id, onboarding_complete: true });
    }
    setLoading(false);
  }
  return (
    <div style={{ ...S.container, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:"100%", paddingTop:60 }}>
        <div style={{ height:3, background:"rgba(255,255,255,0.07)", borderRadius:99, marginBottom:48, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${(step/STEPS.length)*100}%`, background:"linear-gradient(90deg,#7c3aed,#06b6d4)", borderRadius:99, transition:"width 0.4s ease" }} />
        </div>
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ fontSize:52, marginBottom:16 }}>{current.emoji}</div>
          <h2 style={{ fontSize:24, fontWeight:700, margin:0, color:"#f1f5f9" }}>{current.q}</h2>
          <p style={{ color:"#475569", fontSize:13, marginTop:8 }}>Step {step+1} of {STEPS.length}</p>
        </div>
        {saveError && <div style={S.error}>{saveError}</div>}
        <div style={{ marginBottom:24 }}>
          {current.type === "select" ? (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {current.options.map(opt => <button key={opt} onClick={() => setAnswers(a=>({...a,[current.key]:opt}))} style={{ padding:"14px 20px", borderRadius:14, border:`1px solid ${value===opt?"rgba(124,58,237,0.6)":"rgba(255,255,255,0.08)"}`, background:value===opt?"rgba(124,58,237,0.2)":"rgba(255,255,255,0.04)", color:value===opt?"#c4b5fd":"#94a3b8", fontSize:15, fontWeight:value===opt?700:400, cursor:"pointer", textAlign:"left" }}>{opt}</button>)}
            </div>
          ) : (
            <input style={S.input} type={current.type} placeholder={current.placeholder} value={value} autoFocus
              onChange={e => setAnswers(a=>({...a,[current.key]:e.target.value}))}
              onKeyDown={e=>e.key==="Enter"&&handleNext()} />
          )}
        </div>
        <button style={{ ...S.btn, ...S.btnPrimary, opacity:!hasValue||loading?0.4:1 }} onClick={handleNext} disabled={!hasValue||loading}>
          {loading?"Saving...":step===STEPS.length-1?"Let's Go! 🚀":"Next →"}
        </button>
      </div>
    </div>
  );
}

function ScoreRing({ score, size = 160 }) {
  const color = getScoreColor(score);
  const stroke = 14;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition:"stroke-dashoffset 1s ease, stroke 0.5s" }} />
    </svg>
  );
}

function ScoreSlider({ label, emoji, value, onChange, color }) {
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <span style={{ fontSize:14, color:"#94a3b8", fontWeight:600 }}>{emoji} {label}</span>
        <span style={{ fontSize:16, fontWeight:800, color }}>{value}</span>
      </div>
      <div style={{ position:"relative", height:6 }}>
        <div style={{ position:"absolute", height:"100%", width:"100%", background:"rgba(255,255,255,0.07)", borderRadius:99 }} />
        <div style={{ position:"absolute", height:"100%", width:`${value}%`, background:`linear-gradient(90deg,${color}88,${color})`, borderRadius:99 }} />
        <input type="range" min={0} max={100} value={value} onChange={e=>onChange(Number(e.target.value))} style={{ position:"absolute", inset:0, width:"100%", opacity:0, cursor:"pointer", height:"100%", margin:0 }} />
      </div>
    </div>
  );
}

function CheckInModal({ user, onSave, onClose, existingScore }) {
  const [scores, setScores] = useState(existingScore||{sleep:50,fitness:50,productivity:50,money:50,mood:50});
  const [loading, setLoading] = useState(false);
  const life = calcLifeScore(scores);
  async function handleSave() {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    const { error } = await supabase.from("daily_scores").upsert({ user_id:user.id, date:today, sleep_score:scores.sleep, fitness_score:scores.fitness, productivity_score:scores.productivity, money_score:scores.money, mood_score:scores.mood, life_score:life }, { onConflict:"user_id,date" });
    if (!error) { await supabase.from("profiles").update({ last_checkin_date:today }).eq("id",user.id); onSave(); }
    setLoading(false);
  }
  const sliders = [{key:"sleep",label:"Sleep Quality",emoji:"😴",color:"#818cf8"},{key:"fitness",label:"Fitness / Movement",emoji:"💪",color:"#34d399"},{key:"productivity",label:"Productivity",emoji:"🧠",color:"#fbbf24"},{key:"money",label:"Financial Discipline",emoji:"💰",color:"#22d3ee"},{key:"mood",label:"Mood / Energy",emoji:"✨",color:"#f472b6"}];
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(8px)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:100 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ width:"100%", maxWidth:480, background:"#0f1629", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"24px 24px 0 0", padding:"24px 20px 40px", maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ width:40, height:4, background:"rgba(255,255,255,0.15)", borderRadius:99, margin:"0 auto 24px" }} />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:800 }}>Daily Check-In</h2>
          <div style={{ padding:"6px 14px", borderRadius:99, background:`${getScoreColor(life)}22`, color:getScoreColor(life), fontWeight:800, fontSize:18 }}>{life}</div>
        </div>
        {sliders.map(s => <ScoreSlider key={s.key} label={s.label} emoji={s.emoji} value={scores[s.key]} onChange={v=>setScores(p=>({...p,[s.key]:v}))} color={s.color} />)}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:28 }}>
          <button style={{ ...S.btn, ...S.btnSecondary }} onClick={onClose}>Cancel</button>
          <button style={{ ...S.btn, ...S.btnPrimary, opacity:loading?0.7:1 }} onClick={handleSave} disabled={loading}>{loading?"Saving...":"Save Score"}</button>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ user, profile: initialProfile }) {
  const [profile, setProfile] = useState(initialProfile);
  const [todayScore, setTodayScore] = useState(null); const [history, setHistory] = useState([]);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const loadData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data: scores } = await supabase.from("daily_scores").select("*").eq("user_id",user.id).order("date",{ascending:false}).limit(30);
      if (scores) { setHistory(scores); setTodayScore(scores.find(s=>s.date===today)||null); }
      const { data: prof } = await supabase.from("profiles").select("*").eq("id",user.id).single();
      if (prof) setProfile(prof);
    } catch(e) { console.error("loadData error:", e); }
  }, [user.id]);
  useEffect(() => { loadData(); }, [loadData]);

  const life = todayScore?.life_score ?? 0;
  const level = getLevel(profile?.xp??0), xpProgress = getXpProgress(profile?.xp??0), streak = profile?.streak??0;
  const chartData = [...history].reverse().map(s=>({date:s.date.slice(5),score:s.life_score}));
  const categories = [{key:"sleep_score",label:"Sleep",emoji:"😴",color:"#818cf8"},{key:"fitness_score",label:"Fitness",emoji:"💪",color:"#34d399"},{key:"productivity_score",label:"Focus",emoji:"🧠",color:"#fbbf24"},{key:"money_score",label:"Money",emoji:"💰",color:"#22d3ee"},{key:"mood_score",label:"Mood",emoji:"✨",color:"#f472b6"}];
  const radarData = categories.map(c=>({subject:c.label,value:todayScore?.[c.key]??0}));

  return (
    <div style={S.container}>
      <div style={{ position:"fixed", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle,rgba(139,92,246,0.12) 0%,transparent 70%)", top:-100, left:-100, pointerEvents:"none", zIndex:0 }} />
      <div style={{ position:"fixed", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(34,211,238,0.08) 0%,transparent 70%)", bottom:-50, right:-50, pointerEvents:"none", zIndex:0 }} />

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"24px 0 8px" }}>
        <div>
          <p style={{ margin:0, color:"#475569", fontSize:13, fontWeight:600 }}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"})}</p>
          <h1 style={{ margin:0, fontSize:22, fontWeight:800, background:"linear-gradient(135deg,#c4b5fd,#67e8f9)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", letterSpacing:"-0.02em" }}>Hey, {profile?.name||"there"} ⚡</h1>
        </div>
        <button onClick={()=>supabase.auth.signOut().then(()=>window.location.reload())} style={{ padding:"8px 14px", borderRadius:10, border:"1px solid rgba(255,255,255,0.08)", background:"transparent", color:"#64748b", fontSize:13, cursor:"pointer" }}>Sign out</button>
      </div>

      <div style={{ display:"flex", gap:10, marginBottom:20 }}>
        {[{label:"Level",value:level,icon:"🏆"},{label:"Streak",value:`${streak}d`,icon:"🔥"},{label:"XP",value:`${xpProgress}/100`,icon:"⚡"}].map(stat=>(
          <div key={stat.label} style={{ flex:1, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:14, padding:"12px 8px", textAlign:"center" }}>
            <div style={{ fontSize:18, marginBottom:4 }}>{stat.icon}</div>
            <div style={{ fontSize:18, fontWeight:800, color:"#f1f5f9" }}>{stat.value}</div>
            <div style={{ fontSize:11, color:"#475569", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ ...S.card, textAlign:"center", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, background:`radial-gradient(circle at 50% 50%,${getScoreColor(life)}08 0%,transparent 70%)` }} />
        <p style={{ margin:"0 0 8px", fontSize:11, fontWeight:700, color:"#475569", letterSpacing:"0.1em", textTransform:"uppercase" }}>TODAY'S LIFE SCORE</p>
        <div style={{ position:"relative", display:"inline-block" }}>
          <ScoreRing score={life} size={160} />
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:44, fontWeight:800, color:getScoreColor(life), lineHeight:1, letterSpacing:"-0.03em" }}>{life}</span>
            <span style={{ fontSize:13, color:"#64748b", fontWeight:600, marginTop:4 }}>{getScoreLabel(life)}</span>
          </div>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:20, paddingTop:16, borderTop:"1px solid rgba(255,255,255,0.06)" }}>
          {categories.map(c=>(
            <div key={c.key} style={{ textAlign:"center" }}>
              <div style={{ fontSize:14 }}>{c.emoji}</div>
              <div style={{ fontSize:14, fontWeight:700, color:c.color, marginTop:2 }}>{todayScore?.[c.key]??"--"}</div>
              <div style={{ fontSize:10, color:"#475569", fontWeight:600, marginTop:2 }}>{c.label.toUpperCase()}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={S.card}>
        {!todayScore ? (
          <div><p style={{ color:"#475569", fontSize:14, marginBottom:16 }}>No check-in yet today.</p><button style={{ ...S.btn, ...S.btnPrimary }} onClick={()=>setShowCheckIn(true)}>⚡ Start Daily Check-In</button></div>
        ) : (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <p style={{ margin:0, color:"#94a3b8", fontSize:14, fontWeight:600 }}>✅ Checked in today</p>
              <button onClick={()=>setShowCheckIn(true)} style={{ padding:"6px 14px", borderRadius:10, border:"1px solid rgba(255,255,255,0.1)", background:"transparent", color:"#94a3b8", fontSize:13, cursor:"pointer" }}>Edit</button>
            </div>
          </div>
        )}
      </div>

      {history.length > 1 && (
        <div style={S.card}>
          <p style={{ margin:"0 0 16px", fontSize:11, fontWeight:700, color:"#475569", letterSpacing:"0.1em", textTransform:"uppercase" }}>30-Day Trend</p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize:10, fill:"#475569" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0,100]} tick={{ fontSize:10, fill:"#475569" }} axisLine={false} tickLine={false} width={24} />
              <Tooltip contentStyle={{ background:"#0f1629", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, fontSize:12, color:"#e2e8f0" }} />
              <Line type="monotone" dataKey="score" stroke="#a78bfa" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {radarData.some(d=>d.value>0) && (
        <div style={S.card}>
          <p style={{ margin:"0 0 16px", fontSize:11, fontWeight:700, color:"#475569", letterSpacing:"0.1em", textTransform:"uppercase" }}>Life Balance</p>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.06)" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize:11, fill:"#64748b" }} />
              <Radar dataKey="value" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.15} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ height:40 }} />
      {showCheckIn && <CheckInModal user={user} existingScore={todayScore?{sleep:todayScore.sleep_score,fitness:todayScore.fitness_score,productivity:todayScore.productivity_score,money:todayScore.money_score,mood:todayScore.mood_score}:null}
        onSave={async()=>{setShowCheckIn(false);await loadData();}} onClose={()=>setShowCheckIn(false)} />}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null); const [profile, setProfile] = useState(null); const [authLoading, setAuthLoading] = useState(true);
  useEffect(() => {
    const timeout = setTimeout(() => setAuthLoading(false), 5000);
    supabase.auth.getSession().then(async({data:{session}})=>{
      if(session?.user){
        setUser(session.user);
        const{data}=await supabase.from("profiles").select("*").eq("id",session.user.id).single();
        setProfile(data);
      }
      setAuthLoading(false);
      clearTimeout(timeout);
    }).catch(()=>{ setAuthLoading(false); clearTimeout(timeout); });
    const{data:{subscription}}=supabase.auth.onAuthStateChange(async(event,session)=>{
      try {
        if(session?.user){setUser(session.user);const{data}=await supabase.from("profiles").select("*").eq("id",session.user.id).single();setProfile(data);}
        else{setUser(null);setProfile(null);}
      } catch(e){ console.error("Auth state change error:", e); }
    });
    return()=>{ subscription.unsubscribe(); clearTimeout(timeout); };
  },[]);

  if(authLoading) return <div style={{...S.app,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{textAlign:"center"}}><div style={{fontSize:40,marginBottom:16}}>⚡</div><p style={{color:"#475569"}}>Loading...</p></div></div>;

  return (
    <div style={S.app}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />
      {!user ? <AuthScreen onAuth={async u=>{setUser(u);const{data}=await supabase.from("profiles").select("*").eq("id",u.id).single();setProfile(data);}} />
       : !profile?.onboarding_complete ? <OnboardingScreen user={user} onComplete={p=>setProfile({...profile,...p})} />
       : <Dashboard user={user} profile={profile} />}
    </div>
  );
}

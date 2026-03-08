import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase.js";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

function calcLifeScore({ sleep, fitness, productivity, money, mood }) {
  return Math.round(sleep * 0.25 + fitness * 0.2 + productivity * 0.25 + money * 0.15 + mood * 0.15);
}
function getLevel(xp) { return Math.floor((xp || 0) / 100) + 1; }
function getXpProgress(xp) { return (xp || 0) % 100; }
function getScoreColor(s) { return s >= 80 ? "#22d3ee" : s >= 60 ? "#a78bfa" : s >= 40 ? "#fb923c" : "#f87171"; }
function getScoreLabel(s) { return s >= 80 ? "Thriving" : s >= 60 ? "Solid" : s >= 40 ? "Getting By" : "Struggling"; }

const NEEDS = [
  { key: "sleep",        label: "Energy",   emoji: "⚡", color: "#fbbf24", dim: "#78350f" },
  { key: "fitness",      label: "Body",     emoji: "💪", color: "#34d399", dim: "#064e3b" },
  { key: "productivity", label: "Mind",     emoji: "🧠", color: "#818cf8", dim: "#312e81" },
  { key: "money",        label: "Finance",  emoji: "💰", color: "#22d3ee", dim: "#0c4a6e" },
  { key: "mood",         label: "Social",   emoji: "😄", color: "#f472b6", dim: "#500724" },
];

const ALL_QUESTS = [
  { id: "q1",  title: "Morning stretch 10 min",          cat: "fitness",      xp: 15, emoji: "🧘" },
  { id: "q2",  title: "In bed by midnight",              cat: "sleep",        xp: 20, emoji: "😴" },
  { id: "q3",  title: "Drink 8 glasses of water",        cat: "fitness",      xp: 10, emoji: "💧" },
  { id: "q4",  title: "25-min deep work focus block",    cat: "productivity", xp: 20, emoji: "🎯" },
  { id: "q5",  title: "No unnecessary spending today",   cat: "money",        xp: 15, emoji: "💰" },
  { id: "q6",  title: "Text a friend or family member",  cat: "mood",         xp: 10, emoji: "📱" },
  { id: "q7",  title: "30-min walk or workout",          cat: "fitness",      xp: 25, emoji: "🏃" },
  { id: "q8",  title: "Meditate 5 minutes",              cat: "mood",         xp: 15, emoji: "🧘" },
  { id: "q9",  title: "Review your budget / expenses",   cat: "money",        xp: 20, emoji: "📊" },
  { id: "q10", title: "Read for 20 minutes",             cat: "productivity", xp: 15, emoji: "📚" },
  { id: "q11", title: "7+ hours of sleep tonight",       cat: "sleep",        xp: 25, emoji: "⚡" },
  { id: "q12", title: "No phone first 30 min of day",    cat: "productivity", xp: 20, emoji: "📵" },
];

function generateQuests(scores) {
  const scoreMap = { sleep: scores?.sleep ?? 50, fitness: scores?.fitness ?? 50, productivity: scores?.productivity ?? 50, money: scores?.money ?? 50, mood: scores?.mood ?? 50 };
  const sorted = [...ALL_QUESTS].sort((a, b) => scoreMap[a.cat] - scoreMap[b.cat]);
  const today = new Date().toISOString().split("T")[0];
  const seed = parseInt(today.replace(/-/g, "").slice(-4), 10);
  const extra = sorted[Math.min((seed % 9) + 3, sorted.length - 1)];
  const picks = [sorted[0], sorted[1], extra];
  const seen = new Set();
  return picks.filter(q => { if (seen.has(q.id)) return false; seen.add(q.id); return true; }).slice(0, 3);
}

const ACHIEVEMENTS = [
  { id: "first",    title: "First Step",      desc: "Complete first check-in",  emoji: "🌟", check: (p)      => (p?.checkins ?? 0) >= 1 },
  { id: "streak3",  title: "3-Day Streak",    desc: "3 days in a row",           emoji: "🔥", check: (p)      => (p?.streak ?? 0) >= 3 },
  { id: "streak7",  title: "Week Warrior",    desc: "7-day streak",              emoji: "⚡", check: (p)      => (p?.streak ?? 0) >= 7 },
  { id: "streak30", title: "Monthly Master",  desc: "30-day streak",             emoji: "🏆", check: (p)      => (p?.streak ?? 0) >= 30 },
  { id: "lvl5",     title: "Level 5",         desc: "Reach level 5",             emoji: "🎮", check: (p)      => getLevel(p?.xp ?? 0) >= 5 },
  { id: "lvl10",    title: "Level 10",        desc: "Reach level 10",            emoji: "💎", check: (p)      => getLevel(p?.xp ?? 0) >= 10 },
  { id: "perfect",  title: "Perfection",      desc: "Score 80+ life score",      emoji: "✨", check: (p, s)   => (s?.life_score ?? 0) >= 80 },
  { id: "quester",  title: "Quest Master",    desc: "Complete 10 quests",        emoji: "⚔️", check: (p)      => (p?.quests_completed ?? 0) >= 10 },
];

const S = {
  app: { minHeight: "100vh", background: "linear-gradient(135deg,#0a0a14 0%,#0f0f1e 50%,#0a1628 100%)", fontFamily: "'DM Sans','Helvetica Neue',sans-serif", color: "#e2e8f0", position: "relative", overflow: "hidden" },
  container: { position: "relative", zIndex: 1, maxWidth: 480, margin: "0 auto", padding: "0 16px", minHeight: "100vh", paddingBottom: 90 },
  card: { background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "24px 20px", marginBottom: 14 },
  input: { width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "14px 16px", color: "#e2e8f0", fontSize: 15, outline: "none", boxSizing: "border-box" },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" },
  btn: { width: "100%", padding: "15px 24px", borderRadius: 14, border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" },
  btnPrimary: { background: "linear-gradient(135deg,#7c3aed,#06b6d4)", color: "#fff" },
  btnSecondary: { background: "rgba(255,255,255,0.07)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.1)" },
  error: { background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 10, padding: "10px 14px", color: "#fca5a5", fontSize: 14, marginBottom: 16 },
};

/* ─── Auth ─────────────────────────────────────────────────────── */
function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit() {
    setLoading(true); setError(""); setMessage("");
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Account created! Check your email to confirm, then sign in.");
        setMode("login");
      }
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  return (
    <div style={{ ...S.container, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", paddingTop: 60 }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 72, height: 72, borderRadius: 20, background: "linear-gradient(135deg,#7c3aed,#06b6d4)", marginBottom: 20, fontSize: 32 }}>🎮</div>
          <h1 style={{ fontSize: 36, fontWeight: 800, margin: 0, background: "linear-gradient(135deg,#c4b5fd,#67e8f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.02em" }}>Life Sims</h1>
          <p style={{ color: "#64748b", fontSize: 15, marginTop: 8 }}>Gamify your real life</p>
        </div>
        <div style={S.card}>
          {error && <div style={S.error}>{error}</div>}
          {message && <div style={{ ...S.error, background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.3)", color: "#67e8f9" }}>{message}</div>}
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Email</label>
            <input style={S.input} type="email" placeholder="you@example.com" value={email}
              onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={S.label}>Password</label>
            <input style={S.input} type="password" placeholder="••••••••" value={password}
              onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
          </div>
          <button onClick={handleSubmit} disabled={loading || !email || !password}
            style={{ ...S.btn, ...S.btnPrimary, opacity: loading || !email || !password ? 0.5 : 1 }}>
            {loading ? "..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
          <p style={{ textAlign: "center", color: "#475569", fontSize: 14, marginTop: 16, marginBottom: 0 }}>
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <span onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setMessage(""); }}
              style={{ color: "#a78bfa", cursor: "pointer", fontWeight: 600 }}>
              {mode === "login" ? "Sign up" : "Sign in"}
            </span>
     0    </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Onboarding ────────────────────────────────────────────────── */
const STEPS = [
  { key: "name",          q: "What's your name?",                          emoji: "👋", type: "text",   placeholder: "Your first name" },
  { key: "age",           q: "How old are you?",                           emoji: "🎂", type: "number", placeholder: "Your age" },
  { key: "main_goal",     q: "What's your main goal right now?",           emoji: "🎯", type: "select", options: ["Get Healthier","Be More Productive","Reduce Stress","Build Wealth","Find Balance"] },
  { key: "fitness_level", q: "How would you rate your fitness?",           emoji: "💪", type: "select", options: ["Beginner","Light","Moderate","Active","Athlete"] },
  { key: "sleep_hours",   q: "How many hours do you sleep on average?",    emoji: "😴", type: "number", placeholder: "e.g. 7" },
  { key: "stress_level",  q: "On a scale of 1–10, your current stress?",  emoji: "🧘", type: "number", placeholder: "1 (calm) → 10 (stressed)" },
];

function OnboardingScreen({ user, onComplete }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const current = STEPS[step];
  const rawValue = answers[current.key] ?? "";
  const hasValue = current.type === "number" ? rawValue !== "" : !!rawValue;

  async function handleNext() {
    if (!hasValue) return;
    if (step + 1 < STEPS.length) { setStep(step + 1); return; }
    setLoading(true); setSaveError("");
    const payload = { ...answers };
    if (payload.age) payload.age = Number(payload.age);
    if (payload.sleep_hours) payload.sleep_hours = Number(payload.sleep_hours);
    if (payload.stress_level) payload.stress_level = Number(payload.stress_level);
    try {
      const { error } = await supabase.from("profiles").upsert({ id: user.id, ...payload, onboarding_complete: true, xp: 50, streak: 0 });
      if (error) throw error;
      onComplete({ ...payload, id: user.id, onboarding_complete: true, xp: 50, streak: 0 });
    } catch (e) { setSaveError("Couldn't save — " + e.message); setLoading(false); }
  }

  return (
    <div style={{ ...S.container, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", paddingTop: 60 }}>
        <div style={{ height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 99, marginBottom: 48, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(step / STEPS.length) * 100}%`, background: "linear-gradient(90deg,#7c3aed,#06b6d4)", borderRadius: 99, transition: "width 0.4s ease" }} />
        </div>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>{current.emoji}</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "#f1f5f9" }}>{current.q}</h2>
          <p style={{ color: "#475569", fontSize: 13, marginTop: 8 }}>Step {step + 1} of {STEPS.length}</p>
        </div>
        {saveError && <div style={S.error}>{saveError}</div>}
        <div style={{ marginBottom: 24 }}>
          {current.type === "select" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {current.options.map(opt => (
                <button key={opt} onClick={() => setAnswers(a => ({ ...a, [current.key]: opt }))}
                  style={{ padding: "14px 20px", borderRadius: 14, border: `1px solid ${rawValue === opt ? "rgba(124,58,237,0.6)" : "rgba(255,255,255,0.08)"}`, background: rawValue === opt ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.04)", color: rawValue === opt ? "#c4b5fd" : "#94a3b8", fontSize: 15, fontWeight: rawValue === opt ? 700 : 400, cursor: "pointer", textAlign: "left" }}>{opt}</button>
              ))}
            </div>
          ) : (
            <input style={S.input} type={current.type} placeholder={current.placeholder} value={rawValue} autoFocus
              onChange={e => setAnswers(a => ({ ...a, [current.key]: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleNext()} />
          )}
        </div>
        <button style={{ ...S.btn, ...S.btnPrimary, opacity: !hasValue || loading ? 0.4 : 1 }} onClick={handleNext} disabled={!hasValue || loading}>
          {loading ? "Saving..." : step === STEPS.length - 1 ? "Let's Play! 🎮" : "Next →"}
        </button>
      </div>
    </div>
  );
}

/* ─── Score Ring ────────────────────────────────────────────────── */
function ScoreRing({ score, size = 160 }) {
  const color = getScoreColor(score);
  const stroke = 14, r = (size - stroke) / 2, circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={circ - (score / 100) * circ} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s ease, stroke 0.5s" }} />
    </svg>
  );
}

/* ─── Sims Need Bar ─────────────────────────────────────────────── */
function SimsNeedBar({ label, emoji, value, color, dim }) {
  const pct = Math.max(0, Math.min(100, value || 0));
  const isLow = pct < 40, isMid = pct < 70;
  const barColor = isLow ? "#f87171" : isMid ? "#fb923c" : color;
  const barBg   = isLow ? "#7f1d1d" : isMid ? "#92400e" : dim;
  return (
    <div style={{ marginBottom: 11 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 15 }}>{emoji}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", flex: 1 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: barColor }}>{pct}</span>
      </div>
      <div style={{ height: 9, background: "rgba(255,255,255,0.05)", borderRadius: 99, overflow: "hidden", border: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${barBg},${barColor})`, borderRadius: 99, transition: "width 0.8s ease", boxShadow: `0 0 8px ${barColor}55` }} />
      </div>
    </div>
  );
}

/* ─── Score Slider ──────────────────────────────────────────────── */
function ScoreSlider({ label, emoji, value, onChange, color }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 14, color: "#94a3b8", fontWeight: 600 }}>{emoji} {label}</span>
        <span style={{ fontSize: 16, fontWeight: 800, color }}>{value}</span>
      </div>
      <div style={{ position: "relative", height: 6 }}>
        <div style={{ position: "absolute", height: "100%", width: "100%", background: "rgba(255,255,255,0.07)", borderRadius: 99 }} />
        <div style={{ position: "absolute", height: "100%", width: `${value}%`, background: `linear-gradient(90deg,${color}88,${color})`, borderRadius: 99 }} />
        <input type="range" min={0} max={100} value={value} onChange={e => onChange(Number(e.target.value))}
          style={{ position: "absolute", inset: 0, width: "100%", opacity: 0, cursor: "pointer", height: "100%", margin: 0 }} />
      </div>
    </div>
  );
}

/* ─── Check-In Modal ────────────────────────────────────────────── */
function CheckInModal({ user, onSave, onClose, existingScore }) {
  const [scores, setScores] = useState(existingScore || { sleep: 50, fitness: 50, productivity: 50, money: 50, mood: 50 });
  const [loading, setLoading] = useState(false);
  const life = calcLifeScore(scores);

  async function handleSave() {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    const { error } = await supabase.from("daily_scores").upsert({
      user_id: user.id, date: today,
      sleep_score: scores.sleep, fitness_score: scores.fitness,
      productivity_score: scores.productivity, money_score: scores.money,
      mood_score: scores.mood, life_score: life,
    }, { onConflict: "user_id,date" });

    if (!error) {
      const { data: prof } = await supabase.from("profiles").select("xp,streak,last_checkin_date,checkins").eq("id", user.id).single();
      if (prof) {
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().split("T")[0];
        const newStreak = prof.last_checkin_date === yStr ? (prof.streak || 0) + 1 : (prof.last_checkin_date === today ? prof.streak : 1);
        const xpGain = 20 + Math.floor(life / 10);
        await supabase.from("profiles").update({
          last_checkin_date: today,
          xp: (prof.xp || 0) + xpGain,
          streak: newStreak,
          checkins: (prof.checkins || 0) + 1,
        }).eq("id", user.id);
        onSave(xpGain);
      } else { onSave(20); }
    }
    setLoading(false);
  }

  const sliders = [
    { key: "sleep",        label: "Energy / Sleep",    emoji: "⚡", color: "#fbbf24" },
    { key: "fitness",      label: "Body / Fitness",    emoji: "💪", color: "#34d399" },
    { key: "productivity", label: "Mind / Focus",      emoji: "🧠", color: "#818cf8" },
    { key: "money",        label: "Finance",           emoji: "💰", color: "#22d3ee" },
    { key: "mood",         label: "Social / Mood",     emoji: "😄", color: "#f472b6" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: "100%", maxWidth: 480, background: "#0f1629", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "24px 24px 0 0", padding: "24px 20px 40px", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.15)", borderRadius: 99, margin: "0 auto 24px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Daily Check-In</h2>
          <div style={{ padding: "6px 14px", borderRadius: 99, background: `${getScoreColor(life)}22`, color: getScoreColor(life), fontWeight: 800, fontSize: 18 }}>{life}</div>
        </div>
        {sliders.map(s => <ScoreSlider key={s.key} label={s.label} emoji={s.emoji} value={scores[s.key]} onChange={v => setScores(p => ({ ...p, [s.key]: v }))} color={s.color} />)}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 28 }}>
          <button style={{ ...S.btn, ...S.btnSecondary }} onClick={onClose}>Cancel</button>
          <button style={{ ...S.btn, ...S.btnPrimary, opacity: loading ? 0.7 : 1 }} onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save +XP ⚡"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── XP Toast ──────────────────────────────────────────────────── */
function XPToast({ xp, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)", zIndex: 200, background: "linear-gradient(135deg,#7c3aed,#06b6d4)", borderRadius: 99, padding: "10px 28px", fontSize: 15, fontWeight: 800, color: "#fff", boxShadow: "0 8px 32px rgba(124,58,237,0.5)", whiteSpace: "nowrap" }}>
      +{xp} XP ⚡
    </div>
  );
}

/* ─── Quests Tab ────────────────────────────────────────────────── */
function QuestsTab({ user, todayScores, onQuestComplete }) {
  const quests = generateQuests(todayScores);
  const [completed, setCompleted] = useState({});
  const weakest = todayScores ? NEEDS.slice().sort((a, b) => (todayScores[a.key] ?? 50) - (todayScores[b.key] ?? 50))[0] : null;

  async function handleComplete(q) {
    if (completed[q.id]) return;
    setCompleted(c => ({ ...c, [q.id]: true }));
    const { data: prof } = await supabase.from("profiles").select("xp,quests_completed").eq("id", user.id).single();
    if (prof) {
      await supabase.from("profiles").update({
        xp: (prof.xp || 0) + q.xp,
        quests_completed: (prof.quests_completed || 0) + 1,
      }).eq("id", user.id);
    }
    onQuestComplete(q.xp);
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Daily Quests</h2>
        <span style={{ fontSize: 11, color: "#475569", fontWeight: 600 }}>Resets midnight</span>
      </div>
      <p style={{ color: "#64748b", fontSize: 13, marginBottom: 20 }}>Tailored to your weakest areas</p>

      {quests.map(q => (
        <div key={q.id} style={{ background: completed[q.id] ? "rgba(52,211,153,0.06)" : "rgba(255,255,255,0.04)", border: `1px solid ${completed[q.id] ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.08)"}`, borderRadius: 16, padding: "16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 26 }}>{q.emoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: completed[q.id] ? "#6ee7b7" : "#e2e8f0", textDecoration: completed[q.id] ? "line-through" : "none", opacity: completed[q.id] ? 0.7 : 1 }}>{q.title}</div>
            <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>+{q.xp} XP</div>
          </div>
          <button onClick={() => handleComplete(q)} disabled={completed[q.id]}
            style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: completed[q.id] ? "rgba(52,211,153,0.15)" : "linear-gradient(135deg,#7c3aed,#06b6d4)", color: completed[q.id] ? "#6ee7b7" : "#fff", fontSize: 13, fontWeight: 700, cursor: completed[q.id] ? "default" : "pointer", flexShrink: 0 }}>
            {completed[q.id] ? "✓" : "Done"}
          </button>
        </div>
      ))}

      <div style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 16, padding: "14px 16px", marginTop: 8 }}>
        <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>
          🤖 <strong style={{ color: "#c4b5fd" }}>AI Tip:</strong>{" "}
          {weakest
            ? `Your ${weakest.label} (${weakest.emoji}) needs the most attention today. Focus on quests that boost it.`
            : "Complete your daily check-in to unlock personalised quests."}
        </p>
      </div>
    </>
  );
}

/* ─── Achievements Tab ──────────────────────────────────────────── */
function AchievementsTab({ profile, todayScore }) {
  const unlocked = ACHIEVEMENTS.filter(a => a.check(profile, todayScore)).length;
  return (
    <>
      <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800 }}>Achievements</h2>
      <p style={{ color: "#64748b", fontSize: 13, marginBottom: 20 }}>{unlocked} / {ACHIEVEMENTS.length} unlocked</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {ACHIEVEMENTS.map(a => {
          const done = a.check(profile, todayScore);
          return (
            <div key={a.id} style={{ background: done ? "rgba(124,58,237,0.1)" : "rgba(255,255,255,0.02)", border: `1px solid ${done ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.06)"}`, borderRadius: 16, padding: "16px 12px", textAlign: "center", opacity: done ? 1 : 0.45, position: "relative" }}>
              {done && <div style={{ position: "absolute", top: 0, right: 0, width: 8, height: 8, borderRadius: "0 16px 0 8px", background: "#7c3aed" }} />}
              <div style={{ fontSize: 30, marginBottom: 8, filter: done ? "none" : "grayscale(1)" }}>{a.emoji}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: done ? "#c4b5fd" : "#475569" }}>{a.title}</div>
              <div style={{ fontSize: 11, color: "#334155", marginTop: 3 }}>{a.desc}</div>
              {!done && <div style={{ fontSize: 10, color: "#1e293b", marginTop: 5 }}>🔒</div>}
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ─── Bottom Nav ────────────────────────────────────────────────── */
function BottomNav({ tab, setTab }) {
  const tabs = [
    { id: "home",         emoji: "🏠", label: "Home" },
    { id: "quests",       emoji: "⚔️", label: "Quests" },
    { id: "achievements", emoji: "🏆", label: "Trophies" },
  ];
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(10,10,20,0.96)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "center", zIndex: 50 }}>
      <div style={{ display: "flex", width: "100%", maxWidth: 480 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: "10px 8px 14px", border: "none", background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: 20 }}>{t.emoji}</span>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: tab === t.id ? "#a78bfa" : "#334155", textTransform: "uppercase" }}>{t.label}</span>
            {tab === t.id && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#a78bfa" }} />}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Dashboard ─────────────────────────────────────────────────── */
function Dashboard({ user, profile: initialProfile }) {
  const [profile, setProfile] = useState(initialProfile);
  const [todayScore, setTodayScore] = useState(null);
  const [history, setHistory] = useState([]);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [tab, setTab] = useState("home");
  const [xpToast, setXpToast] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data: scores } = await supabase.from("daily_scores").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(30);
      if (scores) { setHistory(scores); setTodayScore(scores.find(s => s.date === today) || null); }
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (prof) setProfile(prof);
    } catch (e) { console.error("loadData error:", e); }
  }, [user.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const life = todayScore?.life_score ?? 0;
  const level = getLevel(profile?.xp), xpProgress = getXpProgress(profile?.xp), streak = profile?.streak ?? 0;
  const chartData = [...history].reverse().map(s => ({ date: s.date.slice(5), score: s.life_score }));
  const todayNeeds = todayScore ? { sleep: todayScore.sleep_score, fitness: todayScore.fitness_score, productivity: todayScore.productivity_score, money: todayScore.money_score, mood: todayScore.mood_score } : null;

  return (
    <div style={S.container}>
      <div style={{ position: "fixed", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,0.12) 0%,transparent 70%)", top: -100, left: -100, pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle,rgba(34,211,238,0.08) 0%,transparent 70%)", bottom: -50, right: -50, pointerEvents: "none", zIndex: 0 }} />
      {xpToast && <XPToast xp={xpToast} onDone={() => setXpToast(null)} />}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 0 14px" }}>
        <div>
          <p style={{ margin: 0, color: "#475569", fontSize: 13, fontWeight: 600 }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </p>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, background: "linear-gradient(135deg,#c4b5fd,#67e8f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.02em" }}>
            Hey, {profile?.name || "there"} 🎮
          </h1>
        </div>
        <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())}
          style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#64748b", fontSize: 13, cursor: "pointer" }}>
          Sign out
        </button>
      </div>

      {/* XP / Level card */}
      <div style={{ ...S.card, padding: "16px 20px" }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          {[{ label: "Level", value: level, icon: "🏆" }, { label: "Streak", value: `${streak}d`, icon: "🔥" }, { label: "XP", value: `${xpProgress}/100`, icon: "⚡" }].map(stat => (
            <div key={stat.label} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 18, marginBottom: 2 }}>{stat.icon}</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#f1f5f9" }}>{stat.value}</div>
              <div style={{ fontSize: 10, color: "#475569", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{stat.label}</div>
            </div>
          ))}
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: "#334155", fontWeight: 600 }}>Lv {level}</span>
            <span style={{ fontSize: 10, color: "#334155", fontWeight: 600 }}>Lv {level + 1}</span>
          </div>
          <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${xpProgress}%`, background: "linear-gradient(90deg,#7c3aed,#06b6d4)", borderRadius: 99, transition: "width 0.5s ease" }} />
          </div>
        </div>
      </div>

      {/* Tab content */}
      {tab === "home" && (
        <>
          {/* Score Ring */}
          <div style={{ ...S.card, textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 50%,${getScoreColor(life)}08 0%,transparent 70%)` }} />
            <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase" }}>TODAY'S LIFE SCORE</p>
            <div style={{ position: "relative", display: "inline-block" }}>
              <ScoreRing score={life} size={160} />
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 44, fontWeight: 800, color: getScoreColor(life), lineHeight: 1, letterSpacing: "-0.03em" }}>{life}</span>
                <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600, marginTop: 4 }}>{getScoreLabel(life)}</span>
              </div>
            </div>
          </div>

          {/* Sims Need Bars */}
          <div style={S.card}>
            <p style={{ margin: "0 0 14px", fontSize: 11, fontWeight: 700, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase" }}>🎮 Needs</p>
            {NEEDS.map(n => (
              <SimsNeedBar key={n.key} label={n.label} emoji={n.emoji}
                value={todayNeeds ? todayNeeds[n.key] : 0} color={n.color} dim={n.dim} />
            ))}
            {!todayScore && (
              <p style={{ textAlign: "center", color: "#475569", fontSize: 13, marginTop: 10, marginBottom: 0 }}>
                Complete a check-in to fill your need bars ↓
              </p>
            )}
          </div>

          {/* Check-in */}
          <div style={S.card}>
            {!todayScore ? (
              <>
                <p style={{ color: "#475569", fontSize: 14, margin: "0 0 14px" }}>No check-in yet today.</p>
                <button style={{ ...S.btn, ...S.btnPrimary }} onClick={() => setShowCheckIn(true)}>
                  ⚡ Daily Check-In (+XP)
                </button>
              </>
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ margin: 0, color: "#94a3b8", fontSize: 14, fontWeight: 600 }}>✅ Checked in today</p>
                <button onClick={() => setShowCheckIn(true)} style={{ padding: "6px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#94a3b8", fontSize: 13, cursor: "pointer" }}>Edit</button>
              </div>
            )}
          </div>

          {/* Trend */}
          {history.length > 1 && (
            <div style={S.card}>
              <p style={{ margin: "0 0 14px", fontSize: 11, fontWeight: 700, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase" }}>30-Day Trend</p>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip contentStyle={{ background: "#0f1629", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12, color: "#e2e8f0" }} />
                  <Line type="monotone" dataKey="score" stroke="#a78bfa" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {tab === "quests" && (
        <div style={S.card}>
          <QuestsTab user={user} todayScores={todayNeeds} onQuestComplete={xp => { setXpToast(xp); loadData(); }} />
        </div>
      )}

      {tab === "achievements" && (
        <div style={S.card}>
          <AchievementsTab profile={profile} todayScore={todayScore} />
        </div>
      )}

      <BottomNav tab={tab} setTab={setTab} />

      {showCheckIn && (
        <CheckInModal user={user}
          existingScore={todayScore ? { sleep: todayScore.sleep_score, fitness: todayScore.fitness_score, productivity: todayScore.productivity_score, money: todayScore.money_score, mood: todayScore.mood_score } : null}
          onSave={async xpGain => { setShowCheckIn(false); setXpToast(xpGain); await loadData(); }}
          onClose={() => setShowCheckIn(false)} />
      )}
    </div>
  );
}

/* ─── Root ──────────────────────────────────────────────────────── */
export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Single source of truth: onAuthStateChange fires INITIAL_SESSION on mount
    // so we don't need a separate getSession() call (which causes a race condition).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      // Ignore background token refreshes — no UI change needed
      if (event === "TOKEN_REFRESHED") return;

      // Show loading spinner while we resolve auth + profile together
      setLoading(true);

      if (session?.user) {
        setUser(session.user);
        try {
          const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
          if (mounted) setProfile(data ?? null);
        } catch {
          if (mounted) setProfile(null);
        }
      } else {
        setUser(null);
        setProfile(null);
      }

      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) return (
    <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🎮</div>
        <p style={{ color: "#475569" }}>Loading Life Sims...</p>
      </div>
    </div>
  );

  return (
    <div style={S.app}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />
      {!user
      0 ? <AuthScreen />
        : !profile?.onboarding_complete
          ? <OnboardingScreen user={user} onComplete={p => setProfile(prev => ({ ...prev, ...p }))} />
          : <Dashboard user={user} profile={profile} />}
    </div>
  );
}

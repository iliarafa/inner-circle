import { useState, useEffect, useRef } from "react";
import {
  useAuth,
  useCircle,
  usePresence,
  useThoughts,
  useMessages,
  useSharedContent,
  useRequests,
} from "./lib/hooks";

// ─── Animations ───
const globalStyles = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=DM+Mono:wght@400;500&display=swap');
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
@keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { margin: 0; }
input::placeholder { color: inherit; opacity: 0.4; }
`;

// ─── Theme helper ───
function theme(night) {
  const bg = night ? "#0A0A0A" : "#FAFAFA";
  const fg = night ? "#E8E8E8" : "#1A1A1A";
  const dim = night ? "#555" : "#999";
  const dimmer = night ? "#333" : "#DDD";
  const card = night ? "#141414" : "#F0F0F0";
  const input = night ? "#1A1A1A" : "#EDEDED";
  const green = "#4ADE80";
  return { bg, fg, dim, dimmer, card, input, green };
}

// ─── Time formatting ───
function timeAgo(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return "Yesterday";
}


// ═══════════════════════════════════════════════════════════
// AUTH SCREEN
// ═══════════════════════════════════════════════════════════
function AuthScreen({ night }) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const t = theme(night);

  const handleSubmit = async () => {
    setError("");
    if (mode === "signup") {
      const { error: e } = await signUp(email, password, name);
      if (e) setError(e.message);
    } else {
      const { error: e } = await signIn(email, password);
      if (e) setError(e.message);
    }
  };

  return (
    <div style={{ background: t.bg, color: t.fg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", padding: 24 }}>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-1px", marginBottom: 8 }}>inner circle</div>
      <div style={{ fontSize: 13, color: t.dim, fontFamily: "'DM Mono', monospace", marginBottom: 40 }}>
        {mode === "signin" ? "welcome back" : "create account"}
      </div>

      <div style={{ width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", gap: 12 }}>
        {mode === "signup" && (
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="your name" style={inputStyle(t)} />
        )}
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" type="email" style={inputStyle(t)} />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" type="password"
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()} style={inputStyle(t)} />

        {error && <div style={{ color: "#f87171", fontSize: 13, fontFamily: "'DM Mono', monospace" }}>{error}</div>}

        <button onClick={handleSubmit} style={{ background: t.fg, color: t.bg, border: "none", borderRadius: 12, padding: "16px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginTop: 8 }}>
          {mode === "signin" ? "sign in" : "create account"}
        </button>

        <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} style={{ background: "none", border: "none", color: t.dim, fontSize: 13, cursor: "pointer", fontFamily: "'DM Mono', monospace", marginTop: 8 }}>
          {mode === "signin" ? "need an account? sign up" : "already have an account? sign in"}
        </button>
      </div>
    </div>
  );
}

function inputStyle(t) {
  return {
    background: t.input, border: "none", borderRadius: 12, padding: "16px",
    fontSize: 14, color: t.fg, fontFamily: "'DM Sans', sans-serif", outline: "none", width: "100%",
  };
}


// ═══════════════════════════════════════════════════════════
// CIRCLE SETUP (create or join)
// ═══════════════════════════════════════════════════════════
function CircleSetup({ night, onDone }) {
  const { createCircle, joinCircle } = useCircle();
  const [mode, setMode] = useState(null); // null | 'create' | 'join'
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const t = theme(night);

  const handleCreate = async () => {
    const { error: e } = await createCircle(value || "my circle");
    if (e) setError(e.message);
    else onDone?.();
  };

  const handleJoin = async () => {
    const { error: e } = await joinCircle(value);
    if (e) setError(e.message);
    else onDone?.();
  };

  return (
    <div style={{ background: t.bg, color: t.fg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", padding: 24 }}>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-1px", marginBottom: 8 }}>set up your circle</div>
      <div style={{ fontSize: 13, color: t.dim, fontFamily: "'DM Mono', monospace", marginBottom: 40 }}>
        your private group of close friends
      </div>

      {!mode && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 320 }}>
          <button onClick={() => setMode("create")} style={{ background: t.fg, color: t.bg, border: "none", borderRadius: 12, padding: 16, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>create a circle</button>
          <button onClick={() => setMode("join")} style={{ background: t.card, color: t.fg, border: "none", borderRadius: 12, padding: 16, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>join with code</button>
        </div>
      )}

      {mode && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 320 }}>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={mode === "create" ? "circle name" : "invite code"}
            onKeyDown={(e) => e.key === "Enter" && (mode === "create" ? handleCreate() : handleJoin())}
            style={inputStyle(t)}
          />
          {error && <div style={{ color: "#f87171", fontSize: 13 }}>{error}</div>}
          <button onClick={mode === "create" ? handleCreate : handleJoin} style={{ background: t.fg, color: t.bg, border: "none", borderRadius: 12, padding: 16, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            {mode === "create" ? "create" : "join"}
          </button>
          <button onClick={() => { setMode(null); setError(""); }} style={{ background: "none", border: "none", color: t.dim, fontSize: 13, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>back</button>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════
export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { circle, members, loading: circleLoading } = useCircle();
  const [night, setNight] = useState(false);
  const [tab, setTab] = useState("presence");
  const [circleReady, setCircleReady] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 20 || hour < 6) setNight(true);
  }, []);

  useEffect(() => {
    if (circle) setCircleReady(true);
  }, [circle]);

  const t = theme(night);

  if (authLoading || circleLoading) {
    return (
      <div style={{ background: t.bg, color: t.dim, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
        loading...
      </div>
    );
  }

  if (!user) return <AuthScreen night={night} />;
  if (!circle) return <CircleSetup night={night} onDone={() => setCircleReady(true)} />;

  const tabs = [
    { id: "presence", label: "awake" },
    { id: "thoughts", label: "thoughts" },
    { id: "chat", label: "chat" },
    { id: "shared", label: "shared" },
    { id: "requests", label: "requests" },
  ];

  return (
    <div style={{ background: t.bg, color: t.fg, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", transition: "background 0.6s, color 0.6s", maxWidth: 480, margin: "0 auto", position: "relative", paddingBottom: 80 }}>
      <style>{globalStyles}</style>

      {/* Header */}
      <div style={{ padding: "24px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.5px" }}>{circle.name}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setNight(!night)} style={{ background: "none", border: `1px solid ${t.dimmer}`, color: t.dim, fontSize: 11, padding: "6px 14px", borderRadius: 20, cursor: "pointer", fontFamily: "'DM Mono', monospace", letterSpacing: "0.5px" }}>
            {night ? "☀ day" : "● night"}
          </button>
          <button onClick={signOut} style={{ background: "none", border: `1px solid ${t.dimmer}`, color: t.dim, fontSize: 11, padding: "6px 14px", borderRadius: 20, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>
            out
          </button>
        </div>
      </div>

      {/* Invite code */}
      <div style={{ padding: "12px 24px 0" }}>
        <div style={{ fontSize: 11, color: t.dim, fontFamily: "'DM Mono', monospace" }}>
          invite: <span style={{ color: t.fg, userSelect: "all" }}>{circle.invite_code}</span>
        </div>
      </div>

      {/* Content Area */}
      <div style={{ padding: 24 }}>
        {tab === "presence" && <PresenceTab circleId={circle.id} members={members} userId={user.id} t={t} />}
        {tab === "thoughts" && <ThoughtsTab circleId={circle.id} userId={user.id} t={t} />}
        {tab === "chat" && <ChatTab circleId={circle.id} userId={user.id} t={t} />}
        {tab === "shared" && <SharedTab circleId={circle.id} userId={user.id} t={t} />}
        {tab === "requests" && <RequestsTab circleId={circle.id} userId={user.id} t={t} />}
      </div>

      {/* Bottom Nav */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, display: "flex", justifyContent: "space-around", padding: "14px 0", background: night ? "rgba(10,10,10,0.95)" : "rgba(250,250,250,0.95)", backdropFilter: "blur(20px)", borderTop: `1px solid ${t.dimmer}`, zIndex: 100 }}>
        {tabs.map((item) => (
          <button key={item.id} onClick={() => setTab(item.id)} style={{ background: "none", border: "none", color: tab === item.id ? t.fg : t.dim, fontSize: 11, fontFamily: "'DM Mono', monospace", cursor: "pointer", padding: "4px 8px", letterSpacing: "0.5px" }}>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// TAB: PRESENCE
// ═══════════════════════════════════════════════════════════
function PresenceTab({ circleId, members, userId, t }) {
  const { presenceMap, myPresence, toggleAwake } = usePresence(circleId);
  const isAwake = myPresence?.is_awake ?? false;

  const awake = members.filter((m) => presenceMap[m.id]?.is_awake && m.id !== userId);
  const sleeping = members.filter((m) => !presenceMap[m.id]?.is_awake && m.id !== userId);

  return (
    <div>
      {/* Wake toggle */}
      <button onClick={toggleAwake} style={{ width: "100%", padding: 20, background: isAwake ? (t.bg === "#0A0A0A" ? "#1a2e1a" : "#e8f5e8") : t.card, border: isAwake ? `1px solid ${t.green}44` : `1px solid ${t.dimmer}`, borderRadius: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, transition: "all 0.4s", marginBottom: 24 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: isAwake ? t.green : t.dim, animation: isAwake ? "pulse 2s ease-in-out infinite" : "none" }} />
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: isAwake ? t.green : t.dim, letterSpacing: "0.5px" }}>
          {isAwake ? "you're awake" : "tap to wake up"}
        </span>
      </button>

      {/* Awake */}
      <div style={{ fontSize: 11, color: t.dim, fontFamily: "'DM Mono', monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 16 }}>
        awake now ({awake.length})
      </div>
      {awake.map((m, i) => (
        <FriendRow key={m.id} name={m.name} initial={m.initial} subtitle={`since ${timeAgo(presenceMap[m.id]?.awake_since)}`} awake t={t} delay={i * 0.08} />
      ))}
      {awake.length === 0 && <div style={{ color: t.dim, fontSize: 13, padding: "12px 0", fontFamily: "'DM Mono', monospace" }}>nobody's up yet</div>}

      {/* Sleeping */}
      <div style={{ fontSize: 11, color: t.dim, fontFamily: "'DM Mono', monospace", letterSpacing: 1, textTransform: "uppercase", margin: "24px 0 16px" }}>
        sleeping ({sleeping.length})
      </div>
      {sleeping.map((m, i) => (
        <FriendRow key={m.id} name={m.name} initial={m.initial} subtitle={`last seen ${timeAgo(presenceMap[m.id]?.last_seen)}`} t={t} delay={i * 0.08 + 0.3} />
      ))}
    </div>
  );
}

function FriendRow({ name, initial, subtitle, awake, t, delay = 0 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: `1px solid ${t.dimmer}`, opacity: awake ? 1 : 0.5, animation: `fadeUp 0.4s ease ${delay}s both` }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", background: t.card, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 600, position: "relative" }}>
        {initial}
        {awake && <div style={{ position: "absolute", bottom: 1, right: 1, width: 8, height: 8, borderRadius: "50%", background: t.green, border: `2px solid ${t.bg}`, animation: "pulse 2s ease-in-out infinite" }} />}
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 500 }}>{name}</div>
        <div style={{ fontSize: 12, color: t.dim, fontFamily: "'DM Mono', monospace" }}>{subtitle}</div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// TAB: THOUGHTS
// ═══════════════════════════════════════════════════════════
function ThoughtsTab({ circleId, userId, t }) {
  const { thoughts, postThought } = useThoughts(circleId);
  const [text, setText] = useState("");

  const handlePost = async () => {
    if (!text.trim()) return;
    await postThought(text);
    setText("");
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePost()} placeholder="what's on your mind..." style={{ flex: 1, background: t.input, border: "none", borderRadius: 12, padding: "14px 16px", fontSize: 14, color: t.fg, fontFamily: "'DM Sans', sans-serif", outline: "none" }} />
        <button onClick={handlePost} style={{ background: t.fg, color: t.bg, border: "none", borderRadius: 12, padding: "14px 18px", fontSize: 13, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>post</button>
      </div>

      {thoughts.map((th, i) => (
        <div key={th.id} style={{ padding: "18px 0", borderBottom: `1px solid ${t.dimmer}`, animation: `fadeUp 0.35s ease ${i * 0.06}s both` }}>
          <div style={{ fontSize: 15, lineHeight: 1.5, marginBottom: 8 }}>{th.text}</div>
          <div style={{ fontSize: 11, color: t.dim, fontFamily: "'DM Mono', monospace" }}>
            {th.author_id === userId ? "you" : th.profiles?.name} · {timeAgo(th.created_at)}
          </div>
        </div>
      ))}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// TAB: CHAT
// ═══════════════════════════════════════════════════════════
function ChatTab({ circleId, userId, t }) {
  const { messages, sendMessage } = useMessages(circleId);
  const [text, setText] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    if (!text.trim()) return;
    await sendMessage(text);
    setText("");
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        {messages.map((m, i) => {
          const isMe = m.author_id === userId;
          return (
            <div key={m.id} style={{ marginBottom: 6, display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", animation: `fadeUp 0.3s ease ${i * 0.05}s both` }}>
              <div style={{ background: isMe ? t.fg : t.card, color: isMe ? t.bg : t.fg, padding: "10px 16px", borderRadius: 16, borderBottomRightRadius: isMe ? 4 : 16, borderBottomLeftRadius: isMe ? 16 : 4, maxWidth: "80%", fontSize: 14, lineHeight: 1.4 }}>
                {m.text}
              </div>
              <div style={{ fontSize: 10, color: t.dim, fontFamily: "'DM Mono', monospace", marginTop: 4, padding: "0 4px" }}>
                {!isMe && `${m.profiles?.name} · `}{timeAgo(m.created_at)}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div style={{ display: "flex", gap: 8, position: "sticky", bottom: 80, background: t.bg, padding: "12px 0" }}>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="message..." style={{ flex: 1, background: t.input, border: "none", borderRadius: 12, padding: "14px 16px", fontSize: 14, color: t.fg, fontFamily: "'DM Sans', sans-serif", outline: "none" }} />
        <button onClick={handleSend} style={{ background: t.fg, color: t.bg, border: "none", borderRadius: 12, padding: "14px 18px", fontSize: 13, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>send</button>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// TAB: SHARED
// ═══════════════════════════════════════════════════════════
function SharedTab({ circleId, userId, t }) {
  const { shared, shareContent } = useSharedContent(circleId);
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("link");

  const handleShare = async () => {
    if (!url.trim()) return;
    await shareContent({ type, url, title: title || url });
    setUrl("");
    setTitle("");
    setShowForm(false);
  };

  return (
    <div>
      {!showForm ? (
        <button onClick={() => setShowForm(true)} style={{ width: "100%", padding: 14, background: t.card, border: `1px dashed ${t.dimmer}`, borderRadius: 14, color: t.dim, fontSize: 13, cursor: "pointer", fontFamily: "'DM Mono', monospace", marginBottom: 16 }}>
          + share something
        </button>
      ) : (
        <div style={{ background: t.card, borderRadius: 14, padding: 16, marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {["link", "video"].map((tp) => (
              <button key={tp} onClick={() => setType(tp)} style={{ background: type === tp ? t.fg : "transparent", color: type === tp ? t.bg : t.dim, border: `1px solid ${t.dimmer}`, borderRadius: 8, padding: "6px 14px", fontSize: 11, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>{tp}</button>
            ))}
          </div>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="paste url" style={{ background: t.input, border: "none", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: t.fg, fontFamily: "'DM Sans', sans-serif", outline: "none" }} />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="title (optional)" onKeyDown={(e) => e.key === "Enter" && handleShare()} style={{ background: t.input, border: "none", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: t.fg, fontFamily: "'DM Sans', sans-serif", outline: "none" }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleShare} style={{ flex: 1, background: t.fg, color: t.bg, border: "none", borderRadius: 10, padding: 12, fontSize: 13, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>share</button>
            <button onClick={() => setShowForm(false)} style={{ background: "none", border: `1px solid ${t.dimmer}`, color: t.dim, borderRadius: 10, padding: "12px 16px", fontSize: 13, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>cancel</button>
          </div>
        </div>
      )}

      {shared.map((item, i) => (
        <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
          <div style={{ padding: 18, background: t.card, borderRadius: 14, marginBottom: 10, animation: `fadeUp 0.35s ease ${i * 0.08}s both` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: t.bg, background: t.fg, padding: "3px 8px", borderRadius: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>{item.type}</div>
              <span style={{ fontSize: 11, color: t.dim, fontFamily: "'DM Mono', monospace" }}>{item.source}</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.4, marginBottom: 8 }}>{item.title}</div>
            <div style={{ fontSize: 11, color: t.dim, fontFamily: "'DM Mono', monospace" }}>
              {item.author_id === userId ? "you" : item.profiles?.name} · {timeAgo(item.created_at)}
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// TAB: REQUESTS
// ═══════════════════════════════════════════════════════════
function RequestsTab({ circleId, userId, t }) {
  const { requests, createRequest, claimRequest } = useRequests(circleId);
  const [text, setText] = useState("");
  const [showForm, setShowForm] = useState(false);

  const handleCreate = async () => {
    if (!text.trim()) return;
    await createRequest(text);
    setText("");
    setShowForm(false);
  };

  return (
    <div>
      {!showForm ? (
        <button onClick={() => setShowForm(true)} style={{ width: "100%", padding: 14, background: t.card, border: `1px dashed ${t.dimmer}`, borderRadius: 14, color: t.dim, fontSize: 13, cursor: "pointer", fontFamily: "'DM Mono', monospace", marginBottom: 16 }}>
          + ask for something
        </button>
      ) : (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreate()} placeholder="what do you need?" style={{ flex: 1, background: t.input, border: "none", borderRadius: 12, padding: "14px 16px", fontSize: 14, color: t.fg, fontFamily: "'DM Sans', sans-serif", outline: "none" }} />
          <button onClick={handleCreate} style={{ background: t.fg, color: t.bg, border: "none", borderRadius: 12, padding: "14px 18px", fontSize: 13, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>post</button>
        </div>
      )}

      {requests.map((r, i) => {
        const claimerName = r.claimed_by ? (r.claimed_by === userId ? "you" : "someone") : null;
        return (
          <div key={r.id} style={{ padding: 18, background: t.card, borderRadius: 14, marginBottom: 10, animation: `fadeUp 0.35s ease ${i * 0.08}s both` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: r.status === "open" ? t.green : t.dim }} />
              <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: r.status === "open" ? t.green : t.dim, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {r.status === "open" ? "open" : `claimed by ${claimerName}`}
              </span>
            </div>
            <div style={{ fontSize: 15, lineHeight: 1.5, marginBottom: 10 }}>{r.text}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 11, color: t.dim, fontFamily: "'DM Mono', monospace" }}>
                {r.author_id === userId ? "you" : r.profiles?.name} · {timeAgo(r.created_at)}
              </div>
              {r.status === "open" && r.author_id !== userId && (
                <button onClick={() => claimRequest(r.id)} style={{ background: "none", border: `1px solid ${t.dimmer}`, color: t.fg, fontSize: 11, padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>
                  i got this
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

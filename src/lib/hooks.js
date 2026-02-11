import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase";

// ─── Auth ──────────────────────────────────────────────────
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    );
    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    return { data, error };
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  const signOut = () => supabase.auth.signOut();

  return { user, loading, signUp, signIn, signOut };
}


// ─── Circle Management ────────────────────────────────────
export function useCircle() {
  const [circle, setCircle] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load user's first circle (MVP: single circle per user)
  const loadCircle = useCallback(async () => {
    const { data } = await supabase
      .from("circle_members")
      .select("circle_id, circles(*)")
      .limit(1)
      .single();

    if (data) {
      setCircle(data.circles);
      await loadMembers(data.circle_id);
    }
    setLoading(false);
  }, []);

  const loadMembers = async (circleId) => {
    const { data } = await supabase
      .from("circle_members")
      .select("user_id, profiles(id, name, initial)")
      .eq("circle_id", circleId);
    setMembers(data?.map((m) => m.profiles) ?? []);
  };

  const createCircle = async (name) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("circles")
      .insert({ name, created_by: user.id })
      .select()
      .single();
    if (data) {
      setCircle(data);
      await loadMembers(data.id);
    }
    return { data, error };
  };

  const joinCircle = async (inviteCode) => {
    const { data, error } = await supabase.rpc("join_circle", { code: inviteCode });
    if (data) {
      setCircle(data);
      await loadMembers(data.id);
    }
    return { data, error };
  };

  useEffect(() => { loadCircle(); }, [loadCircle]);

  return { circle, members, loading, createCircle, joinCircle };
}


// ─── Presence (Awake/Sleep) ───────────────────────────────
export function usePresence(circleId) {
  const [presenceMap, setPresenceMap] = useState({});
  const [myPresence, setMyPresence] = useState(null);

  // Load all presence for circle members
  const loadPresence = useCallback(async () => {
    if (!circleId) return;

    const { data: memberIds } = await supabase
      .from("circle_members")
      .select("user_id")
      .eq("circle_id", circleId);

    if (!memberIds?.length) return;

    const ids = memberIds.map((m) => m.user_id);
    const { data } = await supabase
      .from("presence")
      .select("*")
      .in("user_id", ids);

    const map = {};
    data?.forEach((p) => { map[p.user_id] = p; });
    setPresenceMap(map);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) setMyPresence(map[user.id] ?? null);
  }, [circleId]);

  // Real-time subscription
  useEffect(() => {
    loadPresence();

    const channel = supabase
      .channel("presence-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "presence" },
        (payload) => {
          setPresenceMap((prev) => ({
            ...prev,
            [payload.new.user_id]: payload.new,
          }));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadPresence]);

  const toggleAwake = async () => {
    const { data, error } = await supabase.rpc("toggle_awake");
    if (data) {
      setMyPresence(data);
      setPresenceMap((prev) => ({ ...prev, [data.user_id]: data }));
    }
    return { data, error };
  };

  return { presenceMap, myPresence, toggleAwake };
}


// ─── Generic real-time list hook ──────────────────────────
function useRealtimeList(table, circleId, orderBy = "created_at", ascending = false) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!circleId) return;
    const { data } = await supabase
      .from(table)
      .select("*, profiles:author_id(name, initial)")
      .eq("circle_id", circleId)
      .order(orderBy, { ascending })
      .limit(50);

    setItems(data ?? []);
    setLoading(false);
  }, [circleId, table, orderBy, ascending]);

  useEffect(() => {
    load();

    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table,
          filter: `circle_id=eq.${circleId}`,
        },
        async (payload) => {
          // Fetch with profile join
          const { data } = await supabase
            .from(table)
            .select("*, profiles:author_id(name, initial)")
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setItems((prev) =>
              ascending ? [...prev, data] : [data, ...prev]
            );
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table,
          filter: `circle_id=eq.${circleId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from(table)
            .select("*, profiles:author_id(name, initial)")
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setItems((prev) =>
              prev.map((item) => (item.id === data.id ? data : item))
            );
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table },
        (payload) => {
          setItems((prev) => prev.filter((item) => item.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load, circleId, table, ascending]);

  return { items, loading, setItems };
}


// ─── Thoughts ─────────────────────────────────────────────
export function useThoughts(circleId) {
  const { items: thoughts, loading } = useRealtimeList("thoughts", circleId);

  const postThought = async (text) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("thoughts").insert({
      circle_id: circleId,
      author_id: user.id,
      text,
    });
    return { error };
  };

  return { thoughts, loading, postThought };
}


// ─── Messages ─────────────────────────────────────────────
export function useMessages(circleId) {
  const { items: messages, loading } = useRealtimeList(
    "messages", circleId, "created_at", true // ascending for chat
  );

  const sendMessage = async (text) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("messages").insert({
      circle_id: circleId,
      author_id: user.id,
      text,
    });
    return { error };
  };

  return { messages, loading, sendMessage };
}


// ─── Shared Content ───────────────────────────────────────
export function useSharedContent(circleId) {
  const { items: shared, loading } = useRealtimeList("shared_content", circleId);

  const shareContent = async ({ type, url, title }) => {
    const { data: { user } } = await supabase.auth.getUser();
    const source = new URL(url).hostname.replace("www.", "");
    const { error } = await supabase.from("shared_content").insert({
      circle_id: circleId,
      author_id: user.id,
      type,
      url,
      title,
      source,
    });
    return { error };
  };

  return { shared, loading, shareContent };
}


// ─── Requests ─────────────────────────────────────────────
export function useRequests(circleId) {
  const { items: requests, loading } = useRealtimeList("requests", circleId);

  const createRequest = async (text) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("requests").insert({
      circle_id: circleId,
      author_id: user.id,
      text,
    });
    return { error };
  };

  const claimRequest = async (requestId) => {
    const { data, error } = await supabase.rpc("claim_request", {
      request_id: requestId,
    });
    return { data, error };
  };

  return { requests, loading, createRequest, claimRequest };
}

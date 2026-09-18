"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Search, Plus, Trash2, Check, Loader2, AlertCircle } from "lucide-react";

export type TestCase = {
  id: string;
  title: string;
  status: string;
  automation: string;
  author: string;
  automationPickedBy: string;
  automationId: string;
  automatedBy: string;
  automationMergedDate: string;
};

type StatusMetaEntry = { label: string; dot: string; text: string; bg: string; ring: string };

const STATUS_META: Record<string, StatusMetaEntry> = {
  "not-set": { label: "Not set", dot: "bg-slate-300", text: "text-slate-500", bg: "bg-slate-50", ring: "ring-slate-200" },
  draft: { label: "Draft", dot: "bg-amber-400", text: "text-amber-700", bg: "bg-amber-50", ring: "ring-amber-200" },
  active: { label: "Active", dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-emerald-200" },
  deprecated: { label: "Deprecated", dot: "bg-rose-400", text: "text-rose-700", bg: "bg-rose-50", ring: "ring-rose-200" },
};
const STATUS_ORDER = ["not-set", "draft", "active", "deprecated"];

const AUTOMATION_META: Record<string, StatusMetaEntry> = {
  "not-set": { label: "Not set", dot: "bg-slate-300", text: "text-slate-500", bg: "bg-slate-50", ring: "ring-slate-200" },
  feasible: { label: "Feasible", dot: "bg-sky-500", text: "text-sky-700", bg: "bg-sky-50", ring: "ring-sky-200" },
  "not-feasible": { label: "Not feasible", dot: "bg-rose-400", text: "text-rose-700", bg: "bg-rose-50", ring: "ring-rose-200" },
};
const AUTOMATION_ORDER = ["not-set", "feasible", "not-feasible"];

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

function EditableText({
  value,
  placeholder,
  onCommit,
  mono,
  className,
}: {
  value: string;
  placeholder: string;
  onCommit: (v: string) => boolean | void | Promise<boolean | void>;
  mono?: boolean;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value || "");
    setError(false);
  }, [value]);
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = async (opts: { blur?: boolean } = {}) => {
    if (draft === (value || "")) {
      setEditing(false);
      setError(false);
      return;
    }
    const ok = await onCommit(draft);
    if (ok === false) {
      if (opts.blur) {
        setDraft(value || "");
        setError(false);
        setEditing(false);
      } else {
        setError(true);
      }
      return;
    }
    setError(false);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setError(false);
        }}
        onBlur={() => commit({ blur: true })}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") {
            setDraft(value || "");
            setError(false);
            setEditing(false);
          }
        }}
        className={`w-full bg-white border rounded-md px-2 py-1 text-sm outline-none ring-2 ${
          error ? "border-rose-300 ring-rose-100" : "border-indigo-300 ring-indigo-100"
        } ${mono ? "font-mono" : ""}`}
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={`w-full text-left rounded-md px-2 py-1 text-sm hover:bg-slate-100 transition-colors ${
        mono ? "font-mono" : ""
      } ${!value ? "text-slate-400 italic" : "text-slate-800"} ${className || ""}`}
      title="Click to edit"
    >
      {value || placeholder}
    </button>
  );
}

function StatusPicker({
  value,
  onChange,
  meta = STATUS_META,
  order = STATUS_ORDER,
}: {
  value: string;
  onChange: (v: string) => void;
  meta?: Record<string, StatusMetaEntry>;
  order?: string[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = meta[value] || meta["not-set"];

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${current.bg} ${current.text} ${current.ring} hover:brightness-95 transition`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
        {current.label}
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-36 bg-white border border-slate-200 rounded-lg shadow-lg py-1">
          {order.map((s) => {
            const m = meta[s];
            return (
              <button
                key={s}
                onClick={() => {
                  onChange(s);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
                {m.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AddCaseForm({
  onAdd,
  onCancel,
  nextId,
  existingIds,
}: {
  onAdd: (newCase: Omit<TestCase, "id"> & { id: string }) => void;
  onCancel: () => void;
  nextId: number;
  existingIds: Set<string>;
}) {
  const [id, setId] = useState(`VEL-${nextId}`);
  const [idError, setIdError] = useState(false);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("not-set");
  const [automation, setAutomation] = useState("not-set");
  const [author, setAuthor] = useState("");
  const [automationPickedBy, setAutomationPickedBy] = useState("");
  const [automationId, setAutomationId] = useState("");
  const [automatedBy, setAutomatedBy] = useState("");
  const [automationMergedDate, setAutomationMergedDate] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const submit = () => {
    if (!title.trim()) return;
    const finalId = id.trim() || `VEL-${nextId}`;
    if (existingIds.has(finalId)) {
      setIdError(true);
      return;
    }
    onAdd({
      id: finalId,
      title: title.trim(),
      status,
      automation,
      author: author.trim(),
      automationPickedBy: automationPickedBy.trim(),
      automationId: automationId.trim(),
      automatedBy: automatedBy.trim(),
      automationMergedDate,
    });
  };

  return (
    <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-4 mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-slate-500 mb-1 block">Title</label>
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder="What does this test case verify?"
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Test case ID</label>
          <input
            value={id}
            onChange={(e) => {
              setId(e.target.value);
              setIdError(false);
            }}
            placeholder={`VEL-${nextId}`}
            className={`w-full text-sm border rounded-lg px-3 py-2 outline-none focus:ring-2 font-mono ${
              idError ? "border-rose-300 focus:ring-rose-100" : "border-slate-200 focus:ring-indigo-100 focus:border-indigo-300"
            }`}
          />
          {idError && <p className="text-xs text-rose-500 mt-1">That ID is already in use.</p>}
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Author</label>
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Who wrote it"
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Automation picked by</label>
          <input
            value={automationPickedBy}
            onChange={(e) => setAutomationPickedBy(e.target.value)}
            placeholder="Who picked it for automation"
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Automation ID</label>
          <input
            value={automationId}
            onChange={(e) => setAutomationId(e.target.value)}
            placeholder="e.g. automation script/ticket ID"
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Automated by</label>
          <input
            value={automatedBy}
            onChange={(e) => setAutomatedBy(e.target.value)}
            placeholder="Who automated it"
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Automation merged date</label>
          <input
            type="date"
            value={automationMergedDate}
            onChange={(e) => setAutomationMergedDate(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
          />
        </div>
      </div>
      <div className="flex flex-col gap-2 mb-3">
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Status</label>
          <div className="flex gap-1.5">
            {STATUS_ORDER.map((s) => {
              const m = STATUS_META[s];
              const active = status === s;
              return (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition ${
                    active ? `${m.bg} ${m.text} ${m.ring}` : "bg-white text-slate-400 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Automation</label>
          <div className="flex gap-1.5">
            {AUTOMATION_ORDER.map((s) => {
              const m = AUTOMATION_META[s];
              const active = automation === s;
              return (
                <button
                  key={s}
                  onClick={() => setAutomation(s)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition ${
                    active ? `${m.bg} ${m.text} ${m.ring}` : "bg-white text-slate-400 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end">
        <div className="flex gap-2">
          <button onClick={onCancel} className="text-sm px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!title.trim()}
            className="text-sm bg-indigo-600 text-white px-3.5 py-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-700 transition flex items-center gap-1.5"
          >
            <Check size={14} /> Add case
          </button>
        </div>
      </div>
    </div>
  );
}

type SaveState = "idle" | "saving" | "saved" | "error";

export default function TestCaseTracker() {
  const [cases, setCases] = useState<TestCase[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [quickFilter, setQuickFilter] = useState<"none" | "missing-author" | "missing-automation">("none");
  const [showAdd, setShowAdd] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const inFlight = useRef(0);
  const savedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api<TestCase[]>("/api/testcases");
        if (!cancelled) setCases(data);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load test cases");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const beginRequest = useCallback(() => {
    inFlight.current += 1;
    if (savedTimeout.current) clearTimeout(savedTimeout.current);
    setSaveState("saving");
  }, []);

  const endRequest = useCallback((ok: boolean) => {
    inFlight.current = Math.max(0, inFlight.current - 1);
    if (!ok) {
      setSaveState("error");
      return;
    }
    if (inFlight.current === 0) {
      setSaveState("saved");
      savedTimeout.current = setTimeout(() => setSaveState("idle"), 1500);
    }
  }, []);

  const updateCase = useCallback(
    async (id: string, patch: Partial<TestCase>) => {
      const prev = cases;
      setCases((cur) => (cur ? cur.map((c) => (c.id === id ? { ...c, ...patch } : c)) : cur));
      beginRequest();
      try {
        await api(`/api/testcases/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: JSON.stringify(patch),
        });
        endRequest(true);
      } catch (err) {
        setCases(prev);
        endRequest(false);
      }
    },
    [cases, beginRequest, endRequest]
  );

  const updateId = useCallback(
    async (oldId: string, newIdRaw: string): Promise<boolean> => {
      const newId = newIdRaw.trim();
      if (!newId) return false;
      if (newId === oldId) return true;
      if (cases?.some((c) => c.id === newId)) return false;

      const prev = cases;
      setCases((cur) => (cur ? cur.map((c) => (c.id === oldId ? { ...c, id: newId } : c)) : cur));
      beginRequest();
      try {
        await api(`/api/testcases/${encodeURIComponent(oldId)}`, {
          method: "PATCH",
          body: JSON.stringify({ id: newId }),
        });
        endRequest(true);
        return true;
      } catch (err) {
        setCases(prev);
        endRequest(false);
        return false;
      }
    },
    [cases, beginRequest, endRequest]
  );

  const addCase = useCallback(
    async (newCase: TestCase) => {
      beginRequest();
      try {
        const created = await api<TestCase>("/api/testcases", {
          method: "POST",
          body: JSON.stringify(newCase),
        });
        setCases((cur) => (cur ? [...cur, created] : [created]));
        endRequest(true);
        setShowAdd(false);
      } catch (err) {
        endRequest(false);
        alert(err instanceof Error ? err.message : "Failed to add test case");
      }
    },
    [beginRequest, endRequest]
  );

  const deleteCase = useCallback(
    async (id: string) => {
      const prev = cases;
      setCases((cur) => (cur ? cur.filter((c) => c.id !== id) : cur));
      setDeleteConfirm(null);
      beginRequest();
      try {
        await api(`/api/testcases/${encodeURIComponent(id)}`, { method: "DELETE" });
        endRequest(true);
      } catch (err) {
        setCases(prev);
        endRequest(false);
      }
    },
    [cases, beginRequest, endRequest]
  );

  const nextId = useMemo(() => {
    if (!cases || cases.length === 0) return 1;
    const max = cases.reduce((m, c) => {
      const match = c.id.match(/^VEL-(\d+)$/i);
      const n = match ? parseInt(match[1], 10) : NaN;
      return Number.isFinite(n) && n > m ? n : m;
    }, 0);
    return max + 1;
  }, [cases]);

  const filtered = useMemo(() => {
    if (!cases) return [];
    let list = cases;
    if (statusFilter !== "all") list = list.filter((c) => c.status === statusFilter);
    if (quickFilter === "missing-author") list = list.filter((c) => !c.author);
    if (quickFilter === "missing-automation") list = list.filter((c) => !c.automatedBy);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const looksLikeFullId = /^[a-z]+-.+$/i.test(q);
      if (looksLikeFullId) {
        list = list.filter((c) => c.id.toLowerCase() === q);
      } else {
        list = list.filter(
          (c) =>
            c.id.toLowerCase().includes(q) ||
            c.title.toLowerCase().includes(q) ||
            (c.author || "").toLowerCase().includes(q) ||
            (c.automatedBy || "").toLowerCase().includes(q)
        );
      }
    }
    return list;
  }, [cases, search, statusFilter, quickFilter]);

  const counts = useMemo(() => {
    if (!cases) return { total: 0, missingAuthor: 0, missingAutomation: 0 };
    const c = { total: cases.length, missingAuthor: 0, missingAutomation: 0 };
    for (const t of cases) {
      if (!t.author) c.missingAuthor++;
      if (!t.automatedBy) c.missingAutomation++;
    }
    return c;
  }, [cases]);

  if (loadError) {
    return (
      <div className="min-h-[500px] flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-sm">
          <AlertCircle size={22} className="mx-auto mb-2 text-rose-400" />
          <p className="text-sm text-slate-600">{loadError}</p>
          <p className="text-xs text-slate-400 mt-1">
            Make sure the database is connected and seeded, then reload.
          </p>
        </div>
      </div>
    );
  }

  if (!cases) {
    return (
      <div className="min-h-[500px] flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 className="animate-spin" size={16} />
          Loading test cases...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Test Case Tracker</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {counts.total} test cases · shared workspace, anyone with this link can edit
            </p>
          </div>
          <div className="flex items-center gap-3">
            <SaveIndicator state={saveState} />
            <button
              onClick={() => setShowAdd((s) => !s)}
              className="inline-flex items-center gap-1.5 bg-indigo-600 text-white text-sm px-3.5 py-2 rounded-lg hover:bg-indigo-700 transition shrink-0"
            >
              <Plus size={16} /> Add test case
            </button>
          </div>
        </div>

        {showAdd && (
          <AddCaseForm
            onAdd={addCase}
            onCancel={() => setShowAdd(false)}
            nextId={nextId}
            existingIds={new Set(cases.map((c) => c.id))}
          />
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID (e.g. VEL-3229), title, author, or automator..."
              className="w-full text-sm border border-slate-200 rounded-lg pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 bg-white"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-2.5 py-2 outline-none bg-white text-slate-600 shrink-0"
            >
              <option value="all">All statuses</option>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </select>
            <button
              onClick={() => setQuickFilter(quickFilter === "missing-author" ? "none" : "missing-author")}
              className={`text-sm rounded-lg px-2.5 py-2 border shrink-0 transition ${
                quickFilter === "missing-author" ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              Missing author ({counts.missingAuthor})
            </button>
            <button
              onClick={() => setQuickFilter(quickFilter === "missing-automation" ? "none" : "missing-automation")}
              className={`text-sm rounded-lg px-2.5 py-2 border shrink-0 transition ${
                quickFilter === "missing-automation" ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              Missing automation ({counts.missingAutomation})
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-xs text-slate-400">
                  <th className="text-left font-medium px-3 py-2.5 w-24">ID</th>
                  <th className="text-left font-medium px-3 py-2.5 min-w-[280px]">Title</th>
                  <th className="text-left font-medium px-3 py-2.5 w-28">Status</th>
                  <th className="text-left font-medium px-3 py-2.5 w-32">Automation</th>
                  <th className="text-left font-medium px-3 py-2.5 w-36">Author</th>
                  <th className="text-left font-medium px-3 py-2.5 w-36">Automation picked by</th>
                  <th className="text-left font-medium px-3 py-2.5 w-32">Automation ID</th>
                  <th className="text-left font-medium px-3 py-2.5 w-36">Automated by</th>
                  <th className="text-left font-medium px-3 py-2.5 w-40">Automation merged date</th>
                  <th className="text-left font-medium px-3 py-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 group">
                    <td className="px-2 py-1 align-top">
                      <EditableText value={c.id} placeholder="id" mono onCommit={(v) => updateId(c.id, v)} />
                    </td>
                    <td className="px-1 py-1 align-top">
                      <EditableText value={c.title} placeholder="Untitled test case" onCommit={(v) => updateCase(c.id, { title: v })} />
                    </td>
                    <td className="px-2 py-1.5 align-top">
                      <StatusPicker value={c.status} onChange={(v) => updateCase(c.id, { status: v })} />
                    </td>
                    <td className="px-2 py-1.5 align-top">
                      <StatusPicker
                        value={c.automation}
                        onChange={(v) => updateCase(c.id, { automation: v })}
                        meta={AUTOMATION_META}
                        order={AUTOMATION_ORDER}
                      />
                    </td>
                    <td className="px-1 py-1 align-top">
                      <EditableText value={c.author} placeholder="Unassigned" onCommit={(v) => updateCase(c.id, { author: v })} />
                    </td>
                    <td className="px-1 py-1 align-top">
                      <EditableText
                        value={c.automationPickedBy}
                        placeholder="Unassigned"
                        onCommit={(v) => updateCase(c.id, { automationPickedBy: v })}
                      />
                    </td>
                    <td className="px-1 py-1 align-top">
                      <EditableText
                        value={c.automationId}
                        placeholder="—"
                        mono
                        onCommit={(v) => updateCase(c.id, { automationId: v })}
                      />
                    </td>
                    <td className="px-1 py-1 align-top">
                      <EditableText
                        value={c.automatedBy}
                        placeholder="Not automated"
                        onCommit={(v) => updateCase(c.id, { automatedBy: v })}
                      />
                    </td>
                    <td className="px-2 py-1 align-top">
                      <input
                        type="date"
                        value={c.automationMergedDate || ""}
                        onChange={(e) => updateCase(c.id, { automationMergedDate: e.target.value })}
                        className="w-full bg-transparent border-0 rounded-md px-2 py-1 text-sm text-slate-700 hover:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none"
                      />
                    </td>
                    <td className="px-2 py-1.5 align-top">
                      {deleteConfirm === c.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => deleteCase(c.id)} className="text-xs text-rose-600 hover:underline">
                            Delete
                          </button>
                          <span className="text-slate-300">/</span>
                          <button onClick={() => setDeleteConfirm(null)} className="text-xs text-slate-400 hover:underline">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(c.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition p-1"
                          title="Delete test case"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-3 py-12 text-center text-sm text-slate-400">
                      <AlertCircle size={20} className="mx-auto mb-2 text-slate-300" />
                      No test cases match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Result count */}
          <div className="px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
            {filtered.length} test case{filtered.length === 1 ? "" : "s"} shown
          </div>
        </div>
      </div>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  if (state === "saving")
    return (
      <span className="text-xs text-slate-400 flex items-center gap-1">
        <Loader2 size={12} className="animate-spin" /> Saving
      </span>
    );
  if (state === "saved")
    return (
      <span className="text-xs text-emerald-500 flex items-center gap-1">
        <Check size={12} /> Saved
      </span>
    );
  return (
    <span className="text-xs text-rose-500 flex items-center gap-1">
      <AlertCircle size={12} /> Save failed
    </span>
  );
}

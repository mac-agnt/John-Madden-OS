/* Shared building blocks for the John Madden OS pages. They draw only from the
   Pulse theme tokens (surfaces, borders, radii, accent), so every page matches
   the shell and re-themes with it. Styles live in styles/jma.css. */
import { useEffect, useId, useRef, type ReactNode, type KeyboardEvent, type CSSProperties } from "react";
import { act, useDemo } from "./store";
import { fmtDateTime, fmtShortDate, fmtTime, TZ_OFFICE, zoneLabel } from "./time";

export const cls = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export const ICON: Record<string, string> = {
  check: "M5 12.5l4.2 4.2L19 7",
  alert: "M12 8v5 M12 16.5v.01 M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z",
  clock: "M12 7v5l3.2 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  block: "M5.6 5.6l12.8 12.8 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  x: "M6 6l12 12 M18 6 6 18",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  back: "M19 12H5 M11 6l-6 6 6 6",
  down: "M6 9l6 6 6-6",
  download: "M12 4v11 M7 10.5l5 5 5-5 M5 20h14",
  upload: "M12 20V9 M7 13.5l5-5 5 5 M5 4h14",
  pin: "M12 21s-6-5.6-6-11a6 6 0 1 1 12 0c0 5.4-6 11-6 11Z M12 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z",
  info: "M12 11v6 M12 7.5v.01 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  pause: "M9 5v14 M15 5v14",
  play: "M7 4.5v15l12-7.5z",
  user: "M12 11a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Z M4.8 20a7.2 7.2 0 0 1 14.4 0",
  doc: "M7 3.5h7l5 5v12H7z M14 3.7v5h5",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  plus: "M12 5v14 M5 12h14",
  zoomIn: "M11 8v6 M8 11h6 M20 20l-4.3-4.3 M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z",
  zoomOut: "M8 11h6 M20 20l-4.3-4.3 M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z",
  refresh: "M20 11a8 8 0 1 0-2.3 5.7 M20 4v7h-7",
  send: "M4 12 20 4l-5 16-3-7z",
  lock: "M7 11V8a5 5 0 0 1 10 0v3 M5.5 11h13v9h-13z",
  eye: "M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z M12 14.8a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6Z",
  edit: "M4 20h4L19 9a2.4 2.4 0 0 0-3.4-3.4L4.6 16.6V20Z",
  calendar: "M4.5 6h15v14h-15z M4.5 10.5h15 M8.5 3.5v4 M15.5 3.5v4",
  flag: "M5.5 21V4 M5.5 4.5h11l-2 4 2 4h-11",
  chat: "M4.5 5.5h15v10h-9l-4.5 3.5v-3.5h-1.5z",
  layers: "M12 4 3 8.5l9 4.5 9-4.5z M3 13l9 4.5 9-4.5",
  bolt: "M13 3 4.5 14H10l-1 7 9-11h-5.5z",
  shield: "M12 3.5 5 6v5.5c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6z",
};

export function Icon({ name, size = 15, stroke = 1.8, style }: { name: keyof typeof ICON | string; size?: number; stroke?: number; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none", ...style }}>
      <path d={ICON[name] || name} />
    </svg>
  );
}

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cls("j-page", className)}>{children}</div>;
}

export function PageHead({ title, sub, actions, eyebrow }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="j-pagehead">
      <div className="j-pagehead-text">
        {eyebrow && <div className="j-eyebrow">{eyebrow}</div>}
        <h1 className="j-h1">{title}</h1>
        {sub && <p className="j-sub">{sub}</p>}
      </div>
      {actions && <div className="j-actions">{actions}</div>}
    </div>
  );
}

export function Panel({ title, sub, actions, children, flush, className, id }: { title?: ReactNode; sub?: ReactNode; actions?: ReactNode; children: ReactNode; flush?: boolean; className?: string; id?: string }) {
  return (
    <section className={cls("j-panel", className)} id={id} aria-label={typeof title === "string" ? title : undefined}>
      {(title || actions) && (
        <header className="j-panel-head">
          <div className="j-panel-titles">
            {title && <h2 className="j-h2">{title}</h2>}
            {sub && <div className="j-panel-sub">{sub}</div>}
          </div>
          {actions && <div className="j-actions">{actions}</div>}
        </header>
      )}
      <div className={flush ? "j-panel-body flush" : "j-panel-body"}>{children}</div>
    </section>
  );
}

type BtnProps = { children?: ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md"; icon?: string; disabled?: boolean; title?: string; type?: "button" | "submit"; className?: string; ariaLabel?: string; pressed?: boolean };
export function Btn({ children, onClick, variant = "secondary", size = "md", icon, disabled, title, type = "button", className, ariaLabel, pressed }: BtnProps) {
  const busy = useRef(false);
  return (
    <button type={type} title={title} aria-label={ariaLabel} aria-pressed={pressed} disabled={disabled}
      className={cls("j-btn", "j-btn-" + variant, size === "sm" && "j-btn-sm", !children && "j-btn-icon", className)}
      onClick={() => {
        // double-click guard: a second click inside 600 ms is ignored
        if (busy.current || !onClick) return;
        busy.current = true; onClick(); setTimeout(() => (busy.current = false), 600);
      }}>
      {icon && <Icon name={icon} size={size === "sm" ? 13 : 15} />}
      {children}
    </button>
  );
}

export type Tone = "ok" | "warn" | "bad" | "info" | "neutral" | "accent";
const TONE_ICON: Record<Tone, string> = { ok: "check", warn: "clock", bad: "alert", info: "info", neutral: "info", accent: "flag" };
export function Badge({ tone = "neutral", icon, children, title }: { tone?: Tone; icon?: string | false; children: ReactNode; title?: string }) {
  return (
    <span className={"j-badge j-tone-" + tone} title={title}>
      {icon !== false && <Icon name={icon || TONE_ICON[tone]} size={11} stroke={2.2} />}
      <span>{children}</span>
    </span>
  );
}

/** A date with its type, so a forecast is never mistaken for a commitment. */
export function DateTag({ ts, kind, tz = TZ_OFFICE, showZone, now }: { ts?: number | null; kind?: string; tz?: string; showZone?: boolean; now?: number }) {
  if (ts == null) return <span className="j-dim">-</span>;
  const late = now != null && ts < now;
  return (
    <span className={cls("j-date", late && "late")} title={(kind ? kind + ": " : "") + fmtDateTime(ts, tz, true)}>
      <span className="j-date-main">{fmtShortDate(ts, tz)}<span className="j-date-time"> {fmtTime(ts, tz)}{showZone ? " " + zoneLabel(tz) : ""}</span></span>
      {kind && <span className="j-date-kind">{kind}</span>}
    </span>
  );
}

export function Avatar({ name, colour, size = 26 }: { name: string; colour?: string; size?: number }) {
  const ini = name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return <span className="j-avatar" aria-hidden="true" style={{ width: size, height: size, fontSize: Math.round(size * 0.36), background: colour || "var(--surface-2)" }}>{ini}</span>;
}

export function Empty({ title, body, action }: { title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="j-empty" role="status">
      <div className="j-empty-title">{title}</div>
      {body && <div className="j-empty-body">{body}</div>}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}

export function KV({ items, cols = 2 }: { items: [ReactNode, ReactNode][]; cols?: number }) {
  return (
    <dl className="j-kv" style={{ gridTemplateColumns: "repeat(" + cols + ",minmax(0,1fr))" }}>
      {items.map(([k, v], i) => (
        <div key={i} className="j-kv-item"><dt>{k}</dt><dd>{v}</dd></div>
      ))}
    </dl>
  );
}

/** Pill filter group. Behaves as a radio group for keyboard users. */
export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: ReactNode; count?: number }[]; onChange: (v: T) => void; label: string }) {
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = options.findIndex((o) => o.id === value);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); onChange(options[(i + 1) % options.length].id); }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); onChange(options[(i - 1 + options.length) % options.length].id); }
  };
  return (
    <div className="j-seg" role="radiogroup" aria-label={label} onKeyDown={onKey}>
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={o.id === value} tabIndex={o.id === value ? 0 : -1} className={cls("j-seg-btn", o.id === value && "on")} onClick={() => onChange(o.id)}>
          {o.label}{o.count != null && <span className="j-seg-count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: ReactNode; error?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="j-field">
      <label className="j-label" htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && !error && <div className="j-hint">{hint}</div>}
      {error && <div className="j-error" role="alert">{error}</div>}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  return (
    <label className="j-search">
      <Icon name="M21 21l-4.3-4.3 M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z" size={14} />
      <span className="j-sr">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {value && <button type="button" className="j-search-clear" aria-label="Clear search" onClick={() => onChange("")}><Icon name="x" size={11} /></button>}
    </label>
  );
}

const trapStack: HTMLElement[] = [];
function useFocusTrap(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const self = ref.current;
    if (self) trapStack.push(self);
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const first = el?.querySelector<HTMLElement>("[data-autofocus]") || el?.querySelector<HTMLElement>("button,[href],input,select,textarea,[tabindex]:not([tabindex='-1'])");
    first?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => {
      // only the topmost drawer or dialog reacts, so Escape closes one layer
      if (trapStack[trapStack.length - 1] !== self) return;
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
      if (e.key === "Tab" && el) {
        const f = Array.from(el.querySelectorAll<HTMLElement>("button:not([disabled]),[href],input,select,textarea,[tabindex]:not([tabindex='-1'])")).filter((x) => x.offsetParent !== null);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => { document.removeEventListener("keydown", onKey, true); const i = self ? trapStack.lastIndexOf(self) : -1; if (i > -1) trapStack.splice(i, 1); prev?.focus?.(); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return ref;
}

export function Drawer({ open, onClose, title, eyebrow, actions, children, wide }: { open: boolean; onClose: () => void; title: ReactNode; eyebrow?: ReactNode; actions?: ReactNode; children: ReactNode; wide?: boolean }) {
  const ref = useFocusTrap(open, onClose);
  const tid = useId();
  if (!open) return null;
  return (
    <div className="j-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className={cls("j-drawer", wide && "wide")} role="dialog" aria-modal="true" aria-labelledby={tid}>
        <div className="j-drawer-head">
          <div style={{ minWidth: 0, flex: 1 }}>
            {eyebrow && <div className="j-eyebrow">{eyebrow}</div>}
            <h2 id={tid} className="j-drawer-title">{title}</h2>
          </div>
          {actions}
          <Btn variant="ghost" icon="x" onClick={onClose} ariaLabel="Close" />
        </div>
        <div className="j-drawer-body">{children}</div>
      </div>
    </div>
  );
}

export function Dialog({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode }) {
  const ref = useFocusTrap(open, onClose);
  const tid = useId();
  if (!open) return null;
  return (
    <div className="j-scrim center" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className="j-dialog" role="dialog" aria-modal="true" aria-labelledby={tid}>
        <div className="j-dialog-head"><h2 id={tid} className="j-h2">{title}</h2><Btn variant="ghost" icon="x" onClick={onClose} ariaLabel="Close" /></div>
        <div className="j-dialog-body">{children}</div>
        {footer && <div className="j-dialog-foot">{footer}</div>}
      </div>
    </div>
  );
}

/** Clickable figure that opens the records behind it. */
export function Stat({ label, value, sub, onClick, tone }: { label: string; value: ReactNode; sub?: ReactNode; onClick?: () => void; tone?: Tone }) {
  const inner = (
    <>
      <span className="j-stat-label">{label}</span>
      <span className={cls("j-stat-value", tone && "j-ink-" + tone)}>{value}</span>
      {sub && <span className="j-stat-sub">{sub}</span>}
    </>
  );
  return onClick ? <button type="button" className="j-stat" onClick={onClick}>{inner}</button> : <div className="j-stat">{inner}</div>;
}

/** Row that behaves as a button (Enter/Space open it). */
export function rowProps(onOpen: () => void, label: string) {
  return {
    tabIndex: 0, role: "button" as const, "aria-label": label, className: "j-row",
    onClick: onOpen, onKeyDown: (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } },
  };
}

export function Toast() {
  const d = useDemo();
  const n = d.notice;
  useEffect(() => { if (!n) return; const t = setTimeout(() => act.dismissNotice(), n.tone === "warn" ? 6500 : 4200); return () => clearTimeout(t); }, [n?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!n) return null;
  return (
    <div className={"j-toast j-tone-" + n.tone} role={n.tone === "warn" ? "alert" : "status"} aria-live="polite" key={n.id}>
      <Icon name={n.tone === "warn" ? "alert" : n.tone === "bad" ? "alert" : "check"} size={14} />
      <span>{n.text}</span>
      <button type="button" className="j-toast-x" aria-label="Dismiss" onClick={() => act.dismissNotice()}><Icon name="x" size={11} /></button>
    </div>
  );
}

export function Tabs({ value, tabs, onChange, label }: { value: string; tabs: { id: string; label: ReactNode }[]; onChange: (id: string) => void; label: string }) {
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = tabs.findIndex((t) => t.id === value);
    if (e.key === "ArrowRight") { e.preventDefault(); onChange(tabs[(i + 1) % tabs.length].id); }
    if (e.key === "ArrowLeft") { e.preventDefault(); onChange(tabs[(i - 1 + tabs.length) % tabs.length].id); }
  };
  return (
    <div className="j-tabs" role="tablist" aria-label={label} onKeyDown={onKey}>
      {tabs.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={t.id === value} tabIndex={t.id === value ? 0 : -1} className={cls("j-tab", t.id === value && "on")} onClick={() => onChange(t.id)}>{t.label}</button>
      ))}
    </div>
  );
}

export function Progress({ done, total, label }: { done: number; total: number; label: string }) {
  return <span className="j-progress" aria-label={label + ": " + done + " of " + total}><span>{done}/{total}</span></span>;
}

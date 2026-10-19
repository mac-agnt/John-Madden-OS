/* Drawing viewer shared by the office drawer and the client portal. The sheet is
   an <img> inside a stage moved with CSS translate and scale only. Pins are
   stored as normalised coordinates (0..1) over the drawing image, so they stay
   on the same spot at any zoom or screen size. */
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Btn, Icon, cls } from "../../kit";
import "../../../styles/jma-drawings.css";

export type CanvasPin = { id: string; x: number; y: number; n: number | string; label: string; tone?: "open" | "done" | "new"; active?: boolean };

type Props = {
  src: string;
  label: string;
  pins?: CanvasPin[];
  pinMode?: boolean;
  onPin?: (pt: { x: number; y: number }) => void;
  onPinClick?: (id: string) => void;
  overlay?: { src: string; opacity: number; label: string };
  compact?: boolean;
};

const MIN = 1, MAX = 5;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export default function DrawingCanvas({ src, label, pins = [], pinMode = false, onPin, onPinClick, overlay, compact }: Props) {
  const [view, setView] = useState({ s: 1, x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [failed, setFailed] = useState(false);
  const vpRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ px: number; py: number; x: number; y: number; moved: boolean; id: number } | null>(null);

  useEffect(() => { setFailed(false); }, [src]);

  const size = () => { const r = vpRef.current?.getBoundingClientRect(); return { w: r?.width || 1, h: r?.height || 1 }; };
  const bound = (s: number, x: number, y: number) => {
    const { w, h } = size();
    return { s, x: clamp(x, w - w * s, 0), y: clamp(y, h - h * s, 0) };
  };
  const zoomTo = (next: number) => {
    setView((v) => {
      const s = clamp(Math.round(next * 100) / 100, MIN, MAX);
      const { w, h } = size();
      const cx = w / 2, cy = h / 2;
      return bound(s, cx - ((cx - v.x) * s) / v.s, cy - ((cy - v.y) * s) / v.s);
    });
  };
  const zoomIn = () => zoomTo(view.s * 1.5);
  const zoomOut = () => zoomTo(view.s / 1.5);
  const reset = () => setView({ s: 1, x: 0, y: 0 });
  const pan = (dx: number, dy: number) => setView((v) => bound(v.s, v.x + dx, v.y + dy));

  /** Map a viewport point to normalised coordinates over the (transformed) image. */
  const toImage = (clientX: number, clientY: number) => {
    const r = imgRef.current?.getBoundingClientRect();
    if (!r || !r.width || !r.height) return null;
    return { x: clamp((clientX - r.left) / r.width, 0, 1), y: clamp((clientY - r.top) / r.height, 0, 1) };
  };
  const pinAtCentre = () => {
    const r = vpRef.current?.getBoundingClientRect();
    if (!r || !onPin) return;
    const pt = toImage(r.left + r.width / 2, r.top + r.height / 2);
    if (pt) onPin({ x: Math.round(pt.x * 1000) / 1000, y: Math.round(pt.y * 1000) / 1000 });
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest(".jd-pin")) return;
    drag.current = { px: e.clientX, py: e.clientY, x: view.x, y: view.y, moved: false, id: e.pointerId };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* not supported */ }
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = drag.current; if (!g) return;
    const dx = e.clientX - g.px, dy = e.clientY - g.py;
    if (!g.moved && Math.hypot(dx, dy) > 5) { g.moved = true; if (view.s > 1) setDragging(true); }
    if (g.moved && view.s > 1) setView((v) => bound(v.s, g.x + dx, g.y + dy));
  };
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    const g = drag.current; drag.current = null; setDragging(false);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    if (!g || g.moved || !pinMode || !onPin) return;
    const pt = toImage(e.clientX, e.clientY);
    if (pt) onPin({ x: Math.round(pt.x * 1000) / 1000, y: Math.round(pt.y * 1000) / 1000 });
  };
  const onCancel = () => { drag.current = null; setDragging(false); };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest(".jd-pin")) return;
    const step = 60;
    switch (e.key) {
      case "+": case "=": e.preventDefault(); zoomIn(); break;
      case "-": case "_": e.preventDefault(); zoomOut(); break;
      case "0": e.preventDefault(); reset(); break;
      case "ArrowLeft": if (view.s > 1) { e.preventDefault(); pan(step, 0); } break;
      case "ArrowRight": if (view.s > 1) { e.preventDefault(); pan(-step, 0); } break;
      case "ArrowUp": if (view.s > 1) { e.preventDefault(); pan(0, step); } break;
      case "ArrowDown": if (view.s > 1) { e.preventDefault(); pan(0, -step); } break;
      case "Enter": case " ": if (pinMode) { e.preventDefault(); pinAtCentre(); } break;
    }
  };

  const pct = Math.round(view.s * 100) + "%";
  return (
    <div className="jd-canvas">
      <div className="jd-canvas-tools" role="toolbar" aria-label={"Zoom controls for " + label}>
        {/* native buttons: zoom steps must not hit the kit's double-click guard */}
        <button type="button" className="j-btn j-btn-secondary j-btn-sm j-btn-icon" aria-label="Zoom out" title="Zoom out" onClick={zoomOut} disabled={view.s <= MIN}><Icon name="zoomOut" size={14} /></button>
        <span className="jd-zoom" aria-live="polite">{pct}</span>
        <button type="button" className="j-btn j-btn-secondary j-btn-sm j-btn-icon" aria-label="Zoom in" title="Zoom in" onClick={zoomIn} disabled={view.s >= MAX}><Icon name="zoomIn" size={14} /></button>
        <button type="button" className="j-btn j-btn-ghost j-btn-sm" onClick={reset} disabled={view.s === 1 && view.x === 0 && view.y === 0}><Icon name="refresh" size={13} />Reset view</button>
        {pinMode && onPin && <Btn size="sm" variant="primary" icon="pin" onClick={pinAtCentre}>Place comment at centre</Btn>}
      </div>
      <div
        ref={vpRef}
        className={cls("jd-viewport", view.s > 1 && "zoomed", view.s <= 1 && !pinMode && "flat", pinMode && "pinmode", dragging && "dragging")}
        tabIndex={0}
        role="group"
        aria-roledescription="drawing viewer"
        aria-label={label + ". Zoom with plus and minus, reset with 0, pan with the arrow keys when zoomed." + (pinMode ? " Comment mode: click the drawing, or press Enter to place a comment at the centre of the view." : "")}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onCancel} onKeyDown={onKey}
      >
        <div className={cls("jd-stage", dragging && "dragging")} style={{ transform: "translate(" + view.x + "px, " + view.y + "px) scale(" + view.s + ")" }}>
          {!failed && <img ref={imgRef} src={src} alt={label} draggable={false} onError={() => setFailed(true)} />}
          {!failed && overlay && <img className="jd-over" src={overlay.src} alt={overlay.label} draggable={false} style={{ opacity: overlay.opacity }} />}
          {!failed && pins.map((p) => (
            <button key={p.id} type="button" className={cls("jd-pin", p.tone, p.active && "on")} aria-label={p.label} title={p.label} aria-pressed={p.active ? true : undefined}
              style={{ left: p.x * 100 + "%", top: p.y * 100 + "%", transform: "translate(-50%, -50%) scale(" + 1 / view.s + ")" }}
              onClick={(e) => { e.stopPropagation(); onPinClick?.(p.id); }}>
              {p.n}
            </button>
          ))}
        </div>
        {failed && <div className="jd-canvas-fail" role="status">The drawing file could not be loaded. Try the download link instead.</div>}
      </div>
      {!compact && (
        <div className="jd-canvas-hint">
          {pinMode ? "Comment mode: click or tap the spot you mean. Pins stay attached to this revision." : "Zoom in, then drag to move around the sheet. Visual review only."}
        </div>
      )}
    </div>
  );
}

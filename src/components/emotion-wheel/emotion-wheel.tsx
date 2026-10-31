"use client";

import { ArrowLeft, Check, ChevronRight, Search, X } from "lucide-react";
import { AnimatePresence, motion, useMotionValueEvent, useSpring } from "motion/react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { normalize } from "@/lib/utils";
import { arcPath, fitLabel, labelRotation, layoutAround, polar, R, type Segment } from "./geometry";
import type { EmotionTreeNode } from "./types";
import { useEmotionIndex } from "./use-emotion-index";

const ZOOM_IDLE = 1.42;

type Props = {
  tree: EmotionTreeNode[];
  selected: string[];
  onToggle: (nodeId: string) => void;
};

/**
 * Rueda de las emociones: 3 anillos concéntricos.
 * Tocás una familia → aparece el segundo anillo; tocás una secundaria → aparece el tercero.
 * Se puede elegir en cualquier nivel (tocando el centro o "Es esto").
 */
export function EmotionWheel({ tree, selected, onToggle }: Props) {
  const index = useEmotionIndex(tree);
  const [focus, setFocus] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const searchId = useId();
  const zoomRef = useRef<SVGGElement>(null);
  const zoom = useSpring(ZOOM_IDLE, { stiffness: 180, damping: 24 });

  useEffect(() => {
    zoom.set(focus.length ? 1 : ZOOM_IDLE);
  }, [focus.length, zoom]);
  useMotionValueEvent(zoom, "change", (v) =>
    zoomRef.current?.setAttribute("transform", `scale(${v})`),
  );

  const family = focus[0] ? index.get(focus[0])?.node : undefined;
  const secondary = focus[1] ? index.get(focus[1])?.node : undefined;
  const current = secondary ?? family;
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  // Ancestros de lo elegido, para marcar con un puntito "acá adentro elegiste algo".
  const markedAncestors = useMemo(() => {
    const s = new Set<string>();
    for (const id of selected)
      index
        .get(id)
        ?.path.slice(0, -1)
        .forEach((n) => s.add(n.id));
    return s;
  }, [selected, index]);

  const familySegs: Segment[] = tree.map((_, i) => {
    const size = 360 / tree.length;
    return { a0: i * size, a1: (i + 1) * size, mid: i * size + size / 2 };
  });
  const familyIndex = family ? tree.findIndex((n) => n.id === family.id) : -1;
  const ring2 = family
    ? layoutAround(
        family.children.length,
        family.children.length >= 6 ? 45 : 50,
        familySegs[familyIndex].mid,
      )
    : [];
  const secondaryIndex =
    secondary && family ? family.children.findIndex((n) => n.id === secondary.id) : -1;
  const ring3 =
    secondary && secondaryIndex >= 0
      ? layoutAround(secondary.children.length, 54, ring2[secondaryIndex].mid)
      : [];

  function activate(node: EmotionTreeNode) {
    if (node.children.length === 0) return onToggle(node.id);
    if (node.level === 1) setFocus(focus[0] === node.id && !focus[1] ? [] : [node.id]);
    else if (node.level === 2)
      setFocus(focus[1] === node.id ? [node.parentId!] : [node.parentId!, node.id]);
  }

  function back() {
    setFocus((f) => f.slice(0, -1));
  }

  const results = useMemo(() => {
    const q = normalize(query);
    if (q.length < 2) return [];
    return [...index.values()]
      .filter((e) => normalize(e.node.label).includes(q))
      .sort(
        (a, b) =>
          Number(!normalize(a.node.label).startsWith(q)) -
            Number(!normalize(b.node.label).startsWith(q)) || a.node.level - b.node.level,
      )
      .slice(0, 8);
  }, [query, index]);

  function pickFromSearch(id: string) {
    const entry = index.get(id)!;
    if (!selectedSet.has(id)) onToggle(id);
    const ids = entry.path.map((n) => n.id);
    setFocus(entry.node.level === 3 ? ids.slice(0, 2) : ids);
    setQuery("");
  }

  const status = current
    ? `${current.label}. ${current.children.length ? "Podés elegir una más específica o quedarte con esta." : ""}`
    : "Elegí una emoción para empezar.";

  return (
    <div className="flex flex-col gap-4">
      {/* Búsqueda */}
      <div className="relative">
        <label htmlFor={searchId} className="sr-only">
          Buscá una emoción
        </label>
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2"
          aria-hidden
        />
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscá una emoción (ej.: ansio…)"
          autoComplete="off"
          className="border-input bg-card placeholder:text-muted-foreground/80 focus-visible:border-ring focus-visible:ring-ring/25 h-12 w-full rounded-full border pr-10 pl-12 text-base focus-visible:ring-3 focus-visible:outline-none"
          aria-controls={results.length > 0 ? `${searchId}-results` : undefined}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="text-muted-foreground hover:bg-muted absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1"
            aria-label="Borrar búsqueda"
          >
            <X className="size-4" />
          </button>
        )}
        <AnimatePresence>
          {results.length > 0 && (
            <motion.ul
              id={`${searchId}-results`}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="bg-card absolute inset-x-0 top-14 z-20 overflow-hidden rounded-2xl border shadow-xl"
            >
              {results.map(({ node, path }) => (
                <li key={node.id}>
                  <button
                    type="button"
                    onClick={() => pickFromSearch(node.id)}
                    className="hover:bg-muted focus-visible:bg-muted flex w-full items-center gap-3 px-4 py-3 text-left focus-visible:outline-none"
                  >
                    <span
                      className="size-4 shrink-0 rounded-full"
                      style={{ background: node.color }}
                      aria-hidden
                    />
                    <span className="flex-1">
                      <span className="font-medium">{node.label}</span>
                      {path.length > 1 && (
                        <span className="text-muted-foreground block text-xs">
                          {path
                            .slice(0, -1)
                            .map((n) => n.label)
                            .join(" › ")}
                        </span>
                      )}
                    </span>
                    {selectedSet.has(node.id) && (
                      <Check className="text-primary size-4" aria-label="ya elegida" />
                    )}
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
        {normalize(query).length >= 2 && results.length === 0 && (
          <p className="text-muted-foreground mt-2 px-4 text-sm">
            No encontramos esa emoción. Probá con otra palabra.
          </p>
        )}
      </div>

      {/* Rueda */}
      <div
        role="group"
        aria-label="Rueda de las emociones"
        aria-describedby={`${searchId}-help`}
        onKeyDown={(e) => {
          if (e.key === "Escape" && focus.length) {
            e.stopPropagation();
            back();
          }
        }}
        className="mx-auto w-full max-w-[440px]"
      >
        <p id={`${searchId}-help`} className="sr-only">
          Usá Tab para recorrer las emociones y Enter para abrirlas o elegirlas. Escape vuelve un
          nivel.
        </p>
        <svg
          viewBox={`${-R.view} ${-R.view} ${R.view * 2} ${R.view * 2}`}
          className="h-auto w-full touch-manipulation select-none"
        >
          {/* Sin nada abierto, la rueda se ve más grande; al abrir un anillo "se aleja" para hacerle lugar.
              Se escala con el atributo transform (alrededor de 0,0 = centro de la rueda). */}
          <g ref={zoomRef} transform={`scale(${ZOOM_IDLE})`}>
            {/* Guías tenues de los anillos que todavía no se abrieron */}
            <motion.g initial={false} animate={{ opacity: focus.length ? 1 : 0 }}>
              <circle
                r={(R.ring2[0] + R.ring2[1]) / 2}
                fill="none"
                stroke="var(--muted)"
                strokeWidth={R.ring2[1] - R.ring2[0]}
                opacity={0.55}
              />
              <circle
                r={(R.ring3[0] + R.ring3[1]) / 2}
                fill="none"
                stroke="var(--muted)"
                strokeWidth={R.ring3[1] - R.ring3[0]}
                opacity={0.3}
              />
            </motion.g>

            {tree.map((node, i) => (
              <WheelSegment
                key={node.id}
                node={node}
                seg={familySegs[i]}
                radii={R.ring1}
                order={i}
                fontSize={12.5}
                upper
                dim={!!family && family.id !== node.id}
                active={family?.id === node.id}
                selected={selectedSet.has(node.id)}
                marked={markedAncestors.has(node.id)}
                onActivate={() => activate(node)}
              />
            ))}

            <AnimatePresence>
              {family?.children.map((node, i) => (
                <WheelSegment
                  key={node.id}
                  node={node}
                  seg={ring2[i]}
                  radii={R.ring2}
                  order={i}
                  fontSize={13}
                  dim={!!secondary && secondary.id !== node.id}
                  active={secondary?.id === node.id}
                  selected={selectedSet.has(node.id)}
                  marked={markedAncestors.has(node.id)}
                  onActivate={() => activate(node)}
                />
              ))}
            </AnimatePresence>

            <AnimatePresence>
              {secondary?.children.map((node, i) => (
                <WheelSegment
                  key={node.id}
                  node={node}
                  seg={ring3[i]}
                  radii={R.ring3}
                  order={i}
                  fontSize={14}
                  selected={selectedSet.has(node.id)}
                  onActivate={() => activate(node)}
                />
              ))}
            </AnimatePresence>

            <WheelCenter
              current={current}
              selected={!!current && selectedSet.has(current.id)}
              onPick={() => current && onToggle(current.id)}
            />
          </g>
        </svg>
        <p aria-live="polite" className="sr-only">
          {status}
        </p>
      </div>

      {/* Breadcrumb + acciones */}
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-2">
        <nav
          aria-label="Nivel de la rueda"
          className="flex min-w-0 flex-wrap items-center gap-1 text-sm"
        >
          {focus.length > 0 ? (
            <>
              <button
                type="button"
                onClick={back}
                className="hover:bg-muted mr-1 inline-flex items-center gap-1 rounded-full px-3 py-2 font-medium"
                aria-label="Volver un nivel"
              >
                <ArrowLeft className="size-4" aria-hidden /> Volver
              </button>
              <button
                type="button"
                onClick={() => setFocus([])}
                className="text-muted-foreground hover:bg-muted rounded-full px-2 py-1"
              >
                Todas
              </button>
              {[family, secondary].filter(Boolean).map((n, i, arr) => (
                <span key={n!.id} className="inline-flex items-center gap-1">
                  <ChevronRight className="text-muted-foreground size-4" aria-hidden />
                  <button
                    type="button"
                    onClick={() => setFocus(focus.slice(0, i + 1))}
                    aria-current={i === arr.length - 1 ? "location" : undefined}
                    className="hover:bg-muted aria-[current]:bg-muted rounded-full px-2 py-1 font-medium"
                  >
                    {n!.label}
                  </button>
                </span>
              ))}
            </>
          ) : (
            <span className="text-muted-foreground px-1">Tocá la familia que más se acerque.</span>
          )}
        </nav>
        {current && (
          <button
            type="button"
            onClick={() => onToggle(current.id)}
            aria-pressed={selectedSet.has(current.id)}
            className="inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-semibold transition-colors"
            style={{
              borderColor: current.color,
              background: selectedSet.has(current.id) ? current.color : undefined,
            }}
          >
            {selectedSet.has(current.id) ? <Check className="size-4" aria-hidden /> : null}
            {selectedSet.has(current.id) ? `${current.label} elegida` : `Es esto: ${current.label}`}
          </button>
        )}
      </div>
    </div>
  );
}

function WheelSegment({
  node,
  seg,
  radii,
  order,
  fontSize,
  upper,
  dim,
  active,
  selected,
  marked,
  onActivate,
}: {
  node: EmotionTreeNode;
  seg: Segment;
  radii: readonly [number, number];
  order: number;
  fontSize: number;
  upper?: boolean;
  dim?: boolean;
  active?: boolean;
  selected?: boolean;
  marked?: boolean;
  onActivate: () => void;
}) {
  const [r0, r1] = radii;
  const midR = (r0 + r1) / 2;
  const arcLen = ((seg.a1 - seg.a0) * Math.PI * midR) / 180;
  const label = upper ? node.label.toUpperCase() : node.label;
  const fit = fitLabel(label, arcLen * 0.84, fontSize);
  const lineH = fit.size * 1.1;
  const [x, y] = polar(midR, seg.mid);
  // Marca de "elegida": en la esquina exterior del sector, para no tapar el texto.
  const [cx, cy] = polar(r1 - 9, seg.a1 - (13 / r1) * (180 / Math.PI));
  const d = arcPath(r0, r1, seg.a0, seg.a1);
  const hasChildren = node.children.length > 0;

  return (
    <motion.g
      role="button"
      tabIndex={0}
      aria-label={`${node.label}${hasChildren ? ", ver más específicas" : ""}`}
      aria-pressed={hasChildren ? undefined : !!selected}
      aria-expanded={hasChildren ? !!active : undefined}
      onClick={onActivate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate();
        }
      }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: dim ? 0.35 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 320, damping: 26, delay: order * 0.03 }}
      whileTap={{ scale: 0.96 }}
      className="wheel-seg cursor-pointer outline-none"
    >
      <path
        d={d}
        fill={node.color}
        stroke="var(--wheel-stroke)"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      {(active || selected) && (
        <path
          d={d}
          fill="none"
          stroke="var(--wheel-text)"
          strokeWidth={selected ? 2.5 : 1.5}
          strokeOpacity={selected ? 0.9 : 0.4}
          strokeLinejoin="round"
          pointerEvents="none"
        />
      )}
      <path
        className="wheel-focus"
        d={d}
        fill="none"
        stroke="var(--ring)"
        strokeWidth={4}
        pointerEvents="none"
      />
      <text
        transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${labelRotation(seg.mid)})`}
        textAnchor="middle"
        fontSize={fit.size}
        fontWeight={selected || active || upper ? 700 : 500}
        letterSpacing={upper ? 0.6 : 0}
        fill="var(--wheel-text)"
        pointerEvents="none"
      >
        {fit.lines.map((line, i) => (
          <tspan
            key={i}
            x={0}
            y={-((fit.lines.length - 1) * lineH) / 2 + i * lineH + fit.size * 0.35}
          >
            {line}
          </tspan>
        ))}
      </text>
      {selected && (
        <g transform={`translate(${cx.toFixed(2)} ${cy.toFixed(2)})`} pointerEvents="none">
          <circle r={7} fill="var(--wheel-text)" />
          <path
            d="M -3 0 L -1 2.5 L 3.5 -2.5"
            fill="none"
            stroke={node.color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}
      {!selected && marked && (
        <circle
          cx={cx}
          cy={cy}
          r={3.5}
          fill="var(--wheel-text)"
          opacity={0.7}
          pointerEvents="none"
        />
      )}
    </motion.g>
  );
}

function WheelCenter({
  current,
  selected,
  onPick,
}: {
  current?: EmotionTreeNode;
  selected: boolean;
  onPick: () => void;
}) {
  if (!current) {
    return (
      <g aria-hidden>
        <circle r={R.center} fill="var(--card)" stroke="var(--border)" strokeWidth={1.5} />
        <text textAnchor="middle" fontSize={13} fontWeight={600} fill="var(--muted-foreground)">
          <tspan x={0} y={-3}>
            ¿Qué
          </tspan>
          <tspan x={0} y={13}>
            sentís?
          </tspan>
        </text>
      </g>
    );
  }
  const fit = fitLabel(current.label, 84, 14, 10);
  return (
    <motion.g
      key={current.id}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={selected ? `Quitar ${current.label}` : `Elegir ${current.label}`}
      onClick={onPick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPick();
        }
      }}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="wheel-seg cursor-pointer outline-none"
    >
      <circle r={R.center} fill={current.color} stroke="var(--wheel-stroke)" strokeWidth={3} />
      {selected && (
        <circle r={R.center - 4} fill="none" stroke="var(--wheel-text)" strokeWidth={2} />
      )}
      <circle
        className="wheel-focus"
        r={R.center}
        fill="none"
        stroke="var(--ring)"
        strokeWidth={4}
      />
      <text textAnchor="middle" fill="var(--wheel-text)" pointerEvents="none">
        {fit.lines.map((line, i) => (
          <tspan
            key={i}
            x={0}
            y={-6 - ((fit.lines.length - 1) * fit.size * 1.1) / 2 + i * fit.size * 1.1}
            fontSize={fit.size}
            fontWeight={700}
          >
            {line}
          </tspan>
        ))}
        <tspan x={0} y={18} fontSize={9.5} fontWeight={500} opacity={0.8}>
          {selected ? "✓ elegida" : "tocá para elegir"}
        </tspan>
      </text>
    </motion.g>
  );
}

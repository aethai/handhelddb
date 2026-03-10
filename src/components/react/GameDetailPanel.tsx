import { useState, useEffect, useRef, useCallback } from "react";
import ErrorBoundary from "./ErrorBoundary";
import VoteButtons from "./VoteButtons";

/* ═══ TYPES ═══ */
interface TDPProfile {
  tdpWatts: number;
  fpsAvg: number;
  fpsTarget: number;
  resolution: string;
  preset: string;
  fsrEnabled: boolean;
  fsrMode?: string;
  estimatedBatteryHours: number;
  thermal: string;
  fanNoise: string;
  reportCount: number;
  confidence: string;
}

interface DeviceInfo {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  manufacturer: string;
  chip: string | null;
  screen_resolution: string | null;
  battery_wh: number | null;
  tdp_min: number | null;
  tdp_max: number | null;
  image: string | null;
}

interface ConsensusInfo {
  device_id: string;
  fps_avg: number | null;
  fps_low: number | null;
  recommended_preset: string | null;
  recommended_resolution: string | null;
  recommended_tdp: number | null;
  estimated_battery: number | null;
  typical_thermal: string | null;
  typical_fan_noise: string | null;
  battery_saver_profile: TDPProfile | null;
  balanced_profile: TDPProfile | null;
  performance_profile: TDPProfile | null;
  report_count: number;
  confidence_level: string | null;
  overall_verdict: string | null;
}

interface ReportInfo {
  id: string;
  fps_avg: number;
  preset: string | null;
  resolution: string | null;
  fsr_enabled: boolean;
  fsr_mode: string | null;
  tdp_limit_watts: number | null;
  battery_life_hours: number | null;
  overall_rating: string;
  notes: string | null;
  upvotes: number;
  downvotes: number;
  created_at: string;
  user: { display_name: string | null; avatar_url: string | null; username: string | null } | null;
}

interface GameInfo {
  name: string;
  headerImage: string | null;
  metacriticScore: number | null;
  steamReviewScore: number | null;
  deckCompatibility: string | null;
  priceDisplay: string | null;
  subtitle: string;
  description: string;
  tags: string[];
  steamAppid: number | null;
}

interface PageData {
  gameId: string;
  gameName: string;
  gameSlug: string;
  devices: DeviceInfo[];
  consensus: Record<string, ConsensusInfo>;
  defaultDeviceId: string;
  initialReports: ReportInfo[];
  gameInfo: GameInfo;
  isLoggedIn: boolean;
  userVotes?: Record<string, boolean>;
}

/* ═══ HELPERS ═══ */
const fc = (f: number) => f >= 55 ? "#22c55e" : f >= 40 ? "#eab308" : f >= 30 ? "#f97316" : "#ef4444";

const VERDICT_LABEL: Record<string, string> = {
  excellent: "Portable Perfect",
  good: "Commute Ready",
  fair: "Playable",
  poor: "Rough Ride",
  unplayable: "Unplayable",
};

const PRESET_LABEL: Record<string, string> = {
  ultra_low: "Ultra Low",
  low: "Low",
  medium: "Medium",
  high: "High",
  ultra: "Ultra",
  custom: "Custom",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/* ═══ ANIMATED FPS COUNTER ═══ */
function useCount(target: number, dur = 1200) {
  const [v, setV] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const go = useRef(false);
  useEffect(() => { go.current = false; setV(0); }, [target]);
  useEffect(() => {
    if (!ref.current || go.current) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !go.current) {
        go.current = true;
        const t0 = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - t0) / dur, 1);
          setV(Math.round((1 - Math.pow(1 - p, 4)) * target));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.1 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target, dur]);
  return [v, ref] as const;
}

/* ═══ MAIN COMPONENT ═══ */
function GameDetailPanelInner({ dataId, initialData }: { dataId?: string; initialData?: PageData }) {
  const [data] = useState<PageData>(() => {
    if (initialData) return initialData;
    if (typeof document !== "undefined") {
      const el = document.getElementById(dataId ?? "");
      return JSON.parse(el?.textContent ?? "{}");
    }
    return {} as PageData;
  });

  const [selectedDeviceId, setSelectedDeviceId] = useState(data.defaultDeviceId);
  const [reportsByDevice, setReportsByDevice] = useState<Record<string, ReportInfo[]>>({
    [data.defaultDeviceId]: data.initialReports ?? [],
  });
  const [sort, setSort] = useState<"recent" | "helpful" | "best">("helpful");
  const [reportsLoading, setReportsLoading] = useState(false);
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 960);

  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  const mob = w < 660;
  const cons = data.consensus?.[selectedDeviceId];
  const dev = data.devices?.find(d => d.id === selectedDeviceId);
  const fps = cons?.fps_avg ? Math.round(cons.fps_avg) : 0;
  const tc = cons?.overall_verdict ? fc(fps) : "var(--color-text-3)";
  const tier = cons?.overall_verdict ? VERDICT_LABEL[cons.overall_verdict] ?? cons.overall_verdict : "No Data";

  const [fpsVal, fpsRef] = useCount(fps);


  const switchDevice = useCallback(async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    if (!reportsByDevice[deviceId]) {
      setReportsLoading(true);
      try {
        const res = await fetch(`/api/reports?gameId=${data.gameId}&deviceId=${deviceId}&limit=10`);
        const json = await res.json();
        setReportsByDevice(prev => ({ ...prev, [deviceId]: json.data ?? [] }));
      } catch {
        setReportsByDevice(prev => ({ ...prev, [deviceId]: [] }));
      } finally {
        setReportsLoading(false);
      }
    }
  }, [data.gameId, reportsByDevice]);

  const currentReports = reportsByDevice[selectedDeviceId] ?? [];
  const sortedReports = [...currentReports].sort((a, b) => {
    if (sort === "helpful") return (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes);
    if (sort === "best") return b.fps_avg - a.fps_avg;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const devicesWithData = (data.devices ?? [])
    .filter(d => data.consensus?.[d.id]?.fps_avg != null)
    .sort((a, b) => (data.consensus[b.id]?.fps_avg ?? 0) - (data.consensus[a.id]?.fps_avg ?? 0));
  const maxFps = Math.max(...devicesWithData.map(d => data.consensus[d.id]?.fps_avg ?? 0), 60);

  const bal = cons?.balanced_profile;
  const eco = cons?.battery_saver_profile;
  const perf = cons?.performance_profile;
  const hasTDP = !!(eco || bal || perf);

  const topReport = [...currentReports]
    .filter(r => r.notes)
    .sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes))[0];

  const F = "var(--font-heading)";
  const M = "var(--font-mono)";
  const gi = data.gameInfo;
  const deckMap: Record<string, { label: string; color: string; bg: string }> = {
    verified: { label: "Verified", color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
    playable: { label: "Playable", color: "#facc15", bg: "rgba(250,204,21,0.12)" },
    unsupported: { label: "Unsupported", color: "#f87171", bg: "rgba(248,113,113,0.12)" },
    unknown: { label: "Unknown", color: "var(--color-text-3)", bg: "rgba(90,84,104,0.12)" },
  };
  const deckInfo = deckMap[gi?.deckCompatibility ?? "unknown"] ?? deckMap.unknown;

  return (
    <div>
      {/* ████████ HERO — SPLIT LAYOUT ████████ */}
      <section ref={fpsRef} style={{
        paddingTop: mob ? 56 : 60,
        minHeight: mob ? "auto" : "auto",
        display: "flex", flexDirection: mob ? "column" : "row",
        position: "relative",
      }}>

        {/* LEFT — INSTRUMENT PANEL (on mobile: comes FIRST) */}
        <div style={{
          flex: mob ? "none" : "0 0 55%",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: mob ? "32px 16px 24px" : "40px",
          order: mob ? 1 : 2,
        }}>
          <div style={{ display: "flex", gap: 2, marginBottom: mob ? 28 : 36, flexWrap: "wrap", justifyContent: "center" }}>
            {(data.devices ?? []).filter(d => data.consensus?.[d.id]).map(dv => {
              const a = selectedDeviceId === dv.id;
              const dFps = data.consensus[dv.id]?.fps_avg ? Math.round(data.consensus[dv.id].fps_avg!) : 0;
              const cc = dFps > 0 ? fc(dFps) : "var(--color-text-3)";
              return (
                <button key={dv.id} onClick={() => switchDevice(dv.id)} style={{
                  fontFamily: M, fontSize: mob ? 9 : 10,
                  fontWeight: a ? 700 : 500, letterSpacing: "0.06em",
                  color: a ? cc : "var(--color-text-dim)",
                  background: a ? `${cc}0c` : "transparent",
                  border: `1px solid ${a ? cc + "25" : "transparent"}`,
                  padding: mob ? "6px 12px" : "7px 16px",
                  borderRadius: 0, cursor: "pointer",
                  transition: "all 0.2s",
                }}>{dv.shortName}</button>
              );
            })}
          </div>

          <div style={{ textAlign: "center", marginBottom: mob ? 20 : 28 }}>
            <div style={{
              fontFamily: M, fontSize: mob ? 64 : 96, fontWeight: 700,
              color: tc, lineHeight: 1, letterSpacing: "-0.04em",
              transition: "color 0.3s",
            }}>{fps > 0 ? fpsVal : "—"}</div>
            <div style={{ fontFamily: M, fontSize: 10, color: "var(--color-text-dim)", letterSpacing: "0.2em", marginTop: 4, textTransform: "uppercase" }}>FPS</div>
          </div>

          <div style={{
            fontFamily: M, fontSize: 10, fontWeight: 700,
            color: tc, letterSpacing: "0.14em",
            padding: "6px 20px", borderRadius: 6,
            background: `${tc}0a`, border: `1px solid ${tc}18`,
            marginBottom: 16, transition: "all 0.5s",
          }}>{tier.toUpperCase()}</div>

          <div style={{ display: "flex", gap: mob ? 24 : 36 }}>
            {[
              [cons?.estimated_battery ? `${cons.estimated_battery.toFixed(1)}h` : "—", "BATTERY"],
              [cons?.recommended_tdp ? `${Math.round(cons.recommended_tdp)}W` : "—", "POWER"],
              [`${cons?.report_count ?? 0}`, "REPORTS"],
            ].map(([v, l]) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: M, fontSize: mob ? 16 : 20, fontWeight: 700, color: "#e0dce0" }}>{v}</div>
                <div style={{ fontFamily: M, fontSize: 7, color: "var(--color-text-dim)", letterSpacing: "0.12em", marginTop: 3 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — GAME IDENTITY (on mobile: comes second) */}
        <div style={{
          flex: mob ? "none" : "0 0 45%",
          display: "flex", flexDirection: "column", justifyContent: "center",
          padding: mob ? "20px 16px 28px" : "40px 28px 40px 0",
          order: mob ? 2 : 1,
        }}>
          {gi?.headerImage && (
            <div style={{
              width: "100%", height: mob ? 140 : 180,
              borderRadius: 16, marginBottom: 20,
              border: "1px solid #ffffff08",
              position: "relative", overflow: "hidden",
            }}>
              <img src={gi.headerImage} alt={data.gameName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, var(--color-base)40, transparent)" }} />
            </div>
          )}

          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            {gi?.metacriticScore && (
              <span style={{ fontFamily: M, fontSize: 9, color: "#ffffff50", background: "#ffffff06", border: "1px solid #ffffff08", padding: "4px 10px", borderRadius: 5, letterSpacing: "0.03em" }}>MC {gi.metacriticScore}</span>
            )}
            {gi?.steamReviewScore && (
              <span style={{ fontFamily: M, fontSize: 9, color: "#ffffff50", background: "#ffffff06", border: "1px solid #ffffff08", padding: "4px 10px", borderRadius: 5, letterSpacing: "0.03em" }}>Steam {gi.steamReviewScore}%</span>
            )}
            <span style={{ fontFamily: M, fontSize: 9, color: deckInfo.color, background: deckInfo.bg, border: `1px solid ${deckInfo.color}18`, padding: "4px 10px", borderRadius: 5, letterSpacing: "0.03em" }}>
              {gi?.deckCompatibility === "verified" ? "✔ " : ""}Deck {deckInfo.label}
            </span>
            {gi?.priceDisplay && (
              <span style={{ fontFamily: M, fontSize: 9, color: "#ffffff30", background: "#ffffff06", border: "1px solid #ffffff08", padding: "4px 10px", borderRadius: 5, letterSpacing: "0.03em" }}>{gi.priceDisplay}</span>
            )}
          </div>

          <h1 style={{
            fontFamily: F, fontSize: mob ? 36 : 48, fontWeight: 900,
            color: "#f0eef8", letterSpacing: "-0.04em",
            lineHeight: 0.95, marginBottom: 8,
          }}>{data.gameName}</h1>

          <p style={{ fontFamily: M, fontSize: 11, color: "#ffffff30", marginBottom: 16 }}>{gi?.subtitle}</p>

          {gi?.description && (
            <p style={{ fontFamily: F, fontSize: 13, color: "#4a4458", lineHeight: 1.6, marginBottom: 14, maxWidth: 400 }}>{gi.description}</p>
          )}

          {gi?.tags && gi.tags.length > 0 && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 16 }}>
              {gi.tags.slice(0, 6).map(t => (
                <span key={t} style={{ fontFamily: M, fontSize: 8, color: "#3a3448", background: "#ffffff04", border: "1px solid #ffffff06", padding: "3px 9px", borderRadius: 4 }}>{t}</span>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a href="/report/new" style={{
              fontFamily: M, fontSize: 10, fontWeight: 700,
              color: "var(--color-base)", background: tc,
              padding: "10px 22px", borderRadius: 8, border: "none",
              textDecoration: "none", letterSpacing: "0.04em",
              boxShadow: `0 0 20px ${tc}25`,
              transition: "all 0.3s",
            }}>Submit data</a>
            {gi?.steamAppid && (
              <a href={`https://store.steampowered.com/app/${gi.steamAppid}`} target="_blank" rel="noopener noreferrer" style={{
                fontFamily: M, fontSize: 10,
                color: "#ffffff40", padding: "10px 18px", borderRadius: 8,
                border: "1px solid #ffffff10", background: "#ffffff04",
                textDecoration: "none",
              }}>Steam ↗</a>
            )}
          </div>
        </div>
      </section>

      {/* ████████ CONTENT SECTIONS ████████ */}
      <div style={{ maxWidth: 1060, margin: "0 auto", padding: mob ? "0 16px" : "0 28px" }}>

        {cons && (cons.recommended_preset || bal) && (
          <section style={{ marginBottom: mob ? 32 : 44 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h2 style={{ fontFamily: F, fontSize: mob ? 18 : 22, fontWeight: 800, color: "var(--color-text)", letterSpacing: "-0.02em" }}>
                Settings <span style={{ fontFamily: M, fontSize: 11, fontWeight: 500, color: "var(--color-text-dim)" }}>{dev?.name}</span>
              </h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: mob ? "repeat(3, 1fr)" : "repeat(6, 1fr)", gap: 1, borderRadius: 14, overflow: "hidden", marginBottom: 12 }}>
              {([
                [PRESET_LABEL[cons.recommended_preset ?? ""] ?? cons.recommended_preset ?? "—", "PRESET"],
                [cons.recommended_resolution ?? "—", "RES"],
                [bal?.fsrEnabled ? `FSR ${bal.fsrMode ?? "On"}` : "Off", "UPSCALE"],
                [bal?.fpsTarget ? `${bal.fpsTarget}` : fps > 0 ? `${fps}` : "—", "FPS CAP"],
                [cons.recommended_tdp ? `${Math.round(cons.recommended_tdp)}W` : "—", "TDP"],
                [dev?.screen_resolution ? dev.screen_resolution.split("x").pop() + " Hz" : "60 Hz", "REFRESH"],
              ] as [string, string][]).map(([v, l], i) => (
                <div key={l} style={{ padding: mob ? "16px 8px" : "18px 14px", background: i % 2 === 0 ? "#0c0b12" : "#0a0910", textAlign: "center" }}>
                  <div style={{ fontFamily: M, fontSize: mob ? 13 : 15, fontWeight: 700, color: "#d0cce0", marginBottom: 4 }}>{v}</div>
                  <div style={{ fontFamily: M, fontSize: 7, color: "var(--color-text-dim)", letterSpacing: "0.12em" }}>{l}</div>
                </div>
              ))}
            </div>

            {topReport?.notes && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={{
                  fontFamily: M, fontSize: 10, color: "#7a7590",
                  background: "#0a0910", padding: "7px 14px", borderRadius: 8,
                  borderLeft: `2px solid ${tc}25`, maxWidth: 600,
                }}>
                  {topReport.notes.length > 120 ? topReport.notes.slice(0, 120) + "…" : topReport.notes}
                </span>
              </div>
            )}
          </section>
        )}

        {hasTDP && (
          <section style={{ marginBottom: mob ? 32 : 44 }}>
            <h2 style={{ fontFamily: F, fontSize: mob ? 18 : 22, fontWeight: 800, color: "var(--color-text)", letterSpacing: "-0.02em", marginBottom: 14 }}>Profiles</h2>
            <div style={{ display: "flex", gap: 1, borderRadius: 14, overflow: "hidden" }}>
              {([
                ["ECO", eco],
                ["BAL", bal],
                ["MAX", perf],
              ] as [string, TDPProfile | null | undefined][]).map(([label, profile]) => {
                const pFps = profile?.fpsAvg ? Math.round(profile.fpsAvg) : null;
                const pc = pFps ? fc(pFps) : "var(--color-text-dim)";
                const isBal = label === "BAL";
                return (
                  <div key={label} style={{
                    flex: 1, padding: mob ? "18px 8px" : "24px 16px",
                    background: isBal ? "#0c0b12" : "#08070e",
                    textAlign: "center", position: "relative",
                  }}>
                    {isBal && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${tc}40, transparent)` }} />}
                    <div style={{ fontFamily: M, fontSize: 7, color: isBal ? tc : "var(--color-text-dim)", letterSpacing: "0.15em", marginBottom: 10, fontWeight: isBal ? 700 : 500 }}>{label}</div>
                    <div style={{
                      fontFamily: M, fontSize: mob ? 32 : 44, fontWeight: 800,
                      color: pc, letterSpacing: "-0.05em", lineHeight: 0.9,
                      textShadow: pFps ? `0 0 20px ${pc}20` : "none",
                    }}>{pFps ?? "—"}</div>
                    <div style={{ fontFamily: M, fontSize: 9, color: "var(--color-text-3)", marginTop: 8 }}>
                      {profile?.estimatedBatteryHours ? `${profile.estimatedBatteryHours.toFixed(1)}h` : "—"}
                    </div>
                    <div style={{ fontFamily: M, fontSize: 8, color: "var(--color-text-dim)", marginTop: 2 }}>
                      {profile?.tdpWatts ? `${profile.tdpWatts}W` : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {devicesWithData.length > 1 && (
          <section style={{ marginBottom: mob ? 32 : 44 }}>
            <h2 style={{ fontFamily: F, fontSize: mob ? 18 : 22, fontWeight: 800, color: "var(--color-text)", letterSpacing: "-0.02em", marginBottom: 14 }}>All devices</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {devicesWithData.map(dv => {
                const dCons = data.consensus[dv.id];
                const dFps = Math.round(dCons.fps_avg!);
                const cc = fc(dFps);
                const a = selectedDeviceId === dv.id;
                const pct = Math.round((dFps / maxFps) * 100);
                return (
                  <div key={dv.id} onClick={() => switchDevice(dv.id)} style={{
                    display: "flex", alignItems: "center", gap: mob ? 10 : 16,
                    padding: mob ? "14px 12px" : "16px 18px",
                    borderRadius: 12, cursor: "pointer",
                    background: a ? "#0c0b12" : "transparent",
                    border: `1px solid ${a ? cc + "12" : "transparent"}`,
                    transition: "all 0.25s",
                  }}>
                    <span style={{
                      fontFamily: F, fontSize: mob ? 12 : 13, fontWeight: 700,
                      color: a ? "#d0cce0" : "#3a3448",
                      width: mob ? 55 : 120, flexShrink: 0,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{mob ? dv.shortName : dv.name}</span>
                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: "#0e0d16", overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 3,
                        width: `${pct}%`,
                        background: a ? `linear-gradient(90deg, ${cc}, ${cc}60)` : "#161420",
                        boxShadow: a ? `0 0 12px ${cc}15` : "none",
                        transition: "all 0.7s cubic-bezier(0.16,1,0.3,1)",
                      }} />
                    </div>
                    <span style={{
                      fontFamily: M, fontSize: mob ? 20 : 26, fontWeight: 800,
                      color: a ? cc : "var(--color-border)",
                      textShadow: a ? `0 0 12px ${cc}20` : "none",
                      minWidth: 40, textAlign: "right",
                      transition: "all 0.25s",
                    }}>{dFps}</span>
                    {!mob && <span style={{ fontFamily: M, fontSize: 10, color: a ? "var(--color-text-3)" : "var(--color-border)", width: 50 }}>
                      {dCons.estimated_battery ? `${dCons.estimated_battery.toFixed(1)}h` : ""}
                    </span>}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section style={{ marginBottom: mob ? 32 : 44 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <h2 style={{ fontFamily: F, fontSize: mob ? 18 : 22, fontWeight: 800, color: "var(--color-text)", letterSpacing: "-0.02em" }}>
              Reports <span style={{ fontFamily: M, fontSize: 12, color: "var(--color-text-dim)", fontWeight: 500 }}>{cons?.report_count ?? 0}</span>
            </h2>
            <div style={{ display: "flex", gap: 2 }}>
              {([["helpful", "Top"], ["best", "Best"], ["recent", "New"]] as [typeof sort, string][]).map(([id, l]) => (
                <button key={id} onClick={() => setSort(id)} style={{
                  fontFamily: M, fontSize: 9, fontWeight: 600,
                  padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer",
                  background: sort === id ? "#ffffff08" : "transparent",
                  color: sort === id ? "#a09ab0" : "var(--color-text-dim)",
                }}>{l}</button>
              ))}
            </div>
          </div>

          {reportsLoading ? (
            <div style={{ padding: "48px 0", textAlign: "center" }}>
              <div style={{ fontFamily: M, fontSize: 10, color: "var(--color-text-dim)" }}>Loading reports…</div>
            </div>
          ) : sortedReports.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: mob ? 8 : 10 }}>
              {sortedReports.map((r) => {
                const rc = fc(r.fps_avg);
                const displayName = r.user?.display_name || r.user?.username || "Anonymous";
                const avatarColor = `hsl(${displayName.charCodeAt(0) * 37 % 360}, 50%, 45%)`;
                const settings = [
                  r.tdp_limit_watts ? `${r.tdp_limit_watts}W` : null,
                  r.preset ? PRESET_LABEL[r.preset] ?? r.preset : null,
                  r.resolution,
                ].filter(Boolean).join(" · ");
                const batStr = r.battery_life_hours ? `${r.battery_life_hours.toFixed(1)}h` : null;

                return (
                  <div key={r.id} style={{
                    padding: mob ? "18px 16px" : "22px 20px",
                    borderRadius: 16, background: "#0a0910",
                    border: "1px solid #ffffff04",
                    display: "flex", gap: 14,
                  }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                      background: `${avatarColor}18`, border: `1px solid ${avatarColor}28`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ fontFamily: F, fontSize: 14, fontWeight: 800, color: avatarColor }}>{displayName.charAt(0).toUpperCase()}</span>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div>
                          <div style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: "#b0acc0" }}>{displayName}</div>
                          <div style={{ fontFamily: M, fontSize: 9, color: "var(--color-text-dim)", marginTop: 2 }}>
                            {settings}{batStr ? ` · ${batStr}` : ""}
                          </div>
                        </div>
                        <div style={{
                          fontFamily: M, fontSize: 28, fontWeight: 800,
                          color: rc, letterSpacing: "-0.04em", lineHeight: 0.85,
                          textShadow: `0 0 12px ${rc}20`,
                        }}>{Math.round(r.fps_avg)}</div>
                      </div>

                      {r.notes && (
                        <div style={{
                          fontFamily: F, fontSize: 12, color: "var(--color-text-3)",
                          lineHeight: 1.6, paddingLeft: 12,
                          borderLeft: `2px solid ${rc}12`,
                          marginBottom: 10,
                        }}>{r.notes.length > 200 ? r.notes.slice(0, 200) + "…" : r.notes}</div>
                      )}

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontFamily: M, fontSize: 8, color: "var(--color-border)" }}>{timeAgo(r.created_at)}</span>
                        <VoteButtons
                          reportId={r.id}
                          initialUpvotes={r.upvotes}
                          initialDownvotes={r.downvotes}
                          userVote={data.userVotes?.[r.id] ?? null}
                          isLoggedIn={data.isLoggedIn ?? false}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{
              padding: "40px 20px", borderRadius: 16, background: "#0a0910",
              border: "1px solid #ffffff04", textAlign: "center",
            }}>
              <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: "var(--color-text)", marginBottom: 4 }}>No reports yet</div>
              <div style={{ fontFamily: M, fontSize: 10, color: "var(--color-text-dim)" }}>Be the first to submit data for this device</div>
            </div>
          )}

          {dev && (cons?.report_count ?? 0) > 10 && (
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <a href={`/games/${data.gameSlug}/${dev.slug}`} style={{
                fontFamily: M, fontSize: 10, color: tc, textDecoration: "none",
                padding: "8px 20px", borderRadius: 8,
                border: `1px solid ${tc}18`, background: `${tc}08`,
                transition: "all 0.2s",
              }}>VIEW ALL REPORTS →</a>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function GameDetailPanel(props: { dataId?: string; initialData?: PageData }) {
  return (
    <ErrorBoundary>
      <GameDetailPanelInner {...props} />
    </ErrorBoundary>
  );
}

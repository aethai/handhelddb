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
const fpsClass = (f: number) => f >= 55 ? "gd-fps-green" : f >= 40 ? "gd-fps-yellow" : f >= 30 ? "gd-fps-orange" : "gd-fps-red";

const VERDICT_LABEL: Record<string, string> = {
  excellent: "Portable Perfect",
  good: "Commute Ready",
  fair: "Playable",
  poor: "Rough Ride",
  unplayable: "Unplayable",
};

const PRESET_LABEL: Record<string, string> = {
  ultra_low: "Ultra Low", low: "Low", medium: "Medium",
  high: "High", ultra: "Ultra", custom: "Custom",
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

  const cons = data.consensus?.[selectedDeviceId];
  const dev = data.devices?.find(d => d.id === selectedDeviceId);
  const fps = cons?.fps_avg ? Math.round(cons.fps_avg) : 0;
  const fpsCls = fps > 0 ? fpsClass(fps) : "";
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

  // Single recommended profile (balanced_profile holds the recommended profile now)
  const recommendedProfile = cons?.balanced_profile ?? cons?.battery_saver_profile ?? cons?.performance_profile;
  const hasTDP = !!recommendedProfile;

  const gi = data.gameInfo;
  const deckMap: Record<string, { label: string; cls: string }> = {
    verified: { label: "Deck Verified", cls: "gd-badge-green" },
    playable: { label: "Deck Playable", cls: "gd-badge-yellow" },
    unsupported: { label: "Deck Unsupported", cls: "gd-badge-red" },
    unknown: { label: "Deck Unknown", cls: "gd-badge-dim" },
  };
  const deckInfo = deckMap[gi?.deckCompatibility ?? "unknown"] ?? deckMap.unknown;

  return (
    <div className="gd-wrap" ref={fpsRef}>

      {/* ═══ HERO BANNER ═══ */}
      <section className="gd-hero">
        {gi?.headerImage && (
          <div className="gd-hero-bg">
            <img src={gi.headerImage} alt="" />
          </div>
        )}
        <div className="gd-hero-inner">
          <div className="gd-hero-info">
            <div className="gd-badges">
              {gi?.metacriticScore && <span className="gd-badge gd-badge-dim">MC {gi.metacriticScore}</span>}
              <span className={`gd-badge ${deckInfo.cls}`}>{deckInfo.label}</span>
              {gi?.priceDisplay && <span className="gd-badge gd-badge-dim">{gi.priceDisplay}</span>}
            </div>
            <h1 className="gd-title">{data.gameName}</h1>
            <p className="gd-subtitle">{gi?.subtitle}</p>
          </div>

          <div className="gd-hero-perf">
            <div className={`gd-fps-big ${fpsCls}`}>
              {fps > 0 ? fpsVal : "—"}
              <span className="gd-fps-unit">FPS</span>
            </div>
            <div className={`gd-verdict ${fpsCls}`}>{tier.toUpperCase()}</div>
            <div className="gd-perf-stats">
              <div className="gd-perf-stat">
                <span className="gd-perf-stat-val">{cons?.estimated_battery ? `${cons.estimated_battery.toFixed(1)}h` : "—"}</span>
                <span className="gd-perf-stat-lbl">BATTERY</span>
              </div>
              <div className="gd-perf-stat">
                <span className="gd-perf-stat-val">{cons?.recommended_tdp ? `${Math.round(cons.recommended_tdp)}W` : "—"}</span>
                <span className="gd-perf-stat-lbl">TDP</span>
              </div>
              <div className="gd-perf-stat">
                <span className="gd-perf-stat-val">{cons?.report_count ?? 0}</span>
                <span className="gd-perf-stat-lbl">REPORTS</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ DEVICE TAB BAR ═══ */}
      <div className="gd-device-bar">
        <div className="gd-device-bar-inner">
          {(data.devices ?? []).filter(d => data.consensus?.[d.id]).map(dv => {
            const a = selectedDeviceId === dv.id;
            const dFps = data.consensus[dv.id]?.fps_avg ? Math.round(data.consensus[dv.id].fps_avg!) : 0;
            return (
              <button
                key={dv.id}
                onClick={() => switchDevice(dv.id)}
                className={`gd-device-tab ${a ? "gd-device-tab-active" : ""} ${dFps > 0 ? fpsClass(dFps) : ""}`}
              >
                <span className="gd-device-tab-name">{dv.shortName}</span>
                {dFps > 0 && <span className="gd-device-tab-fps">{dFps}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div className="gd-content">

        {/* — Description + actions — */}
        {(gi?.description || gi?.tags?.length) && (
          <section className="gd-section gd-about">
            {gi?.description && <p className="gd-description">{gi.description}</p>}
            {gi?.tags && gi.tags.length > 0 && (
              <div className="gd-tags">
                {gi.tags.slice(0, 6).map(t => <span key={t} className="gd-tag">{t}</span>)}
              </div>
            )}
            <div className="gd-actions">
              <a href="/report/new" className="gd-btn-primary">SUBMIT REPORT</a>
              {gi?.steamAppid && (
                <a href={`https://store.steampowered.com/app/${gi.steamAppid}`} target="_blank" rel="noopener noreferrer" className="gd-btn-ghost">Steam Store</a>
              )}
            </div>
          </section>
        )}

        {/* — Settings — */}
        {cons && (cons.recommended_preset || bal) && (
          <section className="gd-section">
            <h2 className="gd-section-title">Recommended Settings <span className="gd-section-sub">{dev?.name}</span></h2>
            <div className="gd-settings-grid">
              {([
                [PRESET_LABEL[cons.recommended_preset ?? ""] ?? cons.recommended_preset ?? "—", "PRESET"],
                [cons.recommended_resolution ?? "—", "RESOLUTION"],
                [bal?.fsrEnabled ? `FSR ${bal.fsrMode ?? "On"}` : "Off", "UPSCALE"],
                [bal?.fpsTarget ? `${bal.fpsTarget}` : fps > 0 ? `${fps}` : "—", "FPS CAP"],
                [cons.recommended_tdp ? `${Math.round(cons.recommended_tdp)}W` : "—", "TDP"],
                [dev?.screen_resolution ? dev.screen_resolution.split("x").pop() + " Hz" : "60 Hz", "REFRESH"],
              ] as [string, string][]).map(([v, l]) => (
                <div key={l} className="gd-setting-cell">
                  <div className="gd-setting-val">{v}</div>
                  <div className="gd-setting-lbl">{l}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* — Recommended Profile — */}
        {hasTDP && recommendedProfile && (
          <section className="gd-section">
            <h2 className="gd-section-title">Recommended</h2>
            <div className="gd-profiles">
              {(() => {
                const pFps = recommendedProfile.fpsAvg ? Math.round(recommendedProfile.fpsAvg) : null;
                return (
                  <div className="gd-profile gd-profile-bal" style={{ flex: '1 1 100%' }}>
                    <div className="gd-profile-label">RECOMMENDED</div>
                    <div className={`gd-profile-fps ${pFps ? fpsClass(pFps) : ""}`}>{pFps ?? "—"}</div>
                    <div className="gd-profile-meta">
                      {recommendedProfile.estimatedBatteryHours ? `${recommendedProfile.estimatedBatteryHours.toFixed(1)}h` : "—"}
                      {recommendedProfile.tdpWatts ? ` · ${recommendedProfile.tdpWatts}W` : ""}
                      {recommendedProfile.preset ? ` · ${recommendedProfile.preset.replace('_', ' ')}` : ""}
                    </div>
                  </div>
                );
              })()}
            </div>
          </section>
        )}

        {/* — All Devices — */}
        {devicesWithData.length > 1 && (
          <section className="gd-section">
            <h2 className="gd-section-title">All Devices</h2>
            <div className="gd-devices-list">
              {devicesWithData.map(dv => {
                const dCons = data.consensus[dv.id];
                const dFps = Math.round(dCons.fps_avg!);
                const pct = Math.round((dFps / maxFps) * 100);
                const a = selectedDeviceId === dv.id;
                return (
                  <div key={dv.id} onClick={() => switchDevice(dv.id)} className={`gd-device-row ${a ? "gd-device-row-active" : ""}`}>
                    <span className="gd-device-row-name">{dv.name}</span>
                    <div className="gd-device-row-bar">
                      <div className={`gd-device-row-fill ${fpsClass(dFps)}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={`gd-device-row-fps ${fpsClass(dFps)}`}>{dFps}</span>
                    <span className="gd-device-row-bat">
                      {dCons.estimated_battery ? `${dCons.estimated_battery.toFixed(1)}h` : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* — Reports — */}
        <section className="gd-section">
          <div className="gd-section-head">
            <h2 className="gd-section-title">
              Community Reports <span className="gd-section-sub">{cons?.report_count ?? 0}</span>
            </h2>
            <div className="gd-sort-tabs">
              {([["helpful", "Top"], ["best", "Best FPS"], ["recent", "Newest"]] as [typeof sort, string][]).map(([id, l]) => (
                <button key={id} onClick={() => setSort(id)} className={`gd-sort-tab ${sort === id ? "gd-sort-tab-active" : ""}`}>{l}</button>
              ))}
            </div>
          </div>

          {reportsLoading ? (
            <div className="gd-empty">Loading reports...</div>
          ) : sortedReports.length > 0 ? (
            <div className="gd-reports-grid">
              {sortedReports.map((r) => {
                const displayName = r.user?.display_name || r.user?.username || "Anonymous";
                const settings = [
                  r.tdp_limit_watts ? `${r.tdp_limit_watts}W` : null,
                  r.preset ? PRESET_LABEL[r.preset] ?? r.preset : null,
                  r.resolution,
                ].filter(Boolean).join(" · ");
                const batStr = r.battery_life_hours ? `${r.battery_life_hours.toFixed(1)}h` : null;

                return (
                  <div key={r.id} className="gd-report-card">
                    <div className="gd-report-header">
                      <div className="gd-report-user">
                        <div className="gd-report-avatar">{displayName.charAt(0).toUpperCase()}</div>
                        <div>
                          <div className="gd-report-name">{displayName}</div>
                          <div className="gd-report-meta">{settings}{batStr ? ` · ${batStr}` : ""}</div>
                        </div>
                      </div>
                      <div className={`gd-report-fps ${fpsClass(r.fps_avg)}`}>{Math.round(r.fps_avg)}</div>
                    </div>

                    {r.notes && (
                      <div className="gd-report-notes">{r.notes.length > 200 ? r.notes.slice(0, 200) + "..." : r.notes}</div>
                    )}

                    <div className="gd-report-footer">
                      <span className="gd-report-time">{timeAgo(r.created_at)}</span>
                      <VoteButtons
                        reportId={r.id}
                        initialUpvotes={r.upvotes}
                        initialDownvotes={r.downvotes}
                        userVote={data.userVotes?.[r.id] ?? null}
                        isLoggedIn={data.isLoggedIn ?? false}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="gd-empty">
              <div className="gd-empty-title">No reports yet</div>
              <div className="gd-empty-sub">Be the first to submit performance data for this device</div>
            </div>
          )}

          {dev && (cons?.report_count ?? 0) > 10 && (
            <div className="gd-view-all">
              <a href={`/games/${data.gameSlug}/${dev.slug}`} className="gd-btn-ghost">VIEW ALL REPORTS</a>
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

import { useState, useEffect, useCallback } from 'react';

/* ───── Types ───── */

interface Device {
  id: string;
  name: string;
  slug: string;
  manufacturer: string;
}

interface GameHit {
  id: string;
  name: string;
  slug: string;
  capsule_image?: string;
  header_image?: string;
  genres?: string[];
}

interface ReportData {
  // Step 1
  gameId: string;
  gameName: string;
  gameSlug: string;
  deviceId: string;
  deviceName: string;
  // Step 2
  fpsAvg: string;
  fpsLow: string;
  fpsTarget: string;
  fpsStability: string;
  resolution: string;
  preset: string;
  fsrEnabled: boolean;
  fsrMode: string;
  tdpLimitWatts: string;
  gpuClockMhz: string;
  // Step 3
  overallRating: string;
  thermal: string;
  fanNoise: string;
  batteryLifeHours: string;
  controllerStatus: string;
  suspendStatus: string;
  // Step 4
  notes: string;
  gameVersion: string;
  osVersion: string;
}

interface Props {
  devices: Device[];
  isLoggedIn: boolean;
  preselectedGameId?: string;
  preselectedGameName?: string;
  preselectedDeviceId?: string;
}

const INITIAL: ReportData = {
  gameId: '', gameName: '', gameSlug: '', deviceId: '', deviceName: '',
  fpsAvg: '', fpsLow: '', fpsTarget: '', fpsStability: '',
  resolution: '', preset: '', fsrEnabled: false, fsrMode: '',
  tdpLimitWatts: '', gpuClockMhz: '',
  overallRating: '', thermal: '', fanNoise: '',
  batteryLifeHours: '', controllerStatus: '', suspendStatus: '',
  notes: '', gameVersion: '', osVersion: '',
};

/* ───── Component ───── */

export default function ReportForm({ devices, isLoggedIn, preselectedGameId, preselectedGameName, preselectedDeviceId }: Props) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<ReportData>(() => ({
    ...INITIAL,
    gameId: preselectedGameId ?? '',
    gameName: preselectedGameName ?? '',
    deviceId: preselectedDeviceId ?? '',
    deviceName: devices.find(d => d.id === preselectedDeviceId)?.name ?? '',
  }));
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const update = useCallback((patch: Partial<ReportData>) => {
    setData(prev => ({ ...prev, ...patch }));
  }, []);

  const canAdvance = (): boolean => {
    if (step === 1) return !!data.gameId && !!data.deviceId;
    if (step === 2) return !!data.fpsAvg && Number(data.fpsAvg) > 0;
    if (step === 3) return !!data.overallRating;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: data.gameId,
          deviceId: data.deviceId,
          fpsAvg: Number(data.fpsAvg),
          fpsLow: data.fpsLow ? Number(data.fpsLow) : undefined,
          fpsTarget: data.fpsTarget || undefined,
          fpsStability: data.fpsStability || undefined,
          resolution: data.resolution || undefined,
          preset: data.preset || undefined,
          fsrEnabled: data.fsrEnabled,
          fsrMode: data.fsrEnabled ? data.fsrMode || undefined : undefined,
          tdpLimitWatts: data.tdpLimitWatts ? Number(data.tdpLimitWatts) : undefined,
          gpuClockMhz: data.gpuClockMhz ? Number(data.gpuClockMhz) : undefined,
          overallRating: data.overallRating,
          thermal: data.thermal || undefined,
          fanNoise: data.fanNoise || undefined,
          batteryLifeHours: data.batteryLifeHours ? Number(data.batteryLifeHours) : undefined,
          controllerStatus: data.controllerStatus || undefined,
          suspendStatus: data.suspendStatus || undefined,
          notes: data.notes || undefined,
          gameVersion: data.gameVersion || undefined,
          osVersion: data.osVersion || undefined,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? 'Failed to submit');
      setSubmitted(result.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-800">
          <svg className="h-8 w-8 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white">Sign in to submit a report</h3>
        <p className="mt-2 text-sm text-gray-400">You need to be signed in to submit performance reports.</p>
        <a href="/auth/login?redirect=/report/new" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 transition-colors">
          Sign in
        </a>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/20">
          <svg className="h-8 w-8 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white">Report submitted!</h3>
        <p className="mt-2 text-sm text-gray-400">Thank you for contributing to the community.</p>
        <div className="mt-6 flex justify-center gap-3">
          <a href={`/games/${data.gameSlug}`} className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors">
            View game
          </a>
          <button onClick={() => { setSubmitted(null); setStep(1); setData(INITIAL); }} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 transition-colors">
            Submit another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {['Game & Device', 'Settings & FPS', 'Overall', 'Review'].map((label, i) => (
            <button
              key={label}
              onClick={() => i + 1 < step && setStep(i + 1)}
              className={`text-xs font-medium transition-colors ${
                i + 1 === step ? 'text-cyan-400' : i + 1 < step ? 'text-gray-400 cursor-pointer hover:text-white' : 'text-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="h-1 rounded-full bg-gray-800">
          <div className="h-full rounded-full bg-cyan-500 transition-all duration-300" style={{ width: `${(step / 4) * 100}%` }} />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Step 1: Game & Device */}
      {step === 1 && <Step1 data={data} update={update} devices={devices} />}
      {step === 2 && <Step2 data={data} update={update} />}
      {step === 3 && <Step3 data={data} update={update} />}
      {step === 4 && <Step4 data={data} update={update} />}

      {/* Navigation */}
      <div className="mt-8 flex justify-between">
        <button
          onClick={() => setStep(s => s - 1)}
          disabled={step === 1}
          className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:border-gray-500 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Back
        </button>
        {step < 4 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!canAdvance()}
            className="rounded-lg bg-cyan-600 px-6 py-2 text-sm font-medium text-white hover:bg-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting || !canAdvance()}
            className="rounded-lg bg-cyan-600 px-6 py-2 text-sm font-medium text-white hover:bg-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════ STEP 1: Game & Device ═══════════════ */

function Step1({ data, update, devices }: { data: ReportData; update: (p: Partial<ReportData>) => void; devices: Device[] }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GameHit[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=6`);
        const json = await res.json();
        setResults(json.hits ?? []);
      } catch { /* ignore */ }
      setSearching(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="space-y-6">
      {/* Game Search */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Game *</label>
        {data.gameId ? (
          <div className="flex items-center gap-3 rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-3">
            <span className="text-sm text-white font-medium flex-1">{data.gameName}</span>
            <button onClick={() => update({ gameId: '', gameName: '', gameSlug: '' })} className="text-xs text-gray-400 hover:text-white">
              Change
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search for a game..."
              className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2.5 px-4 text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              autoFocus
            />
            {results.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 shadow-xl overflow-hidden">
                {results.map(hit => (
                  <button
                    key={hit.id}
                    onClick={() => {
                      update({ gameId: hit.id, gameName: hit.name, gameSlug: hit.slug });
                      setQuery('');
                      setResults([]);
                    }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-gray-800 transition-colors"
                  >
                    {(hit.capsule_image || hit.header_image) && (
                      <img src={hit.capsule_image || hit.header_image} alt="" className="h-8 w-14 rounded object-cover flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">{hit.name}</p>
                      {hit.genres && <p className="text-xs text-gray-500">{hit.genres.slice(0, 2).join(', ')}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Device Select */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Device *</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {devices.map(d => (
            <button
              key={d.id}
              onClick={() => update({ deviceId: d.id, deviceName: d.name })}
              className={`rounded-lg border px-3 py-2.5 text-sm text-left transition-colors ${
                data.deviceId === d.id
                  ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                  : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
              }`}
            >
              <span className="font-medium">{d.name}</span>
              <span className="block text-xs text-gray-500 mt-0.5">{d.manufacturer}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ STEP 2: Settings & FPS ═══════════════ */

function Step2({ data, update }: { data: ReportData; update: (p: Partial<ReportData>) => void }) {
  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Performance</h3>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Average FPS *" value={data.fpsAvg} onChange={v => update({ fpsAvg: v })} type="number" placeholder="60" />
        <Field label="1% Low FPS" value={data.fpsLow} onChange={v => update({ fpsLow: v })} type="number" placeholder="45" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select label="FPS Target" value={data.fpsTarget} onChange={v => update({ fpsTarget: v })}
          options={[['', 'Select...'], ['30', '30 FPS'], ['40', '40 FPS'], ['60', '60 FPS'], ['120', '120 FPS']]} />
        <Select label="Stability" value={data.fpsStability} onChange={v => update({ fpsStability: v })}
          options={[['', 'Select...'], ['stable', 'Stable'], ['mostly_stable', 'Mostly Stable'], ['unstable', 'Unstable']]} />
      </div>

      <hr className="border-gray-800" />
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Graphics Settings</h3>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Resolution" value={data.resolution} onChange={v => update({ resolution: v })} placeholder="1280x800" />
        <Select label="Preset" value={data.preset} onChange={v => update({ preset: v })}
          options={[['', 'Select...'], ['ultra_low', 'Ultra Low'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['ultra', 'Ultra'], ['custom', 'Custom']]} />
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={data.fsrEnabled} onChange={e => update({ fsrEnabled: e.target.checked })}
            className="rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0" />
          <span className="text-sm text-gray-300">FSR/DLSS/XeSS enabled</span>
        </label>
        {data.fsrEnabled && (
          <select value={data.fsrMode} onChange={e => update({ fsrMode: e.target.value })}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-300 focus:border-cyan-500 focus:outline-none">
            <option value="">Mode...</option>
            <option value="quality">Quality</option>
            <option value="balanced">Balanced</option>
            <option value="performance">Performance</option>
            <option value="ultra_performance">Ultra Performance</option>
          </select>
        )}
      </div>

      <hr className="border-gray-800" />
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Power</h3>

      <div className="grid grid-cols-2 gap-4">
        <Field label="TDP Limit (W)" value={data.tdpLimitWatts} onChange={v => update({ tdpLimitWatts: v })} type="number" placeholder="15" />
        <Field label="GPU Clock (MHz)" value={data.gpuClockMhz} onChange={v => update({ gpuClockMhz: v })} type="number" placeholder="1600" />
      </div>
    </div>
  );
}

/* ═══════════════ STEP 3: Overall ═══════════════ */

function Step3({ data, update }: { data: ReportData; update: (p: Partial<ReportData>) => void }) {
  const ratings = [
    { value: 'excellent', label: 'Excellent', desc: 'Runs perfectly, no issues', color: 'cyan' },
    { value: 'good', label: 'Good', desc: 'Minor issues, very playable', color: 'green' },
    { value: 'fair', label: 'Fair', desc: 'Playable with some compromises', color: 'yellow' },
    { value: 'poor', label: 'Poor', desc: 'Barely playable, major issues', color: 'orange' },
    { value: 'unplayable', label: 'Unplayable', desc: 'Does not run properly', color: 'red' },
  ];

  const ratingColors: Record<string, string> = {
    cyan: 'border-cyan-500 bg-cyan-500/10 text-cyan-400',
    green: 'border-green-500 bg-green-500/10 text-green-400',
    yellow: 'border-yellow-500 bg-yellow-500/10 text-yellow-400',
    orange: 'border-orange-500 bg-orange-500/10 text-orange-400',
    red: 'border-red-500 bg-red-500/10 text-red-400',
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">Overall Rating *</label>
        <div className="space-y-2">
          {ratings.map(r => (
            <button
              key={r.value}
              onClick={() => update({ overallRating: r.value })}
              className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                data.overallRating === r.value
                  ? ratingColors[r.color]
                  : 'border-gray-700 bg-gray-800 hover:border-gray-500'
              }`}
            >
              <span className={`font-medium ${data.overallRating === r.value ? '' : 'text-gray-300'}`}>{r.label}</span>
              <span className={`block text-xs mt-0.5 ${data.overallRating === r.value ? 'opacity-80' : 'text-gray-500'}`}>{r.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select label="Thermal" value={data.thermal} onChange={v => update({ thermal: v })}
          options={[['', 'Select...'], ['cool', 'Cool'], ['warm', 'Warm'], ['hot', 'Hot']]} />
        <Select label="Fan Noise" value={data.fanNoise} onChange={v => update({ fanNoise: v })}
          options={[['', 'Select...'], ['silent', 'Silent'], ['quiet', 'Quiet'], ['audible', 'Audible'], ['loud', 'Loud']]} />
      </div>

      <Field label="Battery Life (hours)" value={data.batteryLifeHours} onChange={v => update({ batteryLifeHours: v })} type="number" placeholder="2.5" />

      <div className="grid grid-cols-2 gap-4">
        <Select label="Controller" value={data.controllerStatus} onChange={v => update({ controllerStatus: v })}
          options={[['', 'Select...'], ['works_oob', 'Works out of box'], ['needs_remap', 'Needs remap'], ['broken', 'Broken'], ['unknown', 'Unknown']]} />
        <Select label="Suspend/Resume" value={data.suspendStatus} onChange={v => update({ suspendStatus: v })}
          options={[['', 'Select...'], ['works', 'Works'], ['issues', 'Issues'], ['broken', 'Broken'], ['unknown', 'Unknown']]} />
      </div>
    </div>
  );
}

/* ═══════════════ STEP 4: Review & Notes ═══════════════ */

function Step4({ data, update }: { data: ReportData; update: (p: Partial<ReportData>) => void }) {
  const ratingEmoji: Record<string, string> = {
    excellent: 'text-cyan-400', good: 'text-green-400', fair: 'text-yellow-400',
    poor: 'text-orange-400', unplayable: 'text-red-400',
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="rounded-lg border border-gray-800 bg-gray-800/50 p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Game</span>
          <span className="text-white font-medium">{data.gameName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Device</span>
          <span className="text-white">{data.deviceName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Average FPS</span>
          <span className="text-white font-medium">{data.fpsAvg}</span>
        </div>
        {data.fpsLow && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">1% Low</span>
            <span className="text-gray-300">{data.fpsLow}</span>
          </div>
        )}
        {data.resolution && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Resolution</span>
            <span className="text-gray-300">{data.resolution}</span>
          </div>
        )}
        {data.preset && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Preset</span>
            <span className="text-gray-300">{data.preset}</span>
          </div>
        )}
        {data.tdpLimitWatts && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">TDP</span>
            <span className="text-gray-300">{data.tdpLimitWatts}W</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Rating</span>
          <span className={`font-medium capitalize ${ratingEmoji[data.overallRating] ?? 'text-gray-300'}`}>{data.overallRating}</span>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Notes (optional)</label>
        <textarea
          value={data.notes}
          onChange={e => update({ notes: e.target.value })}
          maxLength={2000}
          rows={4}
          placeholder="Any tips, issues, or observations about playing this game on this device..."
          className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2.5 px-4 text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
        />
        <p className="mt-1 text-xs text-gray-600">{data.notes.length}/2000</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Game Version" value={data.gameVersion} onChange={v => update({ gameVersion: v })} placeholder="1.0.4" />
        <Field label="OS Version" value={data.osVersion} onChange={v => update({ osVersion: v })} placeholder="SteamOS 3.5" />
      </div>
    </div>
  );
}

/* ───── Shared UI ───── */

function Field({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        step={type === 'number' ? 'any' : undefined}
        className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 px-3 text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
      />
    </div>
  );
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: [string, string][];
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 px-3 text-sm text-gray-300 focus:border-cyan-500 focus:outline-none"
      >
        {options.map(([val, lbl]) => (
          <option key={val} value={val}>{lbl}</option>
        ))}
      </select>
    </div>
  );
}

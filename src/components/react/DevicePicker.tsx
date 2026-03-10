import { useState, useEffect, useCallback } from 'react';

interface Device {
  id: string;
  slug: string;
  name: string;
  manufacturer: string;
  screen_size?: number | null;
  battery_wh?: number | null;
  chip?: string | null;
  image?: string | null;
}

interface DevicePickerProps {
  userDeviceIds: string[];
}

export default function DevicePicker({ userDeviceIds: initialDeviceIds }: DevicePickerProps) {
  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set(initialDeviceIds));
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirm, setShowConfirm] = useState<{ deviceId: string; action: 'add' | 'remove'; deviceName: string } | null>(null);

  // Fetch all available devices
  useEffect(() => {
    async function fetchDevices() {
      try {
        const res = await fetch('/api/devices-list');
        if (res.ok) {
          const data = await res.json();
          setAllDevices(data.devices ?? []);
        } else {
          // Fallback: try to get from the page's inline data
          setError('Could not load devices');
        }
      } catch {
        setError('Could not load devices');
      } finally {
        setLoading(false);
      }
    }
    fetchDevices();
  }, []);

  const handleAdd = useCallback(async (deviceId: string) => {
    setActionLoading(deviceId);
    setError(null);
    try {
      const res = await fetch('/api/my-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }),
      });
      const data = await res.json();
      if (res.ok) {
        setOwnedIds(prev => {
          const next = new Set(prev);
          next.add(deviceId);
          return next;
        });
      } else {
        setError(data.error ?? 'Failed to add device');
      }
    } catch {
      setError('Network error');
    } finally {
      setActionLoading(null);
      setShowConfirm(null);
    }
  }, []);

  const handleRemove = useCallback(async (deviceId: string) => {
    setActionLoading(deviceId);
    setError(null);
    try {
      const res = await fetch(`/api/my-setup?deviceId=${encodeURIComponent(deviceId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        setOwnedIds(prev => {
          const next = new Set(prev);
          next.delete(deviceId);
          return next;
        });
      } else {
        setError(data.error ?? 'Failed to remove device');
      }
    } catch {
      setError('Network error');
    } finally {
      setActionLoading(null);
      setShowConfirm(null);
    }
  }, []);

  const filtered = allDevices.filter(d => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return d.name.toLowerCase().includes(q) || d.manufacturer.toLowerCase().includes(q) || (d.chip?.toLowerCase().includes(q) ?? false);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="h-6 w-6 animate-spin text-[#7c6cf0]" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="ml-3 text-[#8a8a94]">Loading devices...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Search Filter */}
      <div className="mb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#55555e]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filter devices..."
            className="w-full rounded-lg border border-[#25252e] bg-[#0f0f12] py-2 pl-10 pr-4 text-sm text-white placeholder-[#55555e] focus:border-[#7c6cf0] focus:outline-none focus:ring-1 focus:ring-[#7c6cf0]"
          />
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-300 hover:text-red-200">&times;</button>
        </div>
      )}

      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-[#25252e] bg-[#0f0f12] p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">
              {showConfirm.action === 'add' ? 'Add Device' : 'Remove Device'}
            </h3>
            <p className="mt-2 text-sm text-[#8a8a94]">
              {showConfirm.action === 'add'
                ? `Add ${showConfirm.deviceName} to your setup?`
                : `Remove ${showConfirm.deviceName} from your setup?`}
            </p>
            <div className="mt-5 flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(null)}
                disabled={actionLoading !== null}
                className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:border-[#35353e] hover:text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (showConfirm.action === 'add') handleAdd(showConfirm.deviceId);
                  else handleRemove(showConfirm.deviceId);
                }}
                disabled={actionLoading !== null}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                  showConfirm.action === 'add'
                    ? 'bg-[#7c6cf0] hover:bg-[#7c6cf0]'
                    : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                {actionLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Working...
                  </span>
                ) : showConfirm.action === 'add' ? 'Add' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Device grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(device => {
          const isOwned = ownedIds.has(device.id);
          const isActioning = actionLoading === device.id;

          return (
            <div
              key={device.id}
              className={`relative rounded-lg border p-4 transition-all ${
                isOwned
                  ? 'border-[#7c6cf0]/40 bg-[#7c6cf0]/5'
                  : 'border-[#1a1a22] bg-[#0f0f12] hover:border-[#35353e]'
              }`}
            >
              {/* Owned indicator */}
              {isOwned && (
                <div className="absolute top-2 right-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#7c6cf0]/20 px-2 py-0.5 text-xs font-medium text-[#7c6cf0] border border-[#7c6cf0]/30">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Owned
                  </span>
                </div>
              )}

              <div className="flex items-start gap-3">
                {/* Device image */}
                <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-[#1a1a22] flex items-center justify-center overflow-hidden">
                  {device.image ? (
                    <img src={device.image} alt={device.name} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <svg className="h-7 w-7 text-gray-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <rect x="5" y="3" width="14" height="18" rx="3" />
                      <line x1="9" y1="18" x2="15" y2="18" />
                    </svg>
                  )}
                </div>

                {/* Device info */}
                <div className="flex-1 min-w-0 pr-16">
                  <p className="text-xs text-[#55555e] uppercase tracking-wider">{device.manufacturer}</p>
                  <h4 className="font-medium text-white text-sm truncate">{device.name}</h4>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[#55555e]">
                    {device.chip && <span>{device.chip}</span>}
                    {device.screen_size && <span>{device.screen_size}"</span>}
                    {device.battery_wh && <span>{device.battery_wh} Wh</span>}
                  </div>
                </div>
              </div>

              {/* Action button */}
              <div className="mt-3">
                {isOwned ? (
                  <button
                    onClick={() => setShowConfirm({ deviceId: device.id, action: 'remove', deviceName: device.name })}
                    disabled={isActioning}
                    className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 hover:border-red-500/50 transition-colors disabled:opacity-50"
                  >
                    Remove from Setup
                  </button>
                ) : (
                  <button
                    onClick={() => setShowConfirm({ deviceId: device.id, action: 'add', deviceName: device.name })}
                    disabled={isActioning}
                    className="w-full rounded-lg border border-[#7c6cf0]/30 bg-[#7c6cf0]/10 px-3 py-1.5 text-xs font-medium text-[#7c6cf0] hover:bg-[#7c6cf0]/20 hover:border-[#7c6cf0]/50 transition-colors disabled:opacity-50"
                  >
                    Add to Setup
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full py-8 text-center text-[#55555e] text-sm">
            {searchQuery ? 'No devices match your search.' : 'No devices available.'}
          </div>
        )}
      </div>
    </div>
  );
}

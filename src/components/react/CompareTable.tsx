import { useState, useMemo } from 'react';

// ─── Types ───

interface Device {
  id: string;
  name: string;
  slug: string;
  manufacturer: string;
  chip: string | null;
  gpu: string | null;
  ram_gb: number | null;
  storage_gb: number | null;
  screen_resolution: string | null;
  screen_size: number | null;
  screen_type: string | null;
  battery_wh: number | null;
  tdp_min: number | null;
  tdp_max: number | null;
  tdp_default: number | null;
  weight_grams: number | null;
  default_os: string | null;
  msrp_usd: number | null;
  image: string | null;
}

interface CompareTableProps {
  devices: Device[];
}

// ─── Helpers ───

const MAX_COMPARE = 3;

type WinCondition = 'highest' | 'lowest' | 'none';

interface SpecRow {
  label: string;
  key: string;
  format: (device: Device) => string;
  /** Which numeric value wins: highest, lowest, or none (non-comparable) */
  win: WinCondition;
  /** Extract the raw numeric value for comparison, or null if not applicable */
  numericValue: (device: Device) => number | null;
}

const specCategories: { title: string; rows: SpecRow[] }[] = [
  {
    title: 'Display',
    rows: [
      {
        label: 'Screen Size',
        key: 'screen_size',
        format: (d) => (d.screen_size ? `${d.screen_size}"` : '--'),
        win: 'highest',
        numericValue: (d) => d.screen_size,
      },
      {
        label: 'Resolution',
        key: 'screen_resolution',
        format: (d) => d.screen_resolution ?? '--',
        win: 'none',
        numericValue: () => null,
      },
      {
        label: 'Panel Type',
        key: 'screen_type',
        format: (d) => d.screen_type ?? '--',
        win: 'none',
        numericValue: () => null,
      },
    ],
  },
  {
    title: 'Performance',
    rows: [
      {
        label: 'Chip / SoC',
        key: 'chip',
        format: (d) => d.chip ?? '--',
        win: 'none',
        numericValue: () => null,
      },
      {
        label: 'GPU',
        key: 'gpu',
        format: (d) => d.gpu ?? '--',
        win: 'none',
        numericValue: () => null,
      },
      {
        label: 'RAM',
        key: 'ram_gb',
        format: (d) => (d.ram_gb ? `${d.ram_gb} GB` : '--'),
        win: 'highest',
        numericValue: (d) => d.ram_gb,
      },
      {
        label: 'TDP Range',
        key: 'tdp_range',
        format: (d) =>
          d.tdp_min != null && d.tdp_max != null
            ? `${d.tdp_min}W - ${d.tdp_max}W`
            : '--',
        win: 'none',
        numericValue: () => null,
      },
      {
        label: 'Default TDP',
        key: 'tdp_default',
        format: (d) => (d.tdp_default != null ? `${d.tdp_default}W` : '--'),
        win: 'none',
        numericValue: () => null,
      },
    ],
  },
  {
    title: 'Storage & Battery',
    rows: [
      {
        label: 'Storage',
        key: 'storage_gb',
        format: (d) =>
          d.storage_gb
            ? d.storage_gb >= 1000
              ? `${(d.storage_gb / 1000).toFixed(d.storage_gb % 1000 === 0 ? 0 : 1)} TB`
              : `${d.storage_gb} GB`
            : '--',
        win: 'highest',
        numericValue: (d) => d.storage_gb,
      },
      {
        label: 'Battery',
        key: 'battery_wh',
        format: (d) => (d.battery_wh ? `${d.battery_wh} Wh` : '--'),
        win: 'highest',
        numericValue: (d) => d.battery_wh,
      },
      {
        label: 'Est. Battery Life',
        key: 'battery_est',
        format: (d) => {
          if (d.battery_wh == null || d.tdp_min == null || d.tdp_max == null) return '--';
          // Rough estimate: battery_wh / tdp * efficiency_factor
          const eff = 0.85;
          const maxLife = (d.battery_wh / d.tdp_min) * eff;
          const minLife = (d.battery_wh / d.tdp_max) * eff;
          return `${minLife.toFixed(1)} - ${maxLife.toFixed(1)} hrs`;
        },
        win: 'none',
        numericValue: () => null,
      },
    ],
  },
  {
    title: 'Physical',
    rows: [
      {
        label: 'Weight',
        key: 'weight_grams',
        format: (d) => (d.weight_grams ? `${d.weight_grams}g` : '--'),
        win: 'lowest',
        numericValue: (d) => d.weight_grams,
      },
      {
        label: 'OS',
        key: 'default_os',
        format: (d) => d.default_os ?? '--',
        win: 'none',
        numericValue: () => null,
      },
    ],
  },
  {
    title: 'Price',
    rows: [
      {
        label: 'MSRP',
        key: 'msrp_usd',
        format: (d) =>
          d.msrp_usd != null
            ? `$${d.msrp_usd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
            : '--',
        win: 'lowest',
        numericValue: (d) => d.msrp_usd,
      },
    ],
  },
];

function getWinnerIndices(
  selectedDevices: Device[],
  row: SpecRow,
): Set<number> {
  if (row.win === 'none') return new Set();

  const values = selectedDevices.map((d) => row.numericValue(d));
  const validValues = values.filter((v): v is number => v != null);
  if (validValues.length < 2) return new Set();

  const target =
    row.win === 'highest' ? Math.max(...validValues) : Math.min(...validValues);

  // Only highlight if there is a clear winner (not all the same)
  const allSame = validValues.every((v) => v === validValues[0]);
  if (allSame) return new Set();

  const winners = new Set<number>();
  values.forEach((v, i) => {
    if (v === target) winners.add(i);
  });
  return winners;
}

// ─── Chevron Icon ───

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ─── Device Selector Dropdown ───

function DeviceSelector({
  devices,
  selectedId,
  onChange,
  onRemove,
  index,
}: {
  devices: Device[];
  selectedId: string | null;
  onChange: (id: string) => void;
  onRemove: () => void;
  index: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = devices.find((d) => d.id === selectedId);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white hover:border-gray-600 transition-colors"
      >
        <span className="truncate">
          {selected ? selected.name : 'Select device...'}
        </span>
        <ChevronDown
          className={`flex-shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          {/* Click-outside overlay */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-gray-700 bg-gray-800 shadow-xl shadow-black/40">
            {devices.map((device) => (
              <button
                key={device.id}
                onClick={() => {
                  onChange(device.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-700 transition-colors ${
                  device.id === selectedId
                    ? 'text-emerald-400 bg-gray-700/50'
                    : 'text-gray-300'
                }`}
              >
                <span className="font-medium">{device.name}</span>
                <span className="ml-2 text-xs text-gray-500">
                  {device.manufacturer}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Remove button - only show if more than 2 devices selected */}
      {index >= 2 && (
        <button
          onClick={onRemove}
          className="absolute -top-2 -right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-gray-700 text-gray-400 hover:bg-red-600 hover:text-white text-xs transition-colors"
          title="Remove device"
        >
          x
        </button>
      )}
    </div>
  );
}

// ─── Main Component ───

export default function CompareTable({ devices }: CompareTableProps) {
  // Pre-select first 3 (or fewer)
  const initialIds = devices.slice(0, Math.min(MAX_COMPARE, devices.length)).map((d) => d.id);
  const [selectedIds, setSelectedIds] = useState<(string | null)[]>(
    initialIds.length >= 2
      ? initialIds
      : [...initialIds, ...Array(2 - initialIds.length).fill(null)],
  );

  const selectedDevices = useMemo(
    () =>
      selectedIds
        .map((id) => devices.find((d) => d.id === id) ?? null)
        .filter((d): d is Device => d !== null),
    [selectedIds, devices],
  );

  const handleChange = (index: number, id: string) => {
    setSelectedIds((prev) => {
      const next = [...prev];
      next[index] = id;
      return next;
    });
  };

  const handleRemove = (index: number) => {
    setSelectedIds((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    if (selectedIds.length < MAX_COMPARE) {
      setSelectedIds((prev) => [...prev, null]);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <nav className="mb-4 text-sm text-gray-500">
        <a href="/" className="hover:text-white transition-colors">
          Home
        </a>
        <span className="mx-2">/</span>
        <span className="text-gray-300">Compare Devices</span>
      </nav>

      <h1 className="text-3xl font-bold text-white mb-2">Compare Devices</h1>
      <p className="text-gray-400 mb-8">
        Select up to {MAX_COMPARE} handheld gaming devices to compare side-by-side
      </p>

      {/* Device Selectors */}
      <div className="mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {selectedIds.map((id, i) => (
            <DeviceSelector
              key={i}
              devices={devices}
              selectedId={id}
              onChange={(newId) => handleChange(i, newId)}
              onRemove={() => handleRemove(i)}
              index={i}
            />
          ))}
        </div>
        {selectedIds.length < MAX_COMPARE && (
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-700 px-4 py-2 text-sm text-gray-400 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors"
          >
            <span className="text-lg leading-none">+</span>
            Add device
          </button>
        )}
      </div>

      {/* Comparison Table */}
      {selectedDevices.length >= 2 ? (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full min-w-[600px]">
            {/* Device Header Row */}
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900">
                <th className="p-4 text-left text-sm font-medium text-gray-500 w-40 min-w-[140px]">
                  Spec
                </th>
                {selectedDevices.map((device) => (
                  <th
                    key={device.id}
                    className="p-4 text-center min-w-[160px]"
                  >
                    <div className="flex flex-col items-center gap-2">
                      {device.image ? (
                        <img
                          src={device.image}
                          alt={device.name}
                          className="h-20 w-auto object-contain rounded-lg"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-20 w-28 items-center justify-center rounded-lg bg-gray-800 text-gray-600">
                          <svg
                            className="h-8 w-8"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3"
                            />
                          </svg>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider">
                          {device.manufacturer}
                        </p>
                        <p className="text-sm font-bold text-white mt-0.5">
                          {device.name}
                        </p>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {specCategories.map((category) => (
                <>
                  {/* Category Header */}
                  <tr key={`cat-${category.title}`} className="bg-gray-900/80">
                    <td
                      colSpan={selectedDevices.length + 1}
                      className="px-4 py-3 text-xs font-semibold text-emerald-400 uppercase tracking-wider border-b border-gray-800"
                    >
                      {category.title}
                    </td>
                  </tr>

                  {/* Spec Rows */}
                  {category.rows.map((row) => {
                    const winners = getWinnerIndices(selectedDevices, row);
                    return (
                      <tr
                        key={row.key}
                        className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-400">
                          {row.label}
                        </td>
                        {selectedDevices.map((device, i) => {
                          const isWinner = winners.has(i);
                          return (
                            <td
                              key={device.id}
                              className={`px-4 py-3 text-center text-sm ${
                                isWinner
                                  ? 'text-emerald-400 font-semibold'
                                  : 'text-gray-300'
                              }`}
                            >
                              <span
                                className={
                                  isWinner
                                    ? 'inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5'
                                    : ''
                                }
                              >
                                {row.format(device)}
                                {isWinner && (
                                  <svg
                                    className="h-3.5 w-3.5 text-emerald-500"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                )}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/50 p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-600 mb-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
            />
          </svg>
          <p className="text-gray-400 text-lg font-medium">
            Select at least 2 devices to compare
          </p>
          <p className="text-gray-500 text-sm mt-1">
            Use the dropdowns above to pick devices
          </p>
        </div>
      )}

      {/* Legend */}
      {selectedDevices.length >= 2 && (
        <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-emerald-400 font-semibold">
              Value
              <svg
                className="ml-1 h-3 w-3 text-emerald-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
            <span>= Best in category</span>
          </div>
          <span className="text-gray-700">|</span>
          <span>Highlighted: highest RAM/battery/storage, lowest weight/price</span>
        </div>
      )}
    </div>
  );
}

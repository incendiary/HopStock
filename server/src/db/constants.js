export const MAINTENANCE_EVENT_TYPES = [
  'Cleaned',
  'Serviced',
  'Repaired',
  'Replaced Part',
  'Inspected',
];

export const CONDITIONS = [
  'Good',
  'Fair',
  'Needs Repair',
  'Retired',
];

export const CATEGORIES = [
  // Vessels
  { id: 'kettle',      label: 'Kettle',               group: 'Vessels' },
  { id: 'boiler',      label: 'Boiler',               group: 'Vessels' },
  { id: 'fermenter',   label: 'Fermenter',             group: 'Vessels' },
  { id: 'keg',         label: 'Keg',                   group: 'Vessels' },
  { id: 'carboy',      label: 'Carboy / Demijohn',     group: 'Vessels' },
  // Heat
  { id: 'burner',      label: 'Burner / Heat Source',  group: 'Heat' },
  // Cold
  { id: 'chiller_plate',        label: 'Plate Chiller',          group: 'Cold' },
  { id: 'chiller_counterflow',  label: 'Counterflow Chiller',    group: 'Cold' },
  { id: 'chiller_immersion',    label: 'Immersion Chiller',      group: 'Cold' },
  // Flow & Fittings
  { id: 'pump',             label: 'Pump',                     group: 'Flow & Fittings' },
  { id: 'ball_valve',       label: 'Ball Valve',               group: 'Flow & Fittings' },
  { id: 'jg_straight',      label: 'John Guest — Straight',    group: 'Flow & Fittings' },
  { id: 'jg_elbow',         label: 'John Guest — Elbow',       group: 'Flow & Fittings' },
  { id: 'jg_tee',           label: 'John Guest — Tee',         group: 'Flow & Fittings' },
  { id: 'jg_reducer',       label: 'John Guest — Reducer',     group: 'Flow & Fittings' },
  { id: 'tubing',           label: 'Tubing / Hose',            group: 'Flow & Fittings' },
  { id: 'auto_siphon',      label: 'Auto-Siphon',              group: 'Flow & Fittings' },
  // Measurement
  { id: 'hydrometer',     label: 'Hydrometer',      group: 'Measurement' },
  { id: 'refractometer',  label: 'Refractometer',   group: 'Measurement' },
  { id: 'ph_meter',       label: 'pH Meter',         group: 'Measurement' },
  { id: 'thermometer',    label: 'Thermometer',      group: 'Measurement' },
  { id: 'flow_meter',     label: 'Flow Meter',       group: 'Measurement' },
  // Gas
  { id: 'co2_regulator',  label: 'CO₂ Regulator',   group: 'Gas' },
  { id: 'co2_cylinder',   label: 'CO₂ Cylinder',    group: 'Gas' },
  { id: 'manifold',       label: 'Gas Manifold',     group: 'Gas' },
  // Other
  { id: 'grain_mill',     label: 'Grain Mill',       group: 'Other' },
  { id: 'bottle_capper',  label: 'Bottle Capper',    group: 'Other' },
  { id: 'other',          label: 'Other',            group: 'Other' },
];

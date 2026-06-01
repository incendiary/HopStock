<template>
  <div class="icon-picker">
    <!-- None / clear -->
    <button
      type="button"
      class="icon-btn"
      :class="{ 'icon-btn--selected': !modelValue }"
      title="No icon"
      @click="$emit('update:modelValue', null)"
    >
      <span class="icon-btn__glyph">—</span>
    </button>

    <button
      v-for="icon in ICONS"
      :key="icon.emoji"
      type="button"
      class="icon-btn"
      :class="{ 'icon-btn--selected': modelValue === icon.emoji }"
      :title="icon.label"
      @click="$emit('update:modelValue', icon.emoji)"
    >
      <span class="icon-btn__glyph">{{ icon.emoji }}</span>
    </button>
  </div>
</template>

<script setup>
defineProps({
  modelValue: {
    type: String,
    default: null,
  },
});

defineEmits(['update:modelValue']);

const ICONS = [
  // Vessels
  { emoji: '🫕',  label: 'Kettle'                  },
  { emoji: '🏺',  label: 'Boiler'                  },
  { emoji: '🧪',  label: 'Conical Fermenter'        },
  { emoji: '🪣',  label: 'Bucket Fermenter'         },
  { emoji: '🫙',  label: 'Carboy / Demijohn'        },
  { emoji: '🛢️', label: 'Keg'                      },
  // Heat & Cold
  { emoji: '🔥',  label: 'Burner'                  },
  { emoji: '🧊',  label: 'Plate Chiller'            },
  { emoji: '🌊',  label: 'Counterflow Chiller'      },
  { emoji: '🌀',  label: 'Immersion Chiller'        },
  // Flow & Fittings
  { emoji: '⚙️', label: 'Pump'                     },
  { emoji: '🚰',  label: 'Ball Valve'               },
  { emoji: '↔️', label: 'John Guest — Straight'    },
  { emoji: '↩️', label: 'John Guest — Elbow'       },
  { emoji: '🔀',  label: 'John Guest — Tee'         },
  { emoji: '🔽',  label: 'John Guest — Reducer'     },
  { emoji: '〰️', label: 'Tubing / Hose'            },
  { emoji: '🪠',  label: 'Auto-Siphon'              },
  // Gas
  { emoji: '💨',  label: 'CO₂ Regulator'           },
  { emoji: '🫧',  label: 'CO₂ Cylinder'            },
  { emoji: '🎛️', label: 'Gas Manifold'             },
  // Measurement
  { emoji: '📏',  label: 'Hydrometer'               },
  { emoji: '🔭',  label: 'Refractometer'            },
  { emoji: '🧫',  label: 'pH Meter'                 },
  { emoji: '🌡️', label: 'Thermometer'              },
  { emoji: '💧',  label: 'Flow Meter'               },
  // Other
  { emoji: '⚗️', label: 'Grain Mill'               },
  { emoji: '🍾',  label: 'Bottle Capper'            },
  { emoji: '📦',  label: 'Other'                    },
];
</script>

<style scoped>
.icon-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.icon-btn {
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 6px;
  border: 2px solid var(--color-border);
  background: var(--color-input-bg);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.12s, background 0.12s;
  padding: 0;
}

.icon-btn:hover {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 8%, var(--color-input-bg));
}

.icon-btn--selected {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 15%, var(--color-input-bg));
}

.icon-btn__glyph {
  font-size: 1.2rem;
  line-height: 1;
}
</style>

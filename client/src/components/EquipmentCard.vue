<template>
  <div
    class="card"
    role="button"
    tabindex="0"
    @click="$emit('select', item.id)"
    @keydown.enter="$emit('select', item.id)"
    @keydown.space.prevent="$emit('select', item.id)"
  >
    <div class="card__thumb">
      <img
        v-if="firstPhotoUrl"
        :src="firstPhotoUrl"
        :alt="item.name"
        class="card__thumb-img"
      >
      <div
        v-else
        class="card__thumb-placeholder"
      >
        📦
      </div>
    </div>

    <div class="card__body">
      <h3 class="card__name">
        {{ item.name }}
      </h3>
      <p class="card__category">
        {{ categoryLabel }}
      </p>
      <span
        class="card__condition"
        :class="`card__condition--${conditionSlug}`"
      >{{ item.condition }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
  categoryMap: {
    type: Object,
    default: () => ({}),
  },
});

defineEmits(['select']);

const firstPhotoUrl = computed(() => props.item.photos?.[0]?.url ?? null);

const categoryLabel = computed(
  () => props.categoryMap[props.item.category] ?? props.item.category ?? '—',
);

const conditionSlug = computed(
  () => (props.item.condition ?? '').toLowerCase().replace(/\s+/g, '-'),
);
</script>

<style scoped>
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.15s;
  outline: none;
}

.card:hover,
.card:focus-visible {
  border-color: var(--color-primary);
  transform: translateY(-2px);
}

/* Thumbnail */
.card__thumb {
  width: 100%;
  aspect-ratio: 4 / 3;
  background: var(--color-input-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.card__thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card__thumb-placeholder {
  font-size: 2.5rem;
  opacity: 0.4;
}

/* Body */
.card__body {
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.card__name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card__category {
  font-size: 0.8rem;
  color: var(--color-muted);
}

/* Condition badge */
.card__condition {
  display: inline-block;
  margin-top: 0.25rem;
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  width: fit-content;
}

.card__condition--good {
  background: color-mix(in srgb, var(--color-accent) 20%, transparent);
  color: var(--color-accent);
}

.card__condition--fair {
  background: color-mix(in srgb, var(--color-primary) 25%, transparent);
  color: var(--color-primary);
}

.card__condition--needs-repair {
  background: color-mix(in srgb, var(--color-danger) 20%, transparent);
  color: var(--color-danger);
}

.card__condition--retired {
  background: color-mix(in srgb, var(--color-muted) 20%, transparent);
  color: var(--color-muted);
}
</style>

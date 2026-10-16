<template>
  <section class="section">
    <h3 class="section__title">{{ title }}</h3>
    <slot />
  </section>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
});
</script>

<style scoped>
.section {
  margin-bottom: 2rem;
}

.section__title {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-muted);
  margin-bottom: 0.85rem;
}
</style>

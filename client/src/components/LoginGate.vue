<template>
  <form class="login-gate" @submit.prevent="submit">
    <h1 class="login-gate__title">🍺 HopStock</h1>
    <p class="login-gate__hint">Enter the access token to continue.</p>
    <label class="login-gate__label" for="login-token">Access token</label>
    <input
      id="login-token"
      v-model="token"
      class="login-gate__input"
      type="password"
      autocomplete="current-password"
      autofocus
    />
    <p v-if="error" class="login-gate__error" role="alert">{{ error }}</p>
    <button class="btn btn--primary" type="submit" :disabled="busy || !token">Sign in</button>
  </form>
</template>

<script setup>
import { ref } from 'vue';
import { login } from '../api.js';

const emit = defineEmits(['authenticated']);

const token = ref('');
const error = ref('');
const busy = ref(false);

async function submit() {
  busy.value = true;
  error.value = '';
  try {
    await login(token.value);
    token.value = '';
    emit('authenticated');
  } catch (e) {
    error.value = e.status === 429 ? 'Too many attempts. Try again later.' : e.message;
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.login-gate {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 340px;
  margin: 4rem auto;
  padding: 1.5rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.login-gate__title {
  margin: 0;
  font-size: 1.4rem;
  color: var(--color-primary);
}

.login-gate__hint {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.875rem;
}

.login-gate__label {
  font-size: 0.875rem;
  font-weight: 500;
}

.login-gate__input {
  background: var(--color-input-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
}

.login-gate__error {
  margin: 0;
  color: var(--color-danger);
  font-size: 0.875rem;
}
</style>

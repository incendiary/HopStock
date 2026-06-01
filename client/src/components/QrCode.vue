<template>
  <canvas
    ref="canvasRef"
    :width="size"
    :height="size"
    :title="value"
  />
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import QRCode from 'qrcode';

const props = defineProps({
  value: { type: String, required: true },
  size:  { type: Number, default: 160 },
});

const canvasRef = ref(null);

async function render() {
  if (!canvasRef.value) return;
  await QRCode.toCanvas(canvasRef.value, props.value, {
    width:          props.size,
    margin:         1,
    color:          { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });
}

onMounted(render);
watch(() => [props.value, props.size], render);
</script>

import { createApp } from 'vue';
import App from './App.vue';
import './style.css';

// Restore saved theme before mount to prevent flash
const saved = localStorage.getItem('hopstock-theme');
if (saved) document.documentElement.setAttribute('data-theme', saved);

createApp(App).mount('#app');

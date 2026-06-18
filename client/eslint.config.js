import pluginVue from 'eslint-plugin-vue';
import configPrettier from 'eslint-config-prettier';

export default [
  ...pluginVue.configs['flat/recommended'],
  configPrettier,
  {
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
];

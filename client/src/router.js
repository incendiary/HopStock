import { createRouter, createWebHistory } from 'vue-router';
import EquipmentList   from './views/EquipmentList.vue';
import EquipmentDetail from './views/EquipmentDetail.vue';

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/',               component: EquipmentList   },
    { path: '/equipment/:id',  component: EquipmentDetail },
    { path: '/:pathMatch(.*)', redirect: '/'              },
  ],
});

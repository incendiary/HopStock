import { createRouter, createWebHistory } from 'vue-router';
import EquipmentList   from './views/EquipmentList.vue';
import EquipmentDetail from './views/EquipmentDetail.vue';

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/',               component: EquipmentList                              },
    { path: '/equipment/:id',  component: EquipmentDetail                           },
    { path: '/dashboard',      component: () => import('./views/Dashboard.vue')      },
    { path: '/routines',       component: () => import('./views/Routines.vue')       },
    { path: '/locations',      component: () => import('./views/Locations.vue')      },
    { path: '/:pathMatch(.*)', redirect: '/'                                        },
  ],
});

const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.error ?? `HTTP ${res.status}`), { status: res.status });
  }
  return res.json();
}

// Equipment
export const getEquipment  = (params = {}) => {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v))
  ).toString();
  return request(`/equipment${qs ? `?${qs}` : ''}`).then((r) => r.items);
};
export const getEquipmentItem = (id)       => request(`/equipment/${id}`);
export const createEquipment  = (body)     => request('/equipment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
export const updateEquipment  = (id, body) => request(`/equipment/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
export const deleteEquipment  = (id)       => request(`/equipment/${id}`, { method: 'DELETE' });

// Photos
export const uploadPhotos = (equipmentId, formData) =>
  request(`/equipment/${equipmentId}/photos`, { method: 'POST', body: formData });
export const deletePhoto  = (equipmentId, photoId)  =>
  request(`/equipment/${equipmentId}/photos/${photoId}`, { method: 'DELETE' });

// Meta
export const getCategories = () => request('/categories');
export const getConditions = () => request('/conditions');
export const getStats      = () => request('/stats');

// Service routines
export const getRoutines         = ()           => request('/routines');
export const getRoutine          = (id)         => request(`/routines/${id}`);
export const createRoutine       = (body)       => request('/routines', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
export const updateRoutine       = (id, body)   => request(`/routines/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
export const deleteRoutine       = (id)         => request(`/routines/${id}`, { method: 'DELETE' });
export const attachEquipment     = (id, equipId) => request(`/routines/${id}/equipment`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ equipment_id: equipId }) });
export const detachEquipment     = (id, equipId) => request(`/routines/${id}/equipment/${equipId}`, { method: 'DELETE' });
export const runRoutine          = (id, body)   => request(`/routines/${id}/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

// Maintenance events
export const getMaintenanceEvents  = (equipmentId)        => request(`/equipment/${equipmentId}/maintenance`);
export const addMaintenanceEvent   = (equipmentId, body)  => request(`/equipment/${equipmentId}/maintenance`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
export const deleteMaintenanceEvent = (equipmentId, eventId) => request(`/equipment/${equipmentId}/maintenance/${eventId}`, { method: 'DELETE' });

// Meta — event types
export const getMaintenanceEventTypes = () => request('/maintenance-event-types');

// Import
export const importFile = (formData) =>
  request('/import', { method: 'POST', body: formData });

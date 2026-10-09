export const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.error ?? `HTTP ${res.status}`), { status: res.status });
  }
  return res.json();
}

const json = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

// Equipment
export const getEquipment = (params = {}) => {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v)),
  ).toString();
  return request(`/equipment${qs ? `?${qs}` : ''}`).then((r) => r.items);
};
export const getEquipmentItem = (id) => request(`/equipment/${id}`);
export const createEquipment = (body) => request('/equipment', json('POST', body));
export const updateEquipment = (id, body) => request(`/equipment/${id}`, json('PUT', body));
export const deleteEquipment = (id) => request(`/equipment/${id}`, { method: 'DELETE' });
export const batchEquipment = (body) => request('/equipment/batch', json('POST', body));

// Photos
export const uploadPhotos = (equipmentId, formData) =>
  request(`/equipment/${equipmentId}/photos`, { method: 'POST', body: formData });
export const deletePhoto = (equipmentId, photoId) =>
  request(`/equipment/${equipmentId}/photos/${photoId}`, { method: 'DELETE' });
export const patchPhoto = (equipmentId, photoId, body) =>
  request(`/equipment/${equipmentId}/photos/${photoId}`, json('PATCH', body));

// Meta
export const getCategories = () => request('/categories');
export const getConditions = () => request('/conditions');
export const getStats = () => request('/stats');

// Receipt scanning
export const checkScanAvailable = () => request('/scan-receipt/available');
export const scanReceipt = (fd) => request('/scan-receipt', { method: 'POST', body: fd });

// Tags
export const getTags = () => request('/tags');
export const createTag = (body) => request('/tags', json('POST', body));
export const updateTag = (id, body) => request(`/tags/${id}`, json('PUT', body));
export const deleteTag = (id) => request(`/tags/${id}`, { method: 'DELETE' });

// Service routines
export const getRoutines = () => request('/routines');
export const getRoutine = (id) => request(`/routines/${id}`);
export const createRoutine = (body) => request('/routines', json('POST', body));
export const updateRoutine = (id, body) => request(`/routines/${id}`, json('PUT', body));
export const deleteRoutine = (id) => request(`/routines/${id}`, { method: 'DELETE' });
export const attachEquipment = (id, equipId) =>
  request(`/routines/${id}/equipment`, json('POST', { equipment_id: equipId }));
export const detachEquipment = (id, equipId) =>
  request(`/routines/${id}/equipment/${equipId}`, { method: 'DELETE' });
export const runRoutine = (id, body) =>
  request(`/routines/${id}/run`, json('POST', body));

// Maintenance events
export const getMaintenanceEvents = (equipmentId) =>
  request(`/equipment/${equipmentId}/maintenance`);
export const addMaintenanceEvent = (equipmentId, body) =>
  request(`/equipment/${equipmentId}/maintenance`, json('POST', body));
export const deleteMaintenanceEvent = (equipmentId, eventId) =>
  request(`/equipment/${equipmentId}/maintenance/${eventId}`, { method: 'DELETE' });

// Meta — event types
export const getMaintenanceEventTypes = () => request('/maintenance-event-types');

// Loans
export const getLoans = (equipmentId) => request(`/equipment/${equipmentId}/loans`);
export const recordLoan = (equipmentId, body) =>
  request(`/equipment/${equipmentId}/loans`, json('POST', body));
export const returnLoan = (equipmentId, loanId, body = {}) =>
  request(`/equipment/${equipmentId}/loans/${loanId}/return`, json('PUT', body));
export const deleteLoan = (equipmentId, loanId) =>
  request(`/equipment/${equipmentId}/loans/${loanId}`, { method: 'DELETE' });

// Locations
export const getLocations = () => request('/locations');
export const createLocation = (body) => request('/locations', json('POST', body));
export const updateLocation = (id, body) => request(`/locations/${id}`, json('PUT', body));
export const deleteLocation = (id) => request(`/locations/${id}`, { method: 'DELETE' });

// Backup
export const triggerBackup = () => request('/backup/now', { method: 'POST' });

// Import
export const importFile = (formData) => request('/import', { method: 'POST', body: formData });

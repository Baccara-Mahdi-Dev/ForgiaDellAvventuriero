const state = { catalogs: [], file: '', data: null, selected: -1, dirty: false, mode: 'records' };
const $ = (selector) => document.querySelector(selector);
const elements = {
  catalogList: $('#catalogList'),
  empty: $('#emptyState'),
  editor: $('#editor'),
  endpoint: $('#endpoint'),
  title: $('#catalogTitle'),
  meta: $('#catalogMeta'),
  recordsMode: $('#recordsMode'),
  rawMode: $('#rawMode'),
  recordList: $('#recordList'),
  search: $('#recordSearch'),
  recordJson: $('#recordJson'),
  rawJson: $('#rawJson'),
  recordTitle: $('#recordTitle'),
  status: $('#recordStatus'),
  save: $('#saveButton'),
  toast: $('#toast'),
};

async function api(path, options) {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || body.output || `Errore ${response.status}`);
  return body;
}

function toast(message, error = false) {
  elements.toast.textContent = message;
  elements.toast.className = `show${error ? ' error' : ''}`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (elements.toast.className = ''), 4200);
}

function setDirty(value = true) {
  state.dirty = value;
  elements.save.disabled = !state.file || !value;
  document.title = `${value ? '● ' : ''}Forgia · Editor cataloghi`;
}

function formatBytes(bytes) {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(bytes > 1024 * 100 ? 0 : 1)} KB`;
}

async function loadCatalogList() {
  const result = await api('/api/catalogs');
  state.catalogs = result.catalogs;
  elements.catalogList.innerHTML = '';
  for (const catalog of state.catalogs) {
    const button = document.createElement('button');
    button.className = `catalog-item${catalog.name === state.file ? ' active' : ''}`;
    button.innerHTML = `<strong>${escapeHtml(catalog.name)}</strong><span>${formatBytes(catalog.bytes)}</span><em>${catalog.records ?? catalog.kind}</em>`;
    button.addEventListener('click', () => openCatalog(catalog.name));
    elements.catalogList.append(button);
  }
}

async function openCatalog(name) {
  if (state.dirty && !confirm('Le modifiche non salvate andranno perse. Continuare?')) return;
  const result = await api(`/api/catalogs/${encodeURIComponent(name)}`);
  state.file = name;
  state.data = result.data;
  state.selected = Array.isArray(state.data) && state.data.length ? 0 : -1;
  elements.empty.hidden = true;
  elements.editor.hidden = false;
  elements.endpoint.textContent = `/api/catalogs/${name}`;
  elements.title.textContent = name;
  elements.meta.textContent = Array.isArray(state.data)
    ? `${state.data.length} record · array JSON`
    : `Documento ${typeof state.data}`;
  elements.rawJson.value = pretty(state.data);
  setDirty(false);
  await loadCatalogList();
  renderRecords();
  selectRecord(state.selected);
}

function recordLabel(record, index) {
  if (record && typeof record === 'object')
    return {
      title: record.name || record.id || `Record ${index + 1}`,
      id: record.id || `indice ${index}`,
    };
  return { title: `Valore ${index + 1}`, id: typeof record };
}

function renderRecords() {
  const records = Array.isArray(state.data) ? state.data : [];
  const query = elements.search.value.trim().toLocaleLowerCase('it');
  elements.recordList.innerHTML = '';
  records.forEach((record, index) => {
    const label = recordLabel(record, index);
    if (query && !`${label.title} ${label.id}`.toLocaleLowerCase('it').includes(query)) return;
    const button = document.createElement('button');
    button.className = `record-item${index === state.selected ? ' active' : ''}`;
    button.innerHTML = `<strong>${escapeHtml(String(label.title))}</strong><small>${escapeHtml(String(label.id))}</small>`;
    button.addEventListener('click', () => selectRecord(index));
    elements.recordList.append(button);
  });
}

function selectRecord(index) {
  state.selected = index;
  const isArray = Array.isArray(state.data);
  const record = isArray && index >= 0 ? state.data[index] : null;
  elements.recordJson.disabled = record === null;
  elements.recordJson.value = record === null ? '' : pretty(record);
  elements.recordTitle.textContent =
    record === null ? 'Nessun record' : recordLabel(record, index).title;
  $('#duplicateButton').disabled = record === null;
  $('#deleteButton').disabled = record === null;
  $('#applyRecordButton').disabled = record === null;
  elements.status.textContent = isArray
    ? 'Modifica liberamente proprietà e valori.'
    : 'La modalità Record richiede un array. Usa JSON completo.';
  renderRecords();
}

function applyRecord() {
  if (!Array.isArray(state.data) || state.selected < 0) return;
  try {
    state.data[state.selected] = JSON.parse(elements.recordJson.value);
    elements.recordJson.value = pretty(state.data[state.selected]);
    elements.rawJson.value = pretty(state.data);
    setDirty();
    renderRecords();
    toast('Record applicato al catalogo. Ora puoi salvare il file.');
  } catch (error) {
    elements.status.textContent = `JSON non valido: ${error.message}`;
    toast(`JSON non valido: ${error.message}`, true);
  }
}

function applyRaw() {
  try {
    state.data = JSON.parse(elements.rawJson.value);
    elements.rawJson.value = pretty(state.data);
    state.selected = Array.isArray(state.data) && state.data.length ? 0 : -1;
    setDirty();
    renderRecords();
    selectRecord(state.selected);
    toast('Struttura completa applicata. Ora puoi salvare il file.');
  } catch (error) {
    toast(`JSON non valido: ${error.message}`, true);
  }
}

async function save() {
  try {
    if (state.mode === 'raw') applyRaw();
    else if (state.selected >= 0 && elements.recordJson.value.trim()) applyRecord();
    const result = await api(`/api/catalogs/${encodeURIComponent(state.file)}`, {
      method: 'PUT',
      body: JSON.stringify({ data: state.data }),
    });
    setDirty(false);
    await loadCatalogList();
    const warnings = result.warnings?.length ? `\nAttenzione: ${result.warnings.join(' ')}` : '';
    toast(
      `Catalogo salvato. Copia di sicurezza creata.${result.manifestUpdated ? ' Conteggio manifest aggiornato.' : ''}${warnings}`,
    );
  } catch (error) {
    toast(error.message, true);
  }
}

function addRecord() {
  if (!Array.isArray(state.data))
    return toast('Per aggiungere record, il catalogo deve essere un array.', true);
  const used = new Set(state.data.map((item) => item?.id));
  let number = state.data.length + 1;
  while (used.has(`new-record-${number}`)) number++;
  state.data.push({
    id: `new-record-${number}`,
    name: 'Nuovo record',
    description: '',
    source: 'PHB',
  });
  selectRecord(state.data.length - 1);
  elements.rawJson.value = pretty(state.data);
  setDirty();
}

function duplicateRecord() {
  const source = state.data?.[state.selected];
  if (source === undefined) return;
  const copy = structuredClone(source);
  if (copy && typeof copy === 'object') copy.id = `${copy.id || 'record'}-copy`;
  state.data.splice(state.selected + 1, 0, copy);
  selectRecord(state.selected + 1);
  elements.rawJson.value = pretty(state.data);
  setDirty();
}

function deleteRecord() {
  if (state.selected < 0 || !confirm('Eliminare questo record dal catalogo?')) return;
  state.data.splice(state.selected, 1);
  state.selected = Math.min(state.selected, state.data.length - 1);
  elements.rawJson.value = pretty(state.data);
  selectRecord(state.selected);
  setDirty();
}

async function newCatalog() {
  const value = prompt('Nome del nuovo catalogo (es. condizioni):');
  if (!value) return;
  try {
    const result = await api('/api/catalogs', {
      method: 'POST',
      body: JSON.stringify({ name: value, data: [] }),
    });
    await loadCatalogList();
    await openCatalog(result.name);
    toast('Nuovo catalogo creato. Aggiungilo al manifest se deve essere caricato dall’app.');
  } catch (error) {
    toast(error.message, true);
  }
}

function setMode(mode) {
  state.mode = mode;
  document
    .querySelectorAll('[data-mode]')
    .forEach((button) => button.classList.toggle('active', button.dataset.mode === mode));
  elements.recordsMode.hidden = mode !== 'records';
  elements.rawMode.hidden = mode !== 'raw';
  if (mode === 'raw') elements.rawJson.value = pretty(state.data);
}

function pretty(value) {
  return JSON.stringify(value, null, 2);
}
function escapeHtml(value) {
  const span = document.createElement('span');
  span.textContent = value;
  return span.innerHTML;
}

elements.search.addEventListener('input', renderRecords);
$('#applyRecordButton').addEventListener('click', applyRecord);
$('#applyRawButton').addEventListener('click', applyRaw);
$('#formatRawButton').addEventListener('click', () => {
  try {
    elements.rawJson.value = pretty(JSON.parse(elements.rawJson.value));
  } catch (error) {
    toast(error.message, true);
  }
});
$('#addRecordButton').addEventListener('click', addRecord);
$('#duplicateButton').addEventListener('click', duplicateRecord);
$('#deleteButton').addEventListener('click', deleteRecord);
$('#newCatalogButton').addEventListener('click', newCatalog);
elements.save.addEventListener('click', save);
$('#validateButton').addEventListener('click', async () => {
  try {
    const result = await api('/api/validate', { method: 'POST', body: '{}' });
    toast(result.output || 'Dati validi.');
  } catch (error) {
    toast(error.message, true);
  }
});
document
  .querySelectorAll('[data-mode]')
  .forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)));
window.addEventListener('beforeunload', (event) => {
  if (state.dirty) event.preventDefault();
});

loadCatalogList().catch((error) => toast(error.message, true));

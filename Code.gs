/**
 * Meal Prep backend. Lives inside the "Meal Prep Database" Google Sheet.
 * The app (GitHub Pages) sends every request here as a POST with a Google sign-in token.
 * Only emails listed on the Users tab can read or write.
 */

const SHEET = SpreadsheetApp.getActive();

function doPost(e) {
  let out;
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const user = verify_(body.token);
    out = route_(body, user);
  } catch (err) {
    out = { ok: false, error: String(err && err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, msg: 'Meal Prep backend is running.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ---------- Auth ---------- */

function setting_(label) {
  const rows = SHEET.getSheetByName('Status').getDataRange().getValues();
  const r = rows.find(x => x[0] === label);
  return r ? r[1] : '';
}

function verify_(token) {
  if (!token) throw new Error('Not signed in.');
  const cache = CacheService.getScriptCache();
  const hit = cache.get('t:' + token.slice(-40));
  let email;
  if (hit) {
    email = hit;
  } else {
    const res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token), { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) throw new Error('Sign-in expired. Please sign in again.');
    const info = JSON.parse(res.getContentText());
    const clientId = String(setting_('Google client ID') || '').trim();
    if (!clientId || info.aud !== clientId) throw new Error('Sign-in is not set up for this app.');
    if (String(info.email_verified) !== 'true') throw new Error('Google email is not verified.');
    email = String(info.email).toLowerCase();
    cache.put('t:' + token.slice(-40), email, 1800);
  }
  const users = SHEET.getSheetByName('Users').getDataRange().getValues().slice(1);
  const u = users.find(r => String(r[0]).trim().toLowerCase() === email);
  if (!u) throw new Error(email + ' is not on the Users list.');
  return { email: email, name: u[1], person: u[2] };
}

/* ---------- Routing ---------- */

function route_(b, user) {
  switch (b.action) {
    case 'load': return { ok: true, user: user, ...loadAll_() };
    case 'save': return withLock_(() => saveData_(b.data || {}, user));
    case 'pantry': return withLock_(() => savePantry_(b.updates || [], b.adds || [], user));
    case 'freezer': return withLock_(() => saveFreezer_(b.rows || [], user));
    case 'request': return withLock_(() => addRequest_(b, user));
    case 'receipt': return withLock_(() => addReceipt_(b, user));
    default: throw new Error('Unknown action.');
  }
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function flag_(tab, user) {
  const sh = SHEET.getSheetByName('Status');
  const rows = sh.getDataRange().getValues();
  const set = (label, val) => { const i = rows.findIndex(r => r[0] === label); if (i >= 0) sh.getRange(i + 1, 2).setValue(val); };
  set('Changes waiting', true);
  set('Last change', new Date());
  const prev = String((rows.find(r => r[0] === 'Changed tab') || [])[1] || '');
  const tabs = new Set(prev.split(',').map(s => s.trim()).filter(Boolean));
  if (rows.find(r => r[0] === 'Changes waiting')[1] !== true) tabs.clear();
  tabs.add(tab);
  set('Changed tab', Array.from(tabs).join(', '));
  set('Changed by', user.name);
}

/* ---------- Read ---------- */

function table_(name) {
  const v = SHEET.getSheetByName(name).getDataRange().getValues();
  return v.slice(1).map((r, i) => ({ row: i + 2, v: r })).filter(x => x.v.some(c => c !== ''));
}

function parse_(s) { try { return JSON.parse(s); } catch (e) { return null; } }

function loadAll_() {
  const data = {};
  table_('Data').forEach(x => { data[x.v[0]] = parse_(x.v[1]); });
  const recipes = {};
  table_('Recipes').forEach(x => { const o = parse_(x.v[3]); if (o) { if (x.v[4]) o.src = x.v[4]; recipes[x.v[0]] = o; } });
  const foods = {};
  table_('Foods').forEach(x => { const o = parse_(x.v[2]); if (o) foods[x.v[0]] = o; });
  const pantry = table_('Pantry').map(x => ({ row: x.row, item: x.v[0], brand: x.v[1], type: x.v[2], size: Number(x.v[3]) || 0, left: x.v[4] === '' ? null : Number(x.v[4]), notes: x.v[6], key: x.v[7], buy: x.v[8] }));
  const freezer = table_('Freezer').map(x => ({ item: x.v[0], key: x.v[1], lb: Number(x.v[2]) || 0, priority: x.v[3] || 'Normal', cost: x.v[4], notes: x.v[5] }));
  const requests = table_('Requests').slice(-30).map(x => ({ at: x.v[0], from: x.v[1], text: x.v[2], styles: x.v[3], status: x.v[4], note: x.v[5] }));
  const status = {};
  SHEET.getSheetByName('Status').getDataRange().getValues().slice(1).forEach(r => { status[r[0]] = r[1]; });
  delete status['Google client ID'];
  return { data, recipes, foods, pantry, freezer, requests, status };
}

/* ---------- Write ---------- */

function saveData_(data, user) {
  const sh = SHEET.getSheetByName('Data');
  const rows = sh.getDataRange().getValues();
  Object.keys(data).forEach(k => {
    const i = rows.findIndex((r, n) => n > 0 && r[0] === k);
    const vals = [[k, JSON.stringify(data[k]), new Date(), user.name]];
    if (i > 0) sh.getRange(i + 1, 1, 1, 4).setValues(vals);
    else { sh.appendRow(vals[0]); rows.push(vals[0]); }
  });
  flag_('Data: ' + Object.keys(data).join('/'), user);
  return { ok: true };
}

function savePantry_(updates, adds, user) {
  const sh = SHEET.getSheetByName('Pantry');
  updates.forEach(u => {
    if (u.row && u.left !== undefined) sh.getRange(u.row, 5).setValue(u.left);
    if (u.row && u.size !== undefined) sh.getRange(u.row, 4).setValue(u.size);
  });
  adds.forEach(a => {
    const r = sh.getLastRow() + 1;
    sh.getRange(r, 1, 1, 9).setValues([[a.item || '', a.brand || '', a.type || '', a.size || '', a.left === undefined ? 1 : a.left, '', a.notes || '', a.key || '', a.buy || '']]);
    sh.getRange(r, 6).setFormula('=IF(E' + r + '="","",D' + r + '*E' + r + ')');
  });
  flag_('Pantry', user);
  return { ok: true };
}

function saveFreezer_(rows, user) {
  const sh = SHEET.getSheetByName('Freezer');
  const last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, 6).clearContent();
  if (rows.length) sh.getRange(2, 1, rows.length, 6).setValues(rows.map(r => [r.item || '', r.key || '', r.lb || 0, r.priority || 'Normal', r.cost || '', r.notes || '']));
  flag_('Freezer', user);
  return { ok: true };
}

function addRequest_(b, user) {
  SHEET.getSheetByName('Requests').appendRow([new Date(), user.name, b.text || '', (b.styles || []).join(', '), 'Waiting', '']);
  flag_('Requests', user);
  return { ok: true };
}

function addReceipt_(b, user) {
  const it = DriveApp.getFoldersByName('Meal Prep Receipts');
  const folder = it.hasNext() ? it.next() : DriveApp.createFolder('Meal Prep Receipts');
  const blob = Utilities.newBlob(Utilities.base64Decode(b.data), b.mime || 'image/jpeg', b.name || ('receipt-' + Date.now() + '.jpg'));
  const file = folder.createFile(blob);
  SHEET.getSheetByName('Requests').appendRow([new Date(), user.name, 'Receipt uploaded: ' + file.getUrl(), '', 'Waiting', '']);
  flag_('Receipts', user);
  return { ok: true };
}

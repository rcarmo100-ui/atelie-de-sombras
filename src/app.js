const $ = id => document.getElementById(id), N = Sombra.N;
let VIEW = 1200;
const BOXES = [['Pequena', 110, 125, 70], ['Média', 110, 155, 90], ['Grande', 150, 200, 120], ['Extra', 200, 200, 140]];
const maxShadow = (W, H, D) => 2 * Math.sqrt(45 * Math.min(W, H) / 2 * (D - 2));
const edgeCm = p => (p.S / 2) ** 2 / (Math.min(p.W, p.H) / 2 * Sombra.ledZ(p)) / 10; // parede visível: 1 m
const st = { gray: null, edit: new Int8Array(N * N), sil: new Uint8Array(N * N), panels: null, tool: 'move', view: 'wall', undo: [], busy: 0,
  p: { W: 110, H: 155, D: 90, S: 900, ox: 0, oy: 0, frame: false, glue: false, fit: 0 }, thr: 128, inv: false, preview: false };
const cv = $('wall'), ctx = cv.getContext('2d', { willReadFrequently: true }), R = cv.width, img = ctx.createImageData(R, R);

function compose() {
  const { gray, edit, sil, thr, inv } = st;
  for (let i = 0; i < N * N; i++) { let d = gray[i] < thr; if (inv) d = !d; sil[i] = edit[i] > 0 ? 255 : edit[i] < 0 ? 0 : d ? 255 : 0; }
}
function drawWall() {
  const { p, panels, sil, preview } = st, d = img.data, L = Sombra.ledZ(p), mm = VIEW / R;
  for (let j = 0, o = 0; j < R; j++) { const Y = (R / 2 - j - .5) * mm;
    for (let i = 0; i < R; i++, o += 4) { const X = (i - R / 2 + .5) * mm; let dark;
      if (preview || !panels) dark = Sombra.maskAt(sil, X, Y, p) > 127;
      else dark = Sombra.blocked(panels, p, X, Y);
      const r2 = (X * X + Y * Y) / (260 * 260), lux = dark ? 0 : 1 / (1 + r2 * .55);
      d[o] = 14 + 232 * lux; d[o + 1] = 13 + 200 * lux; d[o + 2] = 18 + 146 * lux; d[o + 3] = 255; } }
  ctx.putImageData(img, 0, 0);
  const w = (p.W + 2 * Sombra.FL) / mm, h = (p.H + 2 * Sombra.FL) / mm, x = R / 2 - w / 2, y = R / 2 - h / 2;
  ctx.fillStyle = '#efe3cc'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = '#6a6578'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#4a4656'; ctx.font = '500 20px "IBM Plex Mono",monospace'; ctx.textAlign = 'center';
  ctx.fillText(`${p.W}×${p.H}`, R / 2, R / 2 + 7);
  if (st.tool === 'move') { const s = p.S / mm; ctx.setLineDash([8, 8]); ctx.strokeStyle = 'rgba(255,190,107,.55)'; if (p.frame) { ctx.beginPath(); ctx.arc(R / 2 + p.ox / mm, R / 2 - p.oy / mm, s / 2, 0, 7); ctx.stroke(); } else ctx.strokeRect(R / 2 + (p.ox - p.S / 2) / mm, R / 2 - (p.oy + p.S / 2) / mm, s, s); ctx.setLineDash([]); }
  ctx.textAlign = 'left'; ctx.font = '500 18px "IBM Plex Mono",monospace'; ctx.fillStyle = 'rgba(241,234,217,.8)';
  ctx.fillRect(20, R - 22, 100 / mm, 3); ctx.fillText('10 cm', 20, R - 32);
}
function drawParts() {
  ctx.fillStyle = '#16151d'; ctx.fillRect(0, 0, R, R);
  const names = ['superior', 'direito', 'inferior', 'esquerdo'], ps = st.panels; if (!ps) return;
  const s = Math.min((R - 60) / Math.max(st.p.W, st.p.H), (R - 150) / 4 / st.p.D * 1.0); let y = 22;
  ctx.textAlign = 'left';
  for (const n of names) { const q = ps[n], c = document.createElement('canvas'); c.width = q.nx; c.height = q.ny;
    const g = c.getContext('2d'), im = g.createImageData(q.nx, q.ny);
    for (let j = 0; j < q.ny; j++) for (let i = 0; i < q.nx; i++) { const o = (j * q.nx + i) * 4, on = q.a[(q.ny - 1 - j) * q.nx + i], k = (q.ny - 1 - j) * q.nx + i, off = on && q.parts[k] !== q.main; im.data[o] = 255; im.data[o + 1] = off ? 70 : 190; im.data[o + 2] = off ? 60 : 107; im.data[o + 3] = on ? 255 : 0; }
    g.putImageData(im, 0, 0);
    ctx.fillStyle = '#a9a4b4'; ctx.font = '500 18px "IBM Plex Mono",monospace'; ctx.fillText('painel ' + n, 30, y + 14); y += 24;
    ctx.imageSmoothingEnabled = true; ctx.drawImage(c, 30, y, q.len * s, q.Pz * s); y += q.Pz * s + 16; }
}
/* estampa do fundo: imagem própria, independente da sombra */
const art = { bmp: null, thr: 128, inv: false, mask: null, cells: 0, crop: { z: 1, x: 0, y: 0 } };
function artMask() { if (!art.bmp) return null; const G = Sombra.G, [aw, ah] = Sombra.artSize(st.p), nx = Math.round(aw / G) + 1, ny = Math.round(ah / G) + 1;
  const c = document.createElement('canvas'); c.width = nx; c.height = ny; const g = c.getContext('2d', { willReadFrequently: true }); g.fillStyle = '#fff'; g.fillRect(0, 0, nx, ny);
  drawCrop(g, art.bmp, nx, ny, art.crop, 2 / G);
  const d = g.getImageData(0, 0, nx, ny).data, a = new Uint8Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const o = ((ny - 1 - j) * nx + i) * 4, v = (d[o] * 77 + d[o + 1] * 150 + d[o + 2] * 29) >> 8; a[j * nx + i] = (v < art.thr) !== art.inv ? 1 : 0; }
  Sombra.artClean(a, nx, ny); let n = 0; for (let k = 0; k < a.length; k++) n += a[k];
  art.mask = { nx, ny, a }; art.cells = n; return art.mask; }
function drawFront() { ctx.fillStyle = '#16151d'; ctx.fillRect(0, 0, R, R); const [aw, ah] = Sombra.artSize(st.p), s = Math.min((R - 80) / aw, (R - 80) / ah), w = aw * s, h = ah * s, x = (R - w) / 2, y = (R - h) / 2;
  ctx.fillStyle = '#f1ead9'; ctx.fillRect(x, y, w, h); ctx.textAlign = 'center';
  const q = art.mask; if (!q) { ctx.fillStyle = '#6a6578'; ctx.font = '500 22px "IBM Plex Mono",monospace'; ctx.fillText('sem estampa', R / 2, R / 2 + 8); return; }
  const c = document.createElement('canvas'); c.width = q.nx; c.height = q.ny; const g = c.getContext('2d'), im = g.createImageData(q.nx, q.ny);
  for (let j = 0; j < q.ny; j++) for (let i = 0; i < q.nx; i++) { const o = (j * q.nx + i) * 4, on = q.a[(q.ny - 1 - j) * q.nx + i]; im.data[o] = 22; im.data[o + 1] = 21; im.data[o + 2] = 29; im.data[o + 3] = on ? 255 : 0; }
  g.putImageData(im, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(c, x, y, w, h); ctx.fillStyle = '#16151d'; ctx.beginPath(); ctx.arc(R / 2, R / 2, 6.8 * s, 0, 7); ctx.fill(); }
function artChanged() { artMask(); Room.dirty(); $('artThrOut').textContent = art.thr; if (art.bmp) { st.view = 'front'; viewButtons(); } draw(); partsList(); }
function viewButtons() { for (const [id, v] of [['vWall', 'wall'], ['vParts', 'parts'], ['vFront', 'front'], ['vRoom', 'room']]) $(id).setAttribute('aria-pressed', st.view === v);
  const room = st.view === 'room'; $('wall').hidden = room; $('room').hidden = !room; $('roomHint').hidden = !room; $('roomBar').hidden = !room; }
const roomMsg = t => { $('roomMsg').textContent = t; };
async function showRoom() { clearTimeout(timer); if (!st.panels) st.panels = Sombra.buildAll(st.sil, st.p); await Room.show($('room'), st.p, st.panels, art.bmp ? art.mask : null, roomMsg); }
function draw() { if (st.view === 'room') return showRoom(); st.view === 'wall' ? drawWall() : st.view === 'front' ? drawFront() : drawParts(); }

let timer = 0;
function rebuild(now) {
  clearTimeout(timer); st.preview = true; if (st.view === 'wall') drawWall();
  timer = setTimeout(() => { st.panels = Sombra.buildAll(st.sil, st.p); st.preview = false; Room.dirty(); const v = Sombra.score(st.sil, st.panels, st.p);
    $('scoreVal').textContent = Math.round(v * 100) + '%'; $('score').className = 'score ' + (v >= .8 ? 'ok' : 'low');
    draw(); partsList(); }, now ? 0 : 220);
}
function grams(mm3) { return Math.round(mm3 / 1000 * 1.24); }
function partsList() {
  const q = st.panels, p = st.p; let html = '', tot = 0, G = Sombra.G;
  for (const n in q) { const g = grams(q[n].cells * G * G * Sombra.WALL); tot += g; html += `<li>Painel ${n}<span>${q[n].len.toFixed(0)}×${q[n].Pz} mm · ${g} g</span></li>`; }
  const b = grams((2 * (p.W + p.H) * 2 * 23 + p.W * p.H * 2) * 1.05), t = grams(p.W * p.H * 3 * 1.1), c = 1, ph = 4; tot += b + t + c + ph;
  let artLine = ''; if (art.mask) { const [aw, ah] = Sombra.artSize(p), g = grams(aw * ah * Sombra.ART_BASE + art.cells * G * G * (Sombra.ART_TOP - Sombra.ART_BASE)); tot += g; artLine = `<li>Estampa do fundo<span>${aw.toFixed(0)}×${ah.toFixed(0)} mm · ${g} g</span></li>`; }
  html += `<li>Caixa da base<span>${p.W + 7}×${p.H + 7}×25 mm · ${b} g</span></li><li>Tampo<span>${p.W + 7}×${p.H + 7} mm · ${t} g</span></li><li>Portinhola das pilhas<span>85×55 mm · ${ph} g</span></li><li>Haste<span>Ø8 × ${Sombra.postLen(p).toFixed(0)} mm · ${c} g</span></li><li>Tampinha<span>Ø13 mm · 1 g</span></li>${artLine}<li><b>Filamento estimado</b><span>${tot} g</span></li>`;
  const loose = Object.values(q).reduce((s, n) => s + n.loose, 0);
  $('looseNote').textContent = loose ? `Há ${loose} pedaço(s) solto(s), em vermelho na aba Peças. Eles só ficam presos com cola no canto.` : 'Todos os pedaços estão presos na própria peça.'; $('looseNote').className = loose ? 'warn' : '';
  const hug = Conversor.check(st.sil, st.p); $('hugNote').textContent = `Desenho em volta da caixa: ${Math.round(hug * 100)}%. ` + (hug >= .8 ? 'Ótimo: quase não precisa de ligações.' : hug >= .4 ? 'Razoável: podem surgir riscos finos.' : 'Pouco escuro em volta: use a conversão ou aumente a sombra.'); $('hugNote').className = hug >= .4 ? '' : 'warn';
  $('parts').innerHTML = html;
}
function setBox(W, H, D) { Object.assign(st.p, { W, H, D }); $('w').value = W; $('h').value = H; $('d').value = D; labels(); if (art.bmp) artMask(); rebuild(); }
function setShadow(S) { st.p.S = S; $('size').value = S; labels(); rebuild(); }
function labels() {
  const p = st.p; VIEW = Math.max(1200, p.S * 1.3); $('thrOut').textContent = st.thr; $('sizeOut').textContent = (p.S / 10).toFixed(0) + ' cm'; $('wOut').textContent = p.W + ' mm'; $('hOut').textContent = p.H + ' mm'; $('dOut').textContent = p.D + ' mm'; $('brushOut').textContent = $('brush').value + ' mm';
  const e = edgeCm(p), ok = p.S <= maxShadow(p.W, p.H, p.D) * 1.02;
  $('detailNote').textContent = `Na borda da sombra, 1 mm da parede da caixa vira cerca de ${e.toFixed(1).replace('.', ',')} cm. ` + (ok ? 'Boa medida para este tamanho.' : 'Para ter mais detalhe, aumente a caixa ou diminua a sombra.'); $('detailNote').className = ok ? '' : 'warn';
  document.querySelectorAll('[data-shadow]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.shadow === p.S));
  document.querySelectorAll('[data-box]').forEach((b, i) => { const q = BOXES[i]; b.setAttribute('aria-pressed', q[1] === p.W && q[2] === p.H && q[3] === p.D); });
  $('fitOut').textContent = (st.p.fit >= 0 ? '+' : '') + st.p.fit.toFixed(2).replace('.', ',') + ' mm';
  $('ledNote').textContent = `O LED fica a ${Sombra.ledZ(p)} mm da parede, acima da haste impressa.`;
}
function setGray(a) { st.gray = a; st.edit.fill(0); st.undo = []; $('undo').disabled = true; compose(); rebuild(true); }
function loadTree() { const t = Sombra.tree(), g = new Uint8Array(N * N); for (let i = 0; i < N * N; i++) g[i] = t[i] ? 0 : 255; st.inv = false; $('inv').checked = false; st.thr = 128; $('thr').value = 128; st.p.ox = 0; st.p.oy = 40; labels(); setGray(g); }

const fileMsg = (t, bad) => { $('fileMsg').textContent = t; $('fileMsg').className = bad ? 'warn' : ''; };
function decode(src) { return new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; }); }
const asDataUrl = f => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(f); });
async function openImage(f) {
  try { return await createImageBitmap(f); } catch {}
  return decode(await asDataUrl(f));
}
const shadowCrop = { z: 1, x: 0, y: 0 };
function drawCrop(g, bmp, w, h, crop, margin = 0) { const iw = bmp.naturalWidth || bmp.width, ih = bmp.naturalHeight || bmp.height, s = Math.min((w - 2 * margin) / iw, (h - 2 * margin) / ih) * crop.z, dw = iw * s, dh = ih * s;
  g.drawImage(bmp, (w - dw) / 2 + crop.x * dw / 2, (h - dh) / 2 + crop.y * dh / 2, dw, dh); }
function useImage(bmp, auto) {
  st.src = bmp; if (auto) { Object.assign(shadowCrop, { z: 1, x: 0, y: 0 }); $('cropZ').value = 100; $('cropX').value = 0; $('cropY').value = 0; }
  $('cropBox').hidden = false;
  const c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d', { willReadFrequently: true }); g.fillStyle = '#fff'; g.fillRect(0, 0, N, N);
  drawCrop(g, bmp, N, N, shadowCrop);
  const d = g.getImageData(0, 0, N, N).data, a = new Uint8Array(N * N), hist = new Array(256).fill(0);
  for (let i = 0; i < N * N; i++) { const v = (d[i * 4] * 77 + d[i * 4 + 1] * 150 + d[i * 4 + 2] * 29) >> 8; a[i] = v; hist[v]++; }
  let sum = 0, sB = 0, wB = 0, best = 0, T = 128; for (let i = 0; i < 256; i++) sum += i * hist[i];
  if (auto) for (let i = 0; i < 256; i++) { wB += hist[i]; if (!wB) continue; const wF = N * N - wB; if (!wF) break; sB += i * hist[i]; const m = (sB / wB - (sum - sB) / wF) ** 2 * wB * wF; if (m > best) { best = m; T = i; } }
  if (auto) { st.thr = Math.max(10, Math.min(245, T)); $('thr').value = st.thr; st.inv = false; $('inv').checked = false; st.p.ox = st.p.oy = 0; } labels(); setGray(a);
}
async function takeFile(f) {
  if (!f) return; fileMsg('Carregando a imagem…');
  try { convPrev = null; $('convUndo').hidden = true; useImage(await openImage(f), true); pick('view', 'wall'); fileMsg('Imagem carregada: ' + f.name); }
  catch { fileMsg('Não consegui ler esse arquivo. Envie em PNG ou JPG; fotos HEIC do iPhone podem falhar.', true); }
}
let picking = false;
const onPick = e => { const f = e.target.files[0]; if (!f) return; picking = false; takeFile(f); e.target.value = ''; };
$('file').addEventListener('change', onPick); $('file').addEventListener('input', onPick);
$('file').addEventListener('click', () => { picking = true; fileMsg('Escolha a imagem na galeria ou nos arquivos.'); });
window.addEventListener('focus', () => setTimeout(() => { if (picking) { picking = false; fileMsg('Nenhuma imagem chegou. Se a galeria não abriu, use a caixa de colar.', true); } }, 2500));
window.addEventListener('paste', e => { const it = [...(e.clipboardData?.items || [])].find(x => x.type.startsWith('image/')); const f = it ? it.getAsFile() : e.clipboardData?.files?.[0]; e.preventDefault(); $('pasteBox').textContent = ''; if (f) takeFile(f); else fileMsg('Não há imagem copiada. Copie a imagem e tente de novo.', true); });
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => { e.preventDefault(); takeFile(e.dataTransfer.files[0]); });
$('blank').onclick = () => { setGray(new Uint8Array(N * N).fill(255)); pick('tool', 'draw'); };
$('sample').onclick = loadTree;
$('thr').oninput = e => { st.thr = +e.target.value; labels(); compose(); rebuild(); };
$('inv').onchange = e => { st.inv = e.target.checked; compose(); rebuild(); };
$('glue').onchange = e => { st.p.glue = e.target.checked; rebuild(); };
$('frame').onchange = e => { st.p.frame = e.target.checked; rebuild(); };
document.querySelectorAll('[data-shadow]').forEach(b => b.onclick = () => setShadow(+b.dataset.shadow));
document.querySelectorAll('[data-box]').forEach((b, i) => { const q = BOXES[i]; b.textContent = `${q[0]} ${q[1]}×${q[2]}×${q[3]}`; b.onclick = () => { setBox(q[1], q[2], q[3]); setShadow(Math.round(maxShadow(q[1], q[2], q[3]) / 50) * 50 > 1500 ? 1500 : Math.round(maxShadow(q[1], q[2], q[3]) / 50) * 50); }; });
$('fitBox').onclick = () => { const q = BOXES.find(b => maxShadow(b[1], b[2], b[3]) >= st.p.S * .98) || BOXES[3]; setBox(q[1], q[2], q[3]); $('fitMsg').textContent = `Caixa ${q[0].toLowerCase()} escolhida para a sombra de ${Math.round(st.p.S / 10)} cm.`; };
$('size').oninput = e => { st.p.S = +e.target.value; labels(); rebuild(); };
for (const [id, k] of [['w', 'W'], ['h', 'H'], ['d', 'D']]) $(id).oninput = e => { st.p[k] = +e.target.value; labels(); if (art.bmp) artMask(); rebuild(); };
$('brush').oninput = labels;

function pick(kind, v) {
  if (kind === 'tool') { st.tool = v; for (const [id, t] of [['tMove', 'move'], ['tDraw', 'draw'], ['tErase', 'erase']]) $(id).setAttribute('aria-pressed', t === v); $('brushField').hidden = v === 'move'; if (st.view !== 'wall') pick('view', 'wall'); else draw(); }
  if (kind === 'view') { st.view = v; viewButtons(); draw(); }
  if (kind === 'step') { for (const n of [1, 2, 3, 4]) { $('p' + n).hidden = n !== v; $('s' + n).setAttribute('aria-pressed', n === v); } $('p2b').hidden = v !== 2; }
}
$('tMove').onclick = () => pick('tool', 'move'); $('tDraw').onclick = () => pick('tool', 'draw'); $('tErase').onclick = () => pick('tool', 'erase');
$('vWall').onclick = () => pick('view', 'wall'); $('vParts').onclick = () => pick('view', 'parts');
[1, 2, 3, 4].forEach(n => $('s' + n).onclick = () => pick('step', n));
$('vFront').onclick = () => pick('view', 'front');
$('vRoom').onclick = () => pick('view', 'room');
$('rLed').onchange = e => Room.set('on', e.target.checked);
$('rRoom').onchange = e => Room.set('room', e.target.checked);
$('rColor').onchange = e => Room.set('led', e.target.value);
$('rWall').onchange = e => Room.set('wall', e.target.value);
$('cFront').onclick = () => Room.view(0, 1.5, 2.7); $('cSide').onclick = () => Room.view(1.1, 1.45, 1.9); $('cNear').onclick = () => Room.view(.55, 1.4, .55); $('cBed').onclick = () => Room.view(-.5, 1.65, 2.6);
$('artFile').addEventListener('change', async e => { const f = e.target.files[0]; if (!f) return; e.target.value = ''; $('artMsg').textContent = 'Carregando a imagem…'; $('artMsg').className = '';
  try { art.bmp = await openImage(f); Object.assign(art.crop, { z: 1, x: 0, y: 0 }); $('aCropZ').value = 100; $('aCropX').value = 0; $('aCropY').value = 0; $('artClear').hidden = false; $('artCrop').hidden = false; artChanged(); $('artMsg').textContent = 'Estampa carregada: ' + f.name; }
  catch { $('artMsg').textContent = 'Não consegui ler esse arquivo. Envie em PNG ou JPG.'; $('artMsg').className = 'warn'; } });
for (const [id, k, d] of [['aCropZ', 'z', 100], ['aCropX', 'x', 100], ['aCropY', 'y', 100]]) $(id).oninput = e => { art.crop[k] = +e.target.value / d; if (art.bmp) artChanged(); };
for (const [id, k, d] of [['cropZ', 'z', 100], ['cropX', 'x', 100], ['cropY', 'y', 100]]) $(id).oninput = e => { shadowCrop[k] = +e.target.value / d; if (st.src) { convPrev = null; $('convUndo').hidden = true; useImage(st.src, false); } };
$('artThr').oninput = e => { art.thr = +e.target.value; artChanged(); };
$('artInv').onchange = e => { art.inv = e.target.checked; artChanged(); };
$('artClear').onclick = () => { art.bmp = art.mask = null; Room.dirty(); $('artClear').hidden = true; $('artCrop').hidden = true; $('artMsg').textContent = 'Estampa removida.'; draw(); partsList(); };
$('undo').onclick = () => { const u = st.undo.pop(); if (!u) return; st.edit = u; $('undo').disabled = !st.undo.length; compose(); rebuild(true); };

/* toque: mover, pinça para escala, pincel na parede */
const ptrs = new Map(); let last = null, pinch = null;
const toWall = e => { const b = cv.getBoundingClientRect(); return [((e.clientX - b.left) / b.width - .5) * VIEW, (.5 - (e.clientY - b.top) / b.height) * VIEW]; };
function stamp(a, b) { const p = st.p, r = +$('brush').value / 2 / p.S * N, val = st.tool === 'draw' ? 1 : -1;
  const n = Math.max(1, Math.ceil(Math.hypot(a[0] - b[0], a[1] - b[1]) / (p.S / N * Math.max(1, r / 2))));
  for (let k = 0; k <= n; k++) { const X = a[0] + (b[0] - a[0]) * k / n, Y = a[1] + (b[1] - a[1]) * k / n, u = ((X - p.ox) / p.S + .5) * N, v = (.5 - (Y - p.oy) / p.S) * N;
    for (let j = Math.max(0, v - r | 0); j <= Math.min(N - 1, v + r); j++) for (let i = Math.max(0, u - r | 0); i <= Math.min(N - 1, u + r); i++) if ((i - u) ** 2 + (j - v) ** 2 <= r * r) { st.edit[j * N + i] = val; st.sil[j * N + i] = val > 0 ? 255 : 0; } } }
cv.addEventListener('pointerdown', e => { if (st.view !== 'wall') return; cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, toWall(e)); last = toWall(e);
  if (st.tool !== 'move') { st.undo.push(st.edit.slice()); if (st.undo.length > 12) st.undo.shift(); $('undo').disabled = false; st.preview = true; stamp(last, last); drawWall(); }
  if (ptrs.size === 2 && st.tool === 'move') { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), s: st.p.S }; } });
cv.addEventListener('pointermove', e => { if (!ptrs.has(e.pointerId)) return; const q = toWall(e); ptrs.set(e.pointerId, q);
  if (st.tool !== 'move') { stamp(last, q); last = q; st.preview = true; drawWall(); return; }
  if (ptrs.size === 2 && pinch) { const [a, b] = [...ptrs.values()]; st.p.S = Math.max(300, Math.min(1500, pinch.s * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d)) | 0; $('size').value = st.p.S; labels(); }
  else if (ptrs.size === 1) { st.p.ox += q[0] - last[0]; st.p.oy += q[1] - last[1]; last = q; }
  st.preview = true; drawWall(); });
const up = e => { if (!ptrs.delete(e.pointerId)) return; if (ptrs.size < 2) pinch = null; if (!ptrs.size) rebuild(); };
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

let lastPos = null;
$('best').onclick = async () => { const b = $('best'), p = st.p; clearTimeout(timer); b.disabled = true; $('bestUndo').hidden = true; const before = { ox: p.ox, oy: p.oy };
  try { const r = await Sombra.bestPosition(st.sil, p, async (n, max) => { $('bestMsg').textContent = `Testando posições: ${n} de ${max}…`; await new Promise(f => setTimeout(f, 0)); });
    const moved = Math.round(Math.hypot(r.ox - before.ox, r.oy - before.oy) / 10);
    if (r.v > r.start + .002) { p.ox = r.ox; p.oy = r.oy; lastPos = before; $('bestUndo').hidden = false; $('bestMsg').textContent = `Fidelidade subiu de ${Math.round(r.start * 100)}% para ${Math.round(r.v * 100)}%. A imagem moveu ${moved} cm.`; rebuild(true); }
    else { $('bestMsg').textContent = `Esta já é a melhor posição encontrada: ${Math.round(r.start * 100)}%.`; rebuild(true); } }
  catch { $('bestMsg').textContent = 'Não consegui calcular. Tente de novo.'; }
  b.disabled = false; };
$('bestUndo').onclick = () => { if (!lastPos) return; Object.assign(st.p, lastPos); lastPos = null; $('bestUndo').hidden = true; $('bestMsg').textContent = 'Posição anterior restaurada.'; rebuild(true); };
let convMode = 'solida', convPrev = null;
document.querySelectorAll('[data-conv]').forEach(b => b.onclick = () => { convMode = b.dataset.conv; document.querySelectorAll('[data-conv]').forEach(x => x.setAttribute('aria-pressed', x === b)); });
$('convert').onclick = async () => { const b = $('convert'), base = convPrev ? convPrev.gray : st.gray; b.disabled = true; $('convMsg').textContent = 'Convertendo…'; await new Promise(r => setTimeout(r, 30));
  try { const r = Conversor.convert(base, convMode, st.p); if (!convPrev) convPrev = { gray: st.gray, thr: st.thr, inv: st.inv, S: st.p.S, ox: st.p.ox, oy: st.p.oy };
    st.thr = 128; $('thr').value = 128; st.inv = false; $('inv').checked = false; Object.assign(st.p, { S: r.S, ox: r.ox, oy: r.oy, frame: false }); $('frame').checked = false; $('size').value = r.S; labels(); setGray(r.gray);
    $('convUndo').hidden = false; $('convMsg').textContent = `Pronto. Sombra de ${Math.round(r.S / 10)} cm, com a caixa no miolo do desenho.` + (r.hug < .98 ? ' O miolo era estreito, então engrossei a área atrás da caixa.' : ''); }
  catch { $('convMsg').textContent = 'Não consegui converter esta imagem. Tente outro tipo de conversão.'; }
  b.disabled = false; };
$('convUndo').onclick = () => { if (!convPrev) return; const c = convPrev; convPrev = null; st.thr = c.thr; st.inv = c.inv; $('thr').value = c.thr; $('inv').checked = c.inv; Object.assign(st.p, { S: c.S, ox: c.ox, oy: c.oy }); $('size').value = c.S; labels(); setGray(c.gray); $('convUndo').hidden = true; $('convMsg').textContent = 'Imagem original restaurada.'; };
function offerFile(blob, name, msg) { const url = URL.createObjectURL(blob), l = document.createElement('a'); l.href = url; l.download = name; document.body.append(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000); msg.textContent = name + ' baixado.'; msg.className = ''; }
function buildParts() { const p = st.p, list = [];
  st.panels = st.panels || Sombra.buildAll(st.sil, p);
  for (const n in st.panels) list.push({ name: 'painel-' + n, tris: Sombra.panelTris(st.panels[n]) });
  list.push({ name: 'caixa-base', tris: Sombra.boxTris(p) }, { name: 'tampo', tris: Sombra.plateTris(p) }, { name: 'portinhola-pilhas', tris: Sombra.hatchTris(p) }, { name: 'haste', tris: Sombra.postTris(p) }, { name: 'tampinha', tris: Sombra.capTris() });
  if (art.bmp && artMask()) list.push({ name: 'estampa-fundo', tris: Sombra.artTris(art.mask, p) });
  return list; }
function readme() { const p = st.p; return `Ateliê de Sombras\nCaixa de ${p.W} x ${p.H} mm, profundidade total de ${p.D} mm, frente aberta. Sombra de ${Math.round(p.S / 10)} cm. LED a ${Sombra.ledZ(p)} mm da parede.\n\nImprima em filamento preto opaco: 0,2 mm, bico 0,4, sem raft e sem suportes.\nA haste é impressa em pé, com brim.\nOs encaixes ainda precisam ser validados na sua impressora: imprima primeiro a caixa Pequena.\nMonte seguindo o manual no site.\n`; }
async function exportAs(kind) { const msg = $('saveMsg'), btns = [$('saveZip'), $('saveStl'), $('save3mf')]; clearTimeout(timer); btns.forEach(b => b.disabled = true); msg.className = ''; msg.textContent = 'Gerando as peças…';
  await new Promise(r => setTimeout(r, 30));
  try { const parts = buildParts();
    if (kind === 'zip') { const files = parts.map(q => ({ name: q.name + '.stl', data: Sombra.stl(q.tris, q.name) })); files.push({ name: 'LEIA-ME.txt', data: new TextEncoder().encode(readme()) }); offerFile(Sombra.zip(files), 'luminaria-pecas.zip', msg); }
    else if (kind === '3mf') offerFile(Sombra.threeMF(parts), 'luminaria-completa.3mf', msg);
    else offerFile(new Blob([Sombra.stl(Sombra.merge(parts.map(q => q.tris)), 'luminaria')], { type: 'model/stl' }), 'luminaria-completa.stl', msg); }
  catch { msg.textContent = 'Não consegui gerar o arquivo. Tente de novo.'; msg.className = 'warn'; }
  btns.forEach(b => b.disabled = false); }
$('fit').oninput = e => { st.p.fit = +e.target.value / 100; labels(); Room.dirty(); };
$('saveTest').onclick = () => { const msg = $('saveMsg'), parts = Sombra.testParts(st.p), files = parts.map(q => ({ name: q.name + '.stl', data: Sombra.stl(q.tris, q.name) })); files.push({ name: 'LEIA-ME.txt', data: new TextEncoder().encode(`Peça de teste do Ateliê de Sombras\nFolga usada: ${st.p.fit.toFixed(2).replace('.', ',')} mm\n\nConfira: painel na fenda, tampo travando nas presilhas, haste deslizando no anel e interruptor na janela.\nSe estiver justo, aumente a folga. Se estiver solto, diminua.\n`) }); offerFile(Sombra.zip(files), 'teste-encaixes.zip', msg); };
$('save3mf').onclick = () => exportAs('3mf'); $('saveZip').onclick = () => exportAs('zip'); $('saveStl').onclick = () => exportAs('stl');

$('openManual').onclick = $('openManual2').onclick = () => Manual.open(st.p);
/* projetos salvos neste aparelho; o arquivo leva o projeto para outro aparelho */
const KEY = 'atelieProjetos';
const readAll = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const writeAll = l => { try { localStorage.setItem(KEY, JSON.stringify(l)); return true; } catch { return false; } };
function grayUrl() { const c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), d = g.createImageData(N, N); for (let i = 0; i < N * N; i++) { const v = st.sil[i] > 127 ? 0 : 255; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255; } g.putImageData(d, 0, 0); return c.toDataURL('image/png'); }
function artUrl() { if (!art.bmp) return null; const iw = art.bmp.naturalWidth || art.bmp.width, ih = art.bmp.naturalHeight || art.bmp.height, k = Math.min(1, 900 / Math.max(iw, ih)), c = document.createElement('canvas'); c.width = iw * k; c.height = ih * k; c.getContext('2d').drawImage(art.bmp, 0, 0, c.width, c.height); return c.toDataURL('image/png'); }
const snapshot = name => ({ name, date: new Date().toISOString(), p: { ...st.p }, sil: grayUrl(), art: artUrl(), artThr: art.thr, artInv: art.inv, artCrop: { ...art.crop } });
async function openProject(q) { const i = await decode(q.sil), c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(i, 0, 0, N, N); const d = g.getImageData(0, 0, N, N).data, a = new Uint8Array(N * N); for (let k = 0; k < N * N; k++) a[k] = d[k * 4];
  Object.assign(st.p, q.p); st.src = null; $('cropBox').hidden = true; convPrev = null; $('convUndo').hidden = true; st.thr = 128; $('thr').value = 128; st.inv = false; $('inv').checked = false;
  $('w').value = st.p.W; $('h').value = st.p.H; $('d').value = st.p.D; $('size').value = st.p.S; $('frame').checked = !!st.p.frame; $('glue').checked = !!st.p.glue; $('fit').value = Math.round((st.p.fit || 0) * 100);
  art.bmp = q.art ? await decode(q.art) : null; art.mask = null; art.thr = q.artThr || 128; art.inv = !!q.artInv; Object.assign(art.crop, q.artCrop || { z: 1, x: 0, y: 0 }); $('artThr').value = art.thr; $('artInv').checked = art.inv; $('artClear').hidden = !art.bmp; $('artCrop').hidden = !art.bmp; if (art.bmp) artMask();
  Room.dirty(); labels(); setGray(a); $('projName').value = q.name; pick('view', 'wall'); }
function listProjects() { const l = readAll(), box = $('projList'); box.textContent = ''; $('projEmpty').hidden = !!l.length;
  l.forEach((q, i) => { const r = document.createElement('div'); r.className = 'proj'; const t = document.createElement('span'); t.textContent = q.name; const o = document.createElement('button'); o.className = 'btn slim'; o.textContent = 'Abrir'; o.onclick = async () => { await openProject(q); $('projMsg').textContent = `Projeto ${q.name} aberto.`; };
    const x = document.createElement('button'); x.className = 'btn slim'; x.textContent = 'Excluir'; x.onclick = () => { if (x.dataset.sure) { const m = readAll(); m.splice(i, 1); writeAll(m); listProjects(); $('projMsg').textContent = `Projeto ${q.name} excluído.`; } else { x.dataset.sure = 1; x.textContent = 'Confirmar'; } };
    r.append(t, o, x); box.append(r); }); }
$('projSave').onclick = () => { const name = $('projName').value.trim() || 'Sem nome', l = readAll(), q = snapshot(name), at = l.findIndex(x => x.name === name); if (at >= 0) l[at] = q; else l.unshift(q); const ok = writeAll(l); $('projMsg').textContent = ok ? `Projeto ${name} salvo neste aparelho.` : 'Sem espaço neste aparelho. Use Salvar em arquivo.'; $('projMsg').className = ok ? '' : 'warn'; listProjects(); };
$('projExport').onclick = () => { const name = $('projName').value.trim() || 'luminaria'; offerFile(new Blob([JSON.stringify(snapshot(name))], { type: 'application/json' }), name.replace(/[^a-z0-9-]+/gi, '-') + '.sombra.json', $('projMsg')); };
$('projImport').addEventListener('change', async e => { const f = e.target.files[0]; if (!f) return; e.target.value = ''; try { const q = JSON.parse(await f.text()); if (!q.sil || !q.p) throw 0; await openProject(q); $('projMsg').textContent = `Projeto ${q.name} aberto.`; $('projMsg').className = ''; } catch { $('projMsg').textContent = 'Este arquivo não é um projeto do ateliê.'; $('projMsg').className = 'warn'; } });
labels(); loadTree(); listProjects();
if (location.hash === '#manual') Manual.open(st.p);

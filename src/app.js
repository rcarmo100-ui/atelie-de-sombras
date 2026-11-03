const $ = id => document.getElementById(id), N = Sombra.N, VIEW = 1000; // parede visível: 1 m
const st = { gray: null, edit: new Int8Array(N * N), sil: new Uint8Array(N * N), panels: null, tool: 'move', view: 'wall', undo: [], busy: 0,
  p: { W: 90, H: 120, D: 50, S: 700, ox: 0, oy: 0 }, thr: 128, inv: false, preview: false };
const cv = $('wall'), ctx = cv.getContext('2d', { willReadFrequently: true }), R = cv.width, img = ctx.createImageData(R, R);

function compose() {
  const { gray, edit, sil, thr, inv } = st;
  for (let i = 0; i < N * N; i++) { let d = gray[i] < thr; if (inv) d = !d; sil[i] = edit[i] > 0 ? 255 : edit[i] < 0 ? 0 : d ? 255 : 0; }
}
function drawWall() {
  const { p, panels, sil, preview } = st, d = img.data, L = Sombra.ledZ(p), mm = VIEW / R;
  for (let j = 0, o = 0; j < R; j++) { const Y = (R / 2 - j - .5) * mm;
    for (let i = 0; i < R; i++, o += 4) { const X = (i - R / 2 + .5) * mm; let dark;
      if (preview || !panels) { const u = ((X - p.ox) / p.S + .5) * (N - 1) + .5 | 0, v = ((.5 - (Y - p.oy) / p.S)) * (N - 1) + .5 | 0;
        dark = u >= 0 && v >= 0 && u < N && v < N && sil[v * N + u] > 127; }
      else dark = Sombra.blocked(panels, p, X, Y);
      const r2 = (X * X + Y * Y) / (260 * 260), lux = dark ? 0 : 1 / (1 + r2 * .55);
      d[o] = 14 + 232 * lux; d[o + 1] = 13 + 200 * lux; d[o + 2] = 18 + 146 * lux; d[o + 3] = 255; } }
  ctx.putImageData(img, 0, 0);
  const w = p.W / mm, h = p.H / mm, x = R / 2 - w / 2, y = R / 2 - h / 2;
  ctx.fillStyle = '#26242f'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = '#6a6578'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#a9a4b4'; ctx.font = '500 20px "IBM Plex Mono",monospace'; ctx.textAlign = 'center';
  ctx.fillText(`${p.W}×${p.H}`, R / 2, R / 2 + 7);
  if (st.tool === 'move') { const s = p.S / mm; ctx.setLineDash([8, 8]); ctx.strokeStyle = 'rgba(255,190,107,.55)'; ctx.strokeRect(R / 2 + (p.ox - p.S / 2) / mm, R / 2 - (p.oy + p.S / 2) / mm, s, s); ctx.setLineDash([]); }
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
    for (let j = 0; j < q.ny; j++) for (let i = 0; i < q.nx; i++) { const o = (j * q.nx + i) * 4, on = q.a[(q.ny - 1 - j) * q.nx + i]; im.data[o] = 255; im.data[o + 1] = 190; im.data[o + 2] = 107; im.data[o + 3] = on ? 255 : 0; }
    g.putImageData(im, 0, 0);
    ctx.fillStyle = '#a9a4b4'; ctx.font = '500 18px "IBM Plex Mono",monospace'; ctx.fillText('painel ' + n, 30, y + 14); y += 24;
    ctx.imageSmoothingEnabled = true; ctx.drawImage(c, 30, y, q.len * s, q.Pz * s); y += q.Pz * s + 16; }
}
function draw() { st.view === 'wall' ? drawWall() : drawParts(); }

let timer = 0;
function rebuild(now) {
  clearTimeout(timer); st.preview = true; if (st.view === 'wall') drawWall();
  timer = setTimeout(() => { st.panels = Sombra.buildAll(st.sil, st.p); st.preview = false; const v = Sombra.score(st.sil, st.panels, st.p);
    $('scoreVal').textContent = Math.round(v * 100) + '%'; $('score').className = 'score ' + (v >= .8 ? 'ok' : 'low');
    draw(); partsList(); }, now ? 0 : 220);
}
function grams(mm3) { return Math.round(mm3 / 1000 * 1.24); }
function partsList() {
  const q = st.panels, p = st.p; let html = '', tot = 0, G = Sombra.G;
  for (const n in q) { const g = grams(q[n].cells * G * G * Sombra.WALL); tot += g; html += `<li>Painel ${n}<span>${q[n].len.toFixed(0)}×${q[n].Pz} mm · ${g} g</span></li>`; }
  const b = grams(p.W * p.H * 3 * 1.15), c = grams(p.W * p.H * 3 * 1.3); tot += b + c;
  html += `<li>Base<span>${p.W}×${p.H} mm · ${b} g</span></li><li>Tampa com torre do LED<span>${p.W}×${p.H} mm · ${c} g</span></li><li><b>Filamento estimado</b><span>${tot} g</span></li>`;
  $('parts').innerHTML = html;
}
function labels() {
  const p = st.p; $('thrOut').textContent = st.thr; $('sizeOut').textContent = (p.S / 10).toFixed(0) + ' cm'; $('wOut').textContent = p.W + ' mm'; $('hOut').textContent = p.H + ' mm'; $('dOut').textContent = p.D + ' mm'; $('brushOut').textContent = $('brush').value + ' mm';
  $('ledNote').textContent = `O LED fica a ${Sombra.ledZ(p)} mm da parede, no centro da caixa.`;
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
function useImage(bmp, auto) {
  const iw = bmp.naturalWidth || bmp.width, ih = bmp.naturalHeight || bmp.height;
  const c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d', { willReadFrequently: true }); g.fillStyle = '#fff'; g.fillRect(0, 0, N, N);
  const s = Math.min(N / iw, N / ih); g.drawImage(bmp, (N - iw * s) / 2, (N - ih * s) / 2, iw * s, ih * s);
  const d = g.getImageData(0, 0, N, N).data, a = new Uint8Array(N * N), hist = new Array(256).fill(0);
  for (let i = 0; i < N * N; i++) { const v = (d[i * 4] * 77 + d[i * 4 + 1] * 150 + d[i * 4 + 2] * 29) >> 8; a[i] = v; hist[v]++; }
  let sum = 0, sB = 0, wB = 0, best = 0, T = 128; for (let i = 0; i < 256; i++) sum += i * hist[i];
  if (auto) for (let i = 0; i < 256; i++) { wB += hist[i]; if (!wB) continue; const wF = N * N - wB; if (!wF) break; sB += i * hist[i]; const m = (sB / wB - (sum - sB) / wF) ** 2 * wB * wF; if (m > best) { best = m; T = i; } }
  st.thr = Math.max(10, Math.min(245, T)); $('thr').value = st.thr; st.inv = false; $('inv').checked = false; st.p.ox = st.p.oy = 0; labels(); setGray(a);
}
async function takeFile(f) {
  if (!f) return; fileMsg('Carregando a imagem…');
  try { useImage(await openImage(f), true); pick('view', 'wall'); fileMsg('Imagem carregada: ' + f.name); }
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
$('size').oninput = e => { st.p.S = +e.target.value; labels(); rebuild(); };
for (const [id, k] of [['w', 'W'], ['h', 'H'], ['d', 'D']]) $(id).oninput = e => { st.p[k] = +e.target.value; labels(); rebuild(); };
$('brush').oninput = labels;

function pick(kind, v) {
  if (kind === 'tool') { st.tool = v; for (const [id, t] of [['tMove', 'move'], ['tDraw', 'draw'], ['tErase', 'erase']]) $(id).setAttribute('aria-pressed', t === v); $('brushField').hidden = v === 'move'; if (st.view !== 'wall') pick('view', 'wall'); else draw(); }
  if (kind === 'view') { st.view = v; $('vWall').setAttribute('aria-pressed', v === 'wall'); $('vParts').setAttribute('aria-pressed', v === 'parts'); draw(); }
  if (kind === 'step') for (const n of [1, 2, 3]) { $('p' + n).hidden = n !== v; $('s' + n).setAttribute('aria-pressed', n === v); }
}
$('tMove').onclick = () => pick('tool', 'move'); $('tDraw').onclick = () => pick('tool', 'draw'); $('tErase').onclick = () => pick('tool', 'erase');
$('vWall').onclick = () => pick('view', 'wall'); $('vParts').onclick = () => pick('view', 'parts');
[1, 2, 3].forEach(n => $('s' + n).onclick = () => pick('step', n));
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
  if (ptrs.size === 2 && pinch) { const [a, b] = [...ptrs.values()]; st.p.S = Math.max(300, Math.min(1100, pinch.s * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d)) | 0; $('size').value = st.p.S; labels(); }
  else if (ptrs.size === 1) { st.p.ox += q[0] - last[0]; st.p.oy += q[1] - last[1]; last = q; }
  st.preview = true; drawWall(); });
const up = e => { if (!ptrs.delete(e.pointerId)) return; if (ptrs.size < 2) pinch = null; if (!ptrs.size) rebuild(); };
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

$('save').onclick = async () => { const msg = $('saveMsg'), btn = $('save'); clearTimeout(timer); btn.disabled = true; msg.textContent = 'Gerando as peças…';
  await new Promise(r => setTimeout(r, 30));
  st.panels = st.panels || Sombra.buildAll(st.sil, st.p);
  const p = st.p, files = []; for (const n in st.panels) files.push({ name: `painel-${n}.stl`, data: Sombra.stl(Sombra.panelTris(st.panels[n]), n) });
  files.push({ name: 'base.stl', data: Sombra.stl(Sombra.baseTris(p), 'base') }, { name: 'tampa.stl', data: Sombra.stl(Sombra.capTris(p), 'tampa') });
  const txt = `Ateliê de Sombras\nCaixa ${p.W} x ${p.H} x ${p.D} mm. Sombra de ${Math.round(p.S / 10)} cm. LED a ${Sombra.ledZ(p)} mm da parede.\n\nImprima tudo deitado, sem suportes, em filamento preto opaco: 0,2 mm, bico 0,4, sem raft.\nMonte os paineis em volta da aba da base. Faixa estreita junto da base; olhando de fora, com a frente para cima, o furinho da faixa larga fica a esquerda.\nCole os quatro cantos. Fixe o LED na torre da tampa, virado para a parede, com resistor de 10 ohm e 1 W em serie.\nO cabo sai pelo recorte do painel inferior.\n`;
  files.push({ name: 'LEIA-ME.txt', data: new TextEncoder().encode(txt) });
  const blob = Sombra.zip(files);
  try { const u = URL.createObjectURL(blob), l = document.createElement('a'); l.href = u; l.download = 'luminaria-de-sombra.zip'; document.body.append(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000); msg.textContent = 'ZIP baixado no seu aparelho.'; msg.className = ''; }
  catch (err) { msg.textContent = err && err.code === 'declined' ? 'Download cancelado.' : 'O download não foi concluído. Tente de novo.'; msg.className = err && err.code === 'declined' ? '' : 'warn'; }
  btn.disabled = false; };

labels(); loadTree();

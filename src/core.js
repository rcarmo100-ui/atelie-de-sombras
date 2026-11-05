
/* Geometria da luminária: tudo em mm. Parede em z=0, LED em (0,0,L) apontando para a parede. */
const Sombra = (() => {
  const N = 768, G = 0.2;           // resolução da silhueta; grade dos painéis (mm)
  const WALL = 1.6, BASE = 28, RAIL = 4, MINR = 2; // MINR*2+1 células = 1 mm
  const earcutFn = (typeof earcut !== 'undefined') ? earcut : (typeof require !== 'undefined' ? require('earcut') : null);

  const ledZ = p => p.D - 2;
  const fit = p => p.fit || 0;                        // folga extra dos encaixes, em mm
  const FL = 3.5, POST_OD = 8, GAP = 13;           // borda da caixa, haste e vão de luz entre haste e LED
  const postLen = p => ledZ(p) - GAP - BASE + 14;     // 14 mm entram no anel e na caixa, sobrando ajuste
  /* cada painel tem fendas próprias: só encaixa no lugar e no sentido certos */
  const TABS = { superior: [-.3, .2], inferior: [-.3, .1], direito: [-.3, .22], esquerdo: [-.3, .08] }, TAB_W = 12;

  /* morfologia separável com janela quadrada */
  function dilate(a, nx, ny, r) {
    const b = new Uint8Array(a.length), c = new Uint8Array(a.length);
    for (let j = 0; j < ny; j++) { let s = 0, o = j * nx;
      for (let i = 0; i < nx; i++) { if (i + r < nx) s += a[o + i + r]; else if (0) s; if (i - r - 1 >= 0) s -= a[o + i - r - 1]; if (i === 0) { s = 0; for (let k = 0; k <= r && k < nx; k++) s += a[o + k]; } b[o + i] = s > 0 ? 1 : 0; } }
    for (let i = 0; i < nx; i++) { let s = 0;
      for (let j = 0; j < ny; j++) { if (j === 0) { s = 0; for (let k = 0; k <= r && k < ny; k++) s += b[k * nx + i]; } else { if (j + r < ny) s += b[(j + r) * nx + i]; if (j - r - 1 >= 0) s -= b[(j - r - 1) * nx + i]; } c[j * nx + i] = s > 0 ? 1 : 0; } }
    return c;
  }
  const invert = a => { const b = new Uint8Array(a.length); for (let i = 0; i < a.length; i++) b[i] = a[i] ? 0 : 1; return b; };
  const erode = (a, nx, ny, r) => invert(dilate(invert(a), nx, ny, r));

  function label(a, nx, ny, val) { // componentes de células == val (4-vizinhos)
    const lab = new Int32Array(a.length).fill(-1), sizes = [], st = new Int32Array(a.length);
    for (let s = 0; s < a.length; s++) { if (a[s] !== val || lab[s] >= 0) continue;
      const id = sizes.length; let n = 0, sp = 0; st[sp++] = s; lab[s] = id;
      while (sp) { const c = st[--sp]; n++; const i = c % nx;
        if (i > 0 && a[c - 1] === val && lab[c - 1] < 0) { lab[c - 1] = id; st[sp++] = c - 1; }
        if (i < nx - 1 && a[c + 1] === val && lab[c + 1] < 0) { lab[c + 1] = id; st[sp++] = c + 1; }
        if (c >= nx && a[c - nx] === val && lab[c - nx] < 0) { lab[c - nx] = id; st[sp++] = c - nx; }
        if (c < a.length - nx && a[c + nx] === val && lab[c + nx] < 0) { lab[c + nx] = id; st[sp++] = c + nx; } }
      sizes.push(n); }
    return { lab, sizes };
  }

  /* liga cada ilha à moldura pelo caminho que menos aparece na parede: perto da base,
     1 mm da peça vira pouco na sombra; perto da borda livre, vira centímetros */
  function connect(a, nx, ny, anchored, rowCost) {
    const { lab, sizes } = label(a, nx, ny, 1);
    if (sizes.length <= 1) return a;
    const fixed = new Set([lab[0]]);        // a célula (0,0) está no trilho da base
    if (anchored) for (const k of anchored) fixed.add(lab[k]);
    const dist = new Float64Array(a.length).fill(1e30), par = new Int32Array(a.length).fill(-1), done = new Uint8Array(a.length), path = new Uint8Array(a.length);
    const heap = [], push = (d, c) => { heap.push([d, c]); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const t = heap[0], l = heap.pop(); if (heap.length) { heap[0] = l; let i = 0; for (;;) { let m = i; const x = 2 * i + 1, y = x + 1; if (x < heap.length && heap[x][0] < heap[m][0]) m = x; if (y < heap.length && heap[y][0] < heap[m][0]) m = y; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return t; };
    for (let c = 0; c < a.length; c++) if (lab[c] >= 0 && fixed.has(lab[c])) { dist[c] = 0; push(0, c); }
    const seen = new Set(fixed);
    while (heap.length) { const [d, c] = pop(); if (done[c] || d > dist[c]) continue; done[c] = 1; const i = c % nx, j = (c - i) / nx;
      if (a[c] && !seen.has(lab[c])) { const id = lab[c]; seen.add(id);
        for (let k = c; k >= 0 && par[k] >= 0 && !a[k] || k === c; k = par[k]) { if (!a[k]) path[k] = 1; if (par[k] < 0) break; }
        for (let m = 0; m < a.length; m++) if (lab[m] === id) { dist[m] = 0; done[m] = 0; par[m] = -1; push(0, m); }
        continue; }
      for (const n of [i > 0 ? c - 1 : -1, i < nx - 1 ? c + 1 : -1, j > 0 ? c - nx : -1, j < ny - 1 ? c + nx : -1]) {
        if (n < 0 || done[n]) continue; const col = n % nx, edge = col < 5 || col >= nx - 5 ? .12 : 1;   // pontas do painel: encostam na peça vizinha
        const w = a[n] ? 0 : (rowCost ? rowCost[(n - col) / nx] : 1) * edge, v = d + w;
        if (v < dist[n]) { dist[n] = v; par[n] = c; push(v, n); } } }
    const th = dilate(path, nx, ny, 1), b = a.slice();
    for (let k = 0; k < a.length; k++) if (th[k]) b[k] = 1;
    return b;
  }

  /* alvo na parede: com moldura, tudo fora do círculo é sombra */
  function maskAt(sil, X, Y, p) {
    const fx = (X - p.ox) / p.S, fy = (Y - p.oy) / p.S;
    if (p.frame && fx * fx + fy * fy > .2475) return 255;
    const u = (fx + .5) * (N - 1), v = (.5 - fy) * (N - 1);
    if (u < 0 || v < 0 || u > N - 1 || v > N - 1) return 0;
    return sil[(v + .5 | 0) * N + (u + .5 | 0)];
  }

  /* sinal da coordenada: u cresce para a direita de quem olha de fora, com a borda livre para cima */
  const SIDES = {
    superior: { axis: 'y', s: 1, dir: -1 }, inferior: { axis: 'y', s: -1, dir: 1 },
    direito: { axis: 'x', s: 1, dir: 1 }, esquerdo: { axis: 'x', s: -1, dir: -1 } };

  function buildPanel(name, sil, p) {
    const def = SIDES[name], L = ledZ(p), Pz = p.D - BASE;
    const len = def.axis === 'y' ? p.W : p.H - 2 * WALL;
    const c = (def.axis === 'y' ? p.H : p.W) / 2 - WALL / 2;
    const nx = Math.round(len / G) + 1, ny = Math.round(Pz / G) + 1;
    let a = new Uint8Array(nx * ny), cost = new Float32Array(nx);
    const wall = (u, t) => { const v = u * def.dir; return def.axis === 'y' ? [v * t, def.s * c * t] : [def.s * c * t, v * t]; };
    for (let j = 0; j < ny; j++) { const w = j * G, z = BASE + w;
      const dt = z < L ? L / ((L - z) * (L - z)) * G : 0;
      for (let i = 0; i < nx; i++) { const u = -len / 2 + i * G, o = j * nx + i;
        if (w < RAIL) { a[o] = 1; continue; }
        if (z >= L) { if (p.frame) a[o] = 1; continue; }
        const t = L / (L - z), P = wall(u, t), on = maskAt(sil, P[0], P[1], p) > 127;
        if (on) a[o] = 1; else cost[i] += Math.min(dt, 3); } }
    /* finos demais para o bico: engrossa; frestas estreitas: fecha */
    const opened = dilate(erode(a, nx, ny, MINR), nx, ny, MINR); const thin = new Uint8Array(a.length);
    for (let k = 0; k < a.length; k++) thin[k] = a[k] && !opened[k] ? 1 : 0;
    const th = dilate(thin, nx, ny, 1); for (let k = 0; k < a.length; k++) if (th[k]) a[k] = 1;
    a = erode(dilate(a, nx, ny, 1), nx, ny, 1);
    /* frente aberta. Com moldura, a faixa escura precisa de duas colunas, nas partes já escuras do desenho */
    const ribs = [];
    if (p.frame) { const rw = Math.round(1 / G);
      for (const [lo, hi] of [[rw, nx >> 1], [nx >> 1, nx - 1 - rw]]) {
        let best = lo, bc = 1e12;
        for (let i = lo; i < hi; i++) { let s = 0; for (let k = -rw; k <= rw; k++) s += cost[i + k]; if (s < bc) { bc = s; best = i; } }
        ribs.push(best);
        for (let j = 0; j < ny; j++) for (let k = -rw; k <= rw; k++) a[j * nx + best + k] = 1; } }
    /* remove farelos e furinhos */
    let r = label(a, nx, ny, 1); const main = r.lab[0], minA = 1.5 / (G * G);
    for (let k = 0; k < a.length; k++) if (a[k] && r.lab[k] !== main && r.sizes[r.lab[k]] < minA) a[k] = 0;
    r = label(a, nx, ny, 0);
    for (let k = 0; k < a.length; k++) if (!a[k] && r.sizes[r.lab[k]] < 1 / (G * G)) a[k] = 1;
    return { name, def, nx, ny, a, len, Pz, c, ribs };
  }

  /* peças que se tocam no canto da caixa colam uma na outra e não precisam de ligação */
  const RING = ['superior', 'esquerdo', 'inferior', 'direito'], MIN_GLUE = .8;
  function buildAll(sil, p) {
    const q = RING.map(n => buildPanel(n, sil, p));
    for (const pn of q) pn.lab = label(pn.a, pn.nx, pn.ny, 1).lab;
    const off = []; let total = 0; for (const pn of q) { off.push(total); let m = 0; for (let k = 0; k < pn.lab.length; k++) if (pn.lab[k] > m) m = pn.lab[k]; total += m + 2; }
    const par = Array.from({ length: total }, (_, i) => i), find = x => { while (par[x] !== x) x = par[x] = par[par[x]]; return x; };
    for (let n = 0; n < 4; n++) { const A = q[n], B = q[(n + 1) % 4], count = new Map(), col = 2;
      for (let j = 0; j < A.ny; j++) { const ia = j * A.nx + A.nx - 1 - col, ib = j * B.nx + col; if (A.a[ia] && B.a[ib]) { const k = (off[n] + A.lab[ia]) + ':' + (off[(n + 1) % 4] + B.lab[ib]); count.set(k, (count.get(k) || 0) + 1); } }
      for (const [k, v] of count) if (v * G >= MIN_GLUE) { const [x, y] = k.split(':').map(Number); par[find(x)] = find(y); } }
    const rootSet = new Set(q.map((pn, n) => find(off[n] + pn.lab[0])));
    const L = ledZ(p), rowCost = new Float32Array(q[0].ny);
    for (let j = 0; j < rowCost.length; j++) { const z = BASE + j * G, t = z < L - .5 ? L / (L - z) : L / .5; rowCost[j] = t * t; }
    const o = {};
    q.forEach((pn, n) => { const anchored = [], seen = new Set();
      for (let k = 0; k < pn.a.length; k++) { const l = pn.lab[k]; if (l >= 0 && !seen.has(l)) { seen.add(l); if (rootSet.has(find(off[n] + l))) anchored.push(k); } }
      pn.a = connect(pn.a, pn.nx, pn.ny, p.glue ? anchored : null, rowCost); delete pn.lab;
      const fin = label(pn.a, pn.nx, pn.ny, 1); pn.loose = fin.sizes.length - 1; pn.parts = fin.lab; pn.main = fin.lab[0];
      for (let j = 0; j < pn.ny; j++) for (let i = 0; i < pn.nx; i++) { for (let d = 0; d < RING.indexOf(pn.name) + 1; d++) { const du = i * G - 7 - d * 4, dw = j * G - RAIL / 2; if (du * du + dw * dw < 1) pn.a[j * pn.nx + i] = 0; } }
      let cells = 0; for (let k = 0; k < pn.a.length; k++) cells += pn.a[k]; pn.cells = cells; o[pn.name] = pn; });
    return o;
  }

  /* traça um raio do LED até o ponto (X,Y) da parede. true = sombra */
  function blocked(panels, p, X, Y) {
    const L = ledZ(p), A = p.W / 2, B = p.H / 2, FA = A + FL, FB = B + FL, ax = Math.abs(X) + 1e-9, ay = Math.abs(Y) + 1e-9;
    const fb = 1 - BASE / L; // fração do raio ao cruzar o plano da base
    if (ax * fb < FA && ay * fb < FB) return true;
    for (const inset of [WALL, WALL / 2, 0]) {
      const fx = (A - inset) / ax, fy = (B - inset) / ay, f = Math.min(fx, fy), z = L * (1 - f);
      if (z >= L || z < 0) continue;
      let pn, u;
      if (fx < fy) { pn = X > 0 ? panels.direito : panels.esquerdo; u = Y * f * pn.def.dir; }
      else { pn = Y > 0 ? panels.superior : panels.inferior; u = X * f * pn.def.dir; }
      const i = Math.round((u + pn.len / 2) / G), j = Math.round((z - BASE) / G);
      if (i < 0 || i >= pn.nx || j < 0) continue;
      if (j < pn.ny && pn.a[j * pn.nx + i]) return true; }
    return false;
  }

  /* fidelidade: sombra pedida × sombra real, dentro da área da imagem.
     O que fica atrás da caixa conta: luz escondida ali é detalhe perdido. */
  function score(sil, panels, p) {
    let inter = 0, uni = 0; const step = 8;
    for (let j = 0; j < N; j += step) for (let i = 0; i < N; i += step) {
      const fx = i / (N - 1) - .5, fy = .5 - j / (N - 1);
      if (p.frame && fx * fx + fy * fy > .2475) continue;
      const X = fx * p.S + p.ox, Y = fy * p.S + p.oy, a = sil[j * N + i] > 127, b = blocked(panels, p, X, Y);
      if (a || b) { uni++; if (a && b) inter++; } }
    return uni ? inter / uni : 1;
  }

  /* procura a posição da imagem com maior fidelidade; o tamanho não muda */
  async function bestPosition(sil, p, onStep) {
    const lim = p.S * .3, MAX = 18; let evals = 0;
    const clamp = v => Math.max(-lim, Math.min(lim, v));
    const full = async (ox, oy) => { const q = { ...p, ox, oy }, v = score(sil, buildAll(sil, q), q); evals++; if (onStep) await onStep(evals, MAX); return v; };
    /* triagem rápida: a caixa deve cair sobre o escuro, cobrindo pouca luz */
    const quick = (ox, oy) => { let dark = 0, n = 0;
      for (let y = -1; y <= 1; y += .25) for (let x = -1; x <= 1; x += .25) {
        const u = ((x * p.W / 2 - ox) / p.S + .5) * (N - 1) + .5 | 0, v = (.5 - (y * p.H / 2 - oy) / p.S) * (N - 1) + .5 | 0;
        n++; if (u < 0 || v < 0 || u >= N || v >= N) dark += p.frame ? 1 : 0; else if (sil[v * N + u] > 127) dark++; }
      return dark / n; };
    const cand = [];
    for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) { const ox = i * lim / 3, oy = j * lim / 3; cand.push({ ox, oy, q: quick(ox, oy) - Math.hypot(ox, oy) / p.S * .15 }); }
    cand.sort((a, b) => b.q - a.q);
    let best = { ox: p.ox, oy: p.oy, v: await full(p.ox, p.oy) }; const start = best.v;
    const seen = new Set([Math.round(p.ox) + ',' + Math.round(p.oy)]);
    const tryAt = async (ox, oy) => { ox = clamp(ox); oy = clamp(oy); const k = Math.round(ox) + ',' + Math.round(oy); if (seen.has(k) || evals >= MAX) return; seen.add(k); const v = await full(ox, oy); if (v > best.v) best = { ox, oy, v }; };
    for (const c of cand.slice(0, 6)) await tryAt(c.ox, c.oy);
    for (let s = p.S / 16; s >= p.S / 64 && evals < MAX; s /= 2) { const { ox, oy } = best;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) await tryAt(ox + dx * s, oy + dy * s); }
    return { ...best, start };
  }

  /* contornos por marching squares; sólido sempre à esquerda do traço */
  function contours(pn) {
    const { nx, ny, a } = pn, W = nx + 2, H = ny + 2, f = new Float32Array(W * H);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { let s = 0, n = 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const x = i + di - 1, y = j + dj - 1, wt = (di ? 1 : 2) * (dj ? 1 : 2);
        n += wt; if (x >= 0 && y >= 0 && x < nx && y < ny && a[y * nx + x]) s += wt; }
      f[j * W + i] = s / n; }
    const next = new Map(), iso = .5;
    const hid = (i, j) => (j * W + i) * 2, vid = (i, j) => (j * W + i) * 2 + 1;
    const vert = id => { const v = id & 1, c = id >> 1, i = c % W, j = (c - i) / W;
      const f0 = f[c], f1 = v ? f[c + W] : f[c + 1], t = Math.max(.02, Math.min(.98, (iso - f0) / (f1 - f0)));
      return [ (i - 1 + (v ? 0 : t)) * G, (j - 1 + (v ? t : 0)) * G ]; };
    for (let j = 0; j < H - 1; j++) for (let i = 0; i < W - 1; i++) {
      const c = [f[j * W + i], f[j * W + i + 1], f[(j + 1) * W + i + 1], f[(j + 1) * W + i]];
      const ins = c.map(v => v >= iso), k = ins.filter(Boolean).length; if (k === 0 || k === 4) continue;
      const e = [hid(i, j), vid(i + 1, j), hid(i, j + 1), vid(i, j)], enter = [], leave = [];
      for (let q = 0; q < 4; q++) { const r = (q + 1) % 4; if (!ins[q] && ins[r]) enter.push(e[q]); if (ins[q] && !ins[r]) leave.push(e[q]); }
      if (enter.length === 1) next.set(leave[0], enter[0]);
      else { const mid = (c[0] + c[1] + c[2] + c[3]) / 4 >= iso;
        // percorre os cantos: cada run é (enter[q], leave[q]) na ordem do ciclo
        let en = enter.slice(), lv = leave.slice();
        const pos = id => e.indexOf(id); en.sort((x, y) => pos(x) - pos(y));
        const pair = en.map(x => { for (let s = 1; s < 4; s++) { const y = e[(pos(x) + s) % 4]; if (lv.includes(y)) return y; } });
        if (mid) { next.set(pair[0], en[1]); next.set(pair[1], en[0]); } else { next.set(pair[0], en[0]); next.set(pair[1], en[1]); } } }
    const loops = [];
    while (next.size) { const s = next.keys().next().value; const ring = []; let c = s;
      do { ring.push(vert(c)); const n = next.get(c); next.delete(c); c = n; } while (c !== s && c !== undefined);
      if (ring.length >= 3) loops.push(simplify(ring, .035)); }
    return loops.filter(r => r.length >= 3);
  }

  function simplify(r, eps) {
    const n = r.length; if (n < 8) return r;
    let far = 0, md = -1; for (let i = 1; i < n; i++) { const d = (r[i][0] - r[0][0]) ** 2 + (r[i][1] - r[0][1]) ** 2; if (d > md) { md = d; far = i; } }
    const keep = new Uint8Array(n); keep[0] = keep[far] = 1;
    const st = [[0, far], [far, n]];
    while (st.length) { const [a, b] = st.pop(); const A = r[a], B = r[b % n]; let mx = eps, mi = -1;
      const dx = B[0] - A[0], dy = B[1] - A[1], l = Math.hypot(dx, dy) || 1;
      for (let i = a + 1; i < b; i++) { const d = Math.abs((r[i][0] - A[0]) * dy - (r[i][1] - A[1]) * dx) / l; if (d > mx) { mx = d; mi = i; } }
      if (mi > 0) { keep[mi] = 1; st.push([a, mi], [mi, b]); } }
    const o = []; for (let i = 0; i < n; i++) if (keep[i]) o.push(r[i]);
    return o.length >= 3 ? o : r;
  }

  const area = r => { let s = 0; for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
  const inside = (pt, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };

  /* extruda polígonos (anéis externos CCW, furos CW) de z0 a z1 */
  function prism(tris, rings, z0, z1) {
    (tris.breaks = tris.breaks || []).push(tris.length);   // cada prisma é uma casca fechada no 3MF
    const outers = rings.filter(r => area(r) > 0).sort((a, b) => area(a) - area(b));
    const holes = rings.filter(r => area(r) < 0), groups = outers.map(o => ({ o, h: [] }));
    for (const h of holes) { const g = groups.find(g => inside(h[0], g.o)); if (g) g.h.push(h); }
    for (const g of groups) { const pts = [...g.o], hi = [];
      for (const h of g.h) { hi.push(pts.length); pts.push(...h); }
      const idx = earcutFn(pts.flat(), hi, 2);
      for (let i = 0; i < idx.length; i += 3) { let a = pts[idx[i]], b = pts[idx[i + 1]], c = pts[idx[i + 2]];
        if ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) < 0) [b, c] = [c, b];
        tris.push(a[0], a[1], z1, b[0], b[1], z1, c[0], c[1], z1, a[0], a[1], z0, c[0], c[1], z0, b[0], b[1], z0); }
      for (const r of [g.o, ...g.h]) for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length];
        tris.push(p[0], p[1], z0, q[0], q[1], z0, q[0], q[1], z1, p[0], p[1], z0, q[0], q[1], z1, p[0], p[1], z1); } }
  }

  const rect = (w, h, cx = 0, cy = 0) => [[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2], [cx + w / 2, cy + h / 2], [cx - w / 2, cy + h / 2]];
  const circle = (r, cx, cy, n = 32) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos(i / n * 6.28318530718), cy + r * Math.sin(i / n * 6.28318530718)]);
  const cw = r => r.slice().reverse();

  const artSize = p => [p.W - 3.8, p.H - 3.8];
  const HATCH = [86, 56], OPEN = [70, 50], hatchY = p => -p.H / 4;
  const clipY = p => [-.42 * p.H, .42 * p.H];

  /* caixa: fundo contra a parede, portinhola por trás e janela do interruptor à direita.
     Nos lados, quatro presilhas impressas travam o tampo. */
  function boxTris(p) {
    const t = [], T = BASE - 3, F = 3, w = p.W / 2 + FL, h = p.H / 2 + FL, i = p.W / 2, j = p.H / 2, cy = p.H / 4, y = hatchY(p);
    const low = circle(4.5, 0, cy, 28).filter(q => !(q[1] > cy && Math.abs(q[0]) < 2));
    const start = low.findIndex(q => q[1] > cy && q[0] < 0);
    const keyhole = cw([...low.slice(start), ...low.slice(0, start), [2, cy + 9], [-2, cy + 9]]);
    prism(t, [rect(2 * w, 2 * h), keyhole, cw(rect(HATCH[0], HATCH[1], 0, y))], 0, 1.5);
    prism(t, [rect(2 * w, 2 * h), keyhole, cw(rect(OPEN[0], OPEN[1], 0, y))], 1.5, F);
    const ring = [rect(2 * w, 2 * h), cw(rect(2 * i, 2 * j))], f = fit(p), sy = 7.75 + f / 2;
    const gapRight = [[-w, -h], [w, -h], [w, -sy], [i, -sy], [i, -j], [-i, -j], [-i, j], [i, j], [i, sy], [w, sy], [w, h], [-w, h]];
    prism(t, ring, F, 9.5 - f / 2); prism(t, [gapRight], 9.5 - f / 2, 18.5 + f / 2); prism(t, ring, 18.5 + f / 2, T);
    for (const s of [-1, 1]) for (const cyc of clipY(p)) {
      const x0 = i + 1, x1 = i + 2.4, a = s > 0 ? x0 : -x1, b = s > 0 ? x1 : -x0;
      prism(t, [rect(b - a, TAB_W, (a + b) / 2, cyc)], T, T + 2.7);
      const ba = s > 0 ? i + .45 : -x0, bb = s > 0 ? x0 : -(i + .45);
      prism(t, [rect(bb - ba, TAB_W, (ba + bb) / 2, cyc)], T + 1.6, T + 2.7); }
    return t;
  }
  /* portinhola: entra por pressão no rebaixo e fica presa contra a parede */
  function hatchTris(p = {}) {
    const a = (HATCH[0] - .3 - fit(p)) / 2, b = (HATCH[1] - .3 - fit(p)) / 2, t = [];
    prism(t, [[[-a, -b], [a, -b], [a, b], [6, b], [6, b - 3], [-6, b - 3], [-6, b], [-a, b]]], 0, 1.5);
    return t;
  }
  /* tampo: fendas dos painéis, fendas das presilhas e anel da haste */
  function plateTris(p) {
    const t = [], f = fit(p), W = p.W / 2, H = p.H / 2, o = W + FL, q = H + FL, pr = POST_OD / 2 + .15 + f / 2, holes = [cw(circle(pr, 0, 0, 32))];
    for (const n in TABS) { const d = SIDES[n], len = d.axis === 'y' ? p.W : p.H - 2 * WALL, c = d.s * ((d.axis === 'y' ? H : W) - WALL / 2);
      for (const f of TABS[n]) { const v = f * len * d.dir, e = holes.length * .013; holes.push(cw(d.axis === 'y' ? rect(TAB_W + .5 + f, 1.9 + f, v, c + e) : rect(1.9 + f, TAB_W + .5 + f, c + e, v))); } }
    const cl = (x0, x1) => { const r = []; for (const s of [-1, 1]) for (const y of clipY(p)) { const a = s > 0 ? W + x0 : -W - x1, b = s > 0 ? W + x1 : -W - x0, e = (r.length + 1) * .017; r.push(cw(rect(b - a + f, TAB_W + .6 + f, (a + b) / 2 + e, y + e))); } return r; };
    prism(t, [rect(2 * o, 2 * q), ...holes, ...cl(.9, 2.95)], 0, 1.5);
    prism(t, [rect(2 * o, 2 * q), ...holes, ...cl(.35, 2.95)], 1.5, 3);
    prism(t, [circle(6.5, 0, 0, 40), cw(circle(pr, 0, 0, 32))], 3, 13);
    return t;
  }
  /* kit de teste: amostra pequena de cada encaixe, com a folga escolhida */
  function testParts(p) {
    const f = fit(p), w = 30, h = 18, i = w - FL, j = h - FL, T = 22, sy = 7.75 + f / 2, parts = [];
    let t = [], ring = [rect(2 * w, 2 * h), cw(rect(2 * i, 2 * j))];
    const gap = [[-w, -h], [w, -h], [w, -sy], [i, -sy], [i, -j], [-i, -j], [-i, j], [i, j], [i, sy], [w, sy], [w, h], [-w, h]];
    prism(t, [rect(2 * w, 2 * h)], 0, 2); prism(t, ring, 2, 6.5 - f / 2); prism(t, [gap], 6.5 - f / 2, 15.5 + f / 2); prism(t, ring, 15.5 + f / 2, T);
    const tabs = [[i + 1, i + 2.4, i + .45, i + 1], [-i - 2.4, -i - 1, -i - 1, -i - .45]];
    for (const [a, b, c1, d] of tabs) { prism(t, [rect(b - a, TAB_W, (a + b) / 2, 0)], T, T + 2.7); prism(t, [rect(d - c1, TAB_W, (c1 + d) / 2, 0)], T + 1.6, T + 2.7); }
    parts.push({ name: 'teste-caixa', tris: t });
    const pr = POST_OD / 2 + .15 + f / 2, slot = cw(rect(TAB_W + .5 + f, 1.9 + f, 0, 10)), hole = cw(circle(pr, 0, -3, 32));
    const clip = (a, b) => [cw(rect(b - a + f, TAB_W + .6 + f, i + (a + b) / 2, .017)), cw(rect(b - a + f, TAB_W + .6 + f, -i - (a + b) / 2 + .03, .034))];
    t = []; prism(t, [rect(2 * w, 2 * h), slot, hole, ...clip(.9, 2.95)], 0, 1.5); prism(t, [rect(2 * w, 2 * h), slot, hole, ...clip(.35, 2.95)], 1.5, 3);
    prism(t, [circle(6.5, 0, -3, 40), cw(circle(pr, 0, -3, 32))], 3, 13); parts.push({ name: 'teste-tampo', tris: t });
    t = []; prism(t, [rect(TAB_W + 12, 12, 0, 6)], 0, WALL); prism(t, [rect(TAB_W, 3.1, 0, -1.05)], 0, WALL); parts.push({ name: 'teste-painel', tris: t });
    t = []; prism(t, [circle(POST_OD / 2, 0, 0, 32), cw(circle(2.2, 0, 0, 20))], 0, 30); parts.push({ name: 'teste-haste', tris: t });
    return parts;
  }

  /* haste oca: os fios descem por dentro e ela desliza no anel para ajustar a altura */
  function postTris(p) { const t = []; prism(t, [circle(POST_OD / 2, 0, 0, 32), cw(circle(2.2, 0, 0, 20))], 0, postLen(p)); return t; }
  /* tampinha: cobre as pernas do LED e bloqueia a luz para a frente */
  function capTris() {
    const t = [];
    prism(t, [circle(6.5, 0, 0, 40)], 0, 1.5);
    prism(t, [circle(6.5, 0, 0, 40), cw(circle(4.8, 0, 0, 32))], 1.5, 10);
    return t;
  }

  function panelTris(pn) {
    const t = [], rings = contours(pn);
    prism(t, rings.map(r => r.map(q => [Math.round(q[0] * 1e3) / 1e3, Math.round(q[1] * 1e3) / 1e3])), 0, WALL);
    for (const f of TABS[pn.name]) prism(t, [rect(TAB_W, 3.1, pn.len / 2 + f * pn.len, -1.05)], 0, WALL);
    return t;
  }

  /* estampa do fundo: placa clara com a arte em relevo, para trocar o filamento na altura ART_BASE */
  const ART_BASE = 1.2, ART_TOP = 1.8;
  function artClean(a, nx, ny) {
    const cx = (nx - 1) / 2, cy = (ny - 1) / 2, rr = (7.5 / G) ** 2;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) if ((i - cx) ** 2 + (j - cy) ** 2 < rr) a[j * nx + i] = 0;
    const min = .4 / (G * G); let r = label(a, nx, ny, 1);
    for (let k = 0; k < a.length; k++) if (a[k] && r.sizes[r.lab[k]] < min) a[k] = 0;
    r = label(a, nx, ny, 0);
    for (let k = 0; k < a.length; k++) if (!a[k] && r.sizes[r.lab[k]] < min) a[k] = 1;
    return a;
  }
  function artTris(mask, p) {
    const t = [], [w, h] = artSize(p);
    prism(t, [rect(w, h, w / 2, h / 2), cw(circle(6.8, w / 2, h / 2, 40))], 0, ART_BASE);
    const rings = contours(mask).map(r => r.map(q => [Math.round(q[0] * 1e3) / 1e3, Math.round(q[1] * 1e3) / 1e3]));
    prism(t, rings, ART_BASE, ART_TOP); return t;
  }

  function stl(tris, name) {
    const n = tris.length / 9, buf = new ArrayBuffer(84 + 50 * n), dv = new DataView(buf);
    const head = ('Sombra ' + name).slice(0, 79); for (let i = 0; i < head.length; i++) dv.setUint8(i, head.charCodeAt(i));
    dv.setUint32(80, n, true); let o = 84;
    for (let i = 0; i < tris.length; i += 9) {
      const ax = tris[i + 3] - tris[i], ay = tris[i + 4] - tris[i + 1], az = tris[i + 5] - tris[i + 2], bx = tris[i + 6] - tris[i], by = tris[i + 7] - tris[i + 1], bz = tris[i + 8] - tris[i + 2];
      let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx; const l = Math.hypot(nx, ny, nz) || 1;
      dv.setFloat32(o, nx / l, true); dv.setFloat32(o + 4, ny / l, true); dv.setFloat32(o + 8, nz / l, true); o += 12;
      for (let k = 0; k < 9; k++) { dv.setFloat32(o, tris[i + k], true); o += 4; } o += 2; }
    return new Uint8Array(buf);
  }

  /* junta as peças num STL só, lado a lado e sem encostar, para separar no fatiador */
  function merge(parts, bedW = 250, gap = 6) {
    const out = []; let x = 0, y = 0, row = 0;
    for (const t of parts) {
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9;
      for (let i = 0; i < t.length; i += 3) { x0 = Math.min(x0, t[i]); x1 = Math.max(x1, t[i]); y0 = Math.min(y0, t[i + 1]); y1 = Math.max(y1, t[i + 1]); z0 = Math.min(z0, t[i + 2]); }
      const w = x1 - x0, h = y1 - y0;
      if (x > 0 && x + w > bedW) { x = 0; y += row + gap; row = 0; }
      for (let i = 0; i < t.length; i += 3) out.push(t[i] - x0 + x, t[i + 1] - y0 + y, t[i + 2] - z0);
      x += w + gap; row = Math.max(row, h); }
    return out;
  }

  /* 3MF: cada peça vira um objeto com nome, que o fatiador move e apaga separadamente */
  function threeMF(parts, bedW = 250, gap = 6) {
    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;'), objs = [], items = []; let x = 0, y = 0, row = 0;
    parts.forEach((q, n) => { const t = q.tris, stops = new Set(t.breaks || []), vs = [], tris = []; let map = new Map(); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9;
      for (let i = 0; i < t.length; i += 3) { x0 = Math.min(x0, t[i]); x1 = Math.max(x1, t[i]); y0 = Math.min(y0, t[i + 1]); y1 = Math.max(y1, t[i + 1]); z0 = Math.min(z0, t[i + 2]); }
      const id = i => { const a = (t[i] - x0).toFixed(3), b = (t[i + 1] - y0).toFixed(3), e = (t[i + 2] - z0).toFixed(3), k = a + ' ' + b + ' ' + e; let v = map.get(k); if (v === undefined) { v = vs.length; map.set(k, v); vs.push(`<vertex x="${a}" y="${b}" z="${e}"/>`); } return v; };
      for (let i = 0; i < t.length; i += 9) { if (stops.has(i)) map = new Map(); const a = id(i), b = id(i + 3), e = id(i + 6); if (a !== b && b !== e && a !== e) tris.push(`<triangle v1="${a}" v2="${b}" v3="${e}"/>`); }
      objs.push(`<object id="${n + 1}" name="${esc(q.name)}" type="model"><mesh><vertices>${vs.join('')}</vertices><triangles>${tris.join('')}</triangles></mesh></object>`);
      const w = x1 - x0, h = y1 - y0; if (x > 0 && x + w > bedW) { x = 0; y += row + gap; row = 0; }
      items.push(`<item objectid="${n + 1}" transform="1 0 0 0 1 0 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} 0"/>`); x += w + gap; row = Math.max(row, h); });
    const te = new TextEncoder();
    return zip([
      { name: '[Content_Types].xml', data: te.encode('<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>') },
      { name: '_rels/.rels', data: te.encode('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>') },
      { name: '3D/3dmodel.model', data: te.encode(`<?xml version="1.0" encoding="UTF-8"?><model unit="millimeter" xml:lang="pt-BR" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><metadata name="Title">Luminária de sombra</metadata><metadata name="Application">Ateliê de Sombras</metadata><resources>${objs.join('')}</resources><build>${items.join('')}</build></model>`) }
    ]);
  }

  const crcT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = d => { let c = ~0; for (let i = 0; i < d.length; i++) c = crcT[(c ^ d[i]) & 255] ^ (c >>> 8); return (~c) >>> 0; };
  function zip(files) { // sem compressão: STL binário abre em qualquer fatiador
    const te = new TextEncoder(), parts = [], cd = []; let off = 0;
    for (const f of files) { const nm = te.encode(f.name), d = f.data, crc = crc32(d), h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint32(14, crc, true); h.setUint32(18, d.length, true); h.setUint32(22, d.length, true); h.setUint16(26, nm.length, true);
      parts.push(new Uint8Array(h.buffer), nm, d);
      const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint32(16, crc, true); c.setUint32(20, d.length, true); c.setUint32(24, d.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
      cd.push(new Uint8Array(c.buffer), nm); off += 30 + nm.length + d.length; }
    const cs = cd.reduce((s, x) => s + x.length, 0), e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cs, true); e.setUint32(16, off, true);
    return new Blob([...parts, ...cd, new Uint8Array(e.buffer)], { type: 'application/zip' });
  }

  /* exemplo original: árvore que envolve a luminária */
  function tree() {
    const a = new Uint8Array(N * N); let seed = 7; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
    const disc = (x, y, r) => { for (let j = Math.max(0, y - r | 0); j <= Math.min(N - 1, y + r); j++) for (let i = Math.max(0, x - r | 0); i <= Math.min(N - 1, x + r); i++) if ((i - x) ** 2 + (j - y) ** 2 <= r * r) a[j * N + i] = 255; };
    const line = (x0, y0, x1, y1, r0, r1) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)) + 1; for (let k = 0; k <= n; k++) { const t = k / n; disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r0 + (r1 - r0) * t); } };
    const br = (x, y, ang, len, r, d) => { if (d === 0 || len < 9) { disc(x, y, 3 + rnd() * 5); return; }
      const x1 = x + Math.cos(ang) * len, y1 = y + Math.sin(ang) * len; line(x, y, x1, y1, r, r * .72);
      const k = 2 + (rnd() > .55 ? 1 : 0); for (let i = 0; i < k; i++) br(x1, y1, ang + (i - (k - 1) / 2) * (.62 + rnd() * .22) + (rnd() - .5) * .25, len * (.68 + rnd() * .14), r * .72, d - 1); };
    for (let j = N - 44; j < N; j++) a.fill(255, j * N, j * N + N);
    line(N / 2, N - 30, N / 2, N * .62, 40, 30);
    br(N / 2, N * .62, -Math.PI / 2, 112, 30, 8); br(N / 2, N * .64, -Math.PI / 2 - .85, 118, 21, 7); br(N / 2, N * .64, -Math.PI / 2 + .85, 118, 21, 7);
    disc(N * .84, N * .13, 0); return a;
  }

  return { N, G, WALL, BASE, threeMF, ledZ, postLen, artSize, FL, POST_OD, GAP, maskAt, merge, bestPosition, artClean, artTris, ART_BASE, ART_TOP, buildAll, blocked, score, boxTris, hatchTris, plateTris, postTris, capTris, testParts, panelTris, stl, zip, tree, contours, SIDES };
})();
if (typeof module !== 'undefined') module.exports = Sombra;

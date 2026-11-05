/* Conversor: transforma uma imagem comum em desenho próprio para sombra.
   Tira o fundo, simplifica o que ficaria fino demais, liga as partes e abraça a caixa. */
const Conversor = (() => {
  const N = Sombra.N;
  function boxBlur(src, r) { // média em janela quadrada, usando imagem integral
    const I = new Float64Array((N + 1) * (N + 1)), o = new Float32Array(N * N);
    for (let j = 0; j < N; j++) { let s = 0; for (let i = 0; i < N; i++) { s += src[j * N + i]; I[(j + 1) * (N + 1) + i + 1] = I[j * (N + 1) + i + 1] + s; } }
    for (let j = 0; j < N; j++) { const a = Math.max(0, j - r), b = Math.min(N, j + r + 1); for (let i = 0; i < N; i++) { const c = Math.max(0, i - r), d = Math.min(N, i + r + 1);
      o[j * N + i] = (I[b * (N + 1) + d] - I[a * (N + 1) + d] - I[b * (N + 1) + c] + I[a * (N + 1) + c]) / ((b - a) * (d - c)); } }
    return o;
  }
  function otsu(g, mask) { const h = new Array(256).fill(0); let n = 0; for (let i = 0; i < g.length; i++) if (!mask || mask[i]) { h[g[i]]++; n++; }
    let sum = 0, sB = 0, wB = 0, best = 0, T = 128; for (let i = 0; i < 256; i++) sum += i * h[i];
    for (let i = 0; i < 256; i++) { wB += h[i]; if (!wB) continue; const wF = n - wB; if (!wF) break; sB += i * h[i]; const m = (sB / wB - (sum - sB) / wF) ** 2 * wB * wF; if (m > best) { best = m; T = i; } }
    return T; }
  /* preenche a partir da borda tudo que parece com o fundo */
  function background(g) { const b = []; for (let i = 0; i < N; i++) b.push(g[i], g[(N - 1) * N + i], g[i * N], g[i * N + N - 1]); b.sort((x, y) => x - y);
    const ref = b[b.length >> 1], tol = Math.max(18, Math.abs(ref - otsu(g)) * .55), bg = new Uint8Array(N * N), st = new Int32Array(N * N); let sp = 0;
    const add = c => { if (!bg[c] && Math.abs(g[c] - ref) <= tol) { bg[c] = 1; st[sp++] = c; } };
    for (let i = 0; i < N; i++) { add(i); add((N - 1) * N + i); add(i * N); add(i * N + N - 1); }
    while (sp) { const c = st[--sp], i = c % N; if (i > 0) add(c - 1); if (i < N - 1) add(c + 1); if (c >= N) add(c - N); if (c < N * (N - 1)) add(c + N); }
    return bg; }
  function comps(a, val) { const lab = new Int32Array(a.length).fill(-1), sizes = [], st = new Int32Array(a.length);
    for (let s = 0; s < a.length; s++) { if (a[s] !== val || lab[s] >= 0) continue; const id = sizes.length; let n = 0, sp = 0; st[sp++] = s; lab[s] = id;
      while (sp) { const c = st[--sp], i = c % N; n++; for (const m of [i > 0 ? c - 1 : -1, i < N - 1 ? c + 1 : -1, c >= N ? c - N : -1, c < a.length - N ? c + N : -1]) if (m >= 0 && a[m] === val && lab[m] < 0) { lab[m] = id; st[sp++] = m; } }
      sizes.push(n); }
    return { lab, sizes }; }
  /* mantém o desenho numa peça só: liga cada parte à maior pelo caminho mais curto */
  function linkAll(a, width) { const { lab, sizes } = comps(a, 1); if (sizes.length < 2) return a;
    let main = 0; sizes.forEach((v, i) => { if (v > sizes[main]) main = i; });
    const par = new Int32Array(a.length).fill(-1), seen = new Uint8Array(a.length), q = new Int32Array(a.length * 2), path = []; let h = 0, t = 0; const joined = new Set([main]);
    for (let c = 0; c < a.length; c++) if (lab[c] === main) { seen[c] = 1; q[t++] = c; }
    while (h < t) { const c = q[h++], i = c % N; for (const m of [i > 0 ? c - 1 : -1, i < N - 1 ? c + 1 : -1, c >= N ? c - N : -1, c < a.length - N ? c + N : -1]) { if (m < 0 || seen[m]) continue; seen[m] = 1; par[m] = c;
        if (a[m] && !joined.has(lab[m])) { joined.add(lab[m]); const id = lab[m]; for (let k = c; k >= 0 && !a[k]; k = par[k]) path.push(k); for (let x = 0; x < a.length; x++) if (lab[x] === id) { seen[x] = 1; if (t < q.length) q[t++] = x; } }
        else if (t < q.length) q[t++] = m; } }
    const o = a.slice(); for (const c of path) { const i = c % N, j = (c - i) / N; for (let y = Math.max(0, j - width); y <= Math.min(N - 1, j + width); y++) for (let x = Math.max(0, i - width); x <= Math.min(N - 1, i + width); x++) o[y * N + x] = 1; }
    return o; }
  /* distância até a borda clara mais próxima: acha o miolo mais largo do desenho */
  function core(a) { const d = new Float32Array(N * N); for (let i = 0; i < d.length; i++) d[i] = a[i] ? 1e6 : 0;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const c = j * N + i; if (!d[c]) continue; if (i) d[c] = Math.min(d[c], d[c - 1] + 1); if (j) d[c] = Math.min(d[c], d[c - N] + 1); if (i && j) d[c] = Math.min(d[c], d[c - N - 1] + 1.41); if (j && i < N - 1) d[c] = Math.min(d[c], d[c - N + 1] + 1.41); }
    let best = 0, bc = 0; for (let j = N - 1; j >= 0; j--) for (let i = N - 1; i >= 0; i--) { const c = j * N + i; if (!d[c]) continue; if (i < N - 1) d[c] = Math.min(d[c], d[c + 1] + 1); if (j < N - 1) d[c] = Math.min(d[c], d[c + N] + 1); if (i < N - 1 && j < N - 1) d[c] = Math.min(d[c], d[c + N + 1] + 1.41); if (i && j < N - 1) d[c] = Math.min(d[c], d[c + N - 1] + 1.41); if (d[c] > best) { best = d[c]; bc = c; } }
    return { r: best, x: bc % N, y: (bc - bc % N) / N }; }
  function crop(g, a, keep = .02) { let x0 = N, x1 = 0, y0 = N, y1 = 0; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (a[j * N + i]) { x0 = Math.min(x0, i); x1 = Math.max(x1, i); y0 = Math.min(y0, j); y1 = Math.max(y1, j); }
    if (x1 <= x0 || y1 <= y0) return { g, a }; const side = Math.max(x1 - x0, y1 - y0) * (1 + 2 * keep), ax = (x0 + x1) / 2 - side / 2, ay = (y0 + y1) / 2 - side / 2, k = side / (N - 1), G = new Uint8Array(N * N).fill(255), A = new Uint8Array(N * N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const u = ax + i * k + .5 | 0, v = ay + j * k + .5 | 0; if (u >= 0 && v >= 0 && u < N && v < N) { G[j * N + i] = g[v * N + u]; A[j * N + i] = a[v * N + u]; } }
    return { g: G, a: A }; }
  /* modo: solida (só o contorno), detalhes (mantém brilhos grandes) ou recorte (preto e branco direto) */
  function convert(gray, mode, p) {
    let bg = background(gray), fg = new Uint8Array(N * N), n = 0; for (let i = 0; i < N * N; i++) if (!bg[i]) { fg[i] = 1; n++; }
    if (n < N * N * .03 || n > N * N * .97 || mode === 'recorte') { const T = otsu(gray); for (let i = 0; i < N * N; i++) fg[i] = gray[i] < T ? 1 : 0; }
    let g = gray; ({ g, a: fg } = crop(gray, fg));
    const h = comps(fg, 0); let outer = new Set(); for (let i = 0; i < N; i++) for (const c of [i, (N - 1) * N + i, i * N, i * N + N - 1]) if (h.lab[c] >= 0) outer.add(h.lab[c]);
    let a = fg.slice();
    if (mode !== 'recorte') for (let i = 0; i < N * N; i++) if (!a[i] && !outer.has(h.lab[i])) a[i] = 1;      // tapa furos do contorno
    if (mode === 'detalhes') { const T = otsu(g, a); for (let i = 0; i < N * N; i++) if (a[i] && g[i] > Math.max(T, 90)) a[i] = 2; for (let i = 0; i < N * N; i++) a[i] = a[i] === 2 ? 0 : a[i]; }
    /* quanto mais longe do centro, mais o detalhe se amplia: simplifica mais nas bordas */
    const A = new Float32Array(N * N); for (let i = 0; i < N * N; i++) A[i] = a[i];
    const near = boxBlur(A, 3), far = boxBlur(A, 9), o = new Uint8Array(N * N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const r = Math.min(1, Math.hypot(i - N / 2, j - N / 2) / (N * .5)), v = near[j * N + i] * (1 - r) + far[j * N + i] * r; o[j * N + i] = v > .5 ? 1 : 0; }
    const small = N * N * .00025, c1 = comps(o, 1); for (let i = 0; i < N * N; i++) if (o[i] && c1.sizes[c1.lab[i]] < small) o[i] = 0;
    const c0 = comps(o, 0); for (let i = 0; i < N * N; i++) if (!o[i] && c0.sizes[c0.lab[i]] < small * 2) o[i] = 1;
    const linked = linkAll(o, 4);
    /* escolhe o tamanho pelo miolo da figura inteira, sem contar os recortes de luz internos */
    const h2 = comps(linked, 0), rim = new Set(); for (let i = 0; i < N; i++) for (const q of [i, (N - 1) * N + i, i * N, i * N + N - 1]) if (h2.lab[q] >= 0) rim.add(h2.lab[q]);
    const F = linked.slice(); for (let i = 0; i < N * N; i++) if (!F[i] && !rim.has(h2.lab[i])) F[i] = 1;
    const c = core(F), bw = p.W + 2 * Sombra.FL, bh = p.H + 2 * Sombra.FL, need = Math.hypot(bw, bh) / 2 * .78;
    const S = Math.max(p.S, Math.min(1500, need / Math.max(c.r, 1) * N)), mm = S / N, hw = Math.ceil(bw / 2 / mm), hh = Math.ceil(bh / 2 / mm);
    /* a caixa vai onde cobre menos detalhe e fica dentro da figura, perto do centro de massa */
    const iL = new Float64Array((N + 1) * (N + 1)), iF = new Float64Array((N + 1) * (N + 1)); let mx = 0, my = 0, mn = 0;
    for (let j = 0; j < N; j++) { let a1 = 0, a2 = 0; for (let i = 0; i < N; i++) { const k = j * N + i, f = F[k], d = f && !linked[k] ? 1 : 0; a1 += d; a2 += f; iL[(j + 1) * (N + 1) + i + 1] = iL[j * (N + 1) + i + 1] + a1; iF[(j + 1) * (N + 1) + i + 1] = iF[j * (N + 1) + i + 1] + a2; if (f) { mx += i; my += j; mn++; } } }
    mx /= mn; my /= mn; const sum = (I, x0, y0, x1, y1) => I[y1 * (N + 1) + x1] - I[y0 * (N + 1) + x1] - I[y1 * (N + 1) + x0] + I[y0 * (N + 1) + x0];
    let bx = c.x, by = c.y, bc = 1e18; const area = (2 * hw) * (2 * hh);
    for (let y = hh; y < N - hh; y += 6) for (let x = hw; x < N - hw; x += 6) { const inF = sum(iF, x - hw, y - hh, x + hw, y + hh) / area; if (inF < .9) continue;
      const lost = sum(iL, x - hw, y - hh, x + hw, y + hh) / area, v = lost * 6 + (1 - inF) * 4 + Math.hypot(x - mx, y - my) / N; if (v < bc) { bc = v; bx = x; by = y; } }
    const ox = -(bx * mm - S / 2), oy = by * mm - S / 2, hug = bc < 1e17 ? 1 : Math.min(1, c.r * mm / need), out = new Uint8Array(N * N).fill(255);
    for (let i = 0; i < N * N; i++) if (linked[i]) out[i] = 0;
    /* a área atrás da caixa e uma pequena folga viram escuro, para firmar as paredes */
    const mg = Math.ceil(12 / mm); for (let j = Math.max(0, by - hh - mg); j < Math.min(N, by + hh + mg); j++) for (let i = Math.max(0, bx - hw - mg); i < Math.min(N, bx + hw + mg); i++) if (F[j * N + i] || hug < .98) out[j * N + i] = 0;
    return { gray: out, S: Math.round(S / 10) * 10, ox, oy, hug };
  }
  /* diagnóstico do desenho na posição atual */
  function check(sil, p) { const W = p.W / 2 + Sombra.FL + 12, H = p.H / 2 + Sombra.FL + 12; let dark = 0, n = 0;
    for (let k = 0; k < 80; k++) { const f = k / 80 * 4, s = f % 1 * 2 - 1, X = f < 1 || (f >= 2 && f < 3) ? s * W * (f < 1 ? 1 : -1) : (f < 2 ? W : -W), Y = f < 1 ? H : f >= 2 && f < 3 ? -H : s * H * (f < 2 ? -1 : 1); n++; if (Sombra.maskAt(sil, X, Y, p) > 127) dark++; }
    return dark / n; }
  return { convert, check };
})();

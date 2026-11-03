/* Renderiza as imagens do manual a partir das peças reais do projeto aberto no ateliê. */
window.Shots = (() => {
  const p = st.p, W = 960, H = 720, B = Sombra.BASE, L = Sombra.ledZ(p), top = L + 11;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true }); r.setSize(W, H, false);
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = .92;
  const PLA = () => new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: .42, metalness: 0 });
  const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .5, ...o });
  function geo(t, map) { const a = new Float32Array(t.length); for (let i = 0; i < t.length; i += 3) { const q = map ? map(t[i], t[i + 1], t[i + 2]) : [t[i], t[i + 1], t[i + 2]]; a[i] = q[0]; a[i + 1] = q[1]; a[i + 2] = q[2]; } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); g.computeVertexNormals(); return g; }
  const mesh = (t, m, map) => { const o = new THREE.Mesh(geo(t, map), m || PLA()); o.material.side = THREE.DoubleSide; o.castShadow = o.receiveShadow = true; return o; };
  const cyl = (rt, h, m, seg = 32) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rt, h, seg), m); o.castShadow = true; return o; };
  const block = (x, y, z, m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(x, y, z), m); o.castShadow = true; o.receiveShadow = true; return o; };
  const glass = () => new THREE.MeshPhysicalMaterial({ color: 0xdcecff, roughness: .08, metalness: 0, transparent: true, opacity: .32, side: THREE.DoubleSide });
  const led = () => { const g = new THREE.Group(); const m = new THREE.MeshPhysicalMaterial({ color: 0xfff6d8, roughness: .2, transparent: true, opacity: .75 }); const b = cyl(4, 6, m); b.rotation.x = Math.PI / 2; g.add(b); const r = cyl(4.5, 1, m); r.rotation.x = Math.PI / 2; r.position.z = 3; g.add(r); const d = new THREE.Mesh(new THREE.SphereGeometry(4, 20, 12), m); d.position.z = -3; g.add(d); for (const x of [-1.3, 1.3]) { const l = cyl(.3, 6, mat(0xc8c8cc, { metalness: .8 }), 8); l.rotation.x = Math.PI / 2; l.position.set(x, 0, 6); g.add(l); } return g; };
  const screw = (len, r0) => { const g = new THREE.Group(), m = mat(0x9aa0a8, { metalness: .9, roughness: .3 }); const s = cyl(r0, len, m, 14); g.add(s); const h = cyl(r0 * 1.8, r0 * 1.2, m, 18); h.position.y = len / 2; g.add(h); return g; };
  const wire = (pts, c) => { const v = pts.map(q => new THREE.Vector3(...q)); const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(v), 80, .8, 8), mat(c)); m.castShadow = true; return m; };
  const holder = () => { const g = new THREE.Group(); const b = block(58, 32, 15, mat(0x202024)); g.add(b); for (const y of [-7.5, 7.5]) { const a = cyl(7, 50, mat(0x2d6b4f, { metalness: .2 }), 24); a.rotation.z = Math.PI / 2; a.position.set(0, y, 8); g.add(a); const c = cyl(7.05, 6, mat(0xc8c8cc, { metalness: .8 }), 24); c.rotation.z = Math.PI / 2; c.position.set(24, y, 8); g.add(c); } return g; };
  const sw = () => { const g = new THREE.Group(); g.add(block(16.7, 10.5, 2.5, mat(0x18181b))); const k = block(12, 8, 4, mat(0xf2f2f2)); k.position.z = 2.5; k.rotation.y = .18; g.add(k); const q = block(15, 9, 14, mat(0x232327)); q.position.z = -10; g.add(q); return g; };
  const resistor = () => { const g = new THREE.Group(); const a = cyl(1.3, 10, mat(0xc7a26a)); a.rotation.z = Math.PI / 2; g.add(a); const b = cyl(.3, 26, mat(0xbbbbbb, { metalness: .8 })); b.rotation.z = Math.PI / 2; g.add(b); return g; };
  function pieces() { const P = st.panels, o = {};
    o.box = mesh(Sombra.boxTris(p)); o.plate = mesh(Sombra.plateTris(p), mat(0xe8e2d4), (x, y, z) => [x, y, z]);
    o.hatch = mesh(Sombra.hatchTris()); o.cap = mesh(Sombra.capTris(), mat(0xe8e4da));
    for (const n in P) o[n] = mesh(Sombra.panelTris(P[n]));
    return o; }
  const mapPanel = q => { const d = q.def, H = (d.axis === 'y' ? p.H : p.W) / 2; return (x, y, z) => { const v = (x - q.len / 2) * d.dir, c = d.s * (H - z); return d.axis === 'y' ? [v, c, y] : [c, v, y]; }; };
  function assembled(e = {}) { const G = new THREE.Group(), P = st.panels, out = k => (e[k] || 0);
    const box = mesh(Sombra.boxTris(p)); box.position.z = -out('box'); G.add(box);
    const pl = mesh(Sombra.plateTris(p)); pl.position.z = B - 3 + out('plate'); G.add(pl);
    for (const n in P) { const q = P[n], m = mesh(Sombra.panelTris(q), null, mapPanel(q)), d = q.def, sh = out('wall') * d.s; m.position.set(d.axis === 'x' ? sh : 0, d.axis === 'y' ? sh : 0, B + out('wallZ')); G.add(m); }
    const po = Sombra.postTris(p), z0 = L - Sombra.GAP - Sombra.postLen(p) + out('tube'), pst = mesh(po, null, (x, y, z) => [x, y, z0 + z]); G.add(pst);
    const sl = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.4, 16, 32, 1, true), glass()); sl.rotation.x = Math.PI / 2; sl.position.z = L - Sombra.GAP + 8 + out('tube'); G.add(sl);
    const l = led(); l.position.z = L + out('tube'); G.add(l);
    const c = mesh(Sombra.capTris(), null, (x, y, z) => [x, y, top - z]); c.position.z = out('cap'); G.add(c);
    if (art.mask) { const t = Sombra.artTris(art.mask, p), lo = [], hi = [], lim = Sombra.ART_BASE + .01, [w, h] = Sombra.artSize(p);
      for (let i = 0; i < t.length; i += 9) (Math.max(t[i + 2], t[i + 5], t[i + 8]) > lim ? hi : lo).push(...t.slice(i, i + 9));
      const m = (x, y, z) => [x - w / 2, y - h / 2, B + z + out('plate')]; G.add(mesh(lo, mat(0xf2ede2), m)); G.add(mesh(hi, PLA(), m)); }
    return G; }
  function studio(table = true, bg = 0x93a0ad) { const s = new THREE.Scene(); s.background = new THREE.Color(bg);
    s.add(new THREE.HemisphereLight(0xffffff, 0x8d8d8d, .85));
    const k = new THREE.DirectionalLight(0xffffff, 1.05); k.position.set(160, 260, 320); k.castShadow = true; k.shadow.mapSize.set(2048, 2048); Object.assign(k.shadow.camera, { left: -420, right: 420, top: 420, bottom: -420, near: 10, far: 1100 }); k.shadow.bias = -.0006; s.add(k);
    if (table) { const f = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshStandardMaterial({ color: bg, roughness: .9 })); f.rotation.x = -Math.PI / 2; f.position.y = -1; f.receiveShadow = true; s.add(f); }
    return s; }
  const cam = (x, y, z, tx = 0, ty = 0, tz = 0, fov = 30) => { const c = new THREE.PerspectiveCamera(fov, W / H, 2, 4000); c.position.set(x, y, z); c.lookAt(tx, ty, tz); c.updateMatrixWorld(); return c; };
  const up = g => { g.rotation.x = -Math.PI / 2; return g; };
  function snap(s, c, labels = []) { r.render(s, c); const out = labels.map(([txt, o, dx = 0, dy = 0]) => { const v = o.clone ? o.clone() : new THREE.Vector3(...o); v.project(c); return { txt, x: (v.x + 1) / 2 * W + dx, y: (1 - v.y) / 2 * H + dy }; }); return { url: cv.toDataURL('image/png'), labels: out }; }
  const place = (o, x, z, y = 0, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; return o; };
  const flat = (t, m) => { const g = new THREE.Group(), o = mesh(t, m); o.rotation.x = -Math.PI / 2; g.add(o); return g; };
  const shots = {
    pecas() { const s = studio(), P = st.panels, lb = [];
      const add = (g, x, z, t) => { s.add(place(g, x, z)); lb.push([t, [x, 8, z]]); };
      add(flat(Sombra.boxTris(p)), -255, -120, 'Caixa da base');
      add(flat(Sombra.plateTris(p), PLA()), -115, -120, 'Tampo');
      add(flat(Sombra.hatchTris()), 20, -170, 'Portinhola'); add(flat(Sombra.capTris()), -30, -85, 'Tampinha'); { const g = new THREE.Group(), o = mesh(Sombra.postTris(p)); o.rotation.y = Math.PI / 2; o.position.z = 0; g.add(o); s.add(place(g, 30, -85, 5)); lb.push(['Haste', [65, 16, -85]]); }
      const f = (n, x, z, lbl) => { const q = P[n], g = flat(Sombra.panelTris(q)); s.add(place(g, x - q.len / 2, z)); lb.push([lbl, [x, 8, z - q.Pz / 2]]); };
      f('superior', -160, 90, 'Painel superior'); f('inferior', 30, 90, 'Painel inferior'); f('esquerdo', -160, 190, 'Painel esquerdo'); f('direito', 30, 190, 'Painel direito');
      return snap(s, cam(-60, 500, 420, -65, 0, 40, 34), lb); },
    externos() { const s = studio(), lb = [], add = (o, x, z, t, y = 6) => { o.position.set(x, y, z); s.add(o); lb.push([t, [x, y + 14, z]]); };
      const t = block(27, .4, 15, glass()); add(t, -130, -70, 'Tira de PET', 1);
      const h = holder(); h.rotation.x = -Math.PI / 2; add(h, 40, -80, 'Suporte de pilhas', 4);
      const l = led(); l.rotation.x = Math.PI / 2; add(l, -160, 20, 'LED chapéu de palha', 3); const a = sw(); a.rotation.x = -Math.PI / 2; add(a, -70, 20, 'Interruptor', 18); 
      const m3 = screw(30, 1.7); m3.rotation.z = Math.PI / 2; add(m3, 110, 20, 'Parafuso de parede', 3);
      s.add(wire([[-170, 1, 90], [-120, 1, 70], [-60, 1, 100], [0, 1, 80]], 0xc0392b)); s.add(wire([[-170, 1, 100], [-120, 1, 80], [-60, 1, 110], [0, 1, 90]], 0x181818)); lb.push(['Fios', [-80, 16, 100]]);
      return snap(s, cam(-5, 250, 260, -5, 0, 10, 32), lb); },
    tubo() { const s = studio(), H0 = Sombra.postLen(p), g = new THREE.Group(); g.add(mesh(Sombra.postTris(p))); const sl = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.4, 16, 32, 1, true), glass()); sl.rotation.x = Math.PI / 2; sl.position.z = H0 + 6; g.add(sl); const l = led(); l.position.z = H0 + 12; g.add(l); const c = mesh(Sombra.capTris(), null, (x, y, z) => [x, y, H0 + 42 - z]); g.add(c); up(g); s.add(g);
      return snap(s, cam(60, 75, 190, 0, H0 * .72, 0, 30), [['Tampinha', [0, H0 + 40, 0], 150, 0], ['LED no anel de PET', [0, H0 + 10, 0], 170, 0], ['Haste impressa', [0, H0 * .5, 0], 150, 0]]); },
    tampo() { const s = studio(), g = new THREE.Group(); const pl = mesh(Sombra.plateTris(p)); g.add(pl); up(g); s.add(g);
      return snap(s, cam(90, 150, 170, 0, 8, 0, 30), [['Fendas únicas de cada painel', [0, 8, -p.H / 2 + 2]], ['Anel da haste', [0, 22, 0]], ['Presilhas do tampo', [p.W / 2 + 3, 10, p.H * .4]]]); },
    caixa() { const s = studio(), g = new THREE.Group(); const b = mesh(Sombra.boxTris(p)); g.add(b); const a = sw(); a.rotation.y = Math.PI / 2; a.position.set(p.W / 2 + 1, 0, 14); g.add(a); const h = holder(); h.rotation.y = Math.PI; h.position.set(0, -p.H / 4, 12); g.add(h); g.rotation.x = -Math.PI / 2; s.add(g);
      return snap(s, cam(30, 215, 130, 0, 0, 8, 30), [['Interruptor na janela lateral', [p.W / 2, 34, 0]], ['Suporte de pilhas', [0, 44, p.H / 4]]]); },
    fechar() { const s = studio(), g = new THREE.Group(); g.add(mesh(Sombra.boxTris(p))); const pl = mesh(Sombra.plateTris(p)); pl.position.z = 58; g.add(pl); up(g); s.add(g);
      return snap(s, cam(150, 170, 215, 0, 40, 0, 30), [['Tampo', [0, 66, 0]], ['Presilhas', [p.W / 2 + 3, 32, 0], 40, 0], ['Caixa', [0, 12, p.H / 2], 0, 0]]); },
    paineis() { const s = studio(), g = assembled({ wall: 30 }); up(g); s.add(g);
      return snap(s, cam(140, 225, 235, 0, 35, 0, 30)); },
    pronta() { const s = studio(), g = assembled(); up(g); s.add(g);
      return snap(s, cam(130, 170, 215, 0, 36, 0, 30)); },
    traseira() { const s = studio(), g = assembled(); g.rotation.x = Math.PI / 2; g.position.y = 95; s.add(g); const h = mesh(Sombra.hatchTris()); h.rotation.x = Math.PI / 2; h.position.set(0, 128, -p.H / 4 + 0); h.position.y = 128; s.add(h); return snap(s, cam(90, 240, 150, 0, 90, -10, 30), [['Portinhola das pilhas', [0, 145, p.H / 4 - 60]]]); },
    frame(k, ang) { const s = studio(), f = v => Math.max(0, Math.min(1, v)), ease = v => v * v * (3 - 2 * v), q = n => 1 - ease(f((k - n) / .17));
      const g = assembled({ box: 0, plate: 70 * q(.05), wall: 60 * q(.45), wallZ: 110 * q(.45), tube: 130 * q(.25), cap: 170 * q(.25) }); up(g); g.rotation.z = ang; s.add(g); return snap(s, cam(205, 300, 350, 0, 62, 0, 30)); },
    parede() { const s = new THREE.Scene(); s.background = new THREE.Color(0x0a0a0c); s.add(new THREE.AmbientLight(0xffffff, .1)); const c = document.createElement('canvas'); c.width = 1400; c.height = 1050; const x = c.getContext('2d'), im = x.createImageData(1400, 1050), mm = 2;
      for (let j = 0, o = 0; j < 1050; j++) for (let i = 0; i < 1400; i++, o += 4) { const X = (i - 700) * mm * .72, Y = (525 - j) * mm * .72, d = Sombra.blocked(st.panels, p, X, Y) ? 0 : 1 / (1 + (X * X + Y * Y) / 67600 * .55); im.data[o] = 14 + 240 * d; im.data[o + 1] = 13 + 190 * d; im.data[o + 2] = 16 + 125 * d; im.data[o + 3] = 255; } x.putImageData(im, 0, 0);
      const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; const w = new THREE.Mesh(new THREE.PlaneGeometry(1400 * 1.44, 1050 * 1.44), new THREE.MeshBasicMaterial({ map: t })); s.add(w); const g = assembled(); s.add(g); const a = new THREE.PointLight(0xffd9a0, 1.3, 130); a.position.set(0, 0, L - 6); s.add(a);
      return snap(s, cam(120, -60, 1150, 0, 20, 0, 36)); }
  };
  return shots;
})();

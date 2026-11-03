/* Quarto 3D: as peças reais montadas na parede. Em metros; a luminária fica em (0, ALT, 0).
   A luz do LED só alcança a parede, então a sombra é calculada raio a raio e vira textura. */
const Room = (() => {
  const RW = 4.2, RH = 2.7, RD = 4, ALT = 1.6, TW = 2048, TH = 1316;
  const LED = { quente: [1, .78, .52], frio: [.86, .93, 1], vermelho: [1, .16, .1], azul: [.2, .45, 1] };
  const WALLS = { branca: [.95, .93, .89], cinza: [.62, .63, .66], escura: [.2, .22, .3] };
  const s = { on: true, room: false, led: 'quente', wall: 'branca', theta: -.45, phi: 1.5, dist: 2.7, ready: false, dirty: true };
  let cv, r, scene, cam, lamp, tex, tctx, timg, lux, ambient, bounce, glow, roomMats = [];

  const load = () => new Promise((ok, no) => { if (window.THREE) return ok(); const e = document.createElement('script'); e.src = 'vendor/three.min.js'; e.onload = ok; e.onerror = no; document.head.append(e); });
  const box = (w, h, d, x, y, z, color, parent) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color })); m.position.set(x, y, z); (parent || scene).add(m); return m; };
  const plane = (w, h, color, pos, rot) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ color })); m.position.set(...pos); m.rotation.set(...rot); scene.add(m); return m; };

  function init() {
    r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true }); r.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    scene = new THREE.Scene(); scene.background = new THREE.Color(0x050507);
    cam = new THREE.PerspectiveCamera(58, 1, .02, 20);
    const c = document.createElement('canvas'); c.width = TW; c.height = TH; tctx = c.getContext('2d'); timg = tctx.createImageData(TW, TH);
    tex = new THREE.CanvasTexture(c); tex.anisotropy = r.capabilities.getMaxAnisotropy();
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(RW, RH), new THREE.MeshBasicMaterial({ map: tex })); wall.position.set(0, RH / 2, 0); scene.add(wall);
    plane(RW, RD, 0x7a5a3f, [0, 0, RD / 2], [-Math.PI / 2, 0, 0]); plane(RW, RD, 0xdedcd6, [0, RH, RD / 2], [Math.PI / 2, 0, 0]);
    plane(RD, RH, 0xd8d4cc, [-RW / 2, RH / 2, RD / 2], [0, Math.PI / 2, 0]); plane(RD, RH, 0xd8d4cc, [RW / 2, RH / 2, RD / 2], [0, -Math.PI / 2, 0]); plane(RW, RH, 0xd8d4cc, [0, RH / 2, RD], [0, Math.PI, 0]);
    box(RW, .1, .015, 0, .05, .008, 0xe8e6e0); plane(2.6, 1.8, 0x4b5068, [0, .006, 1.8], [-Math.PI / 2, 0, 0]);
    box(1.7, .3, 2, -.9, .25, 1.05, 0x5b4636); box(1.6, .2, 1.95, -.9, .48, 1.05, 0xcfc8bb); box(1.7, .85, .06, -.9, .46, .04, 0x4a3829);
    box(.65, .12, .38, -1.3, .63, .32, 0xe9e4d9); box(.65, .12, .38, -.5, .63, .32, 0xe9e4d9); box(1.6, .06, 1.2, -.9, .6, 1.42, 0x3f5a6b);
    box(.45, .5, .4, .25, .25, .22, 0x6a5240); box(.1, .2, .1, .25, .6, .22, 0x2b2b30);
    box(.9, .75, .5, 1.45, .375, .27, 0x3a3f4a); box(.45, .3, .03, 1.45, .92, .25, 0x101014);
    ambient = new THREE.AmbientLight(0xffffff, .05); scene.add(ambient);
    bounce = new THREE.PointLight(0xffc98a, .6, 7, 1.6); bounce.position.set(0, ALT, .5); scene.add(bounce);
    const top = new THREE.DirectionalLight(0xffffff, .35); top.position.set(.5, 3, 2.5); top.visible = false; top.name = 'top'; scene.add(top);
    glow = new THREE.Mesh(new THREE.SphereGeometry(.0035, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); scene.add(glow);
    lamp = new THREE.Group(); lamp.position.set(0, ALT, 0); lamp.scale.setScalar(.001); scene.add(lamp);
    const down = (e) => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); if (pts.size === 2) { const [a, b] = [...pts.values()]; pd = Math.hypot(a[0] - b[0], a[1] - b[1]); pdist = s.dist; } };
    const pts = new Map(); let pd = 0, pdist = 0;
    cv.addEventListener('pointerdown', down);
    cv.addEventListener('pointermove', e => { const q = pts.get(e.pointerId); if (!q) return;
      if (pts.size === 2) { pts.set(e.pointerId, [e.clientX, e.clientY]); const [a, b] = [...pts.values()]; s.dist = pdist * pd / Math.max(1, Math.hypot(a[0] - b[0], a[1] - b[1])); }
      else { s.theta -= (e.clientX - q[0]) * .007; s.phi -= (e.clientY - q[1]) * .006; pts.set(e.pointerId, [e.clientX, e.clientY]); }
      render(); });
    const up = e => pts.delete(e.pointerId); cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', e => { e.preventDefault(); s.dist *= e.deltaY > 0 ? 1.08 : .93; render(); }, { passive: false });
    new ResizeObserver(size).observe(cv);
  }
  function size() { const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h || !r) return; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); render(); }

  /* leva a lista de triângulos de cada peça para a posição montada */
  function mesh(tris, map, color, emissive) {
    const a = new Float32Array(tris.length);
    for (let i = 0; i < tris.length; i += 3) { const q = map(tris[i], tris[i + 1], tris[i + 2]); a[i] = q[0]; a[i + 1] = q[1]; a[i + 2] = q[2]; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); g.computeVertexNormals();
    return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide, emissive: emissive || 0 }));
  }
  function buildLamp(p, panels, art) {
    while (lamp.children.length) { const m = lamp.children.pop(); m.geometry.dispose(); m.material.dispose(); }
    const W = Sombra.WALL, B = Sombra.BASE, black = 0x17171b;
    for (const n in panels) { const q = panels[n], d = q.def, H = (d.axis === 'y' ? p.H : p.W) / 2;
      lamp.add(mesh(Sombra.panelTris(q), (x, y, z) => { const v = (x - q.len / 2) * d.dir, c = d.s * (H - z); return d.axis === 'y' ? [v, c, B + y] : [c, v, B + y]; }, black)); }
    lamp.add(mesh(Sombra.baseTris(p), (x, y, z) => [x, y, z], black));
    lamp.add(mesh(Sombra.capTris(p), (x, y, z) => [x, y, p.D + 3 - z], black));
    if (art) { const t = Sombra.artTris(art, p), lo = [], hi = [], top = Sombra.ART_BASE + .01;
      for (let i = 0; i < t.length; i += 9) (Math.max(t[i + 2], t[i + 5], t[i + 8]) > top ? hi : lo).push(...t.slice(i, i + 9));
      const map = (x, y, z) => [x - p.W / 2, y - p.H / 2, p.D + 3 + z];
      lamp.add(mesh(lo, map, 0xece6d8)); lamp.add(mesh(hi, map, 0x141418)); }
    glow.position.set(0, ALT, Sombra.ledZ(p) * .001);
  }
  function computeLux(p, panels) { lux = new Uint8Array(TW * TH); const mm = RW * 1000 / TW;
    for (let j = 0, o = 0; j < TH; j++) { const Y = (RH * 1000 * (.5 - j / TH)) + (RH * 500 - ALT * 1000);
      for (let i = 0; i < TW; i++, o++) { const X = (i - TW / 2 + .5) * mm; if (Sombra.blocked(panels, p, X, Y)) continue; lux[o] = 255 / (1 + (X * X + Y * Y) / 67600 * .55); } } }
  function paint() { const d = timg.data, w = WALLS[s.wall], c = LED[s.led], amb = s.room ? .85 : .035, k = s.on ? (s.room ? .35 : 1.05) / 255 : 0;
    for (let o = 0, q = 0; o < lux.length; o++, q += 4) { const l = lux[o] * k; d[q] = Math.min(255, 255 * w[0] * (amb + l * c[0])); d[q + 1] = Math.min(255, 255 * w[1] * (amb + l * c[1])); d[q + 2] = Math.min(255, 255 * w[2] * (amb + l * c[2])); d[q + 3] = 255; }
    tctx.putImageData(timg, 0, 0); tex.needsUpdate = true;
    ambient.intensity = s.room ? .8 : .05; scene.getObjectByName('top').visible = s.room;
    bounce.intensity = s.on ? (s.room ? .15 : .55) : 0; bounce.color.setRGB(...c); glow.visible = s.on; }
  function render() { if (!r) return; s.dist = Math.max(.25, Math.min(3.7, s.dist)); s.theta = Math.max(-1.35, Math.min(1.35, s.theta)); s.phi = Math.max(.5, Math.min(2.3, s.phi));
    const tx = 0, ty = ALT - .05, tz = .03; let x = tx + s.dist * Math.sin(s.phi) * Math.sin(s.theta), y = ty + s.dist * Math.cos(s.phi), z = tz + s.dist * Math.sin(s.phi) * Math.cos(s.theta);
    x = Math.max(-RW / 2 + .1, Math.min(RW / 2 - .1, x)); y = Math.max(.1, Math.min(RH - .1, y)); z = Math.max(.08, Math.min(RD - .1, z));
    cam.position.set(x, y, z); cam.lookAt(tx, ty, tz); r.render(scene, cam); }
  async function show(canvas, p, panels, art, msg) { cv = canvas;
    try { await load(); if (!s.ready) { init(); s.ready = true; } }
    catch { msg('Não consegui abrir o quarto 3D neste aparelho.'); return false; }
    if (s.dirty) { msg('Montando o quarto…'); await new Promise(f => setTimeout(f, 30)); buildLamp(p, panels, art); computeLux(p, panels); s.dirty = false; paint(); }
    size(); msg(''); return true; }
  const set = (k, v) => { s[k] = v; if (s.ready && !s.dirty) { paint(); render(); } };
  const view = (theta, phi, dist) => { Object.assign(s, { theta, phi, dist }); render(); };
  return { show, set, view, dirty: () => { s.dirty = true; }, state: s };
})();

/* Manual de montagem: lista de compras e passos com ilustrações animadas em SVG.
   As medidas vêm do projeto aberto. */
const Manual = (() => {
  const K = '#3a3847', B = '#26252f', E = '#f1ead9', Y = '#ffbe6b', D = '#a9a4b4', W = '#9fd0ff', RD = '#ff7a66';
  const svg = b => `<svg viewBox="0 0 320 170" role="img">${b}</svg>`;
  const t = (x, y, s, c = D, a = 'middle', z = 11) => `<text x="${x}" y="${y}" fill="${c}" font-size="${z}" text-anchor="${a}" font-family="IBM Plex Mono,monospace">${s}</text>`;
  const r = (x, y, w, h, f = B, s = K, e = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${f}" stroke="${s}" stroke-width="1.5" ${e}/>`;
  const l = (a, b, c, d, s = Y, w = 2, e = '') => `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="${s}" stroke-width="${w}" stroke-linecap="round" ${e}/>`;
  const g = (cls, b) => `<g class="${cls}">${b}</g>`;
  const ART = {
    print: svg(r(30, 130, 260, 10, K) + r(46, 104, 74, 26) + t(83, 121, 'caixa') + r(132, 120, 60, 10) + t(162, 116, 'tampo') + r(204, 124, 70, 6, B) + t(239, 116, 'painéis') + g('a-dn', l(160, 20, 160, 56, D, 8) + `<path d="M150 56h20l-10 14z" fill="${Y}"/>`) + t(160, 158, 'peças apoiadas na mesa, sem suporte')),
    clean: svg(r(40, 70, 240, 44) + `<path d="M70 70l14 -12 14 12 16 -20 18 20 26 -16 16 16 22 -14 20 14" fill="${B}" stroke="${K}"/>` + g('a-rt', r(150, 40, 66, 12, D, D) + l(216, 46, 262, 28, D, 6)) + t(160, 140, 'lixe bordas e limpe os fiapos dos recortes')),
    tube: svg(r(30, 80, 250, 16, 'none', W) + l(208, 62, 208, 114, RD, 2) + g('a-pulse', t(208, 54, 'marque aqui', RD)) + l(30, 124, 208, 124, D, 1) + t(118, 140, 'TUBE_MM mm') + g('a-rt', `<path d="M226 62l-18 26 6 4 18 -24z" fill="${D}"/>`)),
    wire: svg(`<circle cx="42" cy="86" r="0"/>` + r(16, 68, 58, 36, '#2d3a4a', W) + t(45, 90, 'pilhas', E) + r(104, 72, 42, 28) + t(125, 90, 'chave', E) + r(176, 78, 44, 16, '#c9a56b', '#c9a56b') + t(198, 90, '10 Ω', '#2b1a05') + `<circle cx="280" cy="86" r="16" fill="${Y}" class="a-pulse"/>` + t(280, 90, 'LED', '#2b1a05') + l(74, 86, 104, 86, RD, 2.5, 'class="a-flow"') + l(146, 86, 176, 86, RD, 2.5, 'class="a-flow"') + l(220, 86, 264, 86, RD, 2.5, 'class="a-flow"') + `<path d="M280 102v30H45v-28" fill="none" stroke="${D}" stroke-width="2.5"/>` + t(165, 148, 'preto: volta para o − das pilhas') + t(165, 42, 'vermelho: + das pilhas', RD) + t(265, 62, '+', RD) + t(296, 62, '−')),
    cap: svg(r(40, 90, 200, 16, 'none', W) + t(130, 128, 'tubo') + l(60, 96, 236, 96, RD, 1.2) + l(60, 100, 236, 100, D, 1.2) + g('a-lf', r(246, 82, 8, 32, E, E) + r(232, 89, 16, 18, E, E) + r(226, 90, 5, 16, Y, Y)) + t(250, 66, 'suporte + LED') + `<path d="M222 98l-30 -14v28z" fill="${Y}" opacity=".3" class="a-pulse"/>` + t(205, 140, 'LED virado para dentro')),
    box: svg(r(90, 26, 140, 120) + r(114, 92, 92, 44, '#191821') + t(160, 118, 'abertura das pilhas') + `<circle cx="160" cy="52" r="6" fill="#191821" stroke="${K}"/>` + t(160, 38, 'gancho') + g('a-lf', r(226, 72, 30, 20, Y, Y) + t(241, 86, 'chave', '#2b1a05')) + t(160, 162, 'caixa vista por trás')),
    close: svg(r(70, 104, 180, 34) + t(160, 126, 'caixa') + g('a-dn', r(70, 74, 180, 8, B) + t(160, 66, 'tampo')) + [86, 234].map(x => g('a-dn', '') + `<rect x="${x - 3}" y="110" width="6" height="26" fill="${K}"/>`).join('') + g('a-up', l(86, 136, 86, 156, D, 3) + l(234, 136, 234, 156, D, 3)) + t(160, 30, 'parafusos M3 × 20 entram por trás')),
    art: svg(r(70, 118, 180, 14) + t(160, 150, 'tampo') + r(154, 44, 12, 74, 'none', W) + g('a-dn', r(78, 104, 66, 8, E, E) + r(176, 104, 66, 8, E, E) + t(110, 96, 'estampa', E) ) + t(195, 40, 'encaixa em volta do tubo')),
    wall: svg(r(70, 118, 180, 14) + r(150, 40, 20, 78, 'none', W) + g('a-rt', r(70, 56, 6, 62, '#141418', D)) + g('a-lf', r(244, 56, 6, 62, '#141418', D)) + t(160, 26, 'cole os painéis em volta da aba') + t(38, 90, 'painel') + t(282, 90, 'painel')),
    hang: svg(r(120, 6, 80, 158, '#32313d', K) + t(160, 24, 'parede', E) + `<circle cx="160" cy="46" r="3.5" fill="${Y}"/>` + g('a-dn', r(118, 50, 84, 96) + `<path d="M154 66a6 6 0 1 1 12 0v0l-3 3v-14h-6v14z" fill="#191821"/>`) + t(250, 90, 'encaixe e') + t(250, 104, 'puxe para baixo')),
    on: svg(`<rect width="320" height="170" fill="#0d0c12"/><ellipse cx="160" cy="84" rx="150" ry="74" fill="${Y}" opacity=".22" class="a-pulse"/>` + `<path d="M126 84c-44 -70 -30 -66 34 -54 64 -12 78 -16 34 54 34 60 -96 60 -68 0z" fill="#0d0c12"/>` + r(136, 58, 48, 56, E, E) + `<circle cx="160" cy="86" r="4" fill="${Y}"/>`)
  };
  const CHECK = [
    ['Para imprimir', [['Filamento PLA ou PETG preto', 'opaco, para caixa, tampo e painéis', 'FIL g no total'], ['Filamento PLA claro', 'só se usar estampa do fundo']]],
    ['Eletrônica', [['LED branco quente de 1 W em placa redonda de até 8 mm', 'precisa passar dentro do tubo; emissor de até 3 mm deixa a sombra mais nítida'], ['Resistor de 10 Ω, 1 W', 'limita a corrente do LED'], ['Interruptor de balancim KCD1-11', 'janela de 19 × 13 mm'], ['Suporte para 3 pilhas AA', 'até 70 × 50 × 20 mm, com fios'], ['3 pilhas AA'], ['Fio fino flexível, vermelho e preto', '26 AWG, cerca de 50 cm de cada'], ['Termorretrátil fino', 'para isolar as emendas']]],
    ['Tubo e fixação', [['Tubo de acrílico transparente', 'Ø12 mm externo, Ø10 mm interno, corte de TUBE_MM mm'], ['4 parafusos M3 × 20 mm', 'fecham o tampo'], ['2 parafusos M2 × 6 mm', 'prendem a portinhola'], ['1 parafuso e bucha de parede', 'cabeça até 8 mm, haste até 3,5 mm'], ['Fita dupla-face', 'prende o suporte das pilhas']]],
    ['Colas e acabamento', [['Cola de cianoacrilato (Super Bonder)', 'para os painéis'], ['Bicarbonato de sódio', 'opcional, reforça as colagens com cianoacrilato'], ['Lixa 220 e estilete'], ['Pano seco']]],
    ['Ferramentas', [['Ferro de solda e estanho'], ['Alicate de corte e desencapador'], ['Multímetro', 'para conferir a ligação antes de fechar'], ['Isqueiro ou soprador', 'para o termorretrátil'], ['Serra fina', 'para cortar o tubo'], ['Chave Phillips pequena e média'], ['Furadeira', 'só para o parafuso de parede'], ['Óculos de proteção']]]
  ];
  const STEPS = p => [
    ['Imprima as peças', 'print', ['Baixe <b>Peças em ZIP</b> ou <b>STL único</b> na aba Imprimir.', 'Use camada de 0,2 mm, bico de 0,4 mm e sem raft.', 'Painéis, tampo e portinhola ficam deitados. A caixa fica com o fundo na mesa.', 'A estampa, se houver, começa em filamento claro e troca para o escuro na altura de 1,2 mm.'], ''],
    ['Limpe as peças', 'clean', ['Tire fiapos dos recortes com o estilete.', 'Lixe de leve as bordas que vão ser coladas.', 'Teste os encaixes a seco, antes de colar.'], 'Os painéis têm partes finas. Segure pela faixa lisa.'],
    ['Corte o tubo', 'tube', [`Marque <b>${p.tube} mm</b> no tubo de acrílico.`, 'Corte com serra fina, girando o tubo.', 'Lixe a ponta para encaixar no suporte do LED e no anel do tampo.'], 'Use óculos: acrílico lasca ao cortar.'],
    ['Faça a ligação elétrica', 'wire', ['Siga a ordem: <b>+ das pilhas → interruptor → resistor → + do LED</b>.', 'Ligue o − do LED de volta ao − das pilhas.', 'Solde dois fios de cerca de 50 cm no LED, com o + bem identificado.', 'Deixe o interruptor e o resistor para ligar depois de passar os fios pelo tubo, ou faça as emendas com folga.', 'Isole cada emenda com termorretrátil.'], 'O LED tem polaridade: invertido, ele não acende. Confira no multímetro antes de fechar.'],
    ['Monte o LED no tubo', 'cap', ['Cole a placa do LED na ponta do suporte, com a luz virada para fora do plugue.', 'Passe os fios por dentro do tubo.', 'Encaixe o suporte na ponta do tubo. Com a peça montada, o LED fica virado para a parede.', 'Deixe os fios juntos, de um lado só: eles fazem menos sombra.'], ''],
    ['Coloque tubo e fios no tampo', 'art', ['Passe os fios pelo furo central do tampo.', 'Encaixe a outra ponta do tubo no anel do tampo e cole com cuidado.', 'Se tiver estampa, encaixe-a em volta do tubo, dentro da aba, com o topo da imagem no lado do gancho.'], 'Evite excesso de cola: cianoacrilato pode embaçar o acrílico. Teste antes.'],
    ['Instale interruptor e pilhas', 'box', ['Encaixe o interruptor na janela lateral da caixa.', 'Cole o suporte de pilhas no lado de baixo do tampo, com fita dupla-face, alinhado com a abertura de trás.', 'Complete a ligação do passo 4 e teste com pilhas.'], ''],
    ['Feche o tampo', 'close', ['Acomode os fios sem prendê-los nos pilares.', 'Coloque o tampo sobre a caixa.', 'Aperte os 4 parafusos M3 por trás, sem forçar: a rosca é feita no próprio plástico.'], ''],
    ['Cole os painéis', 'wall', ['Veja no ateliê, em <b>Peças</b>, qual é cada painel.', 'A faixa lisa fica embaixo, encostada no tampo e por fora da aba.', 'Olhando de fora, com a borda livre para cima, o furinho fica à esquerda.', 'O superior fica do lado do gancho. Superior e inferior vão primeiro; direito e esquerdo entram entre eles.', 'Cole também os cantos onde os recortes se encontram: essa colagem segura pedaços da sombra.'], 'Cianoacrilato cola a pele. Use pouco e trabalhe com calma.'],
    ['Pendure na parede', 'hang', ['Fure a parede e coloque bucha e parafuso, deixando a cabeça para fora.', 'Encaixe a parte larga do furo no parafuso e puxe a luminária para baixo.', 'Coloque as pilhas e feche a portinhola com os 2 parafusos M2 antes de pendurar.', 'Escolha uma parede lisa e clara.'], ''],
    ['Ligue e confira', 'on', ['Apague a luz do quarto e ligue o interruptor.', 'Se a sombra estiver borrada, confira se o LED está centralizado no tubo.', 'Se não acender, confira polaridade, pilhas e emendas.'], 'O LED esquenta. Confira a temperatura nos primeiros minutos e não deixe a peça ligada sem supervisão até ter certeza. PLA amolece perto de 60 °C.']
  ];
  const load = () => { try { return JSON.parse(localStorage.getItem('manualCheck') || '{}'); } catch { return {}; } };
  const save = o => { try { localStorage.setItem('manualCheck', JSON.stringify(o)); } catch {} };
  function open(p) {
    const tube = Sombra.tubeLen(p).toFixed(0), seen = load(), box = document.getElementById('manual');
    const fil = (document.getElementById('parts').textContent.match(/Filamento estimado(\d+) g/) || [])[1] || '–';
    const sub = s => s.replace('TUBE_MM', tube).replace('FIL g', fil + ' g');
    const buy = CHECK.map(([h, items]) => `<h3>${h}</h3><div class="buy">` + items.map(([a, b, c]) => { const k = a.slice(0, 24); return `<label><input type="checkbox" data-k="${k}" ${seen[k] ? 'checked' : ''}><span>${a}${b || c ? `<small>${sub([b, c].filter(Boolean).join(' · '))}</small>` : ''}</span></label>`; }).join('') + '</div>').join('');
    const steps = STEPS({ tube }).map(([h, art, li, w], i) => `<article class="mstep"><h2><span>Passo ${i + 1} de 11</span><br>${h}</h2>${sub(ART[art])}<ul>${li.map(x => `<li>${x}</li>`).join('')}</ul>${w ? `<p class="warnbox">Atenção: ${w}</p>` : ''}</article>`).join('');
    box.innerHTML = `<div class="top"><h1>Manual de montagem</h1><button class="btn slim" id="closeManual">Voltar ao ateliê</button></div>
      <p>Medidas deste projeto: caixa de ${p.W} × ${p.H} mm, profundidade total de ${p.D} mm e sombra de ${Math.round(p.S / 10)} cm.</p>
      <section><h2>Lista de compras</h2><p>Marque o que você já tem. As marcações ficam salvas neste aparelho.</p>${buy}</section>${steps}`;
    box.hidden = false; document.getElementById('appMain').hidden = true; scrollTo(0, 0);
    box.querySelectorAll('[data-k]').forEach(c => c.onchange = () => { const o = load(); o[c.dataset.k] = c.checked; save(o); });
    document.getElementById('closeManual').onclick = () => { box.hidden = true; document.getElementById('appMain').hidden = false; scrollTo(0, 0); };
  }
  return { open };
})();

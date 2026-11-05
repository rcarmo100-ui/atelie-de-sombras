# Ateliê de Sombras

Crie luminárias de sombra para impressão 3D direto no navegador do celular.
Envie uma imagem ou desenhe na parede simulada, confira a sombra e baixe as peças em STL.

Site estático, sem etapa de build: `index.html` carrega `src/`. Para testar localmente:

    python3 -m http.server 8000

- `src/core.js`: geometria, simulação da sombra, malhas, STL e ZIP
- `src/app.js`: interface
- `src/convert.js`: conversor de imagem para sombra
- `src/room.js`: quarto 3D
- `vendor/earcut.min.js`: triangulação (licença ISC, em `vendor/earcut-LICENSE`)
- `vendor/three.min.js`: 3D (licença MIT, em `vendor/three-LICENSE`)

## Créditos

A moldura circular e as medidas iniciais da caixa foram inspiradas no [ShadowBox](https://github.com/Akirakato1/ShadowBox), de Akirakato1 (licença MIT).

## Licença

© 2026 Romario. Todos os direitos reservados. Veja `LICENSE`.

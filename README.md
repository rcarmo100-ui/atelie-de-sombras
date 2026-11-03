# Ateliê de Sombras

Crie luminárias de sombra para impressão 3D direto no navegador do celular.
Envie uma imagem ou desenhe na parede simulada, confira a sombra e baixe as peças em STL.

Site estático, sem etapa de build: `index.html` carrega `src/`. Para testar localmente:

    python3 -m http.server 8000

- `src/core.js`: geometria, simulação da sombra, malhas, STL e ZIP
- `src/app.js`: interface
- `vendor/earcut.min.js`: triangulação (licença ISC, em `vendor/earcut-LICENSE`)

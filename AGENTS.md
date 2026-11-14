# Instruções para agentes de IA

Projeto: **Caramulo em chamas**, NASA Space Apps Challenge 2026 (*Dancing with the SARs*).
Uma app estática que conta o incêndio de Vouzela/Caramulo (2–5 jul 2026) só com radar NISAR.

## Lê antes de começar

1. [docs/DOSSIER.md](docs/DOSSIER.md): o problema, o radar, o caso e os valores comuns (zona, datas, órbitas). Fonte de verdade.
2. [docs/PLAN.md](docs/PLAN.md): quem faz o quê, fases, portões e tarefas (IDs como `A2`, `D4`).
3. [docs/CONTRACT.md](docs/CONTRACT.md): grelha comum, nomes de ficheiros, `manifest.json`, caminhos HDF5.
4. [docs/PRODUCTS.md](docs/PRODUCTS.md): produtos NISAR que existem e os que usámos.

## Regras

- Cada pedido traz o ID da tarefa. Trabalha numa tarefa e numa pasta de cada vez.
- Entrega por pull request pequeno, numa branch com o ID (`a2-gunw-coherence`); commits começam pelo ID (`A2: export coherence to common grid`). Nunca faças commit direto em `main`.
- Não alteres `docs/CONTRACT.md`, `pipeline/caramulo/grid.py` nem a API do mapa sem o dono da frente aprovar.
- Não inventes caminhos HDF5 nem nomes de produtos: usa os de `CONTRACT.md` e `PRODUCTS.md`.
- Não escrevas números nem valores da grelha à mão: vêm de `grid.py` ou de ficheiros do pipeline.
- Dados brutos nunca entram no git (`data/` está ignorado); só as camadas finais em `web/public/layers/`.
- Tudo o que o utilizador vê é em inglês; a documentação interna pode ser em português.
- Validade primeiro: nada de afirmar o que os dados não mostram; hipóteses dizem-se hipóteses.
- Usa o que já existe antes de escrever código novo; sem dependências novas para o que poucas linhas resolvem.
- Regista o uso relevante de IA numa linha em `docs/AI_USE.md`.

## Comandos

```bash
make install   # pipeline (uv sync) + web (npm install)
make check     # o que o CI corre
make dev-web   # http://localhost:5173
```

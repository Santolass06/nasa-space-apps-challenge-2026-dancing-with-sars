# Plano de trabalho — Caramulo em chamas

Nov 14, 2026 · @André Miguel Rodrigues dos Santos

Cinco pessoas, cinco frentes em paralelo, seis fases com portões de integração, e submissão às 20:00 de domingo. Este plano complementa o [dossier da equipa](DOSSIER.md): o dossier diz o quê e porquê, este diz quem, quando e como.

## Visão geral

&#91;embedded content: frentes × fases · 5 portões de integração\]

Lê-se de cima para baixo: cada linha é uma fase, cada coluna uma pessoa. Dentro de uma fase as cinco frentes não esperam umas pelas outras, porque a app trabalha com camadas falsas até chegarem as reais; só nos portões é que tudo se junta.

## Stack

Duas metades que só se tocam por ficheiros: um pipeline Python que corre offline e uma app estática que os lê. Não há backend, por isso nada pode cair durante a demo.

| Camada | Escolha | Porquê | Rejeitado |
| --- | --- | --- | --- |
| Ambiente Python | Python 3.12 com `uv` | Um comando instala tudo, igual nas cinco máquinas e nos agentes | conda (lento a resolver) |
| Pesquisa e download NISAR | `asf_search` + `earthaccess` | Bibliotecas oficiais da ASF e da NASA; autenticação Earthdata por `.netrc` | Download manual no Vertex (não é reprodutível) |
| Leitura dos produtos | `h5py` + `numpy` | GCOV e GUNW são HDF5; leitura direta, sem dependências pesadas | ISCE3 (instalação demorada) |
| Reprojeção e recorte | `rasterio` (`rasterio.warp`) | Leva tudo para a grelha comum numa função | GDAL na linha de comandos (difícil de testar) |
| Vetores e áreas | `geopandas` + `shapely` | Polígono da área ardida, área em hectares, interseção com o perímetro oficial | QGIS (manual) |
| Limpeza de máscaras | `scipy.ndimage` | Filtro e morfologia para tirar ruído ao limiar de coerência | Modelos de ML (sem tempo para validar) |
| Contexto ótico | `pystac-client` + `rasterio` sobre o Earth Search | Sentinel-2 em COG, sem conta | Copernicus Browser (manual) |
| Exportação | PNG com transparência + GeoJSON + JSON | A app carrega-os como ficheiros estáticos; o GeoTIFF fica como intermédio | Servidor de tiles (complexidade sem ganho numa zona de 40 km) |
| App | Vite + React + TypeScript | O que os agentes de IA escrevem com menos erros; build estático | Next.js (servidor desnecessário) |
| Mapa | MapLibre GL JS | Open-source, sem chave; camadas de imagem georreferenciada e GeoJSON nativas | Mapbox (chave e licença), Leaflet (transições mais fracas) |
| Mapa de base | Estilo vetorial aberto, por exemplo OpenFreeMap | Sem chave nem limite de uso; confirmar na F0 | Google Maps |
| História guiada | `scrollama` | Dispara um passo da história por cada bloco de texto que entra no ecrã | Biblioteca própria |
| Antes/depois | Slider próprio com dois mapas sincronizados | Vinte linhas; controlo total do aspeto | Plugins antigos de comparação |
| Gráficos | Observable Plot | Série temporal em poucas linhas | D3 puro (lento de escrever) |
| Estilo | Tailwind CSS | Consistência visual entre duas pessoas a fazer UI | CSS solto |
| Alojamento | GitHub Pages por GitHub Actions | Cada merge em `main` publica; o link público serve para a submissão | Vercel (fica como alternativa) |
| Licença | Apache-2.0 | O desafio pede open-source; é a licença por omissão da NASA | MIT (decisão: manter Apache-2.0) |

## Arquitetura e contrato de dados

O contrato de dados é o que permite paralelizar: a app trabalha com camadas falsas no formato certo enquanto o pipeline produz as verdadeiras. Fecha-se na Fase 0 e só muda com aviso a toda a equipa.

### Repositório

```text
caramulo/
  README.md              como correr tudo, em inglês
  AGENTS.md              instruções para agentes de IA (aponta para o dossier e este plano)
  LICENSE                Apache-2.0
  docs/
    CONTRACT.md          o contrato desta secção, versão canónica
    DECISIONS.md         uma linha por decisão tomada, com data e autor
    AI_USE.md            onde e como se usou IA
  pipeline/
    pyproject.toml
    caramulo/
      grid.py            a grelha comum (caixa, projeção, tamanho)
      fetch.py           pesquisa e download NISAR
      gunw.py            coerência a partir de GUNW
      gcov.py            HH e HV em dB a partir de GCOV
      s2.py              Sentinel-2 cor verdadeira
      burn.py            máscara, polígono e área ardida
      series.py          série temporal por zona
      export.py          PNG, GeoJSON, manifest
    run.py               corre o pipeline de ponta a ponta
  data/                  dados brutos e intermédios (fora do git)
  web/
    public/layers/       saída do pipeline, lida pela app (no git)
    src/
      map/               mapa, camadas, slider, legenda
      story/             atos, passos, textos
      explore/           modo de exploração livre
      content/story.en.json   todos os textos da história
```

### Grelha comum

Todas as camadas raster saem exatamente com a mesma caixa, projeção e tamanho, para se sobreporem sem ajustes.

- Caixa: lon −8,50 a −7,95; lat 40,45 a 40,85 (a do dossier, estendida a oeste no A2).
- Projeção de saída: Web Mercator (EPSG:3857), a do mapa.
- Tamanho: metade da grelha — 1000 px de largura (~46 m/px, 1000 × 958) para as camadas raster, abaixo de 1 MB cada (C7); a grelha de análise fica a 2000 px (~23 m/px) em `grid.py`.
- `grid.py` é a única fonte destes valores. Ninguém os escreve à mão noutro ficheiro.

### Nomes dos ficheiros

`{tipo}_{órbita}_{data}.png` para uma data e `{tipo}_{órbita}_{data1}_{data2}.png` para um par. Datas em `AAAAMMDD`.

| Tipo | O que é | Produto | Exemplo |
| --- | --- | --- | --- |
| `coh` | Coerência entre duas datas (0 a 1) | GUNW | `coh_D52_20260629_20260711.png` |
| `hh`, `hv` | Brilho numa data, em dB | GCOV | `hv_D52_20260711.png` |
| `dhv`, `dhh` | Diferença de brilho entre duas datas, em dB | GCOV | `dhv_D52_20260629_20260711.png` |
| `rgb` | Composição de cor HH, HV, HH/HV | GCOV | `rgb_D52_20260711.png` |
| `s2` | Sentinel-2 em cor verdadeira | Sentinel-2 L2A | `s2_20260628.png` |

Vetores e números: `burn_nisar.geojson` (o nosso polígono), `burn_official.geojson` (EFFIS ou ICNF), `progress.geojson` (área ardida até cada data), `places.geojson` (lugares da história), `stats.json` (áreas e sobreposição) e `series.json` (série temporal).

### manifest.json

A app não conhece nomes de ficheiros: lê `web/public/layers/manifest.json` e desenha o que lá estiver. Uma entrada por camada:

```json
{
  "version": 1,
  "bounds": [-8.5, 40.45, -7.95, 40.85],
  "layers": [
    {
      "id": "coh_D52_20260629_20260711",
      "kind": "coh",
      "file": "coh_D52_20260629_20260711.png",
      "orbit": "D52",
      "dates": ["2026-06-29", "2026-07-11"],
      "title": "Coherence, 29 Jun to 11 Jul",
      "units": "coherence",
      "range": [0, 1],
      "colormap": "gray",
      "source": "<nome do produto NISAR>",
      "caveat": "Low coherence also occurs over water and dense forest"
    }
  ]
}
```

- `title` e `caveat` em inglês, porque aparecem na app.
- `source` é obrigatório: é a proveniência que o júri pode verificar.
- `range` e `colormap` alimentam a legenda; a app não adivinha escalas.

### Dentro dos HDF5

Caminhos esperados, a confirmar com `h5ls -r` no primeiro ficheiro (tarefa A1 e B1) e a registar em `CONTRACT.md`:

- GUNW: `science/LSAR/GUNW/grids/frequencyA/unwrappedInterferogram/HH/coherenceMagnitude`.
- GCOV: `science/LSAR/GCOV/grids/frequencyA/HHHH` e `HVHV`, em potência linear; dB = 10 · log10(valor).
- Em ambos, as coordenadas e a projeção (UTM) vêm em `xCoordinates`, `yCoordinates` e `projection` do mesmo grupo.

## Equipa

Cinco frentes, uma pessoa por frente, cada uma dona de uma pasta: quase não há conflitos de merge e cada pessoa pode pôr um agente a trabalhar na sua parte. As letras são lugares; os nomes escolhem-se na Fase 0.

| Frente | Foco | Pasta | Entrega | Recebe de |
| --- | --- | --- | --- | --- |
| A — Coerência | GUNW: coerência de todos os pares, polígono e área ardida, progressão do fogo | `pipeline/` (`fetch`, `gunw`, `burn`) | Camadas `coh`, `burn_nisar.geojson`, `progress.geojson`, `stats.json` | E (perímetro oficial) |
| B — Brilho | GCOV: HH e HV em dB, diferenças, composição de cor, série julho–outubro; Sentinel-2 | `pipeline/` (`gcov`, `s2`, `series`) | Camadas `hh`, `hv`, `dhv`, `rgb`, `s2`, `series.json` | A (polígono, para a série) |
| C — Mapa | Motor do mapa: leitura do manifest, camadas, slider, legenda, seletor de datas, exploração livre | `web/src/map`, `web/src/explore` | Componentes de mapa que a história comanda | A e B (camadas reais) |
| D — História | Scrollytelling dos seis atos, design visual, gráficos, versão móvel | `web/src/story` | A experiência guiada de ponta a ponta | C (API do mapa), E (textos) |
| E — Conteúdo e integração | Textos em inglês, validação científica, perímetro oficial e lugares, documentação, vídeo e página do projeto; conduz os portões | `web/src/content`, `docs/` | `story.en.json`, `burn_official.geojson`, `places.geojson`, README, demo | Todos |

- A e B partilham `grid.py`, `export.py` e `run.py`. Quem lhes tocar avisa o outro antes.
- C expõe à história uma API pequena, por exemplo `showLayers(ids)`, `compare(leftId, rightId)`, `flyTo(view)` e `showVector(id)`. D nunca mexe no MapLibre diretamente.
- E é o integrador: decide o que entra em cada portão e é a única pessoa que altera `CONTRACT.md`.

## Fases e portões

Cada fase acaba num portão: dez minutos em que os cinco param, juntam o trabalho em `main` e veem a app publicada. Só se passa à fase seguinte com o critério cumprido; se não estiver, aplica-se a ordem de corte.

| Fase | Quando | Objetivo | Portão: passa se… |
| --- | --- | --- | --- |
| F0 — Arranque | Sáb 16:00–17:00 | Repositório, contrato, camadas falsas, contas, frentes atribuídas | P0: `CONTRACT.md` em `main`; `run.py --mock` escreve PNG falsos e `manifest.json` em `web/public/layers/`; a app publicada abre o mapa em Vouzela; todas as máquinas ativas correm o projeto (mostrar as camadas falsas é a C1, no P1) |
| F1 — Fundações | Sáb 17:00–20:30 | Cada frente prova a sua parte mais arriscada | P1: fatia vertical — uma coerência real aparece na app publicada, vinda do manifest |
| F2 — Núcleo | Sáb 20:30–01:00 | Atos 1, 3 e 4 com dados reais | P2: slider antes/depois, polígono com área em hectares e comparação HH, HV e coerência funcionam |
| F3 — História completa | Dom 09:00–14:00 | Atos 2, 5 e 6, exploração livre | P3: os seis atos leem-se de ponta a ponta; a partir daqui não entram funcionalidades |
| F4 — Polimento e validação | Dom 14:00–17:00 | Corrigir, rever ciência e texto, documentar | P4: sem erros na consola, textos revistos, README completo; o código congela |
| F5 — Entrega | Dom 17:00–20:00 | Vídeo de 30 s, página do projeto, submissão | Submetido às 20:00, com folga |

O caminho crítico é A1 → A2 → A4 → ato 3: abrir o GUNW, exportar a coerência, tirar o polígono. Tudo o resto tem folga ou alternativa.

## Tarefas: Fase 0 e Fase 1

Cada tarefa tem um ID para usar em branches, commits e pedidos aos agentes. “Depende de” indica o que tem de estar feito antes; tarefas sem dependências comuns correm em paralelo.

### F0 — Arranque (sábado 16:00–17:00)

| ID | Dono | Tarefa | Depende de | Feito quando |
| --- | --- | --- | --- | --- |
| T1 | C | Criar o repositório com a estrutura de pastas; Vite + React + TypeScript + Tailwind + MapLibre a compilar; publicação automática no GitHub Pages | — | O link público mostra um mapa centrado em Vouzela |
| T2 | A + B | `pipeline/` com `uv`; `grid.py` e `export.py`; modo `--mock` que gera camadas falsas na grelha certa | — | `uv run python run.py --mock` escreve PNG e `manifest.json` em `web/public/layers/` |
| T3 | E | Escrever `CONTRACT.md`, `AGENTS.md` e `DECISIONS.md`; registar quem fica em cada frente | — | Os três ficheiros em `main`, lidos pelos cinco |
| T4 | Todos | Conta Earthdata e `.netrc` em cada máquina | — | o login com `.netrc` funciona em todas as máquinas ativas. A pesquisa `asf_search` funciona sem login, por isso não prova nada: o teste a sério é o primeiro download de A1 |
| T5 | D + E | Storyboard: cada ato dividido em passos, e cada passo com as camadas de que precisa | T3 | `story.en.json` com todos os passos e IDs de camada, textos ainda provisórios |

### F1 — Fundações (sábado 17:00–20:30)

| ID | Dono | Tarefa | Depende de | Feito quando |
| --- | --- | --- | --- | --- |
| A1 | A | Descarregar o GUNW D52 de 29 jun → 11 jul; inspecionar com `h5ls -r`; registar os caminhos reais | T4 | Ficheiro em `data/`, caminhos em `CONTRACT.md` |
| A2 | A | `gunw.py`: ler a coerência, reprojetar para a grelha, exportar PNG e entrada no manifest | A1, T2 | A mancha do fogo vê-se em `coh_D52_20260629_20260711.png` |
| A3 | A | Listar todos os GUNW e GCOV disponíveis para as órbitas do dossier, incluindo um par D52 anterior ao fogo (17 → 29 jun) | T4 | Tabela de produtos em `docs/PRODUCTS.md`, com o que existe e o que falta |
| B1 | B | Descarregar os GCOV D52 de 29 jun e 11 jul; inspecionar; registar os caminhos reais | T4 | Ficheiros em `data/`, caminhos em `CONTRACT.md` |
| B2 | B | `gcov.py`: HH e HV em dB na grelha, exportados como PNG | B1, T2 | Quatro camadas (`hh` e `hv`, duas datas) no manifest |
| B3 | B | `s2.py`: uma imagem Sentinel-2 sem nuvens antes e outra depois do fogo | T2 | Duas camadas `s2` no manifest |
| C1 | C | Ler o manifest e desenhar camadas raster por ID; API `showLayers` e `flyTo` | T1, T2 | As camadas falsas aparecem e trocam-se por ID |
| C2 | C | Slider antes/depois entre duas camadas quaisquer; API `compare` | C1 | O slider funciona com duas camadas falsas |
| C3 | C | Legenda gerada a partir de `range`, `colormap` e `units` | C1 | Cada camada mostra a sua legenda sem código específico |
| D1 | D | Esqueleto da história: os passos de `story.en.json` comandam o mapa pela API de C | T5, C1 | Fazer scroll pelos seis atos muda o mapa, com camadas falsas |
| D2 | D | Identidade visual: tipografia, cores, layout em computador e telemóvel | T1 | Um ato completo com o aspeto final |
| E1 | E | Obter o perímetro oficial (EFFIS ou ICNF) e convertê-lo | — | `burn_official.geojson` na pasta de camadas |
| E2 | E | Lugares e cronologia do fogo, com fontes | — | `places.geojson` e a cronologia em `story.en.json` |
| E3 | E | Textos em inglês, primeira versão, dos atos 1, 3 e 4 | T5 | Textos em `story.en.json`, uma frase por imagem |
| P1 | E conduz | Portão: juntar tudo em `main` e abrir a app publicada | A2, C1 | A coerência real aparece na app, vinda do manifest |

Se A1 não estiver feito às 18:30, B pára o que está a fazer e ajuda A: sem coerência não há ato 3.

## Tarefas: Fase 2 e Fase 3

### F2 — Núcleo (sábado 20:30–01:00)

| ID | Dono | Tarefa | Depende de | Feito quando |
| --- | --- | --- | --- | --- |
| A4 | A | `burn.py`: limiar na coerência com limpeza de ruído → máscara → polígono → área em hectares; sobreposição com o perímetro oficial | A2, E1 | `burn_nisar.geojson` e `stats.json` com a nossa área, a oficial e a percentagem comum |
| A5 | A | Correr `gunw.py` nos restantes pares: A15, A116, D124, D52 de controlo e D52 anterior ao fogo | A2, A3 | Uma camada `coh` por par disponível, no manifest |
| B4 | B | Diferenças `dhv` e `dhh` entre antes e depois; composição `rgb` | B2 | Três camadas novas no manifest |
| B5 | B | Números para o ato 4: média de HH, HV e coerência dentro e fora do polígono, antes e depois | B2, A4 | Tabela em `stats.json`; diz se o HV muda ou não, com valores |
| C4 | C | Camadas vetoriais (polígonos e lugares com etiqueta); API `showVector` | C1 | Os dois perímetros e os lugares desenham-se por ID |
| C5 | C | Seletor de tipo de camada e de data | C1 | Troca entre HH, HV, coerência e ótico sem recarregar |
| D3 | D | Ato 1 — Antes: ótico ao lado do radar, para ensinar a ler a imagem | C2, B2, B3 | O slider ótico/radar funciona com dados reais e texto |
| D4 | D | Ato 3 — A cicatriz: slider de coerência, polígono, a nossa área ao lado da oficial | C2, C4, A4 | O número em hectares vem de `stats.json`, não está escrito à mão |
| D5 | D | Ato 4 — Porque é que o radar vê isto: HH, HV e coerência lado a lado, e a explicação dos troncos | C5, B4, B5 | As três vistas comparam-se e o texto usa os valores de B5 |
| E4 | E | Validação: a mancha coincide com o perímetro? Rever cada afirmação dos atos 1, 3 e 4 contra os dados | A4 | Lista de afirmações marcadas como confirmada, hipótese ou a retirar |
| E5 | E | Textos, primeira versão, dos atos 2, 5 e 6; esboço da página do projeto | E2 | Textos em `story.en.json`; esboço em `docs/` |
| P2 | E conduz | Portão: atos 1, 3 e 4 com dados reais na app publicada | D3, D4, D5 | Os três atos leem-se sem camadas falsas |

### F3 — História completa (domingo 09:00–14:00)

| ID | Dono | Tarefa | Depende de | Feito quando |
| --- | --- | --- | --- | --- |
| A6 | A | Progressão do fogo: área ardida até 4 jul (pares A116 e D124) e até 9 e 11 jul | A5, A4 | `progress.geojson` com um polígono por data |
| B6 | B | Série julho–outubro numa órbita: camadas `hv` por data e média de HH e HV dentro do polígono e numa zona de controlo | B2, A4 | `series.json` e pelo menos quatro datas no manifest |
| C6 | C | Exploração livre: todas as camadas, todas as datas, slider entre quaisquer duas | C5 | Um utilizador sem guia consegue comparar duas camadas à escolha |
| C7 | C | Desempenho: comprimir os PNG e carregar cada camada só quando é precisa | C1 | A primeira vista abre em menos de 3 s numa ligação normal |
| D6 | D | Ato 2 — O fogo: cronologia, lugares e progressão | E2, A6, C4 | A cronologia avança e o polígono cresce com ela |
| D7 | D | Ato 5 — Depois: as datas da série e o gráfico | B6 | O gráfico lê `series.json` e destaca a data mostrada no mapa |
| D8 | D | Ato 6 — E agora: aplicações futuras e entrada na exploração livre | C6, E5 | O fim da história leva à exploração |
| E6 | E | Textos finais dos seis atos e explicações curtas dos termos de radar | E4, E5 | Nenhum texto provisório em `story.en.json` |
| E7 | E | Guião do vídeo de 30 s, plano a plano | P2 | Guião em `docs/`, com os ecrãs a gravar |
| B7 | B | Extra, só se B6 acabar antes das 12:00: Arganil como segundo capítulo | B6 | Um par de camadas e um parágrafo |
| P3 | E conduz | Portão: os seis atos de ponta a ponta | D6, D7, D8 | Leitura completa sem falhas; fecham as funcionalidades |

## Tarefas: Fase 4 e Fase 5

### F4 — Polimento e validação (domingo 14:00–17:00)

| ID | Dono | Tarefa | Depende de | Feito quando |
| --- | --- | --- | --- | --- |
| A7 | A | `run.py` reproduz todas as camadas a partir de dados brutos; documentar cada passo do pipeline | P3 | Uma pessoa de fora gera as camadas seguindo o README |
| B8 | B | Rever escalas e cores de todas as camadas raster: mesma escala entre datas comparáveis | P3 | Nenhum par antes/depois usa escalas diferentes |
| C8 | C | Testar em Chrome, Firefox e Safari, em computador e telemóvel; corrigir erros | P3 | Consola sem erros nos três browsers |
| D9 | D | Acabamento visual: transições, estados de carregamento, legibilidade em ecrã pequeno | P3 | A história lê-se bem num telemóvel |
| E8 | E | Revisão científica final: cada frase da app é facto com fonte, medida nossa ou hipótese assinalada | E6 | Lista de E4 sem itens em aberto |
| E9 | E | README em inglês, `AI_USE.md`, créditos de dados e de código externo, licença | P3 | Repositório público e completo |
| P4 | E conduz | Portão: congelar o código | A7–E9 | Etiqueta `v1.0` em `main`; depois disto só correções críticas |

### F5 — Entrega (domingo 17:00–20:00)

| ID | Dono | Tarefa | Depende de | Feito quando |
| --- | --- | --- | --- | --- |
| V1 | D + E | Gravar e montar o vídeo de 30 s: antes → fogo → cicatriz → porque importa | P4, E7 | Vídeo com 30 s ou menos, legendado em inglês, num link público |
| V2 | E | Página do projeto no site do Space Apps: resumo, descrição, dados usados, uso de IA, links | E9 | Todos os campos preenchidos em inglês |
| V3 | C | Verificação final dos links: app, repositório e vídeo abrem numa janela anónima | V1, V2 | Três links testados por alguém que não os criou |
| V4 | A + B | Rever a página do projeto contra o dossier: números, datas e órbitas | V2 | Nenhum valor diferente do que a app mostra |
| V5 | Todos | Submeter | V3, V4 | Submissão confirmada às 20:00 |

## Regras de trabalho

### Git

- Uma branch por tarefa, com o ID no nome: `a2-gunw-coherence`, `d4-act3`.
- Merge em `main` por pull request pequeno, várias vezes por fase. Nada fica mais de duas horas fora de `main`.
- `main` está sempre a funcionar: cada merge publica a app.
- Mensagens de commit começam pelo ID: `A2: export coherence to common grid`.
- Dados brutos nunca entram no git; só as camadas finais em `web/public/layers/`.

### Agentes de IA

- Cada pedido a um agente leva três coisas: o dossier, este plano e o ID da tarefa. `AGENTS.md` aponta para os dois documentos.
- Um agente trabalha numa tarefa e numa pasta de cada vez, e entrega por pull request como qualquer pessoa.
- O agente não altera `CONTRACT.md`, `grid.py` nem a API do mapa sem o dono da frente aprovar.
- Quem pede o trabalho ao agente é quem o revê: corre o código e olha para o resultado antes do merge.
- Em tarefas de dados, o agente não inventa caminhos de HDF5 nem nomes de produtos: usa os que estão em `CONTRACT.md` e `PRODUCTS.md`.
- Cada uso relevante fica numa linha em `AI_USE.md`: tarefa, ferramenta, o que fez.

### Documentação

| Documento | Para quê | Quem mantém |
| --- | --- | --- |
| Dossier da equipa | O problema, o radar, o caso, os dados | E |
| Este plano | Quem faz o quê e quando | E |
| `docs/CONTRACT.md` | Grelha, nomes, manifest, caminhos HDF5 | E, com A e B |
| `docs/PRODUCTS.md` | Que produtos NISAR existem e quais usámos | A |
| `docs/DECISIONS.md` | Decisões tomadas durante o fim de semana, uma linha cada | Quem decide |
| `docs/AI_USE.md` | Uso de IA, para a submissão | Todos |
| `README.md` | Como correr o pipeline e a app, em inglês | E, na F4 |
| Comentário no topo de cada módulo | O que entra, o que sai, que produto lê | Dono do módulo |

### Definição de feito

Uma tarefa está feita quando cumpre o seu critério na tabela e, além disso:

1. Está em `main` e a app publicada continua a funcionar.
2. Se produz uma camada, a camada está no manifest com `source` e `caveat`.
3. Se muda um número mostrado ao utilizador, o número vem de um ficheiro do pipeline.
4. Outra pessoa da equipa viu o resultado.

### Comunicação

- Um canal único. Bloqueios escrevem-se lá no momento, com o ID da tarefa.
- Ponto de situação de cinco minutos a meio de cada fase: o que está feito, o que está preso.
- Mudanças ao contrato anunciam-se antes de serem feitas, nunca depois.

## Riscos e ordem de corte

| Risco | Sinal | Resposta |
| --- | --- | --- |
| O GUNW não abre ou a coerência não está onde esperamos | A1 por fazer às 18:30 | B junta-se a A; em último caso, a pré-visualização PNG da ASF georreferenciada à mão serve de camada provisória até P2 |
| Downloads lentos (ficheiros de vários GB) | Um ficheiro demora mais de 20 min | Descarregar em duas máquinas em paralelo; limitar a série do ato 5 a quatro datas |
| A mancha não coincide com o perímetro oficial | Sobreposição abaixo de 60% em A4 | Rever a reprojeção primeiro, o limiar depois; se persistir, mostrar os dois contornos e explicar a diferença |
| O HV muda mais do que o dossier supõe | B5 mostra queda clara | Reescrever o ato 4 com o que os dados dizem; a história dos troncos sai |
| Não existe par D52 anterior ao fogo | A3 não o encontra | Usar outra órbita com par anterior; se nenhuma tiver, dizer na app que o controlo é posterior ao fogo |
| Conflitos entre A e B nos ficheiros partilhados | Dois pull requests a tocar em `export.py` | Um dos dois fica dono do ficheiro até ao portão seguinte |
| A app fica pesada | Primeira vista acima de 5 s | PNG de 1000 px para a história, 2000 px só na exploração |

### Ordem de corte

Se um portão não for cumprido a horas, corta-se por esta ordem, do primeiro para o último:

1. Arganil (B7).
2. Exploração livre (C6): o ato 6 fica só com texto e o seletor de camadas do ato 4.
3. Série do ato 5 reduzida a três datas, sem gráfico (B6, D7).
4. Progressão do fogo (A6): o ato 2 fica com cronologia e lugares sobre o polígono final.
5. Composição `rgb` e diferenças `dhh` (B4): o ato 4 usa só HV, HH e coerência.

Nunca se cortam: o slider de coerência, o polígono com a área, a comparação com o perímetro oficial, e o vídeo.

## Por decidir em equipa

Quatro escolhas ficam para a Fase 0. Cada uma tem uma proposta; se ninguém discordar em cinco minutos, vale a proposta.

- [ ] Quem fica em cada frente. Proposta: quem tem mais Python e dados fica em A e B, quem tem mais front-end em C e D, quem escreve melhor em inglês em E.
- [ ] Alojamento. Proposta: GitHub Pages; Vercel se a publicação automática falhar.
- [ ] Órbita da série do ato 5. Proposta: D52, por ser a do par principal.
- [ ] Nome público do projeto em inglês. Proposta: decidir até P2, para entrar no vídeo e na página.

Pressupostos deste plano, a corrigir se estiverem errados: o plano mantém as cinco frentes, mas o número de pessoas ativas varia ao longo do fim de semana; cada pessoa tem computador próprio e acesso a um agente de IA; a atribuição atual das frentes está em `docs/DECISIONS.md`; os caminhos HDF5 e o mapa de base estão por confirmar na F0 e F1.

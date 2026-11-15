# Contrato de dados

> Versão canónica do contrato (copiada de [PLAN.md](PLAN.md), secção "Arquitetura e contrato de dados").
> Só o integrador (frente E) a altera, depois de avisar a equipa. Os caminhos HDF5 do GUNW foram
> **confirmados na tarefa A1** (14 nov 2026) e estão registados abaixo; os do GCOV ficam por confirmar na B1.


O contrato de dados é o que permite paralelizar: a app trabalha com camadas falsas no formato certo enquanto o pipeline produz as verdadeiras. Fecha-se na Fase 0 e só muda com aviso a toda a equipa.

## Repositório

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

## Grelha comum

Todas as camadas raster saem exatamente com a mesma caixa, projeção e tamanho, para se sobreporem sem ajustes.

- Caixa: lon −8,50 a −7,95; lat 40,45 a 40,85 (estendida a oeste em 14 nov para cobrir a cicatriz inteira; ver `DOSSIER.md` e `DECISIONS.md`).
- Projeção de saída: Web Mercator (EPSG:3857), a do mapa.
- Tamanho: metade da grelha — 1000 px de largura (cerca de 46 m por píxel; 1000 × 958), para cada camada ficar abaixo de 1 MB e a primeira vista em menos de 3 s (C7). A grelha de análise continua a 2000 px (~23 m/px) em `grid.py`.
- `grid.py` é a única fonte destes valores. Ninguém os escreve à mão noutro ficheiro.

## Nomes dos ficheiros

`{tipo}_{órbita}_{data}.png` para uma data e `{tipo}_{órbita}_{data1}_{data2}.png` para um par. Datas em `AAAAMMDD`.

| Tipo | O que é | Produto | Exemplo |
| --- | --- | --- | --- |
| `coh` | Coerência entre duas datas (0 a 1) | GUNW | `coh_D52_20260629_20260711.png` |
| `hh`, `hv` | Brilho numa data, em dB | GCOV | `hv_D52_20260711.png` |
| `dhv`, `dhh` | Diferença de brilho entre duas datas, em dB | GCOV | `dhv_D52_20260629_20260711.png` |
| `rgb` | Composição de cor HH, HV, HH/HV | GCOV | `rgb_D52_20260711.png` |
| `s2` | Sentinel-2 em cor verdadeira | Sentinel-2 L2A | `s2_20260628.png` |

Vetores e números: `burn_nisar.geojson` (o nosso polígono), `burn_official.geojson` (EFFIS ou ICNF), `progress.geojson` (área ardida até cada data), `places.geojson` (lugares da história) e `stats.json` (áreas e sobreposição). A série temporal (`series.json`) foi cortada — ver `docs/DECISIONS.md`.

## manifest.json

A app não conhece nomes de ficheiros: lê `web/public/layers/manifest.json` e desenha o que lá estiver. Uma entrada por camada:

```json
{
  "version": 1,
  "bounds": [-8.50, 40.45, -7.95, 40.85],
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

## Passos da história com figura

Um passo de `story.en.json` pode ter `figure`: uma imagem que ocupa o mapa nesse passo (por exemplo, uma imagem de satélite com o fumo). Campos: `src` (caminho em `web/public/`), `alt`, `caption`, `credit`, `licence`, `licenceUrl` e `sourceUrl`. A app mostra sempre o crédito, a licença e a ligação à fonte por baixo da imagem, e só entram figuras com licença aberta que o permita (a licença é verificada e registada em `NOTICE` e `docs/data-sources.md`). Um passo com figura pode ter `layers: []`.

## Passos da história com zona em foco

Um passo pode ter `focus` (`bounds` = `[oeste, sul, este, norte]`, `label` e, opcionalmente, `view` com o enquadramento da câmara quando o leitor precisa de ver mais à volta): o mapa alarga, a câmara aproxima-se da zona e a zona fica contornada e com nome, para o texto do passo explicar um exemplo concreto. A zona escolhe-se com os dados à frente (por exemplo, a albufeira é o maior bloco escuro do HH; a caixa dentro da cicatriz tem mais de 98% da área dentro do perímetro oficial) e o texto não leva números escritos à mão: os números ficam em `stats.json` e nas legendas.

## Dentro dos HDF5

Caminhos do GUNW confirmados no primeiro ficheiro real (tarefa A1, 14 nov 2026) e do GCOV no primeiro GCOV (tarefa B1, 14 nov 2026).

- GUNW (coerência): `science/LSAR/GUNW/grids/frequencyA/unwrappedInterferogram/HH/coherenceMagnitude` — float32, 0 a 1 (4392 × 4455 px a 80 m no produto usado).
- GUNW (projeção): `science/LSAR/GUNW/grids/frequencyA/unwrappedInterferogram/projection` — **código EPSG escalar (uint32)**, não WKT (32629 = UTM 29N neste produto).
- GUNW (coordenadas): `science/LSAR/GUNW/grids/frequencyA/unwrappedInterferogram/HH/xCoordinates` e `.../HH/yCoordinates` — float64, centros de píxel, x crescente e y decrescente.
- GCOV (potência): `science/LSAR/GCOV/grids/frequencyA/HHHH` e `HVHV` — float32, potência linear, 20 m/px; dB = 10 · log10(valor). Fora do swath os valores são **NaN** (o dataset `mask` marca 255 nos píxeis sem dados; 0 e 1 têm dados finitos). Na prática, a validade testa-se com `np.isfinite`.
- GCOV (projeção): `science/LSAR/GCOV/grids/frequencyA/projection` — código EPSG escalar (uint32), 32629 = UTM 29N.
- GCOV (coordenadas): `science/LSAR/GCOV/grids/frequencyA/xCoordinates` e `yCoordinates` — float64, centros de píxel, x crescente e y decrescente; o espaçamento vem em `xCoordinateSpacing`/`yCoordinateSpacing` (20 m neste produto).

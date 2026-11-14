# Contrato de dados

> Versão canónica do contrato (copiada de [PLAN.md](PLAN.md), secção "Arquitetura e contrato de dados").
> Só o integrador (frente E) a altera, depois de avisar a equipa. **Os caminhos HDF5 estão por confirmar nas
> tarefas A1 e B1**; quando confirmados, substituir a lista abaixo e remover este aviso.


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

- Caixa: lon −8,35 a −7,95; lat 40,45 a 40,85 (a do dossier).
- Projeção de saída: Web Mercator (EPSG:3857), a do mapa.
- Tamanho: 2000 px de largura (cerca de 17 m por píxel); a altura sai de `grid.py`.
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

Vetores e números: `burn_nisar.geojson` (o nosso polígono), `burn_official.geojson` (EFFIS ou ICNF), `progress.geojson` (área ardida até cada data), `places.geojson` (lugares da história), `stats.json` (áreas e sobreposição) e `series.json` (série temporal).

## manifest.json

A app não conhece nomes de ficheiros: lê `web/public/layers/manifest.json` e desenha o que lá estiver. Uma entrada por camada:

```json
{
  "version": 1,
  "bounds": [-8.35, 40.45, -7.95, 40.85],
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

## Dentro dos HDF5

Caminhos esperados, a confirmar com `h5ls -r` no primeiro ficheiro (tarefa A1 e B1) e a registar em `CONTRACT.md`:

- GUNW: `science/LSAR/GUNW/grids/frequencyA/unwrappedInterferogram/HH/coherenceMagnitude`.
- GCOV: `science/LSAR/GCOV/grids/frequencyA/HHHH` e `HVHV`, em potência linear; dB = 10 · log10(valor).
- Em ambos, as coordenadas e a projeção (UTM) vêm em `xCoordinates`, `yCoordinates` e `projection` do mesmo grupo.

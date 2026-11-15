# Escalas e cores das camadas (B8)

Resposta ao B8: uma escala por tipo de camada, e a rampa que está no ecrã é a que o
manifest declara. As tabelas abaixo são **geradas** do `web/public/layers/manifest.json`,
não escritas à mão; a coluna "desenhada como" vem do código que a desenha.

## Regra

1. **Duas camadas do mesmo tipo têm sempre o mesmo `range` e a mesma `colormap`.** É o que
   permite pôr agosto ao lado de julho e comparar cores.
2. **O manifest descreve os dados, não o ecrã.** O PNG da coerência é cinzento porque
   `burn.py` e `progress.py` o leem como dado (coerência = cinzento / 255); a cor laranja é
   aplicada no navegador.
3. **A rampa desenhada tem de corresponder à `colormap` declarada** — ou, no caso da
   coerência, estar explicada (ver abaixo).

## Camadas raster

| id | tipo | range | colormap | desenhada como |
| --- | --- | --- | --- | --- |
| `coh_A116_20260622_20260704` | coh | 0.0 – 1.0 coherence | gray | rampa laranja no navegador (`style.ts`): transparente em ≥ 0,5, cheia em ≤ 0,2 |
| `coh_A15_20260627_20260709` | coh | 0.0 – 1.0 coherence | gray | idem |
| `coh_D124_20260622_20260704` | coh | 0.0 – 1.0 coherence | gray | idem |
| `coh_D52_20260617_20260629` | coh | 0.0 – 1.0 coherence | gray | idem |
| `coh_D52_20260629_20260711` | coh | 0.0 – 1.0 coherence | gray | idem |
| `coh_D52_20260711_20260723` | coh | 0.0 – 1.0 coherence | gray | idem |
| `coh_D52_20261003_20261015` | coh | 0.0 – 1.0 coherence | gray | idem |
| `dhh_D52_20260629_20260711` | dhh | -2.5 – 2.5 dB | rdbu | paleta RdBu no PNG |
| `dhv_D52_20260629_20260711` | dhv | -2.5 – 2.5 dB | rdbu | paleta RdBu no PNG |
| `hh_D52_20260629` | hh | -15.0 – -2.0 dB | viridis | paleta viridis no PNG |
| `hh_D52_20260711` | hh | -15.0 – -2.0 dB | viridis | idem |
| `hh_D52_20260816` | hh | -15.0 – -2.0 dB | viridis | idem |
| `hv_D52_20260629` | hv | -20.0 – -8.0 dB | magma | paleta magma no PNG |
| `hv_D52_20260711` | hv | -20.0 – -8.0 dB | magma | idem |
| `hv_D52_20260816` | hv | -20.0 – -8.0 dB | magma | idem |
| `rgb_D52_20260711` | rgb | 0.0 – 255.0 RGB | rgb | composto de radar no PNG: R=HH, G=HV, B=HH/HV (não é cor verdadeira) |
| `s2_20260629` | s2 | 0 – 255 RGB | rgb | cor verdadeira no PNG |
| `s2_20260709` | s2 | 0 – 255 RGB | rgb | cor verdadeira no PNG |

**Nenhum par comparável com escalas diferentes.** As três datas de HH (junho, julho,
agosto) partilham −15 a −2 dB; as três de HV partilham −20 a −8 dB; as sete de coerência
partilham 0 a 1; as duas de diferença partilham ±2,5 dB. Verificado camada a camada, não
por amostra.

## A coerência: `gray` no manifest, laranja no ecrã

O `manifest.json` diz `gray` e é verdade sobre o ficheiro. O que o ecrã mostra é uma rampa
de um só tom (`#d95926`) cuja **opacidade** cresce quando a coerência desce: transparente a
partir de 0,5 e cheia em 0,2 (`COHERENCE_CLEAR` / `COHERENCE_FULL` em `web/src/map/style.ts`).
A legenda rotula os extremos do dado (0 e 1) e diz, por baixo, que a cor marca coerência
baixa e que é transparente onde a coerência é alta.

Consequência aceite: a janela visível é 0,2–0,5 dentro de um `range` de 0–1. Quem comparar
o manifest com o ecrã tem de ler a legenda; não é uma incoerência, é a mesma decisão que
mantém os PNG utilizáveis como dado pelo pipeline.

## Como reconferir

```bash
python3 -c "import json;m=json.load(open('web/public/layers/manifest.json'));\
print({k:{(tuple(l['range']),l['colormap']) for l in m['layers'] if l['kind']==k} for k in {l['kind'] for l in m['layers']}})"
```

Cada tipo tem de devolver **um** par `(range, colormap)`. Para a rampa cozida no PNG, a
paleta PLTE do ficheiro começa em `440154` (viridis, HH) e `000004` (magma, HV) — o mesmo
início que `colormap_lut(...)[0]` em `pipeline/caramulo/export.py`; o índice 255 é preto
porque está reservado para nodata em `write_palette_png`, e não porque a rampa acabe em
preto.

## Nota menor, não corrigida

`rgb_D52_20260711` declara `[0.0, 255.0]` e as duas `s2_*` declaram `[0, 255]`: igual em
valor, diferente em tipo no JSON. Não afecta nada em execução (a legenda lê os dois), mas
fica registado para quem comparar manifests com `diff`.

Uma correcção que ficou a dever-se a uma leitura apressada da primeira versão desta página:
só as duas `s2_*` são cor verdadeira (Sentinel-2, luz solar reflectida). A `rgb_D52_20260711`
é um **composto de radar** — R=HH, G=HV, B=HH/HV — e chamar-lhe «true colour» teria sido um
erro de conteúdo, não de formatação.

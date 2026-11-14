# Produtos NISAR

O que existe e o que usámos. Mantém-no a frente A. Dados brutos não entram no git; aqui ficam só os identificadores.

## GUNW encontrados (pesquisa ASF, 2026-11-14)

Obtidos com `uv run python -m caramulo.fetch --start 2026-06-17 --end 2026-07-12 --level GUNW --dry-run` (inclui o par D52 anterior ao fogo que o dossier ainda dava como incerto).

| Órbita | Par (datas de referência → secundária) | Papel |
| --- | --- | --- |
| D52 | 2026-06-17 → 2026-06-29 | Antes do fogo (controlo de coerência normal) |
| D52 | 2026-06-29 → 2026-07-11 | Par principal: mudança causada pelo fogo |
| D52 | 2026-07-11 → 2026-07-23 | Controlo posterior ao fogo |
| A15 | 2026-06-27 → 2026-07-09 | Confirmação noutra geometria |
| A15 | 2026-07-09 → 2026-07-21 | Posterior ao fogo |
| A116 | 2026-06-22 → 2026-07-04 | Fogo a meio |
| A116 | 2026-07-04 → 2026-07-16 | Posterior ao fogo |
| D124 | 2026-06-22 → 2026-07-04 | Fogo a meio |
| D124 | 2026-07-04 → 2026-07-16 | Posterior ao fogo |

## GCOV

Por listar (tarefa A3). Quando houver, acrescentar o nome completo do produto de cada data usada.

## Usados no projeto

| Camada | Produto (nome completo) | Descarregado em |
| --- | --- | --- |
| `coh_D52_20260629_20260711` | `NISAR_L2_PR_GUNW_024_052_D_068_025_2000_SH_20260629T193424_20260629T193459_20260711T193423_20260711T193458_P05023_N_F_J_001` | 2026-11-14 |
| `coh_D52_20260711_20260723` | `NISAR_L2_PR_GUNW_025_052_D_068_026_2000_SH_20260711T193423_20260711T193458_20260723T193423_20260723T193458_P05023_N_F_J_001` | 2026-11-14 |
| `s2_20260629` | `S2A_29TNF_20260629_0_L2A` + `S2A_29TNE_20260629_0_L2A` | 2026-11-14 |
| `s2_20260709` | `S2A_29TNF_20260709_0_L2A` + `S2A_29TNE_20260709_0_L2A` | 2026-11-14 |

### Sentinel-2 L2A em cor verdadeira

As duas camadas foram geradas a partir de imagens do Earth Search
(Element 84), combinando dois tiles por data na grelha comum do projeto.

- **29 de junho de 2026:** imagem anterior ao incêndio, com a zona entre
  Tourelhe e Águeda maioritariamente visível e algumas nuvens isoladas.
- **9 de julho de 2026:** primeira imagem posterior útil entre as cenas
  analisadas. A cicatriz é visível na vertente noroeste do Caramulo, mas
  as nuvens ocultam parte do limite oeste.

**Visibilidade durante o incêndio (2–5 de julho de 2026):**

- **2 de julho:** observa-se uma faixa acinzentada compatível com fumo
  perto da zona do incêndio.
- **3 e 4 de julho:** a pesquisa no Earth Search não devolveu cenas
  Sentinel-2 L2A para a caixa de trabalho.
- **5 de julho:** a visibilidade sobre a área ardida foi parcial. Não foi
  possível confirmar se o fumo contribuiu para essa limitação.

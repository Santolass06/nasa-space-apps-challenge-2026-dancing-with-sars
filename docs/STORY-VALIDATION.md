# Validação das afirmações da história

Revisão dos atos 1, 3 e 4 de `web/src/content/story.en.json`.

## Afirmações do guião

| Ato | Passo | Afirmação | Classificação | Evidência ou limite |
| --- | --- | --- | --- | --- |
| 1 | `introduce-caramulo` | O incêndio de julho de 2026 começou perto de Tourelhe, na Serra do Caramulo. | Confirmada | O relatório do ICNF `REE_2026_004` identifica o local de início em Chamusqueiros, no concelho de Vouzela. |
| 1 | `introduce-caramulo` | A imagem ótica mostra as montanhas e os vales antes do incêndio. | Confirmada | A imagem Sentinel-2 foi adquirida a 29 de junho, antes do incêndio de 2 a 5 de julho. Ver `PRODUCTS.md`. |
| 1 | `compare-optical-and-radar` | A imagem ótica e a imagem de radar mostram a mesma zona. | Confirmada | As camadas Sentinel-2 e NISAR usam a mesma grelha geográfica. |
| 1 | `compare-optical-and-radar` | A imagem ótica usa luz solar refletida para mostrar a paisagem em cor natural. | Confirmada | A camada Sentinel-2 é uma composição em cor verdadeira. |
| 1 | `compare-optical-and-radar` | Os píxeis mais claros na imagem de radar correspondem a um eco mais forte. | Confirmada | A legenda descreve a intensidade representada na escala de brilho da imagem. |
| 3 | `compare-fire-and-control` | O par D52 de 29 de junho a 11 de julho abrange o incêndio e mostra baixa coerência em grande parte da área afetada. | Confirmada | Observação na camada `coh_D52_20260629_20260711`. |
| 3 | `compare-fire-and-control` | O par posterior, de 11 a 23 de julho, mostra coerência mais alta em grande parte da mesma zona. | Confirmada | Comparação com a camada `coh_D52_20260711_20260723`, que cobre os 12 dias seguintes. |
| 3 | `compare-with-official-perimeter` | O mapa de coerência representa a semelhança do sinal de radar entre 29 de junho e 11 de julho. | Confirmada | As duas datas correspondem às aquisições do par D52 que abrange o incêndio. |
| 3 | `compare-with-official-perimeter` | O contorno do ICNF delimita aproximadamente 12 829 ha cartografados como área ardida. | Confirmada | O relatório `REE_2026_004`, p. 6, indica 12 828,9 ha. O guião arredonda ao hectare. |
| 4 | `compare-hh-and-hv` | As imagens HH e HV correspondem à mesma passagem de 11 de julho. | Confirmada | Ambas correspondem à aquisição D52 de 11 de julho, documentada em `PRODUCTS.md`. |
| 4 | `compare-hh-and-hv` | Em HH, o radar transmite e recebe na horizontal. Em HV, transmite na horizontal e recebe na vertical. | Confirmada | Definição das duas polarizações. |
| 4 | `compare-brightness-and-coherence` | O brilho representa a intensidade do eco numa passagem e a coerência representa a semelhança do sinal entre duas passagens. | Confirmada | A imagem HH representa o eco de 11 de julho. O mapa de coerência compara as aquisições de 29 de junho e 11 de julho. |

## Sobreposição com o perímetro oficial

**Confirmada.** A mancha detetada pelo radar coincide em grande parte com o perímetro oficial do ICNF. Segundo os resultados da A4, a interseção cobre **94,8% da área oficial** e **90,0% da área detetada pelo radar**. As duas percentagens medem a mesma interseção, usando áreas de referência diferentes.

O limiar de deteção foi calibrado com os totais de área oficiais. Por isso, a semelhança entre os totais em hectares é um resultado da calibração. A sobreposição acrescenta evidência de que as duas geometrias cobrem, em grande parte, o mesmo terreno.


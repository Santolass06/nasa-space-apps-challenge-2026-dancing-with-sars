# Validação das afirmações da história

Revisão dos seis atos de `web/src/content/story.en.json`: os atos 1, 3 e 4 (E4) e os atos 2, 5 e 6 (E8, mais abaixo).

## Afirmações do guião

| Ato | Passo | Afirmação | Classificação | Evidência ou limite |
| --- | --- | --- | --- | --- |
| 1 | `introduce-caramulo` | O incêndio de julho de 2026 começou perto de Tourelhe, na Serra do Caramulo. | Confirmada, com ressalva | A Lusa situa o início em Tourelhe. O relatório do ICNF `REE_2026_004` (p. 6) tem o título «Incêndio Rural de Tourelhe» mas indica Chamusqueiros como local de início, no concelho de Vouzela. O guião diz «perto de Tourelhe» e não afirma o ponto exato. |
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

**Confirmada.** A mancha detetada pelo radar coincide em grande parte com o perímetro oficial do ICNF. Segundo o `stats.json` (a fonte dos números que a app mostra), a interseção cobre **94,8% da área oficial** e **90,0% da área detetada pelo radar** (12.153,4 ha de 12.819,8 ha e de 13.501,0 ha). As duas percentagens medem a mesma interseção, usando áreas de referência diferentes.

O limiar de deteção foi calibrado com os totais de área oficiais. Por isso, a semelhança entre os totais em hectares é um resultado da calibração. A sobreposição acrescenta evidência de que as duas geometrias cobrem, em grande parte, o mesmo terreno.

## Atos 2, 5 e 6 (E8)

Cada frase foi comparada com a fonte aberta nesta revisão (15 nov 2026) ou com uma medição sobre os produtos NISAR (`pipeline/verify_story.py`, que usa o polígono `burn_nisar.geojson`). Os valores medidos têm duas casas decimais porque a terceira muda com a resolução em que o polígono é traçado (#95). Classificação: **Confirmada** (diz o que a fonte diz), **Medida** (recalculável), **Hipótese** (assinalada como tal) e **Corrigida** (a frase dizia mais do que a fonte ou a medida; foi reescrita).

| Ato | Passo | Afirmação | Classificação | Evidência ou limite |
| --- | --- | --- | --- | --- |
| 2 | `ignition` | O fogo foi dado como começado perto de Tourelhe, às 03:04 de 2 de julho. | Confirmada, com ressalva | Lusa (Executive Digest, Diário de Viseu, CNN Portugal): «começou às 03:04 … em Tourelhe». O ICNF indica 02/07/2026 e Chamusqueiros como local de início. O marcador é aproximado e fica a 89 m do perímetro oficial. |
| 2 | `smoke` | A 3 de julho um satélite Copernicus fotografou o fumo, que seguia para o Atlântico. | Confirmada | Comissão Europeia (DG DEFIS), imagem Sentinel-3 de 3 jul 2026, 10:38 UTC; a pluma tinha cerca de 620 km e vinha de um fogo perto de Vouzela. O texto alternativo dizia «perto de Viseu»; passou a «perto de Vouzela». |
| 2 | `speed` | A 4 de julho, o comandante nacional de Proteção Civil disse que o fogo avançava a 765 m/h em média, cerca de 600 ha/h. | **Corrigida** | Sábado/Lusa, sábado 4 jul, na conferência de balanço do dia. A frase antiga dizia «Overnight … head of the national civil protection authority»: a palavra e a noite de 2 para 3 de julho não estão na fonte, que diz «comandante nacional de Proteção Civil» (Mário Silvestre); «head of the authority» era uma paráfrase. A fonte não diz a que período se refere a média: 600 ha/h durante as 81,6 h do fogo dariam 48 960 ha, 3,8 vezes a área oficial, por isso a app não a apresenta como taxa de toda a duração. |
| 2 | `speed` | Legenda do marcador de Tourelhe. | **Corrigida** | Antes: «where the fire began». A Lusa põe o início em Tourelhe; o ICNF dá Chamusqueiros como local de início e chama «de Tourelhe» ao incêndio. A legenda diz as duas coisas. |
| 2 | `evacuations` | Um comandante local disse à Lusa que Matadegas fora evacuada durante a noite e Mançores estava a ser evacuada, e que os meios eram poucos. | **Corrigida** | Sábado/Lusa, 3 jul, 11:45. Em 4 de julho a Lusa escreveu que foram retirados os moradores vulneráveis das duas aldeias, e a presidente da Câmara de Tondela disse que «não há nenhuma aldeia evacuada» (Diário de Viseu). A fonte de «evacuada» é uma só, por isso a frase atribui-a e mostra a divergência. |
| 2 | `daires` | A 4 de julho as chamas chegaram a Daires; a presidente da Câmara de Tondela disse que não foi evacuada e que não tinha recebido relatos de feridos nem de bens destruídos. | Confirmada | CNN Portugal/Lusa, 4 jul, 20:50: «ninguém partilhou informação sobre qualquer pessoa ferida ou bens destruídos no concelho». A frase antiga («had been reported») ficou mais perto do que a fonte diz. |
| 2 | `fire-contained` | O fogo foi dado como dominado às 12:40 de 5 de julho. | Confirmada | Lusa (Executive Digest, 11 jul). O ICNF regista «data de fim» 07/07/2026, que é outro marco; o guião diz «dominado», como a Lusa. |
| 2 | `cambarinho` | O fogo queimou a Reserva Botânica de Cambarinho. | Confirmada | Lusa, 11 jul: «os 24 hectares da Reserva Botânica de Cambarinho foram destruídos». O marcador é do início do percurso pedestre e fica a 9 m do perímetro oficial. |
| 5 | `compare-july-and-august` | Em HV, dentro da cicatriz o retorno escurece em média ao longo do verão e à volta quase não muda. | **Corrigida**, Medida | Antes comparava HH, que quase não mexe na cicatriz (11 jul → 16 ago: +0,04 dB dentro, +0,44 fora) e prometia «ver que partes mudaram». Em HV: −0,85 dB dentro, −0,06 fora (médias sobre centenas de milhares de píxeis). A diferença no ecrã é subtil; a frase diz «em média» e não traz números. Sem causa avançada: não foi testada. |
| 5 | `compare-july-and-october` | O par do fogo e um par de outubro; em outubro a área ardida deixa de mostrar baixa coerência. | **Corrigida**, Medida | Antes comparava o par de julho (11–23 jul) com o de outubro: dentro da cicatriz dão 0,70 e 0,72, e com o limiar de 0,5 do ecrã cerca de 97% e 96% dos píxeis ficam transparentes, por isso o comparador mostrava dois mapas vazios. Agora: par do fogo 0,28 dentro e 0,53 fora (9% dos píxeis acima de 0,5); outubro 0,72 dentro e 0,64 fora. **Limite:** coerência alta num par de 12 dias diz que pouco mudou entre as duas passagens; não mede recuperação da vegetação, e já era alta no par de julho. |
| 5, 6, 3, 4 | passos com camadas de coerência | «Low coherence also occurs over water and dense forest» (legenda gerada por `caveats.py`). | Confirmada em parte | **Vegetação e floresta:** apoiada, só pelo resumo, em Zebker e Villasenor (1992), «Decorrelation in interferometric radar echoes», IEEE TGRS 30(5), doi 10.1109/36.175330: a decorrelação do eco cresce com o tempo e afeta superfícies vegetadas. O texto integral não foi lido. **Água:** por verificar. É conhecimento de base em InSAR (o eco de uma superfície de água calma é fraco, e com pouco sinal a coerência cai), mas nenhuma fonte aberta nesta revisão o diz, e o resumo do artigo não menciona água. A frase da legenda mantém-se (é a que a legenda gera para todas as camadas de coerência) até haver uma fonte lida; a ligação ao artigo nos passos é referência para a decorrelação, não para a água. |
| 6 | `local-recovery` | A Câmara de Tondela começou a trabalhar com um investigador da Universidade de Aveiro num pacote de medidas para reduzir os efeitos do fogo na encosta do Caramulo. | **Corrigida** | Notícias ao Minuto/Lusa: a Câmara «já começou a trabalhar com o investigador e professor da Universidade de Aveiro Carlos Fonseca». Antes dizia «Tondela and the University of Aveiro», o que atribuía à universidade como instituição; o passo não tinha fonte e passou a ter. |
| 6 | `explore-the-map` | A coerência de 29 jun a 11 jul e o contorno do ICNF servem para explorar onde o padrão do radar muda. | Confirmada | Instrução de uso; as duas camadas são as já validadas no ato 3. |

## Pontos em aberto do #84

- **Áreas diferentes (#56):** a diferença de +3,0% na estimativa de 4 de julho veio de traçar a cicatriz na grelha de 46 m; o #95 volta a traçá-la na grelha completa e repõe os valores anteriores à C7. Não há decisão de aceitação por tomar.
- **Quatro áreas em circulação:** 12 829 ha é o valor do relatório do ICNF (12 828,9 ha) arredondado; 12 819,8 ha é o que se mede no ficheiro do perímetro oficial; a área do polígono do radar vem de `stats.json`. São medições diferentes, e o README passou a dizê-lo.
- **Ato 4:** o texto e as legendas dizem o mesmo que a resposta em `stats.json` (sinal líquido pequeno; hipótese do tronco em pé não testada). O registo B4 em `DECISIONS.md` trocava a variação dentro da cicatriz pela líquida e foi corrigido.
- **Seguimento do #79:** é o #92, resolvido pelo #99.


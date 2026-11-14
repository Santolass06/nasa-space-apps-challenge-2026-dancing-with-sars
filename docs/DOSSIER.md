# Dossier da equipa — Space Apps 2026: Dancing with the SARs

Nov 14, 2026 · @André Miguel Rodrigues dos Santos

## Para que serve este documento

Aqui está tudo o que precisamos de saber sobre o desafio, sobre o radar e sobre o caso que escolhemos, para que qualquer pessoa da equipa — ou um agente de IA sem acesso às nossas conversas — perceba o problema e comece a trabalhar na mesma direção.

- **Não é um plano.** Não define tarefas, divisão de trabalho nem tecnologias; isso é decidido à parte.
- **É a fonte de verdade.** Se alguém tiver dúvidas sobre o que o desafio pede, porque escolhemos Vouzela ou que dados usar, a resposta deve estar aqui. Se não estiver, acrescenta-se.
- **Factos vs. hipóteses.** Tudo o que ainda não foi confirmado está assinalado como tal e listado em “O que ainda não sabemos”.
- **Para agentes:** lê o documento todo antes de começar; respeita as decisões da secção “Como chegámos a Vouzela” e usa os valores da “Referência rápida” (zona, datas, órbitas) em vez de os reinventar.

## Resumo em 30 segundos

- **O desafio:** fazer uma app interativa que use imagens de radar do satélite NISAR (NASA + ISRO) para mostrar como uma zona da Terra mudou ao longo do tempo.
- **O que escolhemos:** o maior incêndio de 2026 em Portugal — Vouzela / Serra do Caramulo, 2 a 5 de julho, 12.828,9 hectares ardidos (ICNF, REE_2026_004).
- **Porquê este:** é o único evento português de 2026 com imagens NISAR antes, durante e depois. A Kristin e as cheias de fevereiro caem num período em que a NASA ainda não publicou os dados.
- **O que já sabemos:** nos dados NISAR reais, a zona do fogo aparece claramente como “mudança” entre uma imagem de 29 de junho e outra de 11 de julho.
- **A ideia:** uma história interativa sobre o fogo do Caramulo, contada só com radar — o que aconteceu, como o radar o vê e o que veio depois.
- **Prazo:** segundo o site oficial, a submissão fecha domingo, 15 de novembro, às 23:59 “hora local”. A equipa está inscrita no evento local de Nablus (UTC+2): se a hora local for a de lá, são 21:59 em Lisboa. Falta confirmar (ver “O que ainda não sabemos”).

## O desafio, em português simples

O [enunciado oficial](https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/) é longo e mistura explicação científica com o pedido em si. Tirando o enquadramento, pede uma coisa: **escolher um sítio, mostrar com imagens de radar NISAR como esse sítio mudou, e transformar isso numa app interativa que qualquer pessoa perceba.**

O nome “Dancing with the SARs” é um trocadilho: a superfície da Terra está sempre a “dançar” (cheias, fogos, glaciares, sismos) e o SAR é o tipo de radar que capta essa dança.

### O que é obrigatório

1. **Uma zona de estudo** à nossa escolha (pode ser a nossa terra, um fogo, uma cheia…).
2. **Dados NISAR** gratuitos, de datas diferentes, para mostrar mudança ao longo do tempo.
3. **Uma aplicação interativa** — mapas de mudança, animações, dashboards, sliders antes/depois — que torne os dados acessíveis a quem não é cientista. Idealmente open-source.
4. **Interpretação:** levantar hipóteses sobre a causa física do que se vê (ou não se vê) nas imagens.

### O que é opcional (mas conta pontos)

- Comparar **polarizações** diferentes e dizer qual mostra melhor a mudança.
- Juntar **dados auxiliares** para dar contexto (imagens óticas, população, tipo de vegetação, mapas oficiais).
- Mostrar o **impacto humano** (agricultura, indústria, ocupação do território).
- **Storytelling** forte e, se conhecermos o sítio, contexto pessoal ou local.
- Falar das **aplicações futuras** do NISAR.

### Regras da submissão

| Regra | Detalhe |
| --- | --- |
| Prazo | Oficialmente fecha domingo, 15 nov, às 23:59 hora local; com o evento de Nablus podem ser 21:59 em Lisboa. Por confirmar |
| Demo obrigatória | Vídeo até **30 segundos** ou apresentação até **7 slides** (com a capa). Passar o limite tira-nos da avaliação global |
| Língua | Página do projeto e materiais em **inglês**; um vídeo pode ser falado noutra língua, mas com legendas em inglês |
| Alojamento | Demo num link público externo (YouTube, Drive, GitHub…); não se carrega no site |
| Equipa | 1 a 6 pessoas, todas registadas e visíveis na página da equipa antes do fecho |
| Originalidade | Recursos externos (código, imagens, texto) têm de ser identificados |

### Como o júri avalia

Cinco critérios: **Impacto** (que problema resolve e a quantas pessoas chega), **Criatividade**, **Validade** (é cientificamente correto e funciona?), **Relevância** (responde mesmo ao desafio? está completo e é fácil de usar?) e **Apresentação**. A organização avisa que as equipas costumam descuidar a apresentação — a demo de 30 segundos pesa tanto como o resto.

## Radar em 5 minutos

Um satélite ótico (como o Sentinel-2 ou o Google Maps) é uma máquina fotográfica: precisa do Sol e de céu limpo. Um radar SAR envia o seu próprio sinal de micro-ondas e mede o eco que volta. Por isso funciona de noite, atravessa nuvens e fumo, e mede coisas que uma foto não mostra.

### 1. O brilho não é cor, é “quanto eco voltou”

Numa imagem de radar, branco = muito eco, preto = pouco eco. O eco depende de duas coisas: a rugosidade/estrutura da superfície e a quantidade de água.

- Água parada funciona como um espelho e reflete o sinal para longe → aparece **escura**.
- Floresta espalha o sinal em todas as direções → aparece **clara**.
- Prédios e troncos fazem “ricochete” chão → parede → satélite → aparecem **muito claros**.

### 2. O comprimento de onda decide o que o radar “vê”

O NISAR usa **banda L (24 cm)**. Ondas compridas passam pelas folhas e batem nos ramos grandes, troncos e solo. O Sentinel-1 (radar europeu) usa banda C (5,6 cm), que fica pelo topo das copas. É isto que torna o NISAR especial para florestas: mede a estrutura (troncos de pé, caídos, cortados), não só a “pele” verde.

&#91;embedded content: ótico vs banda C vs banda L numa floresta\]

Seta cheia = sinal que desce; tracejado = eco que volta ao satélite. O ótico não passa das nuvens; a banda C volta do topo das copas; a banda L chega ao solo e faz ricochete no tronco.

### 3. Polarização: HH e HV

O radar envia a onda numa orientação (H, horizontal) e ouve em duas: **HH** (volta igual) e **HV** (volta rodada). HV acontece sobretudo quando o sinal anda aos ressaltos dentro de vegetação, por isso HV ≈ “quanta vegetação com volume há aqui”. HH é mais sensível a solo, água e ao ricochete solo–tronco.

### 4. Coerência: “o terreno é o mesmo?”

Comparando duas passagens da mesma órbita (o NISAR repete cada órbita a cada 12 dias), dá para medir se o terreno continua “igual” ao nível do sinal. Se sim, a imagem de coerência sai lisa; se algo mudou (ardeu, caiu, foi lavrado, inundou), sai “ruidosa”. É o detetor de mudanças mais direto que temos, e foi o que funcionou no nosso caso.

## Glossário

| Termo | O que quer dizer |
| --- | --- |
| SAR | Synthetic Aperture Radar. Radar a bordo de um satélite que “simula” uma antena enorme somando várias medições, para ter boa resolução |
| NISAR | Satélite NASA + ISRO (Índia), lançado em julho de 2025. Radar banda L (e banda S). Dados gratuitos |
| Banda L / banda C | Comprimento de onda do radar: L ≈ 24 cm (NISAR), C ≈ 5,6 cm (Sentinel-1). Mais comprido = penetra mais na vegetação |
| Backscatter | O eco que volta ao satélite; é o “brilho” da imagem de radar |
| HH, HV | Polarizações: envia horizontal e recebe horizontal (HH) ou vertical (HV) |
| Coerência | Medida (0 a 1) de quanto o terreno se manteve igual entre duas passagens. Baixa = mudou |
| Interferograma | Imagem que compara duas passagens da mesma órbita; dá a coerência e movimentos de centímetros |
| GCOV | Produto NISAR com o brilho do radar (HH, HV) já corrigido do relevo e georreferenciado |
| GUNW | Produto NISAR com o interferograma (fase e coerência) entre duas datas |
| Órbita / track | O “caminho” do satélite. Só se comparam diretamente imagens da mesma órbita (mesmo ângulo de visão) |
| Ascendente / descendente | Passagem sul→norte (manhã, \~6h) ou norte→sul (fim do dia, \~18h–19h) |
| Beta / provisório | Estado de calibração dos dados NISAR: beta = pré-calibração (out 2025–jan 2026); provisório = calibrado (desde jun 2026) |
| ASF | Alaska Satellite Facility, o arquivo da NASA onde se descarregam os dados de radar |
| Earthdata | Conta gratuita da NASA necessária para descarregar os dados |
| Sentinel-1 / Sentinel-2 | Satélites europeus Copernicus: radar banda C / ótico. Úteis como comparação e contexto |
| ICNF | Instituto da Conservação da Natureza e das Florestas; publica as áreas ardidas oficiais |

## Os dados NISAR que existem para Portugal

Os dados NISAR públicos têm um buraco: para Portugal, quase nada entre 10 de janeiro e 17 de junho de 2026. Isto condicionou toda a escolha do caso.

&#91;embedded content: cobertura NISAR em Portugal vs eventos, out 2025 – nov 2026\]

A faixa sombreada é o período sem dados públicos. A Kristin e as cheias ficam lá dentro; o incêndio de Vouzela fica no meio de dados dos dois lados.

- A NASA começou a publicar os dados calibrados (“provisórios”) a 20 de julho de 2026, com imagens a partir de **17 de junho**. Para trás só existe uma série “beta” (pré-calibração) entre outubro de 2025 e janeiro de 2026, e só no interior do país.
- O atraso de setembro de 2025 a junho de 2026 será processado e publicado “antes do fim de 2026” — não contamos com ele para o hackathon.
- Confirmámos isto consultando diretamente a API da ASF para vários locais (Leiria, Tejo, Mondego, Caparica, Vouzela, Valpaços, Manteigas, Arganil).
- Desde junho, cada local tem uma passagem a cada poucos dias (várias órbitas ascendentes e descendentes), em polarização dupla HH + HV.
- Cada produto traz uma pré-visualização em PNG, útil para escolher imagens sem descarregar ficheiros de vários GB.

## Como chegámos a Vouzela

Queríamos um caso português de 2026 com impacto; ficou Vouzela porque é o único em que o NISAR sozinho conta a história toda. Esta decisão está fechada — a tabela fica para ninguém ter de refazer a análise.

| Opção | Evento | Porque não (ou porque sim) |
| --- | --- | --- |
| **Vouzela / Caramulo** ✅ | Incêndio, 2–5 jul 2026 | NISAR antes, durante e depois, em pares da mesma órbita; sinal já visível nos dados |
| Pinhal de Leiria | Tempestade Kristin, 28 jan 2026 | História muito forte, mas sem NISAR na altura da tempestade; o evento teria de vir do Sentinel-1 |
| Cheias do Tejo e Mondego | Comboio de tempestades, fev 2026 | Mesmo problema: sem NISAR durante as cheias |
| Arganil | Maior incêndio de sempre, ago 2025 | Antes do início dos dados; só dá “um ano depois”, com imagem beta vs provisória. Pode entrar como extra |
| Serra da Estrela (Manteigas) | Deslizamento de terras, mar 2026 | Dados antes e depois, mas o deslizamento é pequeno para a resolução e é o mais difícil tecnicamente |
| Costa da Caparica / praias | Erosão e arribas, inverno 2026 | Só há dados depois de junho e os recuos (30–40 m) estão no limite da resolução |

Se sobrar tempo, Arganil pode ser um segundo capítulo (“a cicatriz de 2026 ao lado da de 2025”), reaproveitando o mesmo trabalho.

## O caso: o incêndio de Vouzela / Caramulo

Foi o maior incêndio de 2026 em Portugal: 12.828,9 hectares (ICNF, REE_2026_004, p. 6) em pouco mais de três dias.

| Facto | Valor | Fonte |
| --- | --- | --- |
| Início | 2 jul 2026, 03:04, Tourelhe (freguesia de Cambra e Carvalhal de Ermidas, Vouzela) | [Lusa](https://executivedigest.sapo.pt/?p=788227) |
| Dominado | 5 jul 2026, 12:40 | [Lusa](https://executivedigest.sapo.pt/?p=788227) |
| Área ardida | 12.828,9 ha (ICNF, REE_2026_004, p. 6); a imprensa da época falava em 12.804 ha (provisório) e 13–15 mil ha | [ICNF REE_2026_004](https://www.icnf.pt/api/file/doc/d305b338642255f3); [Agroportal / Lusa](https://www.agroportal.pt/?p=1265118) |
| Concelhos afetados | Vouzela, Oliveira de Frades, Tondela e serra do Caramulo | [Lusa](https://www.agroportal.pt/incendios-sul-da-europa-enfrenta-inicio-precoce-da-epoca-de-fogos-florestais/) |
| Velocidade | Chegou a cerca de 600 ha por hora | [Sábado](https://www.sabado.pt/portugal/amp/incendios-fogo-em-vouzela-ja-queimou-13-mil-hectares-e-e-o-mais-preocupante) |
| Impacto humano | Aldeias evacuadas (ex.: Matadagase, Mansores, em Tondela); dezenas de feridos | [Sábado](https://www.sabado.pt/portugal/amp/duas-aldeias-evacuadas-em-tondela-por-causa-do-incendio-de-vouzela) |
| Património natural | Os 24 ha da Reserva Botânica de Cambarinho destruídos | [Lusa](https://executivedigest.sapo.pt/?p=788227) |
| Depois | Tondela e a Universidade de Aveiro preparam medidas para mitigar os efeitos do fogo na serra | [Notícias ao Minuto](https://www.noticiasaominuto.com/pais/3029882/tondela-prepara-plano-para-mitigar-efeitos-do-fogo-na-serra-do-caramulo) |

O que isto nos dá para a história: uma linha do tempo curta e dramática, nomes de lugares reais, um símbolo (a reserva dos loendros) e uma pergunta para o futuro (como recupera a serra).

## O que já vimos nos dados

O sinal do incêndio existe nos dados NISAR reais e vê-se melhor pela coerência do que pelo brilho.

**Primeira leitura (pré-visualizações ASF, 14 nov):** as cores são a fase do interferograma; o que interessa é a textura. À esquerda (29 jun → 11 jul, as duas datas "abraçam" o fogo) via-se uma mancha granulada de cerca de 14 × 10 km — o radar deixou de reconhecer aquele terreno, porque ardeu. À direita (11 → 23 jul, ambas já depois do fogo) a mesma zona voltava a ser lisa. A georreferência das pré-visualizações era aproximada, e a posição da mancha veio a revelar-se deslocada.

**Medição nos dados completos (14 nov, tarefas A1/A2):** com os GUNW reais na grelha comum, o diferencial de coerência entre o par do fogo (29 jun → 11 jul) e o par de controlo (11 → 23 jul), suavizado a 1 km, mostra:

- a maior região ligada abaixo de −0,25 tem **13.687 ha** em lon −8,398..−8,130, lat 40,557..40,682 (centroide −8,27, 40,62); a um limiar mais exigente (−0,30) fica com 12.063 ha. O polígono final (A4, após morfologia) tem **13.501 ha** — é o número que a app mostra (`stats.json`). O ICNF reporta **12.828,9 ha** (REE_2026_004, p. 6): a nossa medição fica +5,2% acima; a imprensa da época falava em 12.804 ha (provisório) e 13–15 mil ha;
- dentro da cicatriz, a coerência do par do fogo é **0,24** contra **0,69** no par de controlo (queda de 0,45) — o sinal é forte e localizado;
- os pares das duas geometrias de observação — A15 e A116 (ascendente) e D52 e D124 (descendente) — mostram todos a mesma queda de coerência dentro da cicatriz (**−0,21 a −0,25**), e o par pré-fogo (17 → 29 jun) não mostra queda (**+0,02**): o sinal não depende da geometria de observação nem da sazonalidade;
- a mancha é maior do que a elipse das pré-visualizações (caixa de ~22 × 13 km) e está mais a **oeste**: a vertente NW da serra, de Tourelhe (ignição, perto de Cambra) na direção de Águeda. As notícias registam que o fogo atingiu o concelho de Águeda (lon ≈ −8,45), o que é consistente com o que os dados mostram.

**Consequência:** a grelha comum foi estendida a oeste, de −8,35 para −8,50 (pixel de ~17 m para ~23 m), para não cortar a ponta ocidental da cicatriz. Ver `docs/CONTRACT.md` e `docs/DECISIONS.md`.

**A surpresa:** na imagem de brilho HV (antes vs. depois) a cicatriz quase não se nota. A explicação provável é física: os pinheiros queimados ficam de pé e a banda L continua a receber eco dos troncos. Para o fogo, o indicador principal deve ser a coerência; o brilho serve para acompanhar o que acontece depois (queda e corte das árvores, regeneração). Isto é bom material para o júri: mostra que percebemos o sensor.

**Por confirmar:** o polígono oficial (E1), para medir a sobreposição exata, e a comparação com o brilho HV nos GCOV (B).

## A ideia do projeto

Contar o incêndio do Caramulo como uma história interativa feita só com radar: o que aconteceu, como o NISAR o viu (mesmo com fumo) e o que veio a seguir. A mensagem que queremos que fique: **o radar vê o que as fotos de satélite não conseguem, e isso serve para responder mais depressa a fogos e acompanhar a recuperação.**

### A história, em atos

Uma proposta de arco narrativo (a afinar em equipa):

1. **Antes** — a serra em junho, vista pelo radar, ao lado de uma imagem ótica, para o público aprender a ler uma imagem de radar.
2. **O fogo** — 2 a 5 de julho: linha do tempo, lugares, e a passagem do NISAR de 4 de julho, com o fogo ainda ativo.
3. **A cicatriz** — o mapa de mudança (coerência) com slider antes/depois e a área calculada por nós ao lado da oficial.
4. **Porque é que o radar vê isto** — HH vs HV vs coerência, e a história dos troncos queimados que “enganam” o brilho.
5. **Depois** — julho a outubro, passagem a passagem: o que muda na serra (corte de madeira, primeiras chuvas, regeneração).
6. **E agora?** — para que pode servir o NISAR no futuro em Portugal, e espaço para o utilizador explorar livremente.

### O que a app deve permitir (nível de ideia)

- Ver o mapa da zona e mudar de data / de tipo de imagem (HH, HV, coerência, ótico).
- Comparar antes e depois com um slider.
- Seguir a história guiada ou saltar para a exploração livre.
- Perceber cada imagem sem saber nada de radar (legendas e explicações curtas).

### Princípios para todos

- O público-alvo é **não especialista**: cada imagem precisa de uma frase que diga o que se está a ver.
- **Validade primeiro:** nada de afirmar o que os dados não mostram; quando for hipótese, diz-se.
- Tudo o que vai para o júri é em **inglês**; o trabalho interno pode ser em português.
- A demo tem só 30 segundos: a história tem de caber num “antes → fogo → cicatriz → porquê importa”.

## Referência rápida

Valores comuns para toda a gente (e todos os agentes) trabalhar com as mesmas zonas, datas e nomes.

### Zona de interesse

- **Ponto de referência:** lon −8,11, lat 40,68 (Vouzela).
- **Caixa de trabalho:** lon −8,50 a −7,95; lat 40,45 a 40,85 (WGS84), definida em `grid.py` (a única fonte). Estendida a oeste a 14 nov para cobrir a ponta ocidental da cicatriz — ver "O que já vimos nos dados" e `DECISIONS.md`.

### Passagens NISAR principais

Nomeamos cada órbita pela direção + número do track: **D52** = descendente, track 52. Só se comparam imagens da mesma órbita.

| Data | Órbita (track / frame) | Papel |
| --- | --- | --- |
| 2026-06-29 | D52 / 68 | Antes — par principal |
| 2026-07-11 | D52 / 68 | Depois — par principal |
| 2026-07-23 | D52 / 68 | Controlo (já depois do fogo) |
| 2026-06-27 | A15 / 22 | Antes — par alternativo |
| 2026-07-09 | A15 / 22 | Depois — par alternativo |
| 2026-06-22 | A116 / 22 e D124 / 68 | Antes |
| 2026-07-04 | A116 / 22 e D124 / 68 | Durante o fogo |
| Out 2025 – 10 jan 2026 | A15 / 22 | Referência de inverno (beta) |
| Ago – out 2026 | D52, A15, A116, D124 | Série para o “depois” |

### Interferogramas (GUNW) já identificados

| Par | Órbita | Para quê |
| --- | --- | --- |
| 2026-06-29 → 2026-07-11 | D52 | Mudança causada pelo fogo (o que já vimos) |
| 2026-06-27 → 2026-07-09 | A15 | Confirmação noutra geometria |
| 2026-06-22 → 2026-07-04 | A116, D124 | Fogo a meio |
| 2026-07-11 → 2026-07-23 | D52 | Controlo: sem mudança esperada |

### Onde estão os dados

- **NISAR:** [ASF Data Search (Vertex)](https://search.asf.alaska.edu/) ou a API da ASF / biblioteca `asf_search`, com `dataset=NISAR`, `processingLevel=GCOV` ou `GUNW`, e a zona acima. Precisa de conta [Earthdata](https://urs.earthdata.nasa.gov/) gratuita para descarregar.
- **Como ler os nomes:** `NISAR_L2_PR_GCOV_024_052_D_068_..._DHDH_..._20260629T193424_...` → nível 2, provisório (PR), GCOV, ciclo 024, track 052, descendente, frame 068, polarização dupla HH+HV, data e hora UTC.
- **Documentação:** [NISAR Data User Guide](https://nisar-docs.asf.alaska.edu/) (formatos, produtos e problemas conhecidos).
- **Referência oficial da área ardida:** ICNF (relatórios e cartografia) e [EFFIS](https://effis.jrc.ec.europa.eu/) (sistema europeu de incêndios).
- **Contexto ótico:** Sentinel-2, por exemplo através do catálogo público Earth Search (Element 84).

### Convenções

- Datas sempre em ISO (`2026-07-11`); horas em UTC.
- Coordenadas em graus decimais WGS84, longitude primeiro.
- Órbitas como D52, A15, A116, D124.

## O que ainda não sabemos

Estas questões não estão confirmadas. Quem as esclarecer atualiza esta lista.

- **A mancha coincide com o perímetro oficial?** O tamanho é da mesma ordem (13.501 ha medidos por nós vs 12.828,9 ha do ICNF, +5,2%), mas o polígono oficial ainda não foi comparado — falta o perímetro (E1).
- **O fumo tapou mesmo os satélites óticos entre 2 e 5 de julho?** Faz sentido, mas ainda não verificámos as imagens Sentinel-2 desses dias. Em Leiria, durante a Kristin, confirmámos que o ótico ficou \~3 semanas sem imagens limpas.
- **Quanto cai a coerência fora da área ardida no verão?** Vegetação seca também muda; o par de controlo (11 → 23 jul) ajuda a separar.
- **O brilho HV mostra algo ao longo de julho–outubro?** Hipótese: sim, à medida que as árvores queimadas caem ou são cortadas. Por testar.
- **Os produtos “provisórios” têm problemas conhecidos que nos afetem?** Ver a secção de known issues do NISAR Data User Guide.
- **Prazo exato da submissão:** o site oficial diz 23:59 “hora local” de 15 nov. A equipa aparece inscrita no evento local de Nablus (Palestina, UTC+2), que não publicou horário próprio. Confirmar com a organização se o prazo é 23:59 de Lisboa, 21:59 de Lisboa (23:59 em Nablus) ou outro, e se a inscrição em Nablus foi intencional.
- **Perímetro oficial:** onde está disponível (ICNF ou EFFIS) e em que formato.

## Fontes

- [Enunciado “Dancing with the SARs” — NASA Space Apps 2026](https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/)
- [Project Submission Guide — NASA Space Apps](https://www.spaceappschallenge.org/resources/project-submission-guide/)
- [Judging & Awards Guide — NASA Space Apps](https://www.spaceappschallenge.org/resources/judging-awards-guide)
- [NISAR Data User Guide — disponibilidade dos dados (ASF)](https://nisar-docs.asf.alaska.edu/availability-overview/)
- [NISAR L-band data now publicly available (NASA Earthdata)](https://www.earthdata.nasa.gov/data/alerts-outages/nisar-l-band-data-now-publicly-available)
- [ASF Data Search (Vertex)](https://search.asf.alaska.edu/)
- [Radar e florestas: bandas X, C e L (EARTH-BRIDGE)](https://earth-bridge.github.io/e-learning/topics/RADAR_intro.html)
- [Incêndio de Vouzela e Reserva de Cambarinho (Lusa / Executive Digest)](https://executivedigest.sapo.pt/?p=788227)
- [Maiores incêndios de 2026 (Lusa / Agroportal)](https://www.agroportal.pt/?p=1265118)
- [Fogo de Vouzela a 600 ha por hora (Sábado)](https://www.sabado.pt/portugal/amp/incendios-fogo-em-vouzela-ja-queimou-13-mil-hectares-e-e-o-mais-preocupante)
- [Aldeias evacuadas em Tondela (Sábado)](https://www.sabado.pt/portugal/amp/duas-aldeias-evacuadas-em-tondela-por-causa-do-incendio-de-vouzela)
- [Relatório de estabilização de emergência, incêndio rural de Tourelhe, REE_2026_004 (ICNF, 31 jul 2026)](https://www.icnf.pt/api/file/doc/d305b338642255f3)

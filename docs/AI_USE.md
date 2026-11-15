# Uso de IA

Uma linha por uso relevante: data, tarefa, ferramenta, o que fez. Entra na submissão (página do projeto).

| Data | Tarefa | Ferramenta | O que fez |
| --- | --- | --- | --- |
| 2026-11-14 | Pesquisa sobre o desafio e dossier da equipa | Claude (agente de pesquisa) | Leu o enunciado e as regras, redigiu o dossier e o plano de trabalho |
| 2026-11-14 | Scaffold inicial do repositório | Claude Code | Criou o scaffold genérico (FastAPI + React), entretanto substituído |
| 2026-11-14 | Adaptação do repositório ao plano | Claude Code | Reestruturou para `pipeline/` + `web/`, reescreveu a documentação, testou a pesquisa ASF em modo `--dry-run` |
| 2026-11-14 | T2a/T2b: export.py e run.py --mock | Hermes (agente, GLM-5.3 via OpenCode Go) | Escreveu os writers partilhados (PNG/GeoJSON/manifest) e o modo --mock com camadas sintéticas; verificado com ruff, grid check, verificador estrutural dos PNG e make check |
| 2026-11-14 | A1/A2: download GUNW, inspeção HDF5, gunw.py e medição da cicatriz | Hermes (agente, GLM-5.3/DeepSeek via OpenCode Go) | Descarregou o par do fogo e o controlo, confirmou os caminhos HDF5, escreveu o gunw.py, mediu a cicatriz (12-13,7 mil ha) e atualizou a grelha e a documentação |
| 2026-11-14 | A5: séries de coerência (pré-fogo D52, A15, A116, D124) | Hermes (agente, GLM-5.3 via OpenCode Go) | Descarregou quatro GUNW, gerou as camadas e verificou a coerência dentro/fora da cicatriz por par (todas as geometrias dão a mesma queda) |
| 2026-11-14 | A6: progressão do fogo (antes, durante, depois) | Hermes (agente, GLM-5.3 via OpenCode Go) | Escreveu o progress.py, testou limiares absolutos (falham: água e vales) e adotou o limiar relativo (mediana − 2 MAD) restrito à cicatriz final |
| 2026-11-14 | B1: caminhos HDF5 do GCOV | Hermes (agente, GLM-5.3 via OpenCode Go) | Inspecionou o primeiro GCOV real (20 m/px, UTM 29N, NaN fora do swath, máscara 255 = sem dados) e registou os caminhos no CONTRACT |
| 2026-11-14 | B2: gcov.py — HH e HV em dB | Hermes (agente, GLM-5.3 via OpenCode Go) | Escreveu o módulo (potência linear reprojetada, dB, escala fixa por polarização) e gerou as 4 camadas das duas datas; verificado que a cicatriz quase não aparece no brilho |
| 2026-11-14 | B6: camadas de agosto e outubro que o story.en.json já citava | Hermes (agente, GLM-5.3 via OpenCode Go) | Descarregou o GCOV de 16 ago e o par GUNW de 3–15 out e gerou `hh_D52_20260816`, `hv_D52_20260816` e `coh_D52_20261003_20261015` |
| 2026-11-14 | C7: camadas abaixo de 1 MB | Hermes (agente, GLM-5.3 via OpenCode Go) | Portou o writer gray+alpha com filtro Up, acrescentou a paleta com quantização RGB para o ótico e regenerou as 15 camadas raster; mediu os bytes de cada uma |
| 2026-11-14 | B4: diferenças dhh/dhv e composição rgb | Hermes (agente, GLM-5.3 via OpenCode Go) | Acrescentou ao gcov.py a diferença em dB entre as duas datas (colormap divergente) e a composição HH/HV/HH−HV; mediu as distribuições antes de fixar as escalas |
| 2026-11-14 | B5: números do ato 4 no stats.json | Hermes (agente, GLM-5.3 via OpenCode Go) | Escreveu o modo `--act4` do gcov.py (médias dentro/fora da cicatriz calculadas nos produtos, não nas PNG) e gerou a tabela de HH, HV e coerência |
| 2026-11-14 | Revisão do Cristiano ao #28: área oficial do ICNF | Claude Code | Verificou os 12.828,9 ha no REE_2026_004 (Tabela 1, p. 6), atualizou o README, o comentário de calibração do burn.py e a ligação da fonte no dossier |
| 2026-11-14 | T1a/T1b, C1/C2/C4/C5, D1: a app web (mapa, camadas, slider, história) | Hermes (agente, GLM-5.3 via OpenCode Go) | Implementou o mapa maplibre, a leitura do manifest, os vetores, o slider sincronizado, a história comandada pelo story.en.json e o seletor; encontrou dois defeitos de integração (worker do maplibre não emitido pelo Vite, estilo em objeto ignorado no construtor) e verificou cada passo no browser |

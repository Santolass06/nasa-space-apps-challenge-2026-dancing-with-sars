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

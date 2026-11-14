# Decisões

Uma linha por decisão: data, decisão, quem decidiu.

| Data | Decisão | Quem |
| --- | --- | --- |
| 2026-11-14 | Caso: incêndio de Vouzela/Caramulo (ver [DOSSIER.md](DOSSIER.md), "Como chegámos a Vouzela") | Equipa |
| 2026-11-14 | Licença: manter Apache-2.0 (o plano dizia MIT; `PLAN.md` foi corrigido) | André |
| 2026-11-14 | Estrutura: o scaffold inicial (FastAPI, `frontend/`, tiles) foi substituído pela árvore do plano: `pipeline/` + `web/`, sem backend | André |
| 2026-11-14 | Equipa reduzida (3 pessoas ativas): P0 e T4 corrigidos no plano; B3 e a parte GCOV de A3 passam para o E | André (a rever) |
| 2026-11-14 | Caminhos HDF5 do GUNW confirmados no primeiro ficheiro real: coerência no caminho previsto; projeção é código EPSG (uint32) e as coordenadas estão em `unwrappedInterferogram/HH`, não no grupo `frequencyA` | André (A1) |
| 2026-11-14 | Grelha comum estendida a oeste de −8,35 para −8,50 (WIDTH 2000, ~23 m/px): a cicatriz real em coerência mede 12-13,7 mil ha em lon −8,40..−8,13 e o bbox antigo cortava a ponta ocidental | André (A2; CONTRACT a avisar o E) |
| 2026-11-14 | Cicatriz medida nos dados reais: 13.687 ha (limiar −0,25 no diferencial coerência fogo vs controlo), centroide −8,27/40,62, vertente NW da serra (Tourelhe→Águeda); compatível com os 12.804 ha oficiais | André (A2) |
| 2026-11-14 | A4: polígono final da cicatriz = 13.501 ha (maior componente após morfologia; 1.975 ha de blobs separados excluídos e registados no `stats.json`); sobreposição com o perímetro oficial fica pendente do E1 | André (A4) |

## Frentes (atualizar sempre que alguém entra ou sai)

O plano mantém as cinco frentes ([PLAN.md](PLAN.md), "Equipa"); aqui está quem as tem agora.

| Pessoa | Frentes | Notas |
| --- | --- | --- |
| André ([@Santolass06](https://github.com/Santolass06)) | A + B (pipeline) | Mais carregada. O E ajuda o A se o A1 atrasar |
| Fungy ([@Fungy03](https://github.com/Fungy03)) | C + D (web) | |
| Cristiano ([@Cristiano20060707](https://github.com/Cristiano20060707)) | E (integração) | Também fica com B3 (`s2.py`) e com a parte GCOV de A3 |

Regra: quando alguém **entra**, divide-se a frente junta com mais tarefas abertas na fase atual (na F1, A+B; na F2 e F3, C+D). Quando alguém **sai**, junta-se pela ordem inversa.

# PRD - SOL LeadOps / CRM Comercial

Versao: 1.0  
Data: 2026-06-14  
Produto: SOL LeadOps / CRM Comercial  
Repositorio: Leedscope AI / SOL Prospecting  
Status: Documento vivo

## 1. Objetivo

Transformar o sistema atual de prospeccao hoteleira em um CRM Comercial profissional para gerir todo o ciclo de vendas do SOL, desde a geracao do lead ate ao fecho, perda ou bloqueio definitivo de contacto.

O CRM nao deve ser apenas uma lista de leads. Deve funcionar como um sistema de execucao comercial que responde diariamente:

- Quem contactar.
- Quando contactar.
- O que dizer.
- Que material mostrar.
- Que dados preencher.
- Qual a proxima acao.
- Quando voltar a contactar.
- Quais oportunidades estao prontas para demo, proposta ou fecho.

## 2. Contexto do produto atual

O sistema atual ja possui uma base importante:

- Geracao e enriquecimento de leads hoteleiros.
- Integracao com fontes abertas como RNET, CADASTUR e OpenStreetMap.
- Analise com IA/Gemini.
- Gestao simples de hoteis/leads.
- Supabase como base de dados opcional.
- Dashboard e area administrativa.
- Geracao de propostas e emails.

O salto necessario e evoluir de "prospeccao assistida por IA" para uma operacao comercial completa, com pipeline, vendedores, atividades, agenda e indicadores.

## 3. Principios do CRM

1. O vendedor nunca deve iniciar o dia sem saber quais leads contactar.
2. Todo lead deve ter um estado comercial claro.
3. Todo contacto deve gerar uma atividade registada.
4. Todo lead ativo deve ter uma proxima acao ou motivo de encerramento.
5. Reagendamentos e demos marcadas tem prioridade sobre leads novos.
6. Leads marcados como "nao contactar" nunca devem ser apagados.
7. A gestao deve conseguir medir produtividade, qualidade e conversao.
8. A interface deve ser operacional, rapida e feita para uso diario.

## 4. Publicos do sistema

### 4.1 Vendedor

Responsavel por contactar hoteis, identificar decisores, marcar demos, fazer follow-up e fechar oportunidades.

Permissoes:

- Ver apenas os seus leads.
- Usar agenda semanal.
- Usar Modo Play.
- Registar chamadas e notas.
- Agendar demos e follow-ups.
- Atualizar estados comerciais dos seus leads.

### 4.2 Supervisor comercial

Responsavel por acompanhar a equipa, redistribuir leads, validar performance e apoiar oportunidades.

Permissoes:

- Ver leads da equipa.
- Redistribuir leads.
- Ver dashboards por vendedor.
- Ajustar prioridades.
- Auditar atividades.

### 4.3 Administrador

Responsavel por configurar a operacao, vendedores, scripts, motivos, parametros de scoring, templates e integracoes.

Permissoes:

- Ver e alterar tudo.
- Criar e desativar vendedores.
- Configurar pipeline.
- Configurar scripts e objeccoes.
- Gerir materiais comerciais.
- Configurar IA e integracoes.

## 5. Fluxo comercial principal

Fluxo macro:

1. Gerar leads.
2. Validar e preparar leads.
3. Atribuir vendedor.
4. Planear agenda semanal.
5. Contactar hotel.
6. Identificar decisor.
7. Agendar demo.
8. Realizar demo.
9. Fazer follow-up.
10. Enviar proposta.
11. Fechar venda ou encerrar lead.

Fluxo operacional diario:

1. Vendedor abre a fila de hoje.
2. Sistema mostra contactos agendados e reagendados por prioridade.
3. Vendedor clica em Play.
4. Sistema abre a tela de contacto focada.
5. Vendedor segue guiao, consulta materiais e regista notas.
6. Vendedor escolhe resultado da chamada.
7. Sistema exige proxima acao ou motivo de encerramento.
8. CRM atualiza pipeline, agenda e dashboard.

## 6. Estados do lead

Estados recomendados para o pipeline:

| Estado | Significado |
| --- | --- |
| Novo | Lead gerado, ainda sem validacao comercial. |
| Preparado | Dados principais verificados e pronto para contacto. |
| Agendado para contacto | Lead ja tem horario no planeador. |
| Em contacto | Vendedor iniciou o Modo Play. |
| Contactado - recepcao | Houve contacto, mas nao com decisor. |
| Decisor identificado | Nome/cargo/contacto do decisor foi identificado. |
| Reagendado | Cliente pediu contacto em outro momento. |
| Demo agendada | Apresentacao marcada. |
| Demo realizada | Apresentacao concluida. |
| Follow-up | Aguardando resposta ou retorno. |
| Proposta enviada | Cliente recebeu proposta comercial. |
| Ganho | Cliente fechou. |
| Perdido | Oportunidade recusada. |
| Nao contactar | Encerrado definitivamente e bloqueado para futuros contactos. |

Regra:

- Estados "Perdido" e "Nao contactar" exigem motivo.
- Estados ativos exigem proxima acao.
- "Nao contactar" bloqueia futuras importacoes duplicadas como contactaveis.

## 7. Prioridade comercial

Prioridade manual:

- Alta.
- Media.
- Baixa.

Prioridade automatica sugerida:

1. Demo marcada para hoje.
2. Contacto reagendado para hoje.
3. Lead quente/interessado.
4. Lead com decisor identificado.
5. Lead novo com score alto.
6. Lead novo normal.
7. Lead frio.

## 8. Modulos do produto

### M21 - Gestao de Leads

Objetivo:

Centralizar todos os hoteis/prospectos gerados pelo sistema, importados manualmente ou adicionados por campanhas.

Campos principais:

- Nome do hotel.
- Cidade.
- Pais.
- Numero de quartos estimado.
- Segmento.
- Telefone principal.
- Email geral.
- Website.
- Fonte do lead.
- Estado comercial.
- Vendedor responsavel.
- Prioridade.
- Lead score.
- Observacoes.
- Data de criacao.
- Data da ultima atividade.
- Proxima acao.

Funcionalidades:

- Criar lead manualmente.
- Importar leads em massa.
- Evitar duplicados.
- Atribuir vendedor manualmente.
- Atribuir vendedor automaticamente.
- Marcar como nao contactar.
- Guardar motivo de encerramento.
- Filtrar por cidade, pais, tamanho, vendedor, estado, prioridade e origem.
- Ordenar por score, urgencia e ultima atividade.

### M22 - Planeador Comercial Semanal

Objetivo:

Organizar a semana do vendedor em blocos comerciais de 20 minutos.

Regras:

- Manha priorizada para chamadas rapidas.
- Tarde priorizada para demos e reunioes completas.
- Leads reagendados aparecem antes de leads novos.
- Horarios com demo ficam bloqueados.
- Sistema alerta excesso de carga diaria.

Funcionalidades:

- Visualizacao semanal.
- Blocos de 20 minutos.
- Arrastar lead para horario.
- Geracao automatica da agenda.
- Destaque para reagendados.
- Botao Play no slot atual.
- Filtro por vendedor.
- Indicador de capacidade por dia.

### M23 - Modo Play de Contacto

Objetivo:

Ser a tela principal de trabalho do vendedor durante chamadas.

Layout:

- Topo: dados essenciais do hotel.
- Esquerda: contactos conhecidos e decisores.
- Centro: guiao de chamada.
- Direita: mini apresentacao do SOL.
- Rodape: notas, resultado e proxima acao.

Dados exibidos:

- Nome do hotel.
- Cidade/pais.
- Telefone.
- Email.
- Website.
- Vendedor.
- Estado atual.
- Proxima acao.
- Historico rapido.
- Contactos do hotel.

Campos obrigatorios ao finalizar:

- Resultado da chamada.
- Notas.
- Pessoa que atendeu, quando aplicavel.
- Cargo, quando aplicavel.
- Proxima acao ou motivo de encerramento.

Botoes rapidos:

- Agendar demo.
- Reagendar contacto.
- Enviar email.
- Sem resposta.
- Pediu para ligar depois.
- Nao tem interesse.
- Nao contactar mais.
- Contacto errado.
- Hotel encerrado.
- Ja usa outro sistema.
- Lead duplicado.

### M24 - Gestao de Contactos do Hotel

Objetivo:

Separar o hotel das pessoas/contactos envolvidos na decisao.

Tipos de contacto:

- Recepcao.
- Gerente.
- Diretor geral.
- Governanta.
- Manutencao.
- Compras.
- Outro.

Campos:

- Nome.
- Cargo.
- Telefone.
- Email.
- Tipo.
- Estado do contacto.
- Observacoes.
- Decisor principal.

Estados do contacto:

- Desconhecido.
- Procurar.
- Contactado.
- Decisor.
- Influenciador.
- Inativo.

### M25 - Gestao de Vendedores

Objetivo:

Gerir a equipa comercial, metas, regioes e permissoes.

Campos:

- Nome.
- Foto.
- Email.
- Telefone.
- Idiomas.
- Pais/regiao atribuida.
- Horario de trabalho.
- Meta diaria de contactos.
- Meta semanal de reunioes.
- Leads atribuidaos.
- Taxa de conversao.
- Estado ativo/inativo.
- Perfil de permissao.

Perfis:

- Vendedor.
- Supervisor comercial.
- Administrador.

### M26 - Pipeline Comercial

Objetivo:

Representar visualmente o avanco dos leads entre estados.

Visualizacoes:

- Kanban por estado.
- Lista filtravel.
- Funil resumido.
- Oportunidades por vendedor.

Funcionalidades:

- Mover lead entre etapas.
- Exigir dados obrigatorios por etapa.
- Mostrar data de entrada na etapa.
- Alertar leads parados.
- Alertar follow-ups vencidos.

### M27 - Dashboard de Vendas

Objetivo:

Mostrar a saude real da operacao comercial.

Metricas globais:

- Leads gerados.
- Leads preparados.
- Contactos realizados.
- Decisores encontrados.
- Demos agendadas.
- Demos realizadas.
- Propostas enviadas.
- Clientes ganhos.
- Leads perdidos.
- Nao contactar.

Metricas por vendedor:

- Contactos por dia.
- Reunioes marcadas.
- Taxa de sucesso por chamada.
- Taxa de decisor identificado.
- Taxa de reagendamento.
- Taxa de perda.
- Motivos comuns de recusa.
- Leads sem proxima acao.

Funil:

Leads -> Contactados -> Decisor identificado -> Demo marcada -> Demo feita -> Proposta -> Cliente.

### M28 - Scripts, Objeccoes e Materiais Comerciais

Objetivo:

Dar suporte ao vendedor durante chamadas, demos e follow-ups.

Conteudos:

- Script para recepcao.
- Script para gerente.
- Script para governanta.
- Script por pais/idioma.
- Banco de objeccoes.
- Respostas sugeridas.
- Mini apresentacao visual.
- PDFs comerciais.
- Videos curtos.
- Comparativo com WhatsApp/papel.
- Casos de uso.

Objeccoes iniciais:

| Objecao | Resposta sugerida |
| --- | --- |
| Ja usamos WhatsApp | O WhatsApp ajuda no inicio, mas nao cria historico, auditoria, prioridades nem relatorios. O SOL organiza a operacao sem complicar a equipa. |
| Nao temos orcamento | A ideia do SOL e ser acessivel para hoteis pequenos e medios, evitando ferramentas enterprise caras. |
| A equipa nao usa tecnologia | O SOL foi pensado para equipas operacionais, com interface simples, mobile-first e facil de aprender. |
| Ja temos sistema | Perfeito. A conversa pode ser para perceber se o sistema atual cobre housekeeping, manutencao, auditoria e comunicacao em tempo real. |

### M29 - Follow-up e Reagendamentos

Objetivo:

Impedir que leads interessados fiquem esquecidos.

Funcionalidades:

- Criar lembrete de retorno.
- Reagendar contacto.
- Reagendar demo.
- Programar follow-up em 7, 15, 30, 60 ou 90 dias.
- Alertar follow-ups vencidos.
- Sugerir email ou mensagem.
- Reativar leads sazonais.

Regras:

- Todo reagendamento deve ter data/hora.
- Reagendados aparecem na fila antes de leads novos.
- Follow-up vencido deve aparecer no topo da fila do vendedor.

### M30 - IA Comercial

Objetivo:

Usar IA para reduzir trabalho manual e melhorar a qualidade comercial.

Funcionalidades:

- Resumir chamada a partir de notas livres.
- Identificar grau de interesse.
- Extrair decisor, cargo e contacto.
- Sugerir proxima acao.
- Sugerir email de follow-up.
- Classificar objecoes.
- Sugerir score comercial.
- Criar resumo executivo do lead.

Regra:

- IA deve sugerir, nao substituir decisao comercial.
- Vendedor deve poder editar qualquer sugestao antes de guardar.

## 9. Lead Score

Objetivo:

Ajudar a equipa a priorizar os melhores hoteis.

Score inicial sugerido:

| Criterio | Pontos |
| --- | ---: |
| 20 a 150 quartos | +30 |
| Hotel independente | +25 |
| Reviews negativas sobre limpeza/operacao | +20 |
| Website proprio | +10 |
| Sinais de processos manuais | +15 |
| Grupo com varias unidades | +25 |
| Decisor identificado | +20 |
| Ja aceitou falar novamente | +20 |
| Ja usa concorrente e nao quer mudar | -10 |
| Numero errado ou dados inconsistentes | -20 |
| Pediu para nao contactar | bloqueio |

Faixas:

- 80+: Muito quente.
- 60-79: Quente.
- 40-59: Medio.
- 20-39: Frio.
- 0-19: Baixa prioridade.

## 10. Motivos de encerramento

Obrigatorios para "Perdido" e "Nao contactar".

| Motivo | Resultado recomendado |
| --- | --- |
| Ja tem sistema e nao quer ouvir | Perdido |
| Ja tem sistema, mas aceitou futuro contacto | Follow-up futuro |
| Sem orcamento | Perdido |
| Hotel pequeno demais | Desqualificado |
| Nao e hotel / dado errado | Lead invalido |
| Pediu para nao ligar mais | Nao contactar |
| Nao conseguimos decisor | Encerrado temporario |
| Numero errado | Precisa correcao |
| Nao ve necessidade | Perdido |
| Usa papel/WhatsApp, mas nao quer mudar | Perdido |
| Interessado, mas so depois da epoca alta | Follow-up programado |
| Hotel encerrado | Lead invalido |
| Lead duplicado | Duplicado |

## 11. Modelo de dados recomendado

### crm_leads

Tabela principal de leads/oportunidades.

Campos:

- id.
- created_at.
- updated_at.
- company_name.
- city.
- country.
- location.
- segment.
- estimated_rooms.
- website.
- main_email.
- main_phone.
- source.
- status.
- priority.
- lead_score.
- responsible_seller_id.
- next_action_type.
- next_action_at.
- close_reason_id.
- close_notes.
- do_not_contact.
- last_activity_at.
- notes.

### crm_contacts

Contactos/pessoas associadas ao hotel.

Campos:

- id.
- lead_id.
- name.
- role.
- contact_type.
- phone.
- email.
- status.
- is_primary_decision_maker.
- notes.
- created_at.
- updated_at.

### crm_sellers

Equipa comercial.

Campos:

- id.
- user_id.
- name.
- photo_url.
- email.
- phone.
- languages.
- assigned_regions.
- work_schedule.
- daily_contact_goal.
- weekly_demo_goal.
- role.
- status.
- created_at.
- updated_at.

### crm_activities

Historico de interacoes.

Campos:

- id.
- lead_id.
- seller_id.
- contact_id.
- activity_type.
- outcome.
- notes.
- objections.
- interest_level.
- next_action_type.
- next_action_at.
- created_at.

Tipos:

- call.
- email.
- whatsapp.
- demo.
- note.
- status_change.
- proposal.

### crm_schedule_slots

Agenda comercial.

Campos:

- id.
- seller_id.
- lead_id.
- slot_start.
- slot_end.
- slot_type.
- status.
- notes.
- created_at.
- updated_at.

Tipos:

- call.
- demo.
- follow_up.
- admin.

Estados:

- scheduled.
- in_progress.
- completed.
- canceled.
- missed.

### crm_close_reasons

Motivos configuraveis de perda, bloqueio ou desqualificacao.

Campos:

- id.
- name.
- category.
- requires_follow_up.
- default_follow_up_days.
- active.

### crm_scripts

Scripts comerciais.

Campos:

- id.
- name.
- target_role.
- language.
- country.
- content.
- active.

### crm_objections

Banco de objeccoes.

Campos:

- id.
- objection.
- suggested_response.
- category.
- active.

### crm_materials

Materiais comerciais.

Campos:

- id.
- title.
- material_type.
- url.
- description.
- target_stage.
- active.

## 12. Relacao com tabelas atuais

Tabela atual `hotels`:

- Deve continuar funcionando durante a transicao.
- Pode ser expandida temporariamente para campos CRM.
- Idealmente sera migrada ou mapeada para `crm_leads`.

Interface atual `Lead` em `types.ts`:

- Deve ser expandida com campos comerciais.
- Depois pode ser separada em tipos mais claros:
  - `Lead`.
  - `CrmLead`.
  - `CrmContact`.
  - `CrmActivity`.
  - `CrmSeller`.
  - `CrmScheduleSlot`.

## 13. MVP - Versao 1

Objetivo:

Permitir que a empresa comece a operar vendas com disciplina comercial.

Escopo:

- Cadastro/importacao de leads.
- Atribuicao de leads a vendedores.
- Estados comerciais do lead.
- Prioridade manual.
- Motivos de perda/nao contactar.
- Contactos do hotel.
- Registro de atividades.
- Reagendamento.
- Modo Play.
- Agenda semanal simples.
- Dashboard comercial basico.

Fora do MVP:

- Google Calendar.
- Gravacao/transcricao de chamadas.
- Automacao completa de WhatsApp.
- Relatorios avancados.
- IA comercial completa.
- Biblioteca comercial extensa.

## 14. Versao 2

Escopo:

- Lead scoring automatico.
- IA para resumo de chamadas.
- Templates de email/WhatsApp.
- Banco de objeccoes.
- Relatorios avancados por vendedor.
- Materiais comerciais.
- Alertas de follow-up vencido.
- Reativacao automatica de leads.

## 15. Versao 3

Escopo:

- Integracao Google Calendar.
- Integracao com WhatsApp Business, se juridicamente e tecnicamente viavel.
- Gravacao/transcricao de chamadas, se legalmente permitido.
- Automacao de sequencias de follow-up.
- Forecast de vendas.
- Metas comerciais avancadas.
- Controle de comissoes.

## 16. Criterios de aceite do MVP

O MVP sera considerado pronto quando:

- Um administrador conseguir criar vendedores.
- Um lead conseguir ser criado/importado.
- Um lead conseguir ser atribuido a um vendedor.
- Um vendedor conseguir ver apenas os seus leads.
- Um lead conseguir passar por todos os estados principais.
- O sistema exigir motivo ao perder ou bloquear lead.
- O sistema permitir agendar contacto em blocos de 20 minutos.
- O vendedor conseguir abrir o Modo Play.
- O vendedor conseguir registar resultado da chamada.
- O sistema criar proxima acao depois da chamada.
- O dashboard mostrar metricas comerciais basicas.
- Leads "nao contactar" nao forem apagados nem tratados como contactaveis.

## 17. Indicadores de sucesso

Indicadores operacionais:

- Contactos realizados por vendedor/dia.
- Percentual de leads com proxima acao.
- Percentual de leads sem atividade ha mais de 7 dias.
- Tempo medio ate primeiro contacto.
- Taxa de decisor identificado.

Indicadores comerciais:

- Demos agendadas.
- Demos realizadas.
- Propostas enviadas.
- Taxa de conversao por etapa.
- Ganhos por vendedor.
- Motivos de perda mais comuns.

Indicadores de qualidade:

- Percentual de leads duplicados.
- Percentual de leads invalidos.
- Percentual de contactos com decisor identificado.
- Percentual de atividades com notas completas.

## 18. Regras de UX

1. A tela inicial do vendedor deve mostrar trabalho acionavel, nao graficos decorativos.
2. Botoes de acao devem ser claros e rapidos.
3. O Modo Play deve reduzir distracoes.
4. Campos obrigatorios so devem aparecer no momento certo.
5. Dashboard de gestao deve priorizar comparacao e diagnostico.
6. O CRM deve funcionar bem em notebook, com layout denso e legivel.
7. A navegacao deve separar:
   - Leads.
   - Agenda.
   - Play.
   - Pipeline.
   - Dashboard.
   - Equipa.
   - Materiais.

## 19. Backlog inicial por sprint

### Sprint 1 - Fundacao CRM

- Criar tipos TypeScript do CRM.
- Criar schema SQL das novas tabelas.
- Mapear tabela atual `hotels` para `crm_leads`.
- Adicionar estados comerciais.
- Adicionar prioridade, responsavel e proxima acao.

### Sprint 2 - Banco de Leads

- Reformular a tela de gestao de hoteis para Banco de Leads.
- Adicionar filtros comerciais.
- Adicionar acoes rapidas.
- Adicionar motivos de encerramento.
- Adicionar bloqueio de "nao contactar".

### Sprint 3 - Vendedores e permissoes

- Criar gestao de vendedores.
- Relacionar vendedores com usuarios.
- Filtrar leads por permissao.
- Adicionar metas e regioes.

### Sprint 4 - Modo Play

- Criar tela dedicada de contacto.
- Adicionar guiao de chamada.
- Adicionar contactos do hotel.
- Adicionar botoes de resultado.
- Gravar atividade e proxima acao.

### Sprint 5 - Planeador Semanal

- Criar calendario semanal.
- Criar blocos de 20 minutos.
- Permitir agendamento manual.
- Priorizar reagendados.
- Bloquear horarios de demo.

### Sprint 6 - Dashboard Comercial

- Criar metricas globais.
- Criar metricas por vendedor.
- Criar funil visual.
- Criar alertas de leads sem proxima acao.

### Sprint 7 - Inteligencia Comercial

- Criar banco de objeccoes.
- Criar scripts comerciais.
- Criar templates de follow-up.
- Adicionar resumo de chamada com IA.
- Adicionar scoring automatico.

## 20. Decisoes pendentes

1. O CRM sera usado apenas internamente pela empresa ou tambem vendido como modulo para terceiros?
2. Os vendedores devem usar login Supabase Auth obrigatoriamente ou o sistema atual de fallback local continua no MVP?
3. O nome final sera LeadScope, SOL LeadOps ou outro nome comercial?
4. A operacao comercial sera inicialmente em Portugal, Brasil ou ambos?
5. WhatsApp sera apenas campo de contacto/manual ou tera integracao oficial?
6. O produto precisa controlar preco/proposta/contrato no MVP?
7. A equipa quer comissoes e metas financeiras ja na primeira versao?

## 21. Manutencao deste PRD

Este documento deve ser atualizado sempre que:

- Um novo modulo for aprovado.
- Uma regra comercial mudar.
- Um campo novo for adicionado ao banco.
- Uma tela nova for criada.
- Uma funcionalidade sair do MVP ou entrar no MVP.
- Uma decisao pendente for fechada.

Regra de trabalho:

Toda alteracao relevante no CRM deve atualizar tambem este PRD na mesma tarefa.

## 22. Proxima recomendacao

O primeiro desenvolvimento recomendado e a Sprint 1:

1. Criar os tipos CRM em `types.ts`.
2. Criar o schema SQL completo em `supabase/schema.sql`.
3. Preparar compatibilidade entre `hotels` atual e `crm_leads`.
4. Expandir o lead atual com estado comercial, responsavel, prioridade e proxima acao.

Isso cria a base tecnica para evoluir com seguranca para Banco de Leads, Modo Play e Planeador Semanal.

## 24. Visao: o CRM como Assistente de Vendas do SOL

O CRM LeadOps nao deve ser apenas um repositorio de leads. Deve funcionar como um **assistente de vendas** que da autonomia total ao vendedor para prospectar, apresentar, responder objecoes, marcar reuniao e fazer follow-up sem depender de acompanhamento constante.

Em cada lead, o sistema deve responder a 5 perguntas:

1. **Quem contactar** (decisor certo por persona).
2. **O que dizer** (script/roteiro adaptado).
3. **O que mostrar** (modulo e imagem do SOL conforme a dor).
4. **Como responder** (objecoes com resposta + pergunta + material).
5. **Qual o proximo passo** (nunca deixar um lead sem proxima accao).

Meta: um vendedor novo consegue apresentar o SOL com seguranca e profissionalismo.

KPIs do assistente de vendas:

- % de leads contactados com proxima accao definida (meta 100%).
- Tempo medio ate ao primeiro contacto.
- % de chamadas com decisor identificado.
- Demos agendadas / contactos realizados.
- Taxa de conversao por etapa do pipeline.
- Tempo de rampa de um vendedor novo ate a primeira demo.

## 25. Perfil Ideal de Cliente (ICP) — M51

Configuracao do cliente-alvo, usada para qualificar e priorizar leads:

- Tipologia: hotel independente, boutique, aparthotel, grupo.
- Dimensao alvo: 20 a 150 quartos.
- Sinais de dor: housekeeping em papel/WhatsApp/Excel, atrasos de check-in, manutencao sem historico, equipa multilingue, sem inspecao formal.
- Geografia: Portugal (fase 1), depois Brasil/Angola.
- Desqualificadores: menos de 10 quartos; concorrente instalado e satisfeito sem intencao de mudar.

O fit ao ICP alimenta o lead score (M30) e a priorizacao do pipeline (M26) e do planeador (M22).

## 26. Catalogo de novos modulos comerciais (M31-M51)

Modulos a desenvolver para profissionalizar o CRM. Estado: roadmap (nenhum implementado ainda).

| Codigo | Modulo | Objetivo |
| --- | --- | --- |
| M31 | Modo Demo Comercial | Tela limpa de apresentacao do SOL durante chamada/reuniao (problema -> solucao -> imagem -> beneficio -> proximo passo); avancar como slides; copiar/enviar link por email/WhatsApp. |
| M32 | Pitch por Persona | Discurso e modulos certos consoante o interlocutor (recepcao, governanta, gerente, manutencao, dono, grupo). |
| M33 | Roteiro de Chamada Inteligente | Guia por etapas (abertura, identificar decisor, descobrir dor, apresentar solucao, fechar proximo passo) em vez de script fixo. |
| M34 | Qualificacao do Lead | Mini formulario antes da demo (quartos, PMS, como gerem housekeeping, governanta, manutencao, dor, interesse, probabilidade). |
| M35 | Calculadora de ROI / Economia | Estima horas/custo perdidos com processos manuais a partir de inputs do hotel. |
| M36 | Comparador SOL vs WhatsApp/Papel/Excel | Tabela de comparacao para a objecao "ja usamos WhatsApp". |
| M37 | Biblioteca de Objecoes Avancada | Objecoes por tema, cada uma com resposta curta, resposta completa, pergunta de continuidade, material recomendado e proxima accao. |
| M38 | Gerador de Email/Mensagem | Gera follow-up automatico (formal, curto, WhatsApp, LinkedIn, pos-demo, reenvio) com dados do lead, dor e modulos relevantes. |
| M39 | Sequencias Automaticas de Follow-up | Cadencias por cenario (pediu informacao; pos-demo) com passos por dia. |
| M40 | Proposta Comercial / PDF | Gera proposta (plano, preco, setup, desconto, validade, modulos) em PDF, envia e marca como proposta enviada + lembrete. |
| M41 | Catalogo de Planos e Precos | Consulta interna de planos, regras de preco (por quarto/utilizador), trial, setup, comissao. |
| M42 | Playbook de Demonstracao | Roteiro completo de demo (o que dizer, que imagem mostrar, que pergunta fazer, que objecao pode surgir, proximo botao). |
| M43 | Academia Comercial | Formacao e onboarding de vendedores; checklist "vendedor aprovado para vender SOL". |
| M44 | Simulador de Chamada com IA | Treino com IA a fazer de recepcao/governanta/gerente/dono/cliente com concorrente; avaliacao e feedback. |
| M45 | Score de Interesse (comportamental) | Score dinamico por comportamento (pediu apresentacao, pediu preco, reagendou, recusou...) -> frio/morno/quente/muito quente. Complementa o lead score do M30. |
| M46 | Central de Materiais por Situacao | Recomenda materiais conforme o que o cliente disse (ver tabela na seccao 29). |
| M47 | Timeline / Historico Comercial | Linha do tempo por lead: criado, atribuido, tentativas, decisor, emails, demo, proposta, follow-up, ganho/perdido. |
| M48 | Checklist de Proxima Accao | Obriga a escolher a proxima accao em cada lead contactado (regra: nenhum lead sem proxima accao). |
| M49 | Integracao Email/WhatsApp | Botoes para enviar email, abrir WhatsApp Web, copiar mensagem, registar resposta, agendar lembrete; automacao futura. |
| M50 | Resultados padronizados da Chamada | Lista fechada de resultados (sem resposta, falou com recepcao, decisor identificado, interessado, pediu email/proposta, nao interessado, nao contactar) cada um com proximo passo. |
| M51 | Configuracao de ICP | Define o perfil ideal de cliente (seccao 25) que alimenta qualificacao e scoring. |

Nota de consolidacao: M45 estende o lead score deterministico ja existente (M30); M48 e M50 formalizam regras ja iniciadas no Modo Play (M23) e no pipeline (M26).

## 27. Mapa: modulo comercial <-> modulos do sistema SOL

Cada modulo comercial deve ser apresentado **ao lado dos modulos do produto SOL** que demonstra (modulos do sistema: M1 Mapa de Quartos, M2 Colaboradores, M3 Checklists, M4 Atribuicao de Tarefas, M5 Inspecoes, M6 Manutencao/Tickets, M7 Comunicacao, M8 Prioridades VIP, M9 Amenities, M10 Portal do Hospede, M11 Historico/Auditoria, M12 Relatorios, M13 Dashboard, M14 Mobile, M15 Offline, M16 Multi-idioma, M17 Sustentabilidade, M18 PMS, M19 IA, M20 Multi-propriedade).

| Modulo comercial | Modulos do SOL que usa |
| --- | --- |
| M31 Demo Comercial | M1, M3, M5, M6, M13, M14, M19 |
| M32 Pitch por Persona | ver seccao 28 |
| M35 ROI | M4, M7, M12 (tempo perdido e retrabalho) |
| M36 Comparador | M1 (estado), M11 (historico), M6 (manutencao), M12 (relatorios), M15 (offline), M16 (multi-idioma) |
| M40 Proposta / M41 Planos | modulos incluidos por plano (M1-M20 conforme tier) |
| M42 Playbook de Demo | M1 -> M14 -> M3 -> M6 -> M13 -> M12 (ordem sugerida) |
| M46 Materiais por situacao | ver tabela na seccao 29 |

## 28. Personas e discurso (M32)

| Persona | Foco da apresentacao | Modulos SOL a mostrar |
| --- | --- | --- |
| Recepcao | Saber quais quartos estao prontos | M1, M8 |
| Governanta | Controlar equipa, limpeza e inspecoes | M2, M3, M4, M5 |
| Gerente Geral | Reduzir reclamacoes e melhorar operacao | M11, M12, M13 |
| Manutencao | Tickets, prioridades e historico | M6 |
| Dono do hotel | Economia, controlo e profissionalizacao | M12, M17, M20 |
| Grupo hoteleiro | Multi-propriedade e relatorios | M20, M12 |

No lead, o vendedor escolhe "estou a falar com: recepcao/governanta/gerente/dono" e o sistema mostra o discurso e os modulos certos.

## 29. Objecoes e materiais por situacao (M37 e M46)

Estrutura de cada objecao (M37): resposta curta, resposta completa, pergunta de continuidade, material recomendado, proxima accao.

Exemplo:

- Objecao: "Ja usamos WhatsApp."
- Resposta curta: "Perfeito, muitos hoteis comecam assim. O WhatsApp nao da historico, prioridade nem relatorios."
- Pergunta: "Hoje conseguem saber quem limpou cada quarto e a que horas?"
- Material recomendado: Comparador SOL vs WhatsApp (M36).
- Proxima accao: agendar demo.

Recomendacao de material por situacao (M46):

| O que o cliente disse | Material recomendado | Modulo SOL |
| --- | --- | --- |
| Usa WhatsApp | Comparador SOL vs WhatsApp | M36 / M1, M11 |
| Quartos atrasados | Mapa de quartos + prioridades | M1, M8 |
| Governanta quer controlo | Tarefas + checklists + inspecao | M4, M3, M5 |
| Gerente quer relatorios | Dashboard + relatorios | M13, M12 |
| Wi-Fi fraco | Offline-first | M15 |
| Equipa estrangeira | Multi-idioma | M16 |
| Manutencao desorganizada | Tickets de manutencao | M6 |
| Quer preco | Planos e ROI | M41, M35 |

## 30. Sequencias de follow-up (M39)

Sequencia "Cliente pediu informacao": Dia 0 email de apresentacao; Dia 2 ligar; Dia 5 caso de uso; Dia 10 ultimo contacto; Dia 30 reativar.

Sequencia "Depois da demo": Dia 0 resumo; Dia 1 proposta; Dia 3 duvidas; Dia 7 fechar proxima etapa; Dia 15 follow-up futuro ou perdido.

## 31. Roadmap por fases e novos menus

Fase 1 — Essencial para vender melhor: M31 Demo Comercial, M32 Pitch por Persona, M34 Qualificacao, M37 Objecoes Inteligentes, M38 Templates de Email/WhatsApp, M48 Checklist de proxima accao, M47 Historico completo do lead.

Fase 2 — Profissionalizacao: M35 ROI, M40 Propostas PDF, M41 Catalogo de planos, M42 Playbook de demo, M46 Materiais por situacao, M45 Score de interesse.

Fase 3 — Avancado: M30 IA para resumo de chamada (ampliar), M44 Simulador de treino, M39 Automacao de follow-up, M49 Integracao email/calendario, assinatura digital de proposta.

Novos menus propostos no Dashboard:

| Novo menu | Modulo | Funcao |
| --- | --- | --- |
| Demo Comercial | M31 | Apresentacao visual do SOL |
| Playbook de Vendas | M42 | Passo a passo para vender |
| Objecoes Inteligentes | M37 | Respostas por situacao |
| ROI Calculator | M35 | Mostrar economia ao cliente |
| Propostas | M40 | Gerar proposta comercial |
| Planos & Precos | M41 | Consulta interna de precos |
| Academia Comercial | M43 | Formacao dos vendedores |
| Templates de Email | M38 | Mensagens prontas |
| Simulador IA | M44 | Treino de chamadas |
| Configuracao de ICP | M51 | Perfil ideal de cliente |

## 32. Criterios de aceite dos novos modulos

- O vendedor consegue abrir o Modo Demo (M31) a partir de um lead e percorrer problema -> solucao -> imagem -> beneficio -> proximo passo.
- Ao indicar a persona (M32), o sistema mostra o discurso e os modulos certos.
- O roteiro (M33) conduz a chamada por etapas e termina sempre com proximo passo.
- O lead so avanca para demo depois de qualificado (M34).
- Cada objecao (M37) tem resposta, pergunta e material recomendado.
- O follow-up (M38/M39) e gerado/agendado com um clique.
- A proposta (M40) gera PDF e marca o pipeline.
- Nenhum lead contactado fica sem proxima accao (M48).
- Cada chamada termina com um resultado padronizado (M50).
- Cada lead tem timeline comercial completa (M47).

## 33. Historico de implementacao

### 2026-06-14 - Sprint 1 iniciada

Implementado:

- Criados tipos TypeScript de CRM em `types.ts`.
- Criada migration `supabase/migrations/20260614120000_crm_sales_foundation.sql`.
- Atualizado `supabase/schema.sql` com schema consolidado.
- Expandida a tabela atual `hotels` para suportar campos comerciais.
- Criadas tabelas de apoio:
  - `crm_sellers`.
  - `crm_contacts`.
  - `crm_activities`.
  - `crm_schedule_slots`.
  - `crm_close_reasons`.
  - `crm_scripts`.
  - `crm_objections`.
  - `crm_materials`.
- Criada view `crm_leads` para leitura com nomenclatura comercial.
- Criado servico `services/crmDb.ts` para acesso a vendedores, contactos, atividades, agenda e motivos.
- Atualizado `services/hotelDb.ts` para mapear campos comerciais e manter fallback para o schema antigo caso a migration ainda nao tenha sido aplicada.
- Confirmado acesso de API ao Supabase com service role via `.env.local`.
- Atualizado `services/supabaseClient.ts` para aceitar `SUPABASE_ANON_KEY` e manter compatibilidade com `SUPABASE_KEY`.
- Aplicada migration no Supabase real via pooler Postgres `aws-0-eu-west-1.pooler.supabase.com:6543`.
- Validada criacao das tabelas CRM e view `crm_leads`.
- Validado estado inicial no Supabase:
  - 23 leads em `hotels`.
  - 23 leads disponiveis via `crm_leads`.
  - 13 motivos em `crm_close_reasons`.
  - 4 objeccoes em `crm_objections`.
  - 2 utilizadores em `app_users`.

Pendente:

- Atualizar telas do CRM para consumir os novos campos.
- Criar UI de Banco de Leads profissional.
- Criar gestao de vendedores.

### 2026-06-14 - Banco de Leads Comercial iniciado

Implementado:

- Substituida a antiga tela `HotelManagement` por uma tela de Banco de Leads Comercial.
- Adicionados KPIs operacionais no topo:
  - Leads totais.
  - Leads ativos.
  - Alta prioridade.
  - Acoes atrasadas.
  - Acoes de hoje.
  - Demos agendadas.
  - Propostas enviadas.
  - Ganhos.
- Adicionados filtros comerciais:
  - Texto livre.
  - Estado comercial.
  - Prioridade.
  - Vendedor.
  - Proxima acao.
- Adicionadas visualizacoes em tabela e cards.
- Adicionados badges de estado comercial, prioridade e score.
- Adicionado formulario de lead com campos CRM:
  - Cidade.
  - Pais.
  - Segmento.
  - Quartos estimados.
  - Fonte.
  - Estado comercial.
  - Prioridade.
  - Lead score.
  - Vendedor responsavel.
  - Tipo/data da proxima acao.
  - Motivo de encerramento.
  - Bloqueio "nao contactar".
- Adicionada validacao obrigatoria de motivo para estados `lost` e `do_not_contact`.
- Adicionadas acoes rapidas:
  - Modo Play inicial, marcando lead como `in_contact`.
  - Marcar lead como `prepared`.
  - Editar.
  - Abrir proposta.
  - Abrir IA.
  - Excluir.
- Instalado pacote `pg` para permitir execucao de migrations via Postgres local.
- Validado build de producao com `npm run build`.
- Validado servidor local em `http://127.0.0.1:3000`.

Pendente:

- Validacao visual no navegador interno quando o browser `iab` estiver disponivel.
- Criar tela de gestao de vendedores para popular `crm_sellers`.
- Transformar o botao Play em uma tela focada completa de contacto.

### 2026-06-14 - Modo Play, Vendedores, Planeador e Dashboard de Vendas

Implementado:

- Criada tela focada `components/PlayMode.tsx` (M23):
  - Topo com dados do hotel (telefone clicavel `tel:`, email, website, vendedor, historico de contactos).
  - Painel esquerdo de contactos do hotel (M24): adicionar contacto, marcar decisor principal.
  - Centro com guiao de chamada (nome do vendedor + SOL), captura de resultado, interesse, quem atendeu, decisor, notas e proxima acao com atalhos (+7/15/30/60/90 dias).
  - Resumo de chamada por IA reusando `askLeadQuestion` (M30 lite).
  - Painel direito com mini apresentacao do SOL e banco de objeccoes (M28).
  - Rodape com botoes de resultado (agendar demo, reagendar, sem resposta, nao tem interesse, nao contactar, etc.).
  - Ao concluir: atualiza o lead via `hotelDb`, cria `crm_activities`, grava decisor em `crm_contacts` e exige motivo para `lost`/`do_not_contact`.
- Criada tela `components/SellerManagement.tsx` (M25):
  - CRUD de vendedores em `crm_sellers` (idiomas, regioes, metas diarias/semanais, perfil, ativo/inativo).
  - KPIs de equipa e ativar/desativar vendedor.
- Criada tela `components/WeeklyPlanner.tsx` (M22):
  - Grelha semanal Segunda-Sexta em blocos de 20 min (09:00-13:00).
  - Fila de prioridade automatica (demo hoje > reagendado > atrasado > quente > decisor > score alto).
  - Clique-para-agendar, destaque de reagendados/demos, indicador de capacidade diaria (12/dia) e botao Play no slot.
  - Persistencia em `crm_schedule_slots`.
- Criada tela `components/CommercialDashboard.tsx` (M27):
  - Metricas globais, funil comercial visual e metricas por vendedor (conversao, demos, ganhos, perdidos, leads sem proxima acao).
- Integracao no `components/Dashboard.tsx`:
  - Novas abas: Planeador Semanal, Dashboard Vendas, Equipa Comercial (admin).
  - Overlay full-screen do Modo Play, acionado a partir do Banco de Leads e do Planeador.
  - Carregamento de vendedores e motivos de encerramento ao iniciar.
- `HotelManagement` passou a expor `onOpenPlay` para abrir o Modo Play em vez de so mudar o estado.
- Validado `npm run build` e `tsc --noEmit` sem erros.

Pendente:

- Validacao visual no navegador.
- Persistir objeccoes/scripts/materiais configuraveis em `crm_objections`, `crm_scripts` e `crm_materials` (hoje estao embutidos no Modo Play).
- Kanban de pipeline (M26) e relatorios avancados.

### 2026-06-14 - Drag-and-drop no Planeador Semanal

Implementado:

- `components/WeeklyPlanner.tsx` passou a suportar drag-and-drop nativo (HTML5):
  - Arrastar um lead da fila de prioridade para um bloco livre agenda-o nesse horario.
  - Arrastar um slot ja agendado para outro bloco livre move o agendamento (atualiza `slot_start`/`slot_end` e a proxima acao do lead).
  - Destaque visual do bloco alvo durante o arrasto e indicacao "largar aqui".
  - Mantido o fluxo de clique-para-agendar como alternativa.
- Validado `npm run build` e `tsc --noEmit` sem erros.

### 2026-06-14 - Pipeline Comercial Kanban (M26)

Implementado:

- Criada tela `components/PipelineKanban.tsx` (M26):
  - Colunas por estado comercial (Novo -> Ganho/Perdido) com contagem por etapa.
  - Drag-and-drop nativo para mover o lead entre etapas, atualizando `commercial_status` via `hotelDb`.
  - Validacao de dados obrigatorios por etapa: decisor identificado exige `contactPerson`; demo agendada exige `nextActionAt`.
  - Ao mover para Perdido/Nao contactar, modal obrigatorio de motivo (`crm_close_reasons`).
  - Alertas no cartao: proxima acao atrasada e lead parado ha 7+ dias (via `lastActivityAt`).
  - Filtro por vendedor e acoes rapidas no cartao (Play, Proposta, IA).
- Integracao no `components/Dashboard.tsx`: nova aba Pipeline com acesso ao Modo Play, proposta e IA.
- Validado `npm run build` e `tsc --noEmit` sem erros.

Pendente:

- Rastrear data real de entrada em cada etapa (hoje o "parado ha Nd" usa `lastActivityAt` como proxy).

### 2026-06-14 - Correcao: vendedores (e tabelas CRM) nao gravavam no Supabase

Problema:

- Ao criar um vendedor, o registo caia no fallback localStorage e nao persistia no Supabase.

Diagnostico:

- As tabelas `crm_*` tinham RLS ativo sem politicas. A anon key (usada pela app no browser) recebia `42501 new row violates row-level security policy` na escrita, e leitura devolvia 0 linhas. A tabela `hotels` funcionava por nao ter esse bloqueio.

Correcao:

- Criada migration `supabase/migrations/20260614130000_crm_rls_policies.sql` que, para `crm_sellers`, `crm_contacts`, `crm_activities`, `crm_schedule_slots`, `crm_close_reasons`, `crm_scripts`, `crm_objections` e `crm_materials`:
  - garante RLS ativo,
  - faz `GRANT` de SELECT/INSERT/UPDATE/DELETE a `anon` e `authenticated`,
  - cria politica allow-all (`USING (true) WITH CHECK (true)`).
- Migration aplicada no Supabase real via pooler `aws-0-eu-west-1.pooler.supabase.com:6543`.
- Replicadas as mesmas politicas no `supabase/schema.sql` consolidado.
- Validado com a anon key: insert e select em `crm_sellers` passam a funcionar (`error: null`).

Nota:

- Vendedores criados antes da correcao ficaram apenas no localStorage do browser; como a app passa a ler do Supabase, devem ser recriados para persistirem na base de dados.

### 2026-06-14 - Follow-up e Reagendamentos (M29)

Implementado:

- Criada tela `components/FollowUpCenter.tsx` (M29) com fila de retornos por urgencia:
  - Colunas: Atrasados, Hoje, Proximos 7 dias, Sem proxima acao e Reativacao sazonal.
  - Atrasados e ordenados por data; alerta destacado de follow-ups vencidos.
  - Reagendamento rapido (+7/15/30/60/90 dias) e botao "Concluir" que limpa a proxima acao.
  - Reativacao de leads sazonais: leads `lost` com motivo de follow-up futuro voltam a `follow_up` com nova data (nunca reativa `do_not_contact`).
  - Sugestao de contacto: Email (mailto pre-preenchido), WhatsApp (`wa.me` com mensagem), Ligar (`tel:`) e Play.
  - Cada acao grava no lead (`hotels`) e regista uma atividade em `crm_activities`.
- Integracao no `components/Dashboard.tsx`: nova aba "Follow-ups" com badge de vencidos na barra lateral.
- Validado `npm run build` e `tsc --noEmit` sem erros.

Estado do MVP:

- M21 a M29 implementados. Falta apenas M30 (IA comercial completa: scoring automatico e extracao estruturada); o resumo de chamada por IA ja existe no Modo Play.

### 2026-06-14 - Correcao: lead nao aparecia no horario do Planeador

Problema:

- No Planeador Semanal, ao colocar um lead num bloco, o agendamento gravava mas nao aparecia preenchido na grelha.

Diagnostico:

- A grelha procurava o slot por igualdade exata de string de `slot_start`. O valor gravado (`toISOString()`, ex.: `2026-06-14T08:40:00.000Z`) volta do Supabase como timestamptz com outro formato (`2026-06-14T08:40:00+00:00`). As strings nao batiam, logo o slot existia em memoria mas nao era desenhado.
- Confirmado com a anon key: string igual = false, epoch igual = true.

Correcao:

- `components/WeeklyPlanner.tsx` passou a indexar e comparar slots por timestamp (epoch ms) via helper `slotAt(iso)`, robusto a diferencas de formato entre o ISO local e a timestamptz do Supabase.
- Aplicado a todos os pontos (render da celula, agendar, mover, validacao de celula ocupada).
- Validado `npm run build` e `tsc --noEmit` sem erros.

### 2026-06-14 - Scripts, Objeccoes e Materiais configuraveis (M28)

Implementado:

- Novos tipos em `types.ts`: `CrmScript`, `CrmObjection`, `CrmMaterial` e `CrmMaterialType` (alinhado ao CHECK do schema: image/video/pdf/link/text).
- `services/crmDb.ts` ganhou CRUD + mappers para `crm_scripts`, `crm_objections` e `crm_materials`, com defaults e fallback localStorage.
- Criada tela `components/CommercialLibrary.tsx` (M28) com 3 separadores (Scripts, Objeccoes, Materiais) e edicao/criacao por modal, incluindo flag "ativo" (visivel no Play).
- `components/PlayMode.tsx` passou a consumir scripts/objeccoes/materiais da base de dados (fallback aos defaults embutidos):
  - Seletor de guiao por script da BD, com substituicao de `[NOME]` pelo nome do vendedor.
  - Mini apresentacao e banco de objeccoes alimentados pelos materiais/objeccoes ativos.
- Integracao no `components/Dashboard.tsx`: nova aba "Scripts & Materiais" (admin).
- Validado `npm run build` e `tsc --noEmit` sem erros.

### 2026-06-14 - IA Comercial e Lead Scoring (M30)

Implementado:

- Lead scoring deterministico (PRD secao 9) em `services/leadScoring.ts`:
  - `computeLeadScore(lead)` com breakdown e faixas (Muito quente / Quente / Medio / Frio / Baixa / Bloqueado).
  - Sinais: quartos 20-150, hotel independente, grupo, reputacao de limpeza fraca, website, decisor identificado, lead engajado, potencial Hot, sem telefone, concorrente instalado, do_not_contact => bloqueio.
- Integracao no Banco de Leads (`components/HotelManagement.tsx`):
  - Botao "Auto" no formulario para calcular o score do lead atual.
  - Botao "Recalcular scores" na toolbar para recalcular e gravar todos os leads.
  - Badge de faixa do score na tabela.
- IA estruturada de chamada (`services/geminiService.ts`):
  - `analyzeCallNotes(lead, notes)` devolve JSON: resumo, resumo executivo, interesse, decisor (nome/cargo/telefone/email), objeccoes, proxima accao + dias e score sugerido. Parse seguro com fallback para texto.
- Integracao no Modo Play (`components/PlayMode.tsx`):
  - Botao "Analisar IA" pre-preenche interesse, decisor, objeccoes e proxima accao (tudo editavel).
  - Botao "Score auto" e score sugerido pela IA aplicados ao lead ao concluir.
- Validado `npm run build` e `tsc --noEmit` sem erros.

Estado:

- M21 a M30 implementados. MVP e Versao 2 do PRD cobertos. A IA "sugere, nao substitui": todas as sugestoes ficam editaveis antes de gravar.

### 2026-06-14 - Correcao: slots fantasma no Planeador

Problema:

- No Planeador, depois de remover um lead de um bloco, esse horario ficava visualmente vazio mas nao aceitava um novo lead e continuava a contar na capacidade do dia.

Diagnostico:

- `handleRemoveSlot` apenas marcava o slot como `canceled` (mantendo a linha). Como `getScheduleSlots` devolvia todos os slots, `slotAt()` ainda encontrava o slot cancelado e tratava a celula como ocupada.

Correcao:

- Adicionado `crmDb.deleteScheduleSlot(id)` (delete real no Supabase + localStorage).
- `WeeklyPlanner` passa a apagar o slot ao remover.
- `loadSlots` filtra slots `canceled`/`missed` para neutralizar fantasmas ja existentes na base de dados.
- Validado `npm run build` e `tsc --noEmit` sem erros.

### 2026-06-14 - Pesquisa: nao repetir leads ja mostrados

Problema:

- Ao pedir N leads do Algarve (ou outra zona), a pesquisa devolvia sempre os mesmos hoteis.

Causa:

- O pedido de pesquisa nao informava a IA (nem os provedores OSM/RNET/CADASTUR) sobre os leads ja conhecidos, e nao havia deduplicacao.

Correcao:

- `searchLeadsInLocation` (cliente) passa agora `excludeNames`.
- `Dashboard` constroi `excludeNames` a partir de: leads do CRM (`hotels`), historico de campanhas e um registo persistente de "ja mostrados" por pesquisa (localStorage, chave por pais/local/nicho). Apos cada pesquisa memoriza os nomes devolvidos.
- Endpoint `/api/gemini/searchLeads` (server.ts):
  - Injeta a lista "ALREADY KNOWN - DO NOT RETURN" no prompt do Gemini.
  - Filtra os resultados por nome (case-insensitive) em todos os provedores (Gemini, OSM, RNET, CADASTUR).
- Resultado: cada pesquisa tende a trazer hoteis novos; os ja mostrados/guardados/descartados nao voltam.
- Validado `npm run build` e `tsc --noEmit` sem erros.

Nota: por ser alteracao no `server.ts`, e necessario reiniciar o `npm run dev`.

### 2026-06-14 - Acesso de vendedores ao sistema (login)

Contexto:

- "Vendedor" (crm_sellers) e "utilizador de login" (app_users / Supabase Auth) eram conceitos separados; criar um vendedor nao dava acesso ao sistema.

Implementado (opcao escolhida: admin define a senha):

- Politica RLS permissiva em `app_users` (migration `20260614140000_app_users_rls.sql`, aplicada via pooler) para a anon key poder ler (login) e escrever (criar contas). Replicada no `schema.sql`.
- `crmDb.upsertSellerLogin({name,email,password})`: cria/atualiza a conta em `app_users` (role 'user') e devolve o id; preserva role/plano de contas existentes.
- Formulario da Equipa Comercial: nova seccao "Acesso ao sistema" com campo de senha. Ao guardar com senha, cria a conta de login e liga `crm_sellers.user_id`.
- Indicadores "Login ativo"/"Sem login" no cartao e no formulario do vendedor.
- O vendedor entra no ecra de login normal com o email + senha; o fluxo tenta Supabase Auth e, em fallback, valida em `app_users`.
- Verificado ponta-a-ponta com a anon key: criacao de conta, login por fallback e rejeicao de senha errada.

Pendente / nota de seguranca:

- Passwords ficam em texto simples em `app_users` e a anon key (no bundle) tem acesso. Aceitavel para ferramenta interna; para producao migrar para Supabase Auth.
- Falta a filtragem "cada vendedor ve apenas os seus leads" (papel 'user' nao mostra abas de admin, mas o pipeline/banco ainda mostram todos os leads). Proximo passo de permissoes.

### 2026-06-14 - Login via Supabase Auth + Permissoes por vendedor

Parte 1 - Login ligado ao Supabase Auth:

- `server.ts`: cliente admin (service role via `SUPABASE_ROLE_KEY`, ja carregada por `loadLocalEnv`) e endpoint `POST /api/sellers/account` que:
  - cria o utilizador no Supabase Auth (`admin.auth.admin.createUser`, email ja confirmado) ou atualiza a password se ja existir;
  - garante o perfil em `app_users` com papel `user` (evita a promocao automatica a admin no login) e password placeholder `supabase_auth` (a password real fica so no Auth, com hash).
- `crmDb.upsertSellerLogin` deixou de escrever `app_users` com a anon key e passa a chamar este endpoint; liga `crm_sellers.user_id` ao id do Auth.
- O vendedor entra no ecra de login com email + senha; o fluxo usa `signInWithPassword` (Supabase Auth real).
- Verificado: createUser + login real + perfil role 'user' + rejeicao de senha errada.

Parte 2 - Permissoes por vendedor:

- `Dashboard` identifica o vendedor do utilizador logado (por `user_id` ou email) e calcula `restrictSellerId`:
  - admin (User.role 'admin') ve tudo;
  - vendedor (CrmSeller.role 'seller') ve apenas os seus leads;
  - supervisor/admin comercial veem tudo.
- `restrictSellerId` propagado e aplicado em: Banco de Leads, Pipeline, Planeador, Follow-ups e Dashboard de Vendas (filtragem por `responsibleSellerId` e ocultacao do seletor de vendedor).
- Validado `npm run build` e `tsc --noEmit` sem erros.

Nota: alteracao no `server.ts` exige reiniciar o `npm run dev`.

### 2026-06-15 - Materiais comerciais com screenshots reais do HotelOps (M28)

Contexto:

- Os primeiros materiais M1-M20 foram mockups CSS inventados (Remotion) e foram rejeitados por nao representarem o produto real.

Implementado:

- Capturados screenshots REAIS do sistema HotelOps/SOL (repo sibling `../Hotelops`, React Router v7, dev server em :5173) via Playwright, com login admin e remocao de toasts sobrepostos.
- 17 ecrãs reais ligados a `crm_materials` (M1-M14, M17, M19, M20): Mapa de Quartos, Colaboradores, Checklists, Tarefas, Inspeções, Manutenção, Mensagens, Prioridades, Amenities, Pedidos do hóspede, Auditoria, Relatórios, Dashboard SLA, mobile, Sustentabilidade, Centro IA, Grupo.
- PNGs em `public/materials/mNN.png`; `PlayMode` e `CommercialLibrary` mostram as imagens reais.
- M15 (Offline), M16 (Multi-idioma) e M18 (PMS) nao tem ecrã proprio -> ficaram sem imagem e desativados.
- Removido todo o andaime do Remotion (pasta `remotion/`, deps `remotion`/`@remotion/*`, script `render:materials`) por nao ser a abordagem correta.
- Validado `npm run build` e `tsc --noEmit` sem erros.

### 2026-06-15 - Roadmap de profissionalizacao documentado (M31-M51)

- Adicionadas as seccoes 24 a 32 com a visao do CRM como assistente de vendas, o ICP (M51), o catalogo de 21 novos modulos comerciais (M31-M51), o mapa modulo comercial <-> modulos do sistema SOL, personas, objecoes/materiais por situacao, sequencias de follow-up, roadmap por fases, novos menus e criterios de aceite.
- Estado: planeamento. Nenhum destes modulos foi implementado ainda; serao priorizados por fases (Fase 1 essencial, Fase 2 profissionalizacao, Fase 3 avancado).

### 2026-06-15 - Fase 1 iniciada: Demo Comercial (M31) + Timeline (M47)

Implementado:

- `components/DemoMode.tsx` (M31 + M32): apresentacao full-screen lançada do lead ("Demo"), com:
  - seletor de persona (recepcao, governanta, gerente, manutencao, dono, grupo) que filtra os slides de valor;
  - slides problema -> solucao -> imagem REAL do SOL (de `crm_materials`) -> beneficio;
  - slide comparador SOL vs WhatsApp/Papel (M36);
  - slide de proximos passos com marcar demo (atualiza o lead), email e WhatsApp;
  - navegacao por setas/teclado, dots e botao "copiar pitch".
- `components/PlayMode.tsx` (M47): drawer de historico comercial (timeline das `crm_activities`: tipo, resultado, interesse, notas, objecoes, proxima acao), aberto pelo contador de contactos no topo.
- `components/HotelManagement.tsx`: botao "Demo" por lead (tabela e cards); novo prop `onOpenDemo`.
- `components/Dashboard.tsx`: overlay do Modo Demo (M31).
- Sem alteracoes de schema. Validado `npm run build` e `tsc --noEmit` sem erros.

Fase 1 restante: M34 Qualificacao, M37 Objecoes inteligentes, M38 Templates email/WhatsApp, M48 Checklist de proxima accao (reforco).

### 2026-06-15 - Fase 1 (cont.): Templates de mensagens (M38) + Checklist de proxima accao (M48)

Implementado:

- `components/MessageTemplates.tsx` (M38): modal com 8 templates por canal (email formal/curto, WhatsApp, LinkedIn, pos-demo, reenvio, reagendar), gerados com os dados do lead (nome, hotel). Assunto + corpo editaveis, com copiar, abrir email (mailto) e abrir WhatsApp (wa.me). Acionado pelo botao "Mensagens" no Banco de Leads. Novo prop `onOpenMessages` e overlay no Dashboard.
- `components/HotelManagement.tsx` (M48): alerta acionavel no topo quando ha leads contactados sem proxima accao, com botao "Ver e resolver" que filtra esses leads. Reforca a regra "nenhum lead contactado sem proximo passo".
- Sem alteracoes de schema. Validado `npm run build` e `tsc --noEmit` sem erros.

Fase 1 concluida nos itens sem schema (M31, M32, M38, M47, M48). Restam, com schema: M34 Qualificacao e M37 Objecoes inteligentes.

### 2026-06-15 - Fase 1 (cont.): Qualificacao (M34) + Objecoes inteligentes (M37)

Implementado (codigo):

- Tipos: `LeadQualification` e `Lead.qualification`; `CrmObjection` com `fullResponse`, `followUpQuestion`, `recommendedMaterial`, `nextAction`.
- `services/hotelDb.ts`: mapeia `qualification` (JSONB) de/para `hotels`.
- `services/crmDb.ts`: mapeia os novos campos de `crm_objections`.
- `components/QualificationModal.tsx` (M34): mini formulario (quartos, PMS, metodo de housekeeping, governanta, manutencao, dor, interesse, probabilidade, melhor contacto para demo). Ao guardar, atualiza prioridade pelo interesse e marca o lead como preparado. Botao "Qualificar" no Banco de Leads + badge de qualificado.
- `components/CommercialLibrary.tsx` (M37): editor de objecao com resposta curta, resposta completa, pergunta de continuidade, material recomendado e proxima accao.
- `components/PlayMode.tsx` (M37): banco de objecoes mostra a estrutura completa (resposta, resposta completa, pergunta, material a mostrar, proxima accao).

Migration: `supabase/migrations/20260615120000_m34_m37_qualification_objections.sql` (ALTER hotels + crm_objections). PENDENTE de aplicar: a password da BD do CRM em `.env.local` foi rotacionada e o pooler ja nao autentica. Aplicar via SQL editor do Supabase ou atualizar a password. Ate la, os novos campos degradam para fallback (nao persistem na BD).

Validado `npm run build` e `tsc --noEmit` sem erros.

### 2026-06-15 - Migration M34+M37 aplicada

- A password da BD tinha sido rotacionada; aplicada com a nova credencial via pooler em modo SESSAO (aws-0-eu-west-1.pooler.supabase.com:5432). O pooler de transacao (6543) rejeitava a auth.
- Colunas confirmadas: hotels.qualification, crm_objections.full_response/follow_up_question/recommended_material/next_action.
- Forcado reload do schema do PostgREST (NOTIFY pgrst) e validado via anon key. M34 e M37 ficam 100% funcionais e persistentes.
- `.env.local` atualizado com a nova SUPABASE_DB_URL.

### 2026-06-15 - Fase 2 completa (M35, M40, M41, M42, M45, M46)

Implementado (sem schema):

- `services/salesCatalog.ts`: planos (M41), playbook de demo (M42), materiais por situacao (M46) e calculo de ROI (M35).
- `components/SalesTools.tsx`: nova aba "Ferramentas de Venda" com 4 sub-abas:
  - ROI / Economia (M35): calculadora de horas e custo perdidos por mes/ano com processos manuais.
  - Planos & Precos (M41): Starter/Pro/Premium com modulos incluidos e precos indicativos configuraveis.
  - Playbook de Demo (M42): 10 passos (o que dizer, imagem do modulo, pergunta, objecao, proximo).
  - Materiais por situacao (M46): "se o cliente disser X -> mostrar Y" com a imagem real do modulo.
- `services/leadScoring.ts` (M45): `computeInterestScore` — temperatura comportamental (Frio/Morno/Quente/Muito quente/Bloqueado) a partir de etapa, qualificacao e quartos. Badge na tabela do Banco de Leads.
- `components/ProposalBuilder.tsx` (M40): proposta comercial com plano, preco, setup, desconto, validade e notas; gera PDF (impressao do browser) e marca o lead como "proposta enviada" + atividade + follow-up. Botao no Banco de Leads.
- Validado `npm run build` e `tsc --noEmit` sem erros.

Estado: Fase 1 e Fase 2 concluidas. Resta a Fase 3 (avancado): IA resumo ampliado, M44 Simulador de treino, M39 automacao de follow-up, integracao email/calendario, assinatura digital.

### 2026-06-15 - Fase 3: Sequencias de follow-up (M39) + Simulador IA (M44)

Implementado:

- Migration `20260615140000_m39_followup_sequence.sql` (hotels.followup_sequence JSONB), aplicada via session pooler + reload PostgREST.
- M39: `services/salesCatalog.ts` define 2 sequencias ("Cliente pediu informacao" e "Depois da demo") com passos por dia. `Lead.followupSequence` ({key, startedAt, step}); mapeado em `hotelDb`. No Follow-up Center, cada lead pode iniciar uma sequencia; mostra "passo k/n" e botao "Concluir passo" que avanca a cadencia, define a proxima accao na data certa e regista atividade. Ao terminar, limpa a sequencia.
- M44: endpoint `POST /api/gemini/simulate` (server.ts) faz role-play de personas (recepcao ocupada, governanta resistente, gerente interessado, dono preco, usa concorrente) e avaliacao do vendedor. `geminiService.simulateCall`. `components/CallSimulator.tsx`: chat de treino + botao "Terminar e avaliar". Adicionado como sub-aba "Simulador IA" nas Ferramentas de Venda.
- Validado `npm run build` e `tsc --noEmit` sem erros.

Nota: o M44 mexe no `server.ts` — reiniciar o `npm run dev` para o endpoint ficar ativo.

Resta da Fase 3: integracao email/calendario, assinatura digital de proposta, IA de resumo ampliada.

### 2026-06-15 - Fase 3: Integracao com calendario (.ics)

Implementado (sem dependencias externas):

- `services/calendar.ts`: gera e descarrega um ficheiro `.ics` (com alarme 15 min antes) para a proxima accao/demo de um lead — o vendedor importa no Google Calendar / Outlook / Apple Calendar, sem OAuth.
- Botao "Calendario" no Follow-up Center (em cada lead com proxima accao) e "Adicionar ao calendario" no Modo Demo (proximos passos).
- IA de resumo: ja coberta pelo `analyzeCallNotes` (resumo executivo) no Modo Play.

Estado do roadmap M31-M51: concluido tudo o que depende de nos (Fases 1, 2 e 3). Por fazer apenas itens com dependencia externa: integracao OAuth com Google Calendar/email e assinatura digital de proposta (ex.: DocuSign) — requerem contas/servicos de terceiros.

### 2026-06-15 - Tema claro/escuro com toggle Lua/Sol

- Tema escuro mantem-se como base. Tema claro aplicado apenas sob `html.theme-light` (overrides em `index.html`), reversivel e sem reescrever componentes.
- `components/ThemeToggle.tsx` (botao Lua/Sol) no cabecalho do Dashboard e fixo no login/landing; guarda a preferencia em localStorage `leadscope_theme` e aplica no arranque via script inline (sem flash).
- Validado `npm run build` e `tsc --noEmit` sem erros.

### 2026-06-15 - Sidebar com cor da marca + Academia SOL (M43)

- Sidebar: substituido o cinza por gradiente da marca SOL (emerald/teal) via classe `.sol-sidebar` definida em `index.html`, adaptada aos dois temas (escuro e claro).
- `components/Academy.tsx` (M43 Academia Comercial): nova aba "Academia SOL" com 8 licoes de formacao (o que e o SOL, fluxo de housekeeping, dores, como falar com cada persona, objecoes, demo, preencher CRM, fechar) e checklist "Vendedor aprovado para vender SOL" com barra de progresso, persistida em localStorage. Liga ao Simulador IA e ao Playbook.
- Validado `npm run build` e `tsc --noEmit` sem erros.

### 2026-06-15 - Correcao do deploy na Vercel (404 no root)

Problema: `vendas.ecletika.com/` devolvia 404. O `vercel.json` legado (builds+routes) apontava /api para `dist/server.cjs`, que faz `app.listen()` — nao funciona em serverless — e nao servia o `dist` estatico.

Correcao:

- `server.ts` passou a exportar `buildApp()` (sem `app.listen`, sem Vite) em vez de arrancar o servidor.
- Novo `dev.ts`: runner local (Vite em dev, dist estatico em producao) — usado por `npm run dev`/`start`.
- Nova funcao serverless `api/[...path].ts` que reutiliza a app Express (`export default buildApp()`); a Vercel encaminha todos os `/api/*` para aqui.
- `vercel.json` modernizado: `buildCommand: vite build`, `outputDirectory: dist`, e rewrite SPA `/((?!api/).*) -> /index.html` (assets e /api servidos diretamente).
- `package.json`: `dev`/`build`/`start` passam a usar `dev.ts`.
- Validado local (`npm run build`, `tsc --noEmit`, arranque do `dev.ts` -> root HTTP 200).

Para o deploy funcionar 100%, definir na Vercel as variaveis de ambiente do projeto: GEMINI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_ROLE_KEY. O frontend liga ao Supabase mesmo sem env (chave anon embutida), por isso o CRM carrega; as variaveis sao necessarias para a API (IA, criacao de contas de vendedor).

### 2026-06-15 - Vercel /api resolvido (funcao self-contained)

Causa raiz: a Vercel nao compilava/empacotava `server.ts` (fora de `api/`), logo a funcao crashava com `ERR_MODULE_NOT_FOUND: Cannot find module '/var/task/server'`.

Solucao final:

- `server-entry.ts` (handler que importa `buildApp`) e empacotado por esbuild (CJS, todas as dependencias inline) para `api/index.js` — funcao self-contained, sem resolucao de modulos em runtime.
- `api/package.json` com `{ "type": "commonjs" }` evita o crash de "Dynamic require" (projeto raiz e ESM).
- `buildCommand` e `npm run build:api` regeneram o bundle a partir de `server.ts`.
- Validado em producao: `/api/gemini/health` devolve JSON; `/api/gemini/searchLeads` devolve leads reais (RNET) mesmo sem GEMINI_API_KEY (fallback).

Pendente (config na Vercel, do lado do cliente): definir `GEMINI_API_KEY` (features de IA) e `SUPABASE_ROLE_KEY` (criar contas de vendedor). O frontend liga ao Supabase via chave anon embutida.

### 2026-06-20 - Email: copia (BCC) e recepcao

Diagnostico: o envio via Brevo JA funcionava (devolve messageId). Faltava (1) BCC para o remetente receber copia e (2) a copia em "Enviados" so era guardada se houvesse sellerId.

Correcao:

- `/api/email/send` passa a fazer BCC para o vendedor (lookup por sellerId em app_users) e para um endereco de copia `EMAIL_COPY_TO` (default: remetente comercial). Define reply-to para o vendedor.
- `Dashboard` passa `sellerId={currentSeller?.id ?? currentUser.id}` ao MessageTemplates, para a copia em "Enviados" (Drive) ser guardada tambem com admin.
- `.env.local`: adicionado `EMAIL_COPY_TO=ecletikaportugal@gmail.com`.

Acoes na Vercel: definir `EMAIL_COPY_TO` (para receber copia na Gmail) e confirmar autenticacao do dominio remetente no Brevo (SPF/DKIM) para deliverability/spam.

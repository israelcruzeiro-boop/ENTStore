# Dívida Técnica — StorePage

Este arquivo registra decisões temporárias, atalhos ou melhorias pendentes identificadas durante o desenvolvimento.

| Data | Item | Descrição | Prioridade | Status |
| :--- | :--- | :--- | :--- | :--- |
| 11/04/2026 | Logger Customizado | Implementado core no `src/utils/logger.ts` e integrado nos hooks e auth. Pendente substituição total em componentes menores. | Baixa | Em Progresso |
| 11/04/2026 | Soft Delete | Implementar a lógica de `deleted_at` em todas as tabelas (requer alteração no schema do banco e lógica de query). | Alta | Pendente |
| 11/04/2026 | Zod Validation | Implementado schemas base e validação em hooks principais. Necessário garantir cobertura em componentes que utilizam mutations diretas. | Média | Em Progresso |
| 02/05/2026 | Persistencia de ajuste de capa | `hero_position` e `hero_brightness` aparecem na UI de settings e na Home, mas ainda nao fazem parte do contrato/mappers/persistencia do backend. | Media | Pendente |
| 02/05/2026 | Campos de landing no admin settings | `publicBio`, `landingPageActive` e `landingPageLayout` aparecem em `Appearance.tsx`, mas nao sao salvos pelo fluxo de admin settings. | Media | Pendente |

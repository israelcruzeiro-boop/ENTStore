# AGENTS.md

> Cole o trecho abaixo no final do `AGENTS.md` que já existe na raiz do seu projeto.
> Se você ainda não tem um `AGENTS.md`, crie um na raiz e cole o conteúdo todo.

---

## Validação de correções de segurança

Quando este projeto receber:

- Um arquivo `AUDITORIA.md` com vulnerabilidades e correções sugeridas
- Saída de scanners (Snyk, Semgrep, Trivy, npm audit, pip-audit, etc.)
- Sugestões de fix de outro agente
- Pedido do usuário como "valida essas correções", "isso vai quebrar?", "isso é gambiarra?"

**Spawn o subagente `security_validator`** antes de qualquer implementação.

O `security_validator` opera em `read-only` e produz vereditos por item:

- ✅ **APROVADO** — implementar como descrito
- 🟡 **APROVADO COM RESSALVA** — implementar respeitando ajustes obrigatórios
- ❌ **REJEITADO** — NÃO implementar
- ❓ **QUESTIONAR** — aguardar resposta humana

Itens REJEITADOS são bloqueio rígido. Itens com ressalva exigem que as ressalvas sejam
aplicadas como pré-requisito do patch.

### Como invocar

```
Use o security_validator para revisar AUDITORIA.md antes de eu aplicar qualquer fix.
```

# Troubleshooting: Erro "Permission denied (publickey)"

## Problema Comum

O erro `Permission denied (publickey)` geralmente acontece quando:

1. A chave PEM no secret tem formatação incorreta
2. A chave não é a correta para a EC2
3. A chave tem espaços extras ou quebras de linha incorretas

## Soluções

### Solução 1: Verificar Formato da Chave no Secret

A chave no secret `EC2_SSH_KEY` deve:

✅ **Estar correta:**
```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
... (várias linhas) ...
-----END RSA PRIVATE KEY-----
```

❌ **NÃO deve ter:**
- Espaços extras no início ou fim
- Quebras de linha duplas
- Caracteres invisíveis

### Solução 2: Verificar Qual Chave Está na EC2

Execute na EC2:

```bash
# Ver qual chave pública está autorizada
cat ~/.ssh/authorized_keys

# Verificar permissões
ls -la ~/.ssh/
```

A chave pública deve corresponder à chave privada que você colocou no secret.

### Solução 3: Gerar Nova Chave e Atualizar EC2

Se a chave não estiver correta:

1. **Gerar nova chave no AWS:**
   - EC2 → Key Pairs → Create key pair
   - Nome: `prontivus-keypair`
   - Formato: `.pem`
   - Download

2. **Adicionar chave pública na EC2:**
   ```bash
   # Na EC2, adicionar a chave pública
   echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQC..." >> ~/.ssh/authorized_keys
   ```

3. **Atualizar secret no GitHub:**
   - Copie o conteúdo completo do arquivo `.pem` baixado
   - Atualize o secret `EC2_SSH_KEY`

### Solução 4: Usar Chave Existente Corretamente

Se você já tem a chave que funciona:

1. **Encontrar a chave que você usa para conectar:**
   - Geralmente está em: `C:\Users\raphael.souza\.ssh\` ou onde você salvou
   - Ou use a chave que você baixou do AWS

2. **Copiar conteúdo completo:**
   - Abra no Bloco de Notas
   - Selecione tudo (Ctrl+A)
   - Copie (Ctrl+C)

3. **Atualizar secret:**
   - GitHub → Settings → Secrets → EC2_SSH_KEY
   - Cole o conteúdo completo
   - Update secret

### Solução 5: Verificar Secrets Estão Corretos

Certifique-se de que os 3 secrets estão assim:

- `EC2_SSH_KEY`: Conteúdo completo da chave PEM (sem espaços extras)
- `EC2_HOST`: `54.233.203.231` (sem http:// ou espaços)
- `EC2_USER`: `ubuntu` (minúsculo, sem espaços)

## Teste Manual

Para testar se a chave funciona localmente:

```bash
# No seu computador (se tiver SSH)
ssh -i caminho/para/prontivus-keypair.pem ubuntu@54.233.203.231
```

Se funcionar localmente, o problema é na formatação do secret no GitHub.

## Próximos Passos

1. Verifique o formato da chave no secret
2. Teste a conexão manualmente (se possível)
3. Reexecute o workflow após corrigir
4. Veja os logs detalhados (agora com `-v` para debug)

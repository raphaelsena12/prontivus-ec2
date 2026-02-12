# Guia de Configuração DNS para SES - Resolver "Email Não Verificado"

## ⚠️ Problema Atual

Os emails estão chegando com aviso "Não é possível verificar se este email veio do remetente" porque faltam os registros DNS de autenticação.

**Status no AWS SES:**
- ✅ Domínio `prontivus.com` está verificado
- ❌ **DMARC não configurado** (Recomendação de ALTO IMPACTO)
- ⚠️ Verifique também SPF e DKIM

## ✅ Solução: Configurar SPF, DKIM e DMARC

### Passo 1: Verificar Domínio no AWS SES

1. Acesse o **AWS Console** → **SES** → **Verified identities**
2. Verifique se o domínio **`prontivus.com`** está verificado (não apenas um email específico)
3. Se não estiver:
   - Clique em **"Create identity"**
   - Selecione **"Domain"**
   - Digite: `prontivus.com`
   - Marque **"Use a default DKIM signing key"** ou **"Easy DKIM"**
   - Clique em **"Create identity"**

### Passo 2: Configurar SPF no DNS

O SPF autoriza o AWS SES a enviar emails em nome do seu domínio.

**Adicione este registro TXT no DNS do domínio `prontivus.com`:**

```
Tipo: TXT
Nome: @ (ou prontivus.com)
Valor: v=spf1 include:amazonses.com ~all
TTL: 3600 (ou o padrão do seu provedor)
```

**Explicação:**
- `v=spf1` = versão do SPF
- `include:amazonses.com` = autoriza o AWS SES
- `~all` = soft fail (emails de outros servidores são marcados, mas não rejeitados)

### Passo 3: Configurar DKIM no DNS

O DKIM assina digitalmente os emails para provar autenticidade.

1. No **AWS SES Console** → **Verified identities** → clique no domínio `prontivus.com`
2. Vá na aba **"DKIM"**
3. Se estiver usando **Easy DKIM**, você verá 3 registros CNAME para adicionar
4. Adicione os 3 registros CNAME no seu DNS:

```
Exemplo (os valores serão diferentes no seu caso):

Tipo: CNAME
Nome: xxxxxx._domainkey.prontivus.com
Valor: xxxxxx.dkim.amazonses.com
TTL: 3600

Tipo: CNAME
Nome: yyyyyy._domainkey.prontivus.com
Valor: yyyyyy.dkim.amazonses.com
TTL: 3600

Tipo: CNAME
Nome: zzzzzz._domainkey.prontivus.com
Valor: zzzzzz.dkim.amazonses.com
TTL: 3600
```

5. Após adicionar, aguarde alguns minutos e verifique no SES se o status mudou para **"Success"**

### Passo 4: Configurar DMARC (⚠️ CRÍTICO - Recomendação de ALTO IMPACTO)

O DMARC define políticas de autenticação e melhora a reputação. **O AWS SES está mostrando uma recomendação de ALTO IMPACTO indicando que o DMARC não foi encontrado.**

**Opção 1: Usar o link do console SES (Recomendado)**
1. No console SES, vá em **"Recomendações"**
2. Clique no link **"Configuração de registros DMARC"** na recomendação
3. Siga as instruções fornecidas pelo AWS

**Opção 2: Configurar manualmente**

**Adicione este registro TXT no DNS:**

```
Tipo: TXT
Nome: _dmarc.prontivus.com
Valor: v=DMARC1; p=quarantine; rua=mailto:admin@prontivus.com; ruf=mailto:admin@prontivus.com; fo=1
TTL: 3600
```

**OU para começar de forma mais conservadora (apenas monitorar):**

```
Tipo: TXT
Nome: _dmarc.prontivus.com
Valor: v=DMARC1; p=none; rua=mailto:admin@prontivus.com
TTL: 3600
```

**Explicação:**
- `v=DMARC1` = versão do DMARC
- `p=quarantine` = emails que falharem autenticação vão para quarentena (não spam)
- `rua` = email para relatórios agregados
- `ruf` = email para relatórios de falhas
- `fo=1` = reportar todas as falhas

**Políticas DMARC:**
- `p=none` = apenas monitorar (recomendado para começar)
- `p=quarantine` = enviar para quarentena
- `p=reject` = rejeitar completamente (só use após testar)

### Passo 5: Verificar Configuração

Após adicionar os registros DNS:

1. **Aguarde a propagação DNS** (pode levar de alguns minutos a 48 horas)
2. **Verifique no AWS SES:**
   - SPF: geralmente verificado automaticamente
   - DKIM: deve aparecer como "Success" na aba DKIM
   - DMARC: verifique com ferramentas online

3. **Teste o envio:**
   - Envie um email de teste
   - Verifique os headers do email recebido
   - Use ferramentas como:
     - https://mxtoolbox.com/spf.aspx
     - https://mxtoolbox.com/dkim.aspx
     - https://mxtoolbox.com/dmarc.aspx

### Passo 6: Verificar Headers do Email

Após enviar um email, verifique os headers. Você deve ver:

```
Authentication-Results: spf=pass
Authentication-Results: dkim=pass
Authentication-Domain: prontivus.com
```

## 🔍 Troubleshooting

### DKIM não está funcionando?

1. Verifique se os 3 registros CNAME foram adicionados corretamente
2. Aguarde até 48 horas para propagação
3. Verifique se não há erros de digitação nos registros
4. Use `dig` ou `nslookup` para verificar se os registros estão resolvendo

### SPF não está funcionando?

1. Verifique se o registro TXT está no domínio raiz (`@` ou `prontivus.com`)
2. Verifique se não há múltiplos registros SPF (deve ter apenas um)
3. Teste com: `nslookup -type=TXT prontivus.com`

### Emails ainda vão para spam?

1. Verifique se saiu do **Sandbox do SES** (Account dashboard → Request production access)
2. Configure o **DMARC** com `p=quarantine` inicialmente
3. Monitore os relatórios DMARC
4. Verifique a reputação do domínio em: https://mxtoolbox.com/blacklists.aspx

## 📝 Checklist Final

- [x] Domínio `prontivus.com` verificado no SES ✅
- [ ] Registro SPF adicionado no DNS
- [ ] 3 registros DKIM CNAME adicionados no DNS
- [ ] DKIM mostra "Success" no console SES
- [ ] **Registro DMARC adicionado** ⚠️ **CRÍTICO - Recomendação de ALTO IMPACTO**
- [ ] Aguardou propagação DNS (pode levar até 48h)
- [ ] Testou envio de email
- [ ] Verificou headers do email recebido
- [ ] Conta SES saiu do Sandbox (para produção)
- [ ] **Recomendação DMARC desapareceu do console SES**

## 🚀 Após Configuração

Após configurar tudo corretamente:

1. Os emails devem aparecer como **verificados**
2. Não devem mais ir para **lixo eletrônico**
3. O aviso "Não é possível verificar" deve **desaparecer**
4. A recomendação de **ALTO IMPACTO do DMARC** deve **desaparecer** do console SES
5. A reputação do domínio vai **melhorar com o tempo**

## 🎯 Ação Imediata Necessária

**PRIORIDADE ALTA:** Configure o DMARC agora mesmo:

1. No console SES, clique em **"Recomendações"**
2. Clique no link **"Configuração de registros DMARC"** na recomendação de ALTO IMPACTO
3. Siga as instruções para adicionar o registro TXT no seu DNS
4. Aguarde a propagação (alguns minutos a algumas horas)
5. Verifique se a recomendação desapareceu do console SES

## 📞 Suporte

Se após 48 horas os problemas persistirem:
1. Verifique os logs do SES no CloudWatch
2. Verifique os relatórios DMARC (se configurado)
3. Teste com ferramentas online de verificação DNS
4. Consulte a documentação oficial: https://docs.aws.amazon.com/ses/

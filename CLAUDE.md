@AGENTS.md

# Foto & Gráficos

**O que é:** sistema da gráfica e fotografia: balcão, contas a pagar e receber, clientes, produtos e produção. Vai substituir o NEX.
**Pasta:** `C:\Users\NotRenan\Documents\foto_e_graficos`
**Repositório:** `renanmachadotef-netizen/foto_graficos`, branch `main`
**No ar:** https://grafica.renanmachado.com.br
**Servidor:** Easypanel, projeto `foto-graficos`, serviços `grafica` e `grafica-db`.

## Como publicar
Depois do push, confira no Easypanel se o serviço `grafica` publicou. Se não publicar sozinho, o Renan clica em Deploy. Mudança de banco entra por migration do Prisma.

## Cuidados
- As planilhas do NEX (`Produtos.xls`, `vendas.xls` e a pasta `dados/`) têm dados reais: nunca vão para o GitHub.
- O que ainda serve do `crmproprio` (nexcopy, congelado) é trazido para cá seguindo `crmproprio/PORTAR.md`.

## Não tocar a partir daqui
Geoturismo, PDV, cachaçaria, Meu Dinheiro (mesmo domínio, outro serviço), Meu Fichário, Agenda da TV e o código do `crmproprio`.

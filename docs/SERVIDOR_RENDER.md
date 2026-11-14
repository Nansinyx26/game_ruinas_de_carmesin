# Chat e Game Master no ar: MongoDB + Render

O jogo é um site estático (GitHub Pages). O chat, as contas e os comandos de GM precisam de um servidor de
verdade: a pasta `servidor/` (Node + WebSocket). Com a variável `MONGODB_URI`, os dados ficam no MongoDB
Atlas e sobrevivem a reinícios e novos deploys (o disco do Render grátis é apagado a cada deploy).

## Segurança (regra do projeto)

- A URI do MongoDB, a chave do dono (`EZ_OWNER_CHAVE`) e a chave da ElevenLabs **só existem nas variáveis de
  ambiente** (do Render, ou da sua máquina). Nunca no código, no `render.yaml`, no `config.js`, no navegador
  ou num commit. O `render.yaml` só declara os nomes (`sync: false`): o Render pede os valores no painel.
- `.gitignore` ignora `.env*` e `servidor/dados/` (contas com hash de senha, sessões).
- O servidor nunca mostra a URI: os erros de conexão dizem só o tipo do problema.
- Papéis (dono, GM, moderador) são conferidos no servidor; o navegador não decide nada.

## O que fica onde no MongoDB

Banco `eclipse_zero` (ou `EZ_MONGO_BANCO`):

| Coleção | Conteúdo |
|---|---|
| `estado` | um documento por parte: `contas.json`, `sessoes.json`, `historico.json`, `mundo.json` (campo `json` com o mesmo conteúdo que o arquivo teria) |
| `log_gm` | cada comando de GM: quem, quando, comando, alvo, resultado (inclusive os negados) |
| `denuncias` | denúncias dos jogadores |

Sem `MONGODB_URI`, tudo vai para arquivos JSON em `servidor/dados/` (bom para testar na sua máquina).

## Passo a passo

1. **MongoDB Atlas → Network Access**: adicione `0.0.0.0/0` (o Render grátis não tem IP fixo; a senha do
   usuário do banco continua protegendo). **Database Access**: um usuário só com `readWrite` no banco
   `eclipse_zero`.
2. **Render → New → Blueprint** e escolha este repositório: ele lê o `render.yaml` (serviço
   `eclipse-zero-chat`, pasta `servidor/`, verificação em `/saude`). Ou **New → Web Service** com
   Root Directory `servidor`, Build `npm ci --omit=dev`, Start `node servidor.mjs`.
3. No painel do serviço, **Environment**, preencha:

   | Variável | Valor |
   |---|---|
   | `MONGODB_URI` | a URI `mongodb+srv://…` do Atlas (secreta) |
   | `EZ_OWNER` | o nome da sua conta no jogo (só ela é dona) |
   | `EZ_OWNER_CHAVE` | um segredo seu, pedido uma vez para criar a conta dona (secreto) |
   | `EZ_ORIGENS` | `https://nansinyx26.github.io` (já vem no blueprint) |

   A porta o Render dá sozinho (`PORT`).
4. Depois do deploy, abra `https://SEU-SERVICO.onrender.com/saude`: deve responder
   `{"ok":true,…,"dados":"mongodb"}`. Se aparecer `"arquivos"`, a `MONGODB_URI` não chegou ao serviço; se o
   serviço nem subir, o log diz `não foi possível ligar ao MongoDB (…)` (veja o passo 1).
5. Aponte o jogo para o servidor em `js/rede/config.js` (o endereço não é segredo):
   `window.EZ_SERVIDOR = 'wss://SEU-SERVICO.onrender.com';` e suba. Para testar antes sem editar:
   `jogar.html?servidor=wss://SEU-SERVICO.onrender.com`.
6. No jogo, crie a conta com o nome de `EZ_OWNER` e a chave de `EZ_OWNER_CHAVE`: ela entra como dona e
   promove GMs e moderadores com os comandos (`/gm help`).

Observação: no plano grátis o Render adormece o serviço sem uso; a primeira conexão depois disso leva uns
segundos (o jogo tenta de novo sozinho). Ao desligar (deploy novo), o servidor grava o que estiver pendente
antes de sair.

## Testes

`node servidor/teste.mjs` (68 verificações): chat, papéis, comandos, limites, registro e persistência com
arquivos, e o mesmo servidor sobre o armazém do MongoDB com um banco falso na memória (os testes nunca usam
o banco de verdade nem leem `MONGODB_URI`).

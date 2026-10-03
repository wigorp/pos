# Portfólio — Wigor Pires de Araújo

Site estático publicado no GitHub Pages: https://wigorp.github.io/pos/

| Arquivo | Função |
|---|---|
| `index.html` | Portfólio público |
| `login.html` / `login.js` | Login da área acadêmica e configuração do primeiro acesso |
| `area-academica.html` / `painel.js` | Painel das pós-graduações: cursos, certificados, edição |
| `cofre.js` | Criptografia e gravação no GitHub |
| `academico.css` | Estilos do login e do painel |
| `dados/` | Dados e certificados **criptografados** (gerado pelo painel) |
| `certificados/` | Certificados que você escolheu tornar públicos (gerado pelo painel) |

## Como funciona a segurança

Não há servidor nem serviço externo. Tudo fica neste repositório:

- Os dados dos cursos (`dados/cofre.json`) e os certificados (`dados/arquivos/*.bin`)
  são cifrados com **AES-256-GCM** no seu navegador antes de serem enviados.
- A chave vem da sua senha (**PBKDF2-SHA256, 600 mil iterações**) e nunca é gravada.
  Mesmo com o repositório público, sem a senha os arquivos são ilegíveis.
- A sessão vale só para a aba aberta e expira após 30 minutos sem uso.
- As páginas têm Content-Security-Policy e não carregam nenhum script de terceiros.

Limites que você deve conhecer:

- **Use uma senha forte** (uma frase longa é o ideal). Como os arquivos cifrados são públicos,
  alguém pode tentar adivinhar a senha offline. Com uma frase de 4 ou mais palavras, isso fica inviável.
- **Não existe recuperação de senha.** Se esquecer, dá para recriar a área acadêmica
  (a lista de cursos volta ao início e os certificados enviados são apagados).
  Guarde a senha num gerenciador de senhas.
- Dá para ver no repositório *quantos* arquivos existem e o tamanho deles, mas não o conteúdo.

## Primeiro acesso

1. **Crie um token do GitHub**: https://github.com/settings/personal-access-tokens/new
   - *Repository access*: **Only select repositories** → `wigorp/pos`
   - *Permissions → Repository permissions → Contents*: **Read and write**
   - Escolha uma validade (ex.: 1 ano) e gere. O token começa com `github_pat_`.
2. Abra https://wigorp.github.io/pos/login.html. Como ainda não existe área acadêmica,
   aparece a tela **Configurar acesso**.
3. Defina a senha, cole o token e clique em **Criar área acadêmica**.
   Os cursos do portfólio já entram cadastrados.

## Enviar certificados e editar cursos

1. No painel, clique em **✏️ Gerenciar**.
2. Em cada curso, clique em **Editar / enviar certificado**.
3. Escolha o arquivo (PDF, PNG, JPG ou WEBP, até 20 MB) e clique em **Salvar e publicar**.
4. Para o certificado aparecer no portfólio para recrutadores, marque
   **Mostrar também no portfólio público**. O card em "Formação" ganha o link
   "Ver certificado" automaticamente. Esse arquivo específico fica sem criptografia.

Cada gravação vira um commit neste repositório. O GitHub Pages leva 1–2 minutos para publicar,
mas o painel já mostra a alteração na hora.

O token pode ficar guardado no dispositivo (cifrado com a sua senha) ou ser pedido a cada sessão.
Em computador compartilhado, não marque "Lembrar".

## Trocar a senha

**Gerenciar → 🔒 Alterar senha.** Todos os certificados são cifrados de novo com a nova chave.

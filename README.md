# Portfólio — Wigor Pires de Araújo

Site estático publicado no GitHub Pages: https://wigorp.github.io/pos/

| Arquivo | Função |
|---|---|
| `index.html` | Portfólio público |
| `login.html` | Login da área acadêmica (Supabase Auth) |
| `area-academica.html` | Painel das pós-graduações (só com login) |
| `academico.css` | Estilos compartilhados do login e do painel |
| `supabase-config.js` | URL e anon key do Supabase |
| `supabase/setup.sql` | Tabelas, políticas de acesso (RLS) e dados iniciais |

## Configurar o login (uma vez só)

1. **Criar o projeto** em https://supabase.com (plano gratuito).
2. **Banco de dados:** em *SQL Editor*, cole o conteúdo de `supabase/setup.sql`,
   troque `seu@email.com` pelo seu e-mail e clique em *Run*.
3. **Bloquear cadastro público:** *Authentication → Sign In / Providers → Email*:
   desative **Allow new users to sign up**.
4. **Criar seu usuário:** *Authentication → Users → Add user → Create new user*
   (mesmo e-mail do passo 2, marque *Auto Confirm User*).
5. **URLs de redirecionamento:** *Authentication → URL Configuration*:
   - Site URL: `https://wigorp.github.io/pos/`
   - Redirect URLs: `https://wigorp.github.io/pos/login.html`
6. **Chaves:** em *Project Settings → API*, copie a *Project URL* e a *anon public key*
   para `supabase-config.js`. Nunca use a `service_role key` no site.
7. Faça commit e push. O GitHub Pages atualiza em 1–2 minutos.

## Editar os cursos

Pelo *Table Editor → pos_graduacoes* no Supabase. Campos principais:

- `status`: `cursando`, `concluido` ou `trancado`
- `progresso`: 0 a 100
- `inicio` / `conclusao`: datas (em `conclusao` vale a previsão, se ainda estiver cursando)
- `links`: lista JSON, ex.: `[{"rotulo": "AVA", "url": "https://..."}]`
- `anotacoes`: texto livre (aparece recolhido no card)
- `ordem`: posição no painel (menor aparece primeiro)

## Dar acesso a outra pessoa

Crie o usuário em *Authentication → Users* e adicione o e-mail na tabela
`acesso_permitido`. Quem não estiver nessa tabela consegue logar, mas não vê nenhum curso.

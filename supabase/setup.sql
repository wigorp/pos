-- =========================================================
-- ÁREA ACADÊMICA — configuração do Supabase
-- Execute no Supabase: SQL Editor → New query → Run
-- =========================================================


-- ---------------------------------------------------------
-- 1. Quem pode ver o painel (lista de e-mails permitidos)
-- ---------------------------------------------------------

create table if not exists public.acesso_permitido (
  email text primary key
);

alter table public.acesso_permitido enable row level security;
-- Sem políticas: ninguém lê/escreve esta tabela pelo navegador.
-- Gerencie pelo painel do Supabase.

-- >>> TROQUE pelo seu e-mail de login <<<
insert into public.acesso_permitido (email)
values ('seu@email.com')
on conflict do nothing;


-- Função auxiliar (security definer para poder ler a tabela acima)
create or replace function public.tem_acesso_academico()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.acesso_permitido
    where lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;


-- ---------------------------------------------------------
-- 2. Pós-graduações
-- ---------------------------------------------------------

create table if not exists public.pos_graduacoes (
  id          bigint generated always as identity primary key,
  titulo      text not null,
  instituicao text not null,
  status      text not null default 'cursando'
              check (status in ('cursando', 'concluido', 'trancado')),
  progresso   int  not null default 0
              check (progresso between 0 and 100),
  descricao   text,
  inicio      date,
  conclusao   date,          -- data de conclusão ou previsão
  links       jsonb not null default '[]'::jsonb,
              -- ex.: [{"rotulo": "Certificado", "url": "https://..."}]
  anotacoes   text,
  ordem       int  not null default 0,
  criado_em   timestamptz not null default now()
);

alter table public.pos_graduacoes enable row level security;

drop policy if exists "leitura_academica" on public.pos_graduacoes;

create policy "leitura_academica"
  on public.pos_graduacoes
  for select
  to authenticated
  using (public.tem_acesso_academico());


-- ---------------------------------------------------------
-- 3. Dados iniciais (mesmos cursos do portfólio)
--    Ajuste progresso, datas, links e anotações à vontade
--    pelo Table Editor do Supabase.
-- ---------------------------------------------------------

insert into public.pos_graduacoes
  (ordem, titulo, instituicao, status, progresso, descricao, links)
values
  (1, 'MBA em Gestão de Projetos', 'Anhanguera', 'cursando', 0,
   'Planejamento, execução, acompanhamento, controle e gestão de projetos.',
   '[]'),

  (2, 'Gestão de Projetos, Jornada do Cliente e Metodologias Ágeis', 'PUC Paraná', 'cursando', 0,
   'Gestão de projetos, experiência e jornada do cliente e metodologias ágeis.',
   '[]'),

  (10, 'Liderança e Gestão de Equipes de Alta Performance', 'Anhanguera', 'concluido', 100,
   'Liderança, gestão de pessoas, desenvolvimento e gestão de equipes.',
   '[{"rotulo": "Certificado", "url": "certificados/lideranca-alta-performance.pdf"}]'),

  (11, 'Gestão e Governança de Tecnologia da Informação', 'Anhanguera', 'concluido', 100,
   'Governança, processos, controles, gestão estratégica e alinhamento entre tecnologia e negócio.',
   '[{"rotulo": "Certificado", "url": "certificados/gestao-governanca-ti.pdf"}]'),

  (12, 'Ciência de Dados e Inteligência Artificial', 'Anhanguera', 'concluido', 100,
   'Data Science, análise de dados, analytics e aplicações de Inteligência Artificial.',
   '[{"rotulo": "Certificado", "url": "certificados/ciencia-dados-ia.pdf"}]'),

  (13, 'Inteligência Artificial e Machine Learning', 'Anhanguera', 'concluido', 100,
   'Inteligência Artificial, aprendizado de máquina e aplicações orientadas por dados.',
   '[{"rotulo": "Certificado", "url": "certificados/ia-machine-learning.pdf"}]'),

  (14, 'Engenharia de Dados e Inteligência Artificial', 'Anhanguera', 'concluido', 100,
   'Engenharia, processamento e arquitetura de dados integrados a soluções de Inteligência Artificial.',
   '[{"rotulo": "Certificado", "url": "certificados/engenharia-dados-ia.pdf"}]'),

  (15, 'Tecnologia da Informação Aplicada à Logística', 'Anhanguera', 'concluido', 100,
   'Aplicação de sistemas, dados, tecnologia e automação aos processos logísticos e de Supply Chain.',
   '[{"rotulo": "Certificado", "url": "certificados/ti-aplicada-logistica.pdf"}]'),

  (16, 'IA e Negócios: Estratégia, Inovação e Resultados', 'PUC Paraná', 'concluido', 100,
   'Inteligência Artificial aplicada à estratégia, inovação e geração de resultados para negócios.',
   '[]'),

  (17, 'Como usar DS e AI para otimizar a Logística e as Operações', 'PUC RS', 'concluido', 100,
   'Data Science e Inteligência Artificial aplicadas à otimização de operações, logística e processos.',
   '[{"rotulo": "Certificado", "url": "certificados/puc-logistica-ds-ai.pdf"}]');

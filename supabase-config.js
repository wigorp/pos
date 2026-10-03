/* =========================================================
   CONFIGURAÇÃO DO SUPABASE

   Preencha com os dados do seu projeto:
   Supabase → Project Settings → API

   A "anon key" é pública por natureza (vai para o navegador).
   A proteção real dos dados é feita pelas políticas RLS
   definidas em supabase/setup.sql.

   NUNCA coloque aqui a "service_role key".
========================================================= */

window.SUPABASE_CONFIG = {
  url: "https://SEU-PROJETO.supabase.co",
  anonKey: "SUA-ANON-KEY"
};

window.getSupabase = function () {
  const cfg = window.SUPABASE_CONFIG;

  const configured =
    cfg &&
    cfg.url &&
    cfg.anonKey &&
    !cfg.url.includes("SEU-PROJETO") &&
    !cfg.anonKey.includes("SUA-ANON-KEY");

  if (!configured || !window.supabase) {
    return null;
  }

  if (!window.__sbClient) {
    window.__sbClient = window.supabase.createClient(
      cfg.url,
      cfg.anonKey
    );
  }

  return window.__sbClient;
};

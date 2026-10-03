/* =========================================================
   COFRE — criptografia e armazenamento da área acadêmica

   Tudo fica no próprio repositório do GitHub Pages, cifrado:
   - dados/cofre.json      → dados dos cursos (AES-256-GCM)
   - dados/arquivos/*.bin  → certificados (AES-256-GCM)

   A chave é derivada da senha com PBKDF2-SHA256 e nunca
   sai do navegador. Sem a senha, os arquivos são ilegíveis.

   Gravações usam a API do GitHub com um token pessoal
   (fine-grained, só este repositório, Contents: read/write).
========================================================= */

const Cofre = (() => {

  const CONFIG = {
    owner: "wigorp",
    repo: "pos",
    branch: "main",
    caminho: "dados/cofre.json",
    pastaArquivos: "dados/arquivos",
    manifestoPublico: "certificados/index.json",
    iteracoes: 600000,
    sessaoMinutos: 30,
    tamanhoMaximo: 20 * 1024 * 1024
  };

  const API = "https://api.github.com";
  const K_SESSAO = "cofre-sessao";
  const K_CACHE = "cofre-cache";
  const K_TOKEN = "cofre-token";

  const enc = new TextEncoder();
  const dec = new TextDecoder();


  /* ---------- armazenamento seguro (pode falhar em modo privado) ---------- */

  const store = {
    get(area, k) { try { return area.getItem(k); } catch { return null; } },
    set(area, k, v) { try { area.setItem(k, v); } catch { /* ignora */ } },
    del(area, k) { try { area.removeItem(k); } catch { /* ignora */ } }
  };


  /* ---------- base64 ---------- */

  function paraB64(bytes) {
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(s);
  }

  function deB64(b64) {
    const s = atob(b64);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }

  function aleatorio(n) {
    return crypto.getRandomValues(new Uint8Array(n));
  }

  function idAleatorio() {
    return Array.from(aleatorio(16), b => b.toString(16).padStart(2, "0")).join("");
  }


  /* ---------- criptografia ---------- */

  async function derivarChave(senha, saltB64, iteracoes) {
    const base = await crypto.subtle.importKey(
      "raw", enc.encode(senha.normalize("NFC")), "PBKDF2", false, ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
      { name: "PBKDF2", hash: "SHA-256", salt: deB64(saltB64), iterations: iteracoes },
      base,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  }

  async function cifrar(chave, bytes) {
    const iv = aleatorio(12);
    const ct = new Uint8Array(
      await crypto.subtle.encrypt({ name: "AES-GCM", iv }, chave, bytes)
    );
    const out = new Uint8Array(iv.length + ct.length);
    out.set(iv);
    out.set(ct, iv.length);
    return out;
  }

  async function decifrar(chave, bytes) {
    return new Uint8Array(
      await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: bytes.subarray(0, 12) }, chave, bytes.subarray(12)
      )
    );
  }

  async function cifrarJSON(chave, obj) {
    return paraB64(await cifrar(chave, enc.encode(JSON.stringify(obj))));
  }

  async function decifrarJSON(chave, b64) {
    return JSON.parse(dec.decode(await decifrar(chave, deB64(b64))));
  }

  function novoKdf() {
    return { nome: "PBKDF2-SHA256", iteracoes: CONFIG.iteracoes, salt: paraB64(aleatorio(16)) };
  }


  /* ---------- sessão (só nesta aba, expira por inatividade) ---------- */

  async function salvarSessao(chave) {
    const raw = new Uint8Array(await crypto.subtle.exportKey("raw", chave));
    store.set(sessionStorage, K_SESSAO, JSON.stringify({
      chave: paraB64(raw),
      expira: Date.now() + CONFIG.sessaoMinutos * 60000
    }));
  }

  function renovarSessao() {
    try {
      const s = JSON.parse(store.get(sessionStorage, K_SESSAO));
      if (!s) return;
      s.expira = Date.now() + CONFIG.sessaoMinutos * 60000;
      store.set(sessionStorage, K_SESSAO, JSON.stringify(s));
    } catch { /* ignora */ }
  }

  function sessaoExpirada() {
    try {
      const s = JSON.parse(store.get(sessionStorage, K_SESSAO));
      return !s || s.expira < Date.now();
    } catch {
      return true;
    }
  }

  async function chaveDaSessao() {
    if (sessaoExpirada()) {
      sair();
      return null;
    }

    try {
      const s = JSON.parse(store.get(sessionStorage, K_SESSAO));
      return await crypto.subtle.importKey(
        "raw", deB64(s.chave), { name: "AES-GCM" }, true, ["encrypt", "decrypt"]
      );
    } catch {
      sair();
      return null;
    }
  }

  function sair() {
    store.del(sessionStorage, K_SESSAO);
    store.del(sessionStorage, K_TOKEN);
    tokenMemoria = null;
  }


  /* ---------- leitura do cofre ---------- */

  // Usa a versão mais recente entre o site publicado e a última
  // gravada neste navegador (o GitHub Pages leva ~1 min para atualizar).
  async function carregarCofre() {
    let site = null;

    try {
      const r = await fetch(CONFIG.caminho + "?v=" + Date.now(), { cache: "no-store" });
      if (r.ok) site = await r.json();
    } catch { /* offline ou sem cofre */ }

    let local = null;
    try { local = JSON.parse(store.get(localStorage, K_CACHE)); } catch { /* ignora */ }

    if (site && local) {
      return (local.atualizado || "") > (site.atualizado || "") ? local : site;
    }

    return site || local;
  }

  function guardarCache(cofre) {
    store.set(localStorage, K_CACHE, JSON.stringify(cofre));
  }

  async function abrir(senha) {
    const cofre = await carregarCofre();
    if (!cofre) throw new Error("SEM_COFRE");

    const chave = await derivarChave(senha, cofre.kdf.salt, cofre.kdf.iteracoes);

    let dados;
    try {
      dados = await decifrarJSON(chave, cofre.indice);
    } catch {
      throw new Error("SENHA_INVALIDA");
    }

    await salvarSessao(chave);
    return { cofre, chave, dados };
  }

  async function abrirComSessao() {
    const chave = await chaveDaSessao();
    if (!chave) return null;

    const cofre = await carregarCofre();
    if (!cofre) return null;

    try {
      const dados = await decifrarJSON(chave, cofre.indice);
      return { cofre, chave, dados };
    } catch {
      // A senha foi trocada em outro dispositivo
      sair();
      return null;
    }
  }

  async function montarCofre(chave, kdf, dados) {
    dados.atualizado = new Date().toISOString();

    return {
      versao: 1,
      atualizado: dados.atualizado,
      kdf,
      indice: await cifrarJSON(chave, dados)
    };
  }

  async function lerArquivo(chave, caminho, token) {
    let r = null;

    try { r = await fetch(caminho); } catch { /* tenta pela API */ }

    // Recém-enviado e o Pages ainda não publicou: busca direto no GitHub
    if (!r || !r.ok) {
      const headers = { Accept: "application/vnd.github.raw" };
      if (token) headers.Authorization = "Bearer " + token;

      r = await fetch(
        `${API}/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${caminho}?ref=${CONFIG.branch}`,
        { headers, cache: "no-store" }
      );

      if (!r.ok) throw new Error("ARQUIVO_INDISPONIVEL");
    }

    return decifrar(chave, new Uint8Array(await r.arrayBuffer()));
  }


  /* ---------- token do GitHub (guardado cifrado com a chave do cofre) ---------- */

  let tokenMemoria = null;

  async function obterToken(chave) {
    if (tokenMemoria) return tokenMemoria;

    const salvo =
      store.get(sessionStorage, K_TOKEN) || store.get(localStorage, K_TOKEN);

    if (!salvo || !chave) return null;

    try {
      tokenMemoria = dec.decode(await decifrar(chave, deB64(salvo)));
      return tokenMemoria;
    } catch {
      return null;
    }
  }

  async function guardarToken(chave, token, lembrar) {
    tokenMemoria = token;

    const cifrado = paraB64(await cifrar(chave, enc.encode(token)));

    store.set(sessionStorage, K_TOKEN, cifrado);

    if (lembrar) store.set(localStorage, K_TOKEN, cifrado);
    else store.del(localStorage, K_TOKEN);
  }

  function tokenLembrado() {
    return !!store.get(localStorage, K_TOKEN);
  }

  function esquecerToken() {
    tokenMemoria = null;
    store.del(sessionStorage, K_TOKEN);
    store.del(localStorage, K_TOKEN);
  }


  /* ---------- API do GitHub ---------- */

  class ErroGitHub extends Error {
    constructor(status, mensagem) {
      super(mensagem);
      this.status = status;
    }
  }

  async function gh(token, metodo, caminho, corpo) {
    const r = await fetch(API + caminho, {
      method: metodo,
      cache: "no-store",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: "Bearer " + token,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(corpo ? { "Content-Type": "application/json" } : {})
      },
      body: corpo ? JSON.stringify(corpo) : undefined
    });

    if (!r.ok) {
      let msg = "";
      try { msg = (await r.json()).message || ""; } catch { /* ignora */ }
      throw new ErroGitHub(r.status, msg);
    }

    return r.status === 204 ? null : r.json();
  }

  const repoPath = () => `/repos/${CONFIG.owner}/${CONFIG.repo}`;

  async function validarToken(token) {
    const repo = await gh(token, "GET", repoPath());
    if (repo.permissions && repo.permissions.push === false) {
      throw new ErroGitHub(403, "sem permissão de escrita");
    }
    return true;
  }

  async function existeNoRepo(token, caminho) {
    try {
      await gh(token, "GET", `${repoPath()}/contents/${caminho}?ref=${CONFIG.branch}`);
      return true;
    } catch (e) {
      if (e.status === 404) return false;
      throw e;
    }
  }

  async function listarPasta(token, caminho) {
    try {
      const itens = await gh(token, "GET", `${repoPath()}/contents/${caminho}?ref=${CONFIG.branch}`);
      return Array.isArray(itens) ? itens.filter(i => i.type === "file").map(i => i.path) : [];
    } catch (e) {
      if (e.status === 404) return [];
      throw e;
    }
  }

  // Grava vários arquivos (e remoções, bytes = null) num único commit
  async function publicar(token, arquivos, mensagem, aoProgredir) {
    const passo = aoProgredir || (() => {});
    const adicionados = new Set(arquivos.filter(a => a.bytes).map(a => a.caminho));

    const entradas = [];
    let i = 0;

    for (const a of arquivos) {
      if (!a.bytes) {
        if (!adicionados.has(a.caminho)) {
          entradas.push({ path: a.caminho, mode: "100644", type: "blob", sha: null });
        }
        continue;
      }

      passo(`Enviando arquivos (${++i}/${adicionados.size})...`);

      const blob = await gh(token, "POST", `${repoPath()}/git/blobs`, {
        content: paraB64(a.bytes),
        encoding: "base64"
      });

      entradas.push({ path: a.caminho, mode: "100644", type: "blob", sha: blob.sha });
    }

    passo("Gravando no GitHub...");

    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const ref = await gh(token, "GET", `${repoPath()}/git/ref/heads/${CONFIG.branch}`);
      const atual = await gh(token, "GET", `${repoPath()}/git/commits/${ref.object.sha}`);

      const arvore = await gh(token, "POST", `${repoPath()}/git/trees`, {
        base_tree: atual.tree.sha,
        tree: entradas
      });

      const commit = await gh(token, "POST", `${repoPath()}/git/commits`, {
        message: mensagem,
        tree: arvore.sha,
        parents: [ref.object.sha]
      });

      try {
        await gh(token, "PATCH", `${repoPath()}/git/refs/heads/${CONFIG.branch}`, {
          sha: commit.sha
        });
        return commit.sha;
      } catch (e) {
        // Outro commit entrou no meio: tenta de novo sobre o mais recente
        if (e.status !== 422 || tentativa === 2) throw e;
      }
    }
  }

  function mensagemErro(e) {
    if (e && e.status === 401) return "Token do GitHub inválido ou expirado.";
    if (e && (e.status === 403 || e.status === 404))
      return "O token não tem permissão de escrita neste repositório (Contents: Read and write).";
    if (e && e.status === 422) return "O GitHub recusou a gravação. Recarregue a página e tente de novo.";
    if (e && e.message === "ARQUIVO_INDISPONIVEL") return "Arquivo não encontrado no repositório.";
    if (e && /fetch|network/i.test(e.message || "")) return "Falha de conexão. Verifique sua internet.";
    return "Não foi possível concluir: " + ((e && e.message) || "erro desconhecido");
  }


  return {
    CONFIG,
    paraB64, deB64, idAleatorio,
    derivarChave, cifrar, decifrar, cifrarJSON, decifrarJSON, novoKdf,
    salvarSessao, renovarSessao, sessaoExpirada, chaveDaSessao, sair,
    carregarCofre, guardarCache, abrir, abrirComSessao, montarCofre, lerArquivo,
    obterToken, guardarToken, tokenLembrado, esquecerToken,
    validarToken, existeNoRepo, listarPasta, publicar, mensagemErro
  };

})();


/* ---------- tema (compartilhado com o portfólio) ---------- */

function aplicarTemaSalvo() {
  try {
    if (localStorage.getItem("portfolio-theme") === "dark") {
      document.body.classList.add("dark");
    }
  } catch { /* ignora */ }
}

function alternarTema() {
  document.body.classList.toggle("dark");
  try {
    localStorage.setItem(
      "portfolio-theme",
      document.body.classList.contains("dark") ? "dark" : "light"
    );
  } catch { /* ignora */ }
}

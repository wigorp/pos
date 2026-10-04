/* =========================================================
   PAINEL — área acadêmica
========================================================= */

const LOGIN = "login.html";

const STATUS = {
  concluido: "✓ Concluído",
  cursando: "● Cursando",
  trancado: "Trancado"
};

const TIPOS = {
  pos: "Pós-graduações e especializações",
  graduacao: "Graduações"
};

// Plataforma de estudo usada quando o curso não tem "linkEstudo" próprio
const PLATAFORMAS_PADRAO = {
  "mba em gestão de projetos":
    "https://kroton.platosedu.io/v2/lms/aluno/disciplina/30180618",
  "gestão de projetos, jornada do cliente e metodologias ágeis":
    "https://pucprdigital.grupoa.education/plataforma/my-enrollments/courses?categoryIds=965&courseStatus=all",
  "engenharia de software":
    "https://alunodigital.anhanguera.com/ead_anhanguera?id=pua_index"
};

function linkEstudo(c) {
  return urlSegura(c.linkEstudo || "") ||
    urlSegura(PLATAFORMAS_PADRAO[(c.titulo || "").trim().toLowerCase()] || "");
}

const ASSINATURAS = [
  { tipo: "application/pdf", ext: "pdf", teste: b => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 },
  { tipo: "image/png", ext: "png", teste: b => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { tipo: "image/jpeg", ext: "jpg", teste: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { tipo: "image/webp", ext: "webp", teste: b => b[0] === 0x52 && b[1] === 0x49 && b[8] === 0x57 && b[9] === 0x45 }
];

const estado = {
  cofre: null,
  chave: null,
  dados: null,
  edicao: false,
  editando: null,
  filtros: { status: "todos", tipo: "todos" }
};

const $ = sel => document.querySelector(sel);


/* =========================================================
   UTILITÁRIOS
========================================================= */

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function urlSegura(url) {
  try {
    const u = new URL(url);
    return ["http:", "https:"].includes(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
}

function formatarMes(v) {
  if (!v) return null;
  const [a, m] = v.split("-");
  if (!a || !m) return null;
  return new Date(+a, +m - 1).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

function formatarTamanho(n) {
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return Math.round(n / 1024) + " KB";
  return (n / 1024 / 1024).toFixed(1).replace(".", ",") + " MB";
}

function slug(s) {
  return String(s || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "certificado";
}

function detectarTipo(bytes) {
  const a = ASSINATURAS.find(s => bytes.length > 12 && s.teste(bytes));
  return a ? a.tipo : null;
}

function extensaoDe(tipo) {
  const a = ASSINATURAS.find(s => s.tipo === tipo);
  return a ? a.ext : "pdf";
}

function ajustarExtensao(caminho, tipo) {
  return caminho.replace(/\.[a-z0-9]+$/i, "") + "." + extensaoDe(tipo);
}

const CAMINHO_PUBLICO_OK = /^certificados\/[a-z0-9][a-z0-9._-]*\.(pdf|png|jpg|webp)$/;

function ordenar(cursos) {
  return [...cursos].sort((a, b) =>
    (a.ordem ?? 0) - (b.ordem ?? 0) || a.titulo.localeCompare(b.titulo, "pt-BR")
  );
}

let toastTimer;

function toast(msg, erro) {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "toast show" + (erro ? " error" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = "toast"), erro ? 6000 : 4000);
}

function alertaDialogo(dlg, tipo, msg) {
  const box = dlg.querySelector("[data-alert]");
  if (!msg) {
    box.className = "alert";
    box.textContent = "";
    return;
  }
  box.className = "alert alert-" + tipo + " show";
  box.textContent = msg;
  box.scrollIntoView({ block: "nearest" });
}

function carregando(btn, ativo, texto) {
  if (ativo) {
    btn.dataset.label = btn.dataset.label || btn.textContent.trim();
    btn.disabled = true;
    btn.replaceChildren();
    const sp = document.createElement("span");
    sp.className = "spinner";
    btn.append(sp, " " + texto);
  } else {
    btn.disabled = false;
    btn.textContent = btn.dataset.label;
  }
}


/* =========================================================
   RENDERIZAÇÃO
========================================================= */

function renderizarResumo() {
  const c = estado.dados.cursos;
  $("#stat-total").textContent = c.length;
  $("#stat-done").textContent = c.filter(x => x.status === "concluido").length;
  $("#stat-progress").textContent = c.filter(x => x.status === "cursando").length;
  $("#stat-certs").textContent = c.filter(x => x.certificado).length;
}

function cartao(c) {
  const progresso = Math.max(0, Math.min(100, +c.progresso || 0));
  const status = STATUS[c.status] ? c.status : "cursando";
  const estudo = linkEstudo(c);

  const datas = [
    c.inicio && "Início: " + formatarMes(c.inicio),
    c.conclusao && (status === "concluido" ? "Conclusão: " : "Previsão: ") + formatarMes(c.conclusao)
  ].filter(Boolean);

  const links = (c.links || [])
    .map(l => ({ rotulo: l.rotulo, url: urlSegura(l.url) }))
    .filter(l => l.rotulo && l.url)
    .map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.rotulo)} ↗</a>`)
    .join("");

  const cert = c.certificado
    ? `<div class="cert">
         <span aria-hidden="true">📄</span>
         <span class="cert-name" title="${esc(c.certificado.nome)}">${esc(c.certificado.nome)}</span>
         <button type="button" class="btn btn-ghost btn-sm" data-action="ver" data-id="${esc(c.id)}">Ver</button>
         <button type="button" class="btn btn-ghost btn-sm" data-action="baixar" data-id="${esc(c.id)}" aria-label="Baixar certificado">⬇</button>
       </div>`
    : `<div class="cert cert-missing">📄 Nenhum certificado enviado</div>`;

  return `
    <article class="course">
      <div class="course-top">
        <span class="institution">${esc(c.instituicao)}</span>
        <span class="tags">
          ${c.publico && c.certificado ? `<span class="tag tag-publico" title="Certificado visível no portfólio">🌐 Público</span>` : ""}
          <span class="tag tag-${status}">${STATUS[status]}</span>
        </span>
      </div>

      <h3>${estudo
        ? `<a class="course-link" href="${esc(estudo)}" target="_blank" rel="noopener noreferrer">${esc(c.titulo)}</a>`
        : esc(c.titulo)}</h3>

      ${c.descricao ? `<p>${esc(c.descricao)}</p>` : ""}

      ${estudo && status !== "concluido" ? `
        <a class="btn btn-primary btn-sm btn-study" href="${esc(estudo)}" target="_blank" rel="noopener noreferrer">
          ▶ Estudar agora
        </a>` : ""}

      <div>
        <div class="progress-label"><span>Progresso</span><span>${progresso}%</span></div>
        <div class="progress ${progresso === 100 ? "done" : ""}" role="progressbar"
             aria-valuenow="${progresso}" aria-valuemin="0" aria-valuemax="100">
          <div style="width:${progresso}%"></div>
        </div>
      </div>

      ${datas.length ? `<div class="dates">${datas.map(d => `<span>${esc(d)}</span>`).join("")}</div>` : ""}

      ${cert}

      ${links ? `<div class="links">${links}</div>` : ""}

      ${c.anotacoes ? `
        <details class="notes">
          <summary>Anotações</summary>
          <div>${esc(c.anotacoes)}</div>
        </details>` : ""}

      ${estado.edicao ? `
        <div class="course-actions">
          <button type="button" class="btn btn-ghost btn-sm btn-block" data-action="editar" data-id="${esc(c.id)}">✏️ Editar / enviar certificado</button>
        </div>` : ""}
    </article>`;
}

function renderizarLista() {
  const termo = $("#search").value.trim().toLowerCase();
  const { status, tipo } = estado.filtros;

  const lista = ordenar(estado.dados.cursos).filter(c =>
    (status === "todos" || c.status === status) &&
    (tipo === "todos" || c.tipo === tipo) &&
    (!termo ||
      c.titulo.toLowerCase().includes(termo) ||
      (c.instituicao || "").toLowerCase().includes(termo))
  );

  if (!lista.length) {
    $("#list").innerHTML = `
      <div class="grid"><div class="empty">
        <strong>Nada encontrado</strong>
        ${estado.dados.cursos.length ? "Ajuste o filtro ou a busca." : "Ative “Gerenciar” para adicionar cursos."}
      </div></div>`;
    return;
  }

  $("#list").innerHTML = Object.keys(TIPOS)
    .map(t => {
      const grupo = lista.filter(c => (c.tipo || "pos") === t);
      if (!grupo.length) return "";
      return `<h2 class="group-title">${TIPOS[t]}</h2>
              <div class="grid">${grupo.map(cartao).join("")}</div>`;
    })
    .join("");
}

function renderizar() {
  renderizarResumo();
  renderizarLista();
}


/* =========================================================
   FILTROS, BUSCA, MODO EDIÇÃO
========================================================= */

document.querySelectorAll(".chips").forEach(grupo => {
  grupo.addEventListener("click", e => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    estado.filtros[grupo.dataset.group] = chip.dataset.value;
    grupo.querySelectorAll(".chip").forEach(c =>
      c.setAttribute("aria-pressed", String(c === chip))
    );
    renderizarLista();
  });
});

$("#search").addEventListener("input", renderizarLista);

$("#btn-edit").addEventListener("click", () => {
  estado.edicao = !estado.edicao;
  $("#btn-edit").setAttribute("aria-pressed", String(estado.edicao));
  $("#admin-bar").hidden = !estado.edicao;
  renderizarLista();
});

$("#theme").addEventListener("click", alternarTema);

$("#logout").addEventListener("click", () => {
  Cofre.sair();
  location.replace(LOGIN);
});


/* =========================================================
   VER / BAIXAR CERTIFICADO
========================================================= */

async function abrirCertificado(curso, baixar) {
  // Abre a aba já no clique (senão o bloqueador de pop-up impede)
  const janela = baixar ? null : window.open("", "_blank");

  try {
    toast("Descriptografando certificado...");

    const token = await Cofre.obterToken(estado.chave);
    const bytes = await Cofre.lerArquivo(estado.chave, curso.certificado.arquivo, token);
    const url = URL.createObjectURL(new Blob([bytes], { type: curso.certificado.tipo }));

    if (janela) {
      janela.location.href = url;
    } else {
      const a = document.createElement("a");
      a.href = url;
      a.download = curso.certificado.nome || "certificado." + extensaoDe(curso.certificado.tipo);
      document.body.append(a);
      a.click();
      a.remove();
    }

    toast(baixar ? "Download iniciado." : "Certificado aberto em nova aba.");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) {
    if (janela) janela.close();
    toast(e.message === "ARQUIVO_INDISPONIVEL"
      ? "Certificado ainda não disponível. Se acabou de enviar, aguarde 1–2 minutos."
      : Cofre.mensagemErro(e), true);
  }
}

$("#list").addEventListener("click", e => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;

  const curso = estado.dados.cursos.find(c => c.id === btn.dataset.id);
  if (!curso) return;

  if (btn.dataset.action === "ver") abrirCertificado(curso, false);
  if (btn.dataset.action === "baixar") abrirCertificado(curso, true);
  if (btn.dataset.action === "editar") abrirEdicao(curso);
});


/* =========================================================
   DIÁLOGOS
========================================================= */

document.querySelectorAll("dialog").forEach(dlg => {
  dlg.addEventListener("click", e => {
    if (e.target.closest("[data-close]")) dlg.close();
  });
});


/* ---------- token ---------- */

let resolverToken = null;

function abrirDialogoToken() {
  const dlg = $("#dlg-token");
  alertaDialogo(dlg, null, null);
  $("#t-token").value = "";
  $("#t-lembrar").checked = Cofre.tokenLembrado();
  dlg.showModal();
  $("#t-token").focus();

  return new Promise(resolve => (resolverToken = resolve));
}

$("#dlg-token").addEventListener("close", () => {
  if (resolverToken) resolverToken(null);
  resolverToken = null;
});

$("#form-token").addEventListener("submit", async e => {
  e.preventDefault();

  const dlg = $("#dlg-token");
  const btn = e.currentTarget.querySelector("button[type=submit]");
  const token = $("#t-token").value.trim();

  if (!token) return alertaDialogo(dlg, "error", "Cole o token.");

  carregando(btn, true, "Validando...");

  try {
    await Cofre.validarToken(token);
    await Cofre.guardarToken(estado.chave, token, $("#t-lembrar").checked);
    carregando(btn, false);

    const r = resolverToken;
    resolverToken = null;
    dlg.close();
    if (r) r(token);
    toast("Token salvo.");
  } catch (err) {
    carregando(btn, false);
    alertaDialogo(dlg, "error", Cofre.mensagemErro(err));
  }
});

$("#t-esquecer").addEventListener("click", () => {
  Cofre.esquecerToken();
  $("#dlg-token").close();
  toast("Token removido deste dispositivo.");
});

$("#btn-token").addEventListener("click", abrirDialogoToken);

async function exigirToken() {
  return (await Cofre.obterToken(estado.chave)) || abrirDialogoToken();
}


/* ---------- gravação ---------- */

async function gravar(token, cursos, operacoes, mensagem, aoProgredir, nova) {
  const chave = nova ? nova.chave : estado.chave;
  const kdf = nova ? nova.kdf : estado.cofre.kdf;

  const dados = { ...estado.dados, cursos };
  const cofre = await Cofre.montarCofre(chave, kdf, dados);

  const manifesto = ordenar(cursos)
    .filter(c => c.publico && c.certificado && c.caminhoPublico)
    .map(c => ({ titulo: c.titulo, instituicao: c.instituicao, caminho: c.caminhoPublico }));

  const enc = new TextEncoder();

  await Cofre.publicar(
    token,
    [
      ...operacoes,
      { caminho: Cofre.CONFIG.caminho, bytes: enc.encode(JSON.stringify(cofre, null, 2)) },
      { caminho: Cofre.CONFIG.manifestoPublico, bytes: enc.encode(JSON.stringify(manifesto, null, 2)) }
    ],
    mensagem,
    aoProgredir
  );

  Cofre.guardarCache(cofre);
  estado.cofre = cofre;
  estado.dados = dados;
  if (nova) estado.chave = nova.chave;

  renderizar();
}

function tratarErroGravacao(dlg, err) {
  if (err && err.status === 401) Cofre.esquecerToken();
  alertaDialogo(dlg, "error", Cofre.mensagemErro(err));
}


/* ---------- curso: abrir ---------- */

const formCurso = $("#form-course");

function abrirEdicao(curso) {
  const dlg = $("#dlg-course");
  const f = formCurso;
  const c = curso || {
    tipo: "pos", status: "cursando", progresso: 0, links: [],
    ordem: (Math.max(0, ...estado.dados.cursos.map(x => x.ordem || 0)) + 10)
  };

  estado.editando = curso ? curso.id : null;
  alertaDialogo(dlg, null, null);
  f.reset();

  $("#dlg-course-title").textContent = curso ? "Editar curso" : "Novo curso";
  f.titulo.value = c.titulo || "";
  f.instituicao.value = c.instituicao || "";
  f.tipo.value = c.tipo || "pos";
  f.status.value = c.status || "cursando";
  f.progresso.value = c.progresso || 0;
  $("#c-progresso-out").textContent = (c.progresso || 0) + "%";
  f.inicio.value = (c.inicio || "").slice(0, 7);
  f.conclusao.value = (c.conclusao || "").slice(0, 7);
  f.descricao.value = c.descricao || "";
  f.links.value = (c.links || []).map(l => `${l.rotulo} | ${l.url}`).join("\n");
  f.anotacoes.value = c.anotacoes || "";
  f.linkEstudo.value = c.linkEstudo || (curso ? linkEstudo(c) || "" : "");
  f.ordem.value = c.ordem ?? 0;

  const atual = $("#c-cert-atual");
  atual.replaceChildren();
  if (c.certificado) {
    const s = document.createElement("strong");
    s.textContent = c.certificado.nome;
    atual.append("Atual: ", s, ` (${formatarTamanho(c.certificado.tamanho || 0)})`);
  } else {
    atual.textContent = "Nenhum certificado enviado ainda.";
  }

  $("#c-remover-wrap").hidden = !c.certificado;
  f.publico.checked = !!c.publico;
  f.caminhoPublico.value = c.caminhoPublico || "";
  atualizarCaminho();
  $("#c-excluir").hidden = !curso;

  dlg.showModal();
  f.titulo.focus();
}

function atualizarCaminho() {
  const f = formCurso;
  $("#c-caminho-wrap").hidden = !f.publico.checked;

  if (f.publico.checked && !f.caminhoPublico.value.trim()) {
    f.caminhoPublico.value = `certificados/${slug(f.titulo.value)}.pdf`;
  }
}

formCurso.publico.addEventListener("change", atualizarCaminho);

formCurso.progresso.addEventListener("input", e => {
  $("#c-progresso-out").textContent = e.target.value + "%";
});

formCurso.status.addEventListener("change", e => {
  if (e.target.value === "concluido") {
    formCurso.progresso.value = 100;
    $("#c-progresso-out").textContent = "100%";
  }
});

$("#btn-new").addEventListener("click", () => abrirEdicao(null));


/* ---------- curso: salvar ---------- */

function lerLinks(texto) {
  const links = [];

  texto.split("\n").map(l => l.trim()).filter(Boolean).forEach((linha, i) => {
    const corte = linha.indexOf("|");
    let rotulo = corte >= 0 ? linha.slice(0, corte).trim() : "";
    const url = urlSegura((corte >= 0 ? linha.slice(corte + 1) : linha).trim());

    if (!url) throw new Error(`Link inválido na linha ${i + 1}. Use: Rótulo | https://...`);
    if (!rotulo) rotulo = new URL(url).hostname.replace(/^www\./, "");

    links.push({ rotulo: rotulo.slice(0, 40), url });
  });

  return links;
}

formCurso.addEventListener("submit", async e => {
  e.preventDefault();

  const dlg = $("#dlg-course");
  const f = formCurso;
  const btn = f.querySelector("button[type=submit]");

  const titulo = f.titulo.value.trim();
  const instituicao = f.instituicao.value.trim();

  if (!titulo || !instituicao) {
    return alertaDialogo(dlg, "error", "Preencha o nome do curso e a instituição.");
  }

  let links;
  try {
    links = lerLinks(f.links.value);
  } catch (err) {
    return alertaDialogo(dlg, "error", err.message);
  }

  const estudo = f.linkEstudo.value.trim();

  if (estudo && !urlSegura(estudo)) {
    return alertaDialogo(dlg, "error", "Link da plataforma de estudo inválido. Use um endereço começando com https://");
  }

  const arquivo = f.arquivo.files[0];

  if (arquivo && arquivo.size > Cofre.CONFIG.tamanhoMaximo) {
    return alertaDialogo(dlg, "error", "Arquivo maior que 20 MB.");
  }

  const token = await exigirToken();
  if (!token) return;

  alertaDialogo(dlg, null, null);
  carregando(btn, true, "Preparando...");

  try {
    const anterior = estado.dados.cursos.find(c => c.id === estado.editando) || null;
    const curso = anterior
      ? structuredClone(anterior)
      : { id: Cofre.idAleatorio(), certificado: null, publico: false, caminhoPublico: "" };

    Object.assign(curso, {
      titulo,
      instituicao,
      tipo: f.tipo.value,
      status: f.status.value,
      progresso: +f.progresso.value,
      inicio: f.inicio.value,
      conclusao: f.conclusao.value,
      descricao: f.descricao.value.trim(),
      links,
      linkEstudo: estudo ? urlSegura(estudo) : "",
      anotacoes: f.anotacoes.value.trim(),
      ordem: Number.isFinite(+f.ordem.value) ? +f.ordem.value : 0
    });

    const ops = [];
    let claro = null;

    // Certificado novo, removido ou mantido
    if (arquivo) {
      claro = new Uint8Array(await arquivo.arrayBuffer());
      const tipo = detectarTipo(claro);

      if (!tipo) {
        carregando(btn, false);
        return alertaDialogo(dlg, "error", "O arquivo não parece ser um PDF, PNG, JPG ou WEBP válido.");
      }

      carregando(btn, true, "Criptografando...");

      const caminho = `${Cofre.CONFIG.pastaArquivos}/${Cofre.idAleatorio()}.bin`;
      ops.push({ caminho, bytes: await Cofre.cifrar(estado.chave, claro) });
      if (curso.certificado) ops.push({ caminho: curso.certificado.arquivo, bytes: null });

      curso.certificado = {
        arquivo: caminho,
        nome: arquivo.name.slice(0, 120),
        tipo,
        tamanho: arquivo.size,
        enviado: new Date().toISOString()
      };
    } else if (f.remover.checked && curso.certificado) {
      ops.push({ caminho: curso.certificado.arquivo, bytes: null });
      curso.certificado = null;
    }

    // Publicação no portfólio
    const querPublico = f.publico.checked && !!curso.certificado;
    const antes = anterior && anterior.publico && anterior.certificado ? anterior.caminhoPublico : null;
    let caminhoPub = f.caminhoPublico.value.trim().toLowerCase();

    if (querPublico) {
      caminhoPub = ajustarExtensao(caminhoPub || `certificados/${slug(titulo)}.pdf`, curso.certificado.tipo);

      if (!CAMINHO_PUBLICO_OK.test(caminhoPub)) {
        carregando(btn, false);
        return alertaDialogo(dlg, "error", "Endereço público inválido. Use algo como certificados/nome-do-curso.pdf (letras minúsculas, números e hífen).");
      }

      const emUso = estado.dados.cursos.some(c =>
        c.id !== curso.id && c.publico && c.caminhoPublico === caminhoPub
      );

      if (emUso) {
        carregando(btn, false);
        return alertaDialogo(dlg, "error", "Esse endereço público já é usado por outro curso.");
      }

      if (arquivo || antes !== caminhoPub) {
        if (!claro) {
          carregando(btn, true, "Lendo certificado...");
          claro = await Cofre.lerArquivo(estado.chave, curso.certificado.arquivo, token);
        }
        ops.push({ caminho: caminhoPub, bytes: claro });
      }

      if (antes && antes !== caminhoPub) ops.push({ caminho: antes, bytes: null });
    } else if (antes) {
      ops.push({ caminho: antes, bytes: null });
    }

    curso.publico = querPublico;
    if (caminhoPub) curso.caminhoPublico = caminhoPub;

    const cursos = anterior
      ? estado.dados.cursos.map(c => (c.id === curso.id ? curso : c))
      : [...estado.dados.cursos, curso];

    await gravar(
      token, cursos, ops,
      `Área acadêmica: ${anterior ? "atualiza" : "adiciona"} "${titulo}"`,
      msg => carregando(btn, true, msg)
    );

    carregando(btn, false);
    dlg.close();
    toast(querPublico
      ? "Publicado! O portfólio mostra o certificado em 1–2 minutos."
      : "Salvo e publicado!");
  } catch (err) {
    carregando(btn, false);
    tratarErroGravacao(dlg, err);
  }
});


/* ---------- curso: excluir ---------- */

$("#c-excluir").addEventListener("click", async () => {
  const dlg = $("#dlg-course");
  const btn = $("#c-excluir");
  const curso = estado.dados.cursos.find(c => c.id === estado.editando);
  if (!curso) return;

  if (!confirm(`Excluir "${curso.titulo}"${curso.certificado ? " e o certificado enviado" : ""}?`)) return;

  const token = await exigirToken();
  if (!token) return;

  carregando(btn, true, "Excluindo...");

  try {
    const ops = [];
    if (curso.certificado) ops.push({ caminho: curso.certificado.arquivo, bytes: null });
    if (curso.publico && curso.certificado && curso.caminhoPublico) {
      ops.push({ caminho: curso.caminhoPublico, bytes: null });
    }

    await gravar(
      token,
      estado.dados.cursos.filter(c => c.id !== curso.id),
      ops,
      `Área acadêmica: remove "${curso.titulo}"`
    );

    carregando(btn, false);
    dlg.close();
    toast("Curso excluído.");
  } catch (err) {
    carregando(btn, false);
    tratarErroGravacao(dlg, err);
  }
});


/* ---------- alterar senha ---------- */

$("#btn-password").addEventListener("click", () => {
  const dlg = $("#dlg-password");
  $("#form-password").reset();
  alertaDialogo(dlg, null, null);
  dlg.showModal();
  $("#p-atual").focus();
});

$("#form-password").addEventListener("submit", async e => {
  e.preventDefault();

  const dlg = $("#dlg-password");
  const btn = e.currentTarget.querySelector("button[type=submit]");
  const atual = $("#p-atual").value;
  const nova = $("#p-nova").value;

  if (nova.length < 10) return alertaDialogo(dlg, "error", "A nova senha deve ter pelo menos 10 caracteres.");
  if (nova !== $("#p-confirmar").value) return alertaDialogo(dlg, "error", "As senhas não coincidem.");
  if (nova === atual) return alertaDialogo(dlg, "error", "A nova senha deve ser diferente da atual.");

  carregando(btn, true, "Verificando...");

  try {
    const { kdf } = estado.cofre;
    const chaveAtual = await Cofre.derivarChave(atual, kdf.salt, kdf.iteracoes);
    await Cofre.decifrarJSON(chaveAtual, estado.cofre.indice);
  } catch {
    carregando(btn, false);
    return alertaDialogo(dlg, "error", "Senha atual incorreta.");
  }

  carregando(btn, false);
  const token = await exigirToken();
  if (!token) return;

  try {
    carregando(btn, true, "Gerando nova chave...");

    const novoKdf = Cofre.novoKdf();
    const novaChave = await Cofre.derivarChave(nova, novoKdf.salt, novoKdf.iteracoes);
    const cursos = structuredClone(estado.dados.cursos);
    const comCert = cursos.filter(c => c.certificado);
    const ops = [];

    for (let i = 0; i < comCert.length; i++) {
      const c = comCert[i];
      carregando(btn, true, `Recriptografando (${i + 1}/${comCert.length})...`);

      const claro = await Cofre.lerArquivo(estado.chave, c.certificado.arquivo, token);
      const caminho = `${Cofre.CONFIG.pastaArquivos}/${Cofre.idAleatorio()}.bin`;

      ops.push({ caminho, bytes: await Cofre.cifrar(novaChave, claro) });
      ops.push({ caminho: c.certificado.arquivo, bytes: null });
      c.certificado.arquivo = caminho;
    }

    await gravar(
      token, cursos, ops,
      "Área acadêmica: senha alterada",
      msg => carregando(btn, true, msg),
      { chave: novaChave, kdf: novoKdf }
    );

    await Cofre.salvarSessao(novaChave);
    await Cofre.guardarToken(novaChave, token, Cofre.tokenLembrado());

    carregando(btn, false);
    dlg.close();
    toast("Senha alterada. Use a nova senha nos próximos acessos.");
  } catch (err) {
    carregando(btn, false);
    tratarErroGravacao(dlg, err);
  }
});


/* =========================================================
   SESSÃO
========================================================= */

let ultimaRenovacao = 0;

["click", "keydown", "scroll", "pointermove"].forEach(ev =>
  window.addEventListener(ev, () => {
    if (Date.now() - ultimaRenovacao > 60000) {
      ultimaRenovacao = Date.now();
      Cofre.renovarSessao();
    }
  }, { passive: true })
);

function verificarSessao() {
  if (Cofre.sessaoExpirada()) {
    Cofre.sair();
    location.replace(LOGIN);
  }
}

setInterval(verificarSessao, 30000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) verificarSessao();
});


/* =========================================================
   INÍCIO
========================================================= */

aplicarTemaSalvo();

(async function iniciar() {
  const s = await Cofre.abrirComSessao();

  if (!s) {
    location.replace(LOGIN);
    return;
  }

  Object.assign(estado, s);
  estado.dados.cursos = estado.dados.cursos || [];

  document.body.classList.remove("auth-pending");
  renderizar();
})();

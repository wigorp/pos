/* =========================================================
   LOGIN — área acadêmica
========================================================= */

const PAINEL = "area-academica.html";

// Lista inicial, igual à seção "Formação" do portfólio.
// caminhoPublico = onde o certificado fica se for publicado no portfólio.
const CURSOS_INICIAIS = [
  ["graduacao", "Desenvolvimento Mobile", "UNOPAR", "concluido",
    "Curso Superior de Tecnologia com foco no desenvolvimento de aplicativos e soluções para dispositivos móveis.",
    "certificados/graduacao-desenvolvimento-mobile.pdf"],
  ["graduacao", "Engenharia de Software", "Anhanguera", "cursando",
    "Bacharelado voltado à engenharia, arquitetura, desenvolvimento, qualidade e manutenção de software."],
  ["pos", "MBA em Gestão de Projetos", "Anhanguera", "cursando",
    "Planejamento, execução, acompanhamento, controle e gestão de projetos."],
  ["pos", "Gestão de Projetos, Jornada do Cliente e Metodologias Ágeis", "PUC Paraná", "cursando",
    "Gestão de projetos, experiência e jornada do cliente e metodologias ágeis."],
  ["pos", "Liderança e Gestão de Equipes de Alta Performance", "Anhanguera", "concluido",
    "Liderança, gestão de pessoas, desenvolvimento e gestão de equipes.",
    "certificados/lideranca-alta-performance.pdf"],
  ["pos", "Gestão e Governança de Tecnologia da Informação", "Anhanguera", "concluido",
    "Governança, processos, controles, gestão estratégica e alinhamento entre tecnologia e negócio.",
    "certificados/gestao-governanca-ti.pdf"],
  ["pos", "Ciência de Dados e Inteligência Artificial", "Anhanguera", "concluido",
    "Data Science, análise de dados, analytics e aplicações de Inteligência Artificial.",
    "certificados/ciencia-dados-ia.pdf"],
  ["pos", "Inteligência Artificial e Machine Learning", "Anhanguera", "concluido",
    "Inteligência Artificial, aprendizado de máquina e aplicações orientadas por dados.",
    "certificados/ia-machine-learning.pdf"],
  ["pos", "Engenharia de Dados e Inteligência Artificial", "Anhanguera", "concluido",
    "Engenharia, processamento e arquitetura de dados integrados a soluções de Inteligência Artificial.",
    "certificados/engenharia-dados-ia.pdf"],
  ["pos", "Tecnologia da Informação Aplicada à Logística", "Anhanguera", "concluido",
    "Aplicação de sistemas, dados, tecnologia e automação aos processos logísticos e de Supply Chain.",
    "certificados/ti-aplicada-logistica.pdf"],
  ["pos", "IA e Negócios: Estratégia, Inovação e Resultados", "PUC Paraná", "concluido",
    "Inteligência Artificial aplicada à estratégia, inovação e geração de resultados para negócios."],
  ["pos", "Como usar DS e AI para otimizar a Logística e as Operações", "PUC RS", "concluido",
    "Data Science e Inteligência Artificial aplicadas à otimização de operações, logística e processos.",
    "certificados/puc-logistica-ds-ai.pdf"]
].map(([tipo, titulo, instituicao, status, descricao, caminhoPublico], i) => ({
  id: Cofre.idAleatorio(),
  tipo, titulo, instituicao, status, descricao,
  progresso: status === "concluido" ? 100 : 0,
  inicio: "", conclusao: "",
  links: [], anotacoes: "",
  ordem: (i + 1) * 10,
  certificado: null,
  publico: false,
  caminhoPublico: caminhoPublico || ""
}));


/* ---------- interface ---------- */

aplicarTemaSalvo();

document.getElementById("year").textContent = new Date().getFullYear();
document.getElementById("theme").addEventListener("click", alternarTema);

const alertBox = document.getElementById("alert");
let modoRecriar = false;

function mostrarView(nome) {
  document.querySelectorAll(".view").forEach(v =>
    v.classList.toggle("active", v.id === "view-" + nome)
  );
  esconderAlerta();

  const campo = document.querySelector("#view-" + nome + " input:not([hidden])");
  if (campo) campo.focus();
}

function mostrarAlerta(tipo, mensagem) {
  alertBox.className = "alert alert-" + tipo + " show";
  alertBox.textContent = mensagem;
}

function esconderAlerta() {
  alertBox.className = "alert";
  alertBox.textContent = "";
}

function carregando(form, ativo, texto) {
  const btn = form.querySelector("button[type=submit]");

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

document.querySelectorAll("[data-view]").forEach(b =>
  b.addEventListener("click", () => mostrarView(b.dataset.view))
);

document.querySelectorAll(".toggle-password").forEach(btn => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    const mostrar = input.type === "password";
    input.type = mostrar ? "text" : "password";
    btn.textContent = mostrar ? "🙈" : "👁";
    btn.setAttribute("aria-label", mostrar ? "Ocultar senha" : "Mostrar senha");
  });
});


/* ---------- força da senha ---------- */

function forcaSenha(s) {
  let p = 0;
  if (s.length >= 10) p++;
  if (s.length >= 14) p++;
  if (s.length >= 20) p++;
  if (/[a-z]/.test(s) && /[A-Z]/.test(s)) p++;
  if (/\d/.test(s)) p++;
  if (/[^A-Za-z0-9]/.test(s)) p++;
  if (/^(.)\1+$/.test(s) || /^(123|abc|senha|password)/i.test(s)) p = 0;
  return Math.min(4, Math.floor(p * 4 / 6));
}

const FORCA = [
  ["Muito fraca", "var(--danger)"],
  ["Fraca", "var(--danger)"],
  ["Razoável", "var(--warning)"],
  ["Boa", "var(--success)"],
  ["Forte", "var(--success)"]
];

document.getElementById("new-password").addEventListener("input", e => {
  const v = e.target.value;
  const n = v ? forcaSenha(v) : 0;
  const bar = document.getElementById("strength-bar");
  bar.style.width = v ? (n + 1) * 20 + "%" : "0";
  bar.style.background = FORCA[n][1];
  document.getElementById("strength-text").textContent = v
    ? "Força: " + FORCA[n][0] + (v.length < 10 ? " (mínimo 10 caracteres)" : "")
    : "Mínimo de 10 caracteres. Uma frase longa é o ideal.";
});


/* ---------- inicialização ---------- */

function configurarSetup(recriar) {
  modoRecriar = recriar;
  document.getElementById("setup-title").textContent =
    recriar ? "Recriar área acadêmica" : "Configurar acesso";
  document.getElementById("setup-subtitle").textContent = recriar
    ? "Defina uma nova senha. Os dados atuais serão substituídos."
    : "Primeiro acesso: defina a senha da área acadêmica.";
  document.getElementById("reset-confirm-wrap").hidden = !recriar;
  document.getElementById("setup-back").hidden = !recriar;
  document.querySelector("#form-setup button[type=submit]").textContent =
    recriar ? "Recriar com nova senha" : "Criar área acadêmica";
  mostrarView("setup");
}

document.getElementById("go-reset").addEventListener("click", () => configurarSetup(true));

(async function iniciar() {
  if (!window.crypto || !crypto.subtle) {
    mostrarView("login");
    mostrarAlerta("error", "Este navegador não suporta a criptografia necessária. Use um navegador atualizado (HTTPS).");
    return;
  }

  if (await Cofre.abrirComSessao()) {
    location.replace(PAINEL);
    return;
  }

  const cofre = await Cofre.carregarCofre();

  if (cofre) mostrarView("login");
  else configurarSetup(false);
})();


/* ---------- entrar ---------- */

document.getElementById("form-login").addEventListener("submit", async e => {
  e.preventDefault();

  const form = e.currentTarget;
  const senha = form.password.value;

  if (!senha) {
    mostrarAlerta("error", "Digite a senha.");
    return;
  }

  esconderAlerta();
  carregando(form, true, "Verificando...");

  try {
    await Cofre.abrir(senha);
    location.replace(PAINEL);
  } catch (err) {
    carregando(form, false);

    if (err.message === "SENHA_INVALIDA") {
      mostrarAlerta("error", "Senha incorreta.");
      form.password.select();
    } else if (err.message === "SEM_COFRE") {
      configurarSetup(false);
    } else {
      mostrarAlerta("error", "Não foi possível abrir a área acadêmica. Tente novamente.");
    }
  }
});


/* ---------- configurar / recriar ---------- */

document.getElementById("form-setup").addEventListener("submit", async e => {
  e.preventDefault();

  const form = e.currentTarget;
  const senha = form["new-password"].value;
  const confirmacao = form["confirm-password"].value;
  const token = form.token.value.trim();
  const lembrar = form["remember-token"].checked;

  if (senha.length < 10) return mostrarAlerta("error", "A senha deve ter pelo menos 10 caracteres.");
  if (forcaSenha(senha) < 2) return mostrarAlerta("error", "Senha muito fraca. Use uma frase mais longa ou misture letras, números e símbolos.");
  if (senha !== confirmacao) return mostrarAlerta("error", "As senhas não coincidem.");
  if (!token) return mostrarAlerta("error", "Informe o token do GitHub.");
  if (modoRecriar && !form["reset-confirm"].checked)
    return mostrarAlerta("error", "Confirme que entende que os dados atuais serão apagados.");

  esconderAlerta();
  carregando(form, true, "Validando token...");

  try {
    await Cofre.validarToken(token);

    const { caminho, pastaArquivos } = Cofre.CONFIG;
    const remover = [];

    if (modoRecriar) {
      const antigos = await Cofre.listarPasta(token, pastaArquivos);
      antigos.forEach(c => remover.push({ caminho: c, bytes: null }));
    } else if (await Cofre.existeNoRepo(token, caminho)) {
      carregando(form, false);
      mostrarAlerta("warning", "A área acadêmica já foi criada e o site ainda está publicando. Aguarde 1–2 minutos e recarregue a página.");
      return;
    }

    carregando(form, true, "Criando...");

    const kdf = Cofre.novoKdf();
    const chave = await Cofre.derivarChave(senha, kdf.salt, kdf.iteracoes);
    const cofre = await Cofre.montarCofre(chave, kdf, { versao: 1, cursos: CURSOS_INICIAIS });

    await Cofre.publicar(
      token,
      [
        { caminho, bytes: new TextEncoder().encode(JSON.stringify(cofre, null, 2)) },
        ...remover
      ],
      modoRecriar ? "Área acadêmica: recriada com nova senha" : "Área acadêmica: configuração inicial",
      msg => carregando(form, true, msg)
    );

    Cofre.guardarCache(cofre);
    await Cofre.salvarSessao(chave);
    await Cofre.guardarToken(chave, token, lembrar);

    location.replace(PAINEL);
  } catch (err) {
    carregando(form, false);
    mostrarAlerta("error", Cofre.mensagemErro(err));
  }
});

// =========================================================
// Qual é o pinguim? — front-end
// - sincroniza controles deslizantes, campos numéricos e gráficos;
// - desenha o pinguim conforme as medidas e o transforma na espécie prevista;
// - envia as medidas ao back-end Flask (POST /prever) — ao vivo ou pelo botão "Prever";
// - mostra as curvas normais aprendidas pelo Naive Bayes (arrastáveis);
// - guarda um histórico e um placar do modo "Sortear".
// A previsão é SEMPRE feita pelo back-end; os parâmetros do modelo só servem para desenhar.
// =========================================================

const ESPECIES = window.ESPECIES;
const PARAM = window.PARAMETROS;
const CAMPOS = window.CAMPOS;

const form = document.getElementById("form-previsao");
const painel = document.getElementById("resultado");
const botao = form.querySelector(".prever");
const aoVivo = document.getElementById("ao-vivo");
const pinguim = document.getElementById("pinguim");
const balao = document.getElementById("balao");

const numero = (nome) => document.getElementById(nome);
const deslizante = (nome) => form.querySelector(`.deslizante[data-alvo="${nome}"]`);
const campoDef = (nome) => CAMPOS.find((c) => c.nome === nome);

const guardar = {
  ler(chave, padrao) { try { return JSON.parse(localStorage.getItem(chave)) ?? padrao; } catch (e) { return padrao; } },
  salvar(chave, valor) { try { localStorage.setItem(chave, JSON.stringify(valor)); } catch (e) { /* sem armazenamento */ } },
};

let segredo = null;          // espécie usada no sorteio (modo desafio)
let especieAtual = null;
let ultimoPct = 0;

// ---------------------------------------------------------
// Valores
// ---------------------------------------------------------
function valorAtual(nome) {
  const v = parseFloat(String(numero(nome).value).replace(",", "."));
  return Number.isFinite(v) ? v : parseFloat(deslizante(nome).value);
}
const valores = () => Object.fromEntries(CAMPOS.map((c) => [c.nome, valorAtual(c.nome)]));
const arred = (v, passo) => (passo >= 1 ? Math.round(v) : Math.round(v * 10) / 10);

function pintarDeslizante(d) {
  const p = ((d.value - d.min) / (d.max - d.min)) * 100;
  d.style.setProperty("--p", `${Math.min(Math.max(p, 0), 100)}%`);
}

function definirValor(nome, v, { mexeuManual = true } = {}) {
  const c = campoDef(nome);
  v = arred(v, c.passo);
  numero(nome).value = v;
  deslizante(nome).value = v;
  pintarDeslizante(deslizante(nome));
  limparErro(nome);
  if (mexeuManual) segredo = null;
  aoMudar();
}

function aoMudar() {
  desenharPinguim();
  atualizarGraficos();
  if (aoVivo.checked) agendarPrevisao();
}

// ---------------------------------------------------------
// Pinguim
// ---------------------------------------------------------
const mapear = (v, a, b, c, d) => c + (Math.min(Math.max(v, a), b) - a) * (d - c) / (b - a);

function desenharPinguim() {
  const bico = valorAtual("comprimento_bico_mm");
  const prof = valorAtual("profundidade_bico_mm");
  const nad = valorAtual("comprimento_nadadeira_mm");

  const L = mapear(bico, 30, 62, 18, 62);
  const D = mapear(prof, 12, 22, 8, 22);
  const x0 = 150, y0 = 70;
  document.getElementById("bico").setAttribute("points",
    `${x0},${y0 - D / 2} ${x0 + L},${y0 + D * 0.15} ${x0},${y0 + D / 2}`);

  const cb = document.getElementById("cota-bico");
  cb.setAttribute("x2", x0 + L);
  const tb = document.getElementById("txt-bico");
  tb.setAttribute("x", x0 + L / 2);
  tb.textContent = `${bico} mm`;

  const xp = x0 + L + 8;
  const cp = document.getElementById("cota-prof");
  cp.setAttribute("x1", xp); cp.setAttribute("x2", xp);
  cp.setAttribute("y1", y0 - D / 2); cp.setAttribute("y2", y0 + D / 2);
  const tp = document.getElementById("txt-prof");
  tp.setAttribute("x", Math.min(xp - 4, 214));
  tp.setAttribute("y", y0 + D / 2 + 16);
  tp.textContent = `${prof} mm`;

  const F = mapear(nad, 165, 235, 60, 115);
  const y = 104;
  document.getElementById("nadadeira").setAttribute("d",
    `M84 ${y} Q48 ${y + F * 0.45} 46 ${y + F} Q70 ${y + F * 0.62} 98 ${y + 16} Z`);
  const tn = document.getElementById("txt-nad");
  const yt = y + F - 16;
  tn.innerHTML = `<tspan x="-20" y="${yt}">nadadeira</tspan><tspan x="-20" y="${yt + 15}">${nad} mm</tspan>`;
}

function pular() {
  pinguim.classList.remove("pula");
  void pinguim.getBoundingClientRect();
  pinguim.classList.add("pula");
}
pinguim.addEventListener("animationend", (e) => {
  if (e.animationName === "pular") pinguim.classList.remove("pula");
});

function falar(texto) {
  if (balao.textContent === texto) return;
  balao.classList.add("troca");
  setTimeout(() => { balao.textContent = texto; balao.classList.remove("troca"); }, 180);
}

const FRASES_TOQUE = ["Ei, isso faz cócegas!", "Sou um pinguim estatístico.", "P(fofura | pinguim) ≈ 1",
  "Bayes era fã de pinguins?", "Me sorteia! 🎲", "Arrasta as curvas lá embaixo!"];
document.getElementById("palco").addEventListener("click", () => {
  pular();
  falar(FRASES_TOQUE[Math.floor(Math.random() * FRASES_TOQUE.length)]);
});

// Olho segue o mouse
const brilho = document.getElementById("pupila-brilho");
document.addEventListener("pointermove", (e) => {
  const r = document.getElementById("olho").getBoundingClientRect();
  const dx = e.clientX - (r.left + r.width / 2);
  const dy = e.clientY - (r.top + r.height / 2);
  const ang = Math.atan2(dy, dx);
  const dist = Math.min(Math.hypot(dx, dy) / 80, 1) * 2.6;
  brilho.setAttribute("cx", 132 + Math.cos(ang) * dist);
  brilho.setAttribute("cy", 60 + Math.sin(ang) * dist);
});

// ---------------------------------------------------------
// Gráficos das normais P(x_i | C)
// ---------------------------------------------------------
const NS = "http://www.w3.org/2000/svg";
const G = { W: 320, H: 150, esq: 10, dir: 10, topo: 12, base: 24 };
const graficos = {};

const normal = (x, m, s) => Math.exp(-((x - m) ** 2) / (2 * s * s)) / (s * Math.sqrt(2 * Math.PI));

function el(tag, attrs, pai) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (pai) pai.appendChild(e);
  return e;
}

function montarGraficos() {
  PARAM.atributos.forEach((nome, j) => {
    const c = campoDef(nome);
    const svg = document.querySelector(`[data-grafico="${nome}"] svg`);
    const faixa = c.max - c.min;
    const x0 = c.min - faixa * 0.12, x1 = c.max + faixa * 0.12;
    const curvas = PARAM.classes.map((cl, i) => ({ classe: cl, m: PARAM.media[i][j], s: PARAM.desvio[i][j] }));
    const yMax = Math.max(...curvas.map((k) => normal(k.m, k.m, k.s))) * 1.08;

    const sx = (x) => G.esq + ((x - x0) / (x1 - x0)) * (G.W - G.esq - G.dir);
    const sy = (y) => G.H - G.base - (y / yMax) * (G.H - G.base - G.topo);
    const invx = (px) => x0 + ((px - G.esq) / (G.W - G.esq - G.dir)) * (x1 - x0);

    // eixo + marcas
    el("line", { x1: G.esq, x2: G.W - G.dir, y1: sy(0), y2: sy(0), class: "eixo" }, svg);
    const passoMarca = faixa > 30 ? 10 : faixa > 12 ? 5 : 2;
    for (let t = Math.ceil(x0 / passoMarca) * passoMarca; t <= x1; t += passoMarca) {
      el("line", { x1: sx(t), x2: sx(t), y1: sy(0), y2: sy(0) + 4, class: "eixo" }, svg);
      const txt = el("text", { x: sx(t), y: sy(0) + 15, "text-anchor": "middle", class: "rot-eixo" }, svg);
      txt.textContent = t;
    }

    // curvas
    const caminhos = curvas.map((k) => {
      let d = `M${sx(x0)},${sy(0)}`;
      for (let i = 0; i <= 140; i++) {
        const x = x0 + (i / 140) * (x1 - x0);
        d += ` L${sx(x).toFixed(1)},${sy(normal(x, k.m, k.s)).toFixed(1)}`;
      }
      d += ` L${sx(x1)},${sy(0)} Z`;
      const cor = ESPECIES[k.classe].cor;
      return el("path", { d, class: "curva", fill: cor, stroke: cor }, svg);
    });

    const marcador = el("line", { y1: G.topo - 4, y2: sy(0), class: "marcador" }, svg);
    const pontos = curvas.map((k) => el("circle", { r: 4.5, class: "ponto", fill: ESPECIES[k.classe].cor }, svg));
    const alca = el("circle", { r: 6, cy: G.topo - 4, class: "alca" }, svg);

    graficos[nome] = { svg, curvas, caminhos, marcador, pontos, alca, sx, sy, invx };

    // arrastar
    const moverPara = (ev) => {
      const pt = svg.createSVGPoint();
      pt.x = ev.clientX; pt.y = ev.clientY;
      const local = pt.matrixTransform(svg.getScreenCTM().inverse());
      const v = Math.min(Math.max(invx(local.x), c.min - faixa * 0.1), c.max + faixa * 0.1);
      definirValor(nome, Math.max(v, c.passo));
    };
    svg.addEventListener("pointerdown", (ev) => {
      svg.setPointerCapture(ev.pointerId);
      document.querySelector(`[data-campo="${nome}"]`).classList.add("ativo");
      moverPara(ev);
    });
    svg.addEventListener("pointermove", (ev) => { if (svg.hasPointerCapture(ev.pointerId)) moverPara(ev); });
    const soltar = () => document.querySelector(`[data-campo="${nome}"]`).classList.remove("ativo");
    svg.addEventListener("pointerup", soltar);
    svg.addEventListener("pointercancel", soltar);
  });
}

function atualizarGraficos() {
  for (const [nome, g] of Object.entries(graficos)) {
    const v = valorAtual(nome);
    const x = g.sx(v);
    g.marcador.setAttribute("x1", x); g.marcador.setAttribute("x2", x);
    g.alca.setAttribute("cx", x);
    let melhor = 0, dens = [];
    g.curvas.forEach((k, i) => {
      dens[i] = normal(v, k.m, k.s);
      g.pontos[i].setAttribute("cx", x);
      g.pontos[i].setAttribute("cy", Math.max(g.sy(dens[i]), G.topo - 6));
      if (dens[i] > dens[melhor]) melhor = i;
    });
    g.caminhos.forEach((p, i) => p.classList.toggle("melhor", i === melhor));
    document.querySelector(`[data-valor-grafico="${nome}"]`).textContent = `${v} ${campoDef(nome).unidade}`;
    const venc = g.curvas[melhor].classe;
    const total = dens.reduce((a, b) => a + b, 0);
    const vencedor = document.querySelector(`[data-vencedor="${nome}"]`);
    vencedor.style.setProperty("--cor", ESPECIES[venc].cor);
    vencedor.innerHTML = total < 1e-6
      ? "Valor muito fora do comum para as três espécies."
      : `Esta medida sozinha aponta para <b>${venc}</b>.`;
  }
}

// ---------------------------------------------------------
// Previsão (back-end)
// ---------------------------------------------------------
let temporizador = null;
let controlador = null;

function agendarPrevisao() {
  clearTimeout(temporizador);
  temporizador = setTimeout(() => prever({ silenciosa: true }), 220);
}

function camposPreenchidos() {
  return CAMPOS.every((c) => numero(c.nome).value !== "");
}

async function prever({ silenciosa = false } = {}) {
  // No modo ao vivo, campos vazios recebem o valor do controle deslizante.
  if (silenciosa && !camposPreenchidos()) {
    CAMPOS.forEach((c) => { if (numero(c.nome).value === "") numero(c.nome).value = deslizante(c.nome).value; });
  }
  const dados = Object.fromEntries(CAMPOS.map((c) => [c.nome, numero(c.nome).value]));

  controlador?.abort();
  controlador = new AbortController();
  if (!silenciosa) { botao.disabled = true; botao.querySelector(".txt").textContent = "Calculando…"; }
  painel.classList.add("carregando");

  try {
    const resposta = await fetch(form.action, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(dados),
      signal: controlador.signal,
    });
    const corpo = await resposta.json();
    if (!resposta.ok) {
      Object.entries(corpo.erros || {}).forEach(([nome, msg]) => mostrarErro(nome, msg));
      falar("Faltou alguma medida…");
      return;
    }
    mostrarResultado(corpo, { pularPinguim: !silenciosa || corpo.especie !== especieAtual });
  } catch (erro) {
    if (erro.name === "AbortError") return;
    painel.innerHTML = `<p class="aviso">Não foi possível falar com o servidor. Ele está rodando?</p>`;
  } finally {
    botao.disabled = false;
    botao.querySelector(".txt").textContent = "Prever";
    painel.classList.remove("carregando");
  }
}

// ---------------------------------------------------------
// Resultado
// ---------------------------------------------------------
const pct = (v) => `${(v * 100).toFixed(1).replace(".", ",")}%`;
const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

function contar(elemento, de, ate) {
  const ini = performance.now(), dur = 600;
  const passo = (t) => {
    const k = Math.min((t - ini) / dur, 1);
    const e = 1 - (1 - k) ** 3;
    elemento.textContent = pct(de + (ate - de) * e);
    if (k < 1) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}

function fraseConfianca(p) {
  if (p > 0.97) return "certeza quase absoluta";
  if (p > 0.85) return "bem confiante";
  if (p > 0.6) return "provável";
  return "na dúvida…";
}

function mostrarResultado(r, { pularPinguim = true } = {}) {
  const mudouEspecie = r.especie !== especieAtual;
  especieAtual = r.especie;
  painel.style.setProperty("--cor", r.cor);
  document.getElementById("palco").style.setProperty("--cor", r.cor);
  pinguim.dataset.especie = r.especie;

  // Reaproveita as barras se já existem (assim elas deslizam suavemente)
  let barras = painel.querySelector(".barras");
  if (!barras || mudouEspecie || !painel.querySelector(".especie")) {
    painel.innerHTML = `
      <p class="rotulo-resultado"><span class="num">02</span> Espécie prevista</p>
      <h2 class="especie">${esc(r.especie)}</h2>
      <p class="cientifico">${esc(r.cientifico)}</p>
      <p class="confianca"><strong>0%</strong><span>de probabilidade</span><span class="mao"></span></p>
      <ul class="barras">
        ${PARAM.classes.map((cl) => `
          <li data-classe="${esc(cl)}" style="--cor:${ESPECIES[cl].cor}; --valor:0">
            <span class="nome">${esc(cl)}</span>
            <span class="trilho"><span class="preenchido"></span></span>
            <span class="pct">0%</span>
          </li>`).join("")}
      </ul>
      <p class="descricao">${esc(r.descricao)}</p>
      <div class="extras"></div>`;
    painel.classList.remove("novo");
    void painel.offsetWidth;
    painel.classList.add("novo");
    barras = painel.querySelector(".barras");
    ultimoPct = 0;
  }

  // ordena as barras pela probabilidade e anima
  requestAnimationFrame(() => {
    r.probabilidades.forEach((p) => {
      const li = barras.querySelector(`[data-classe="${p.classe}"]`);
      li.style.setProperty("--valor", p.valor);
      li.querySelector(".pct").textContent = pct(p.valor);
      barras.appendChild(li);
    });
  });
  contar(painel.querySelector(".confianca strong"), ultimoPct, r.probabilidade);
  ultimoPct = r.probabilidade;
  painel.querySelector(".confianca .mao").textContent = `— ${fraseConfianca(r.probabilidade)}`;

  let extras = "";
  if (r.fora_da_faixa.length) {
    extras += `<p class="aviso">⚠ ${esc(r.fora_da_faixa.join(", "))} fora da faixa observada na base. A previsão é menos confiável.</p>`;
  }
  if (segredo) {
    const acertou = segredo === r.especie;
    extras += `<p class="desafio">🎲 Este pinguim foi sorteado como <b style="color:${ESPECIES[segredo].cor}">${esc(segredo)}</b>.
      <span class="mao">${acertou ? "O modelo acertou! ✓" : "O modelo errou ✗"}</span></p>`;
    registrarPlacar(acertou);
  }
  painel.querySelector(".extras").innerHTML = extras;

  if (pularPinguim) pular();
  falar(r.probabilidade > 0.85 ? `Sou ${r.especie}!` : `Hmm… talvez ${r.especie}?`);
  adicionarHistorico(r);
  segredo = null;
}

// ---------------------------------------------------------
// Histórico e placar
// ---------------------------------------------------------
const lista = document.getElementById("lista-historico");
let historico = guardar.ler("historico", []);
let placar = guardar.ler("placar", { acertos: 0, total: 0 });

function adicionarHistorico(r) {
  const chave = JSON.stringify(r.entrada);
  if (historico[0] && JSON.stringify(historico[0].entrada) === chave) return;
  historico = historico.filter((h) => JSON.stringify(h.entrada) !== chave);
  historico.unshift({ especie: r.especie, p: r.probabilidade, entrada: r.entrada });
  historico = historico.slice(0, 6);
  guardar.salvar("historico", historico);
  desenharHistorico();
}

function desenharHistorico() {
  if (!historico.length) {
    lista.innerHTML = `<li class="historico-vazio">Nenhuma previsão ainda.</li>`;
    return;
  }
  lista.innerHTML = historico.map((h, i) => `
    <li><button type="button" data-i="${i}" style="--cor:${ESPECIES[h.especie].cor}">
      <span class="bola"></span>
      <span><span class="esp">${esc(h.especie)}</span>
        <span class="med">${CAMPOS.map((c) => h.entrada[c.nome]).join(" · ")} mm</span></span>
      <span class="p">${pct(h.p)}</span>
    </button></li>`).join("");
}

lista.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-i]");
  if (!b) return;
  const h = historico[+b.dataset.i];
  CAMPOS.forEach((c) => definirValor(c.nome, h.entrada[c.nome], { mexeuManual: true }));
  if (!aoVivo.checked) prever();
});

document.getElementById("limpar-historico").addEventListener("click", () => {
  historico = [];
  placar = { acertos: 0, total: 0 };
  guardar.salvar("historico", historico);
  guardar.salvar("placar", placar);
  desenharHistorico();
  desenharPlacar();
});

function registrarPlacar(acertou) {
  placar.total += 1;
  if (acertou) placar.acertos += 1;
  guardar.salvar("placar", placar);
  desenharPlacar();
}
function desenharPlacar() {
  const p = document.getElementById("placar");
  p.hidden = placar.total === 0;
  p.textContent = `🎲 Placar dos sorteios: o modelo acertou ${placar.acertos} de ${placar.total}.`;
}

// ---------------------------------------------------------
// Sortear: gera um pinguim a partir das normais de uma espécie
// ---------------------------------------------------------
function gaussiana() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

document.getElementById("sortear").addEventListener("click", (e) => {
  const i = Math.floor(Math.random() * PARAM.classes.length);
  e.currentTarget.classList.remove("girando");
  void e.currentTarget.offsetWidth;
  e.currentTarget.classList.add("girando");
  PARAM.atributos.forEach((nome, j) => {
    const v = PARAM.media[i][j] + gaussiana() * PARAM.desvio[i][j];
    definirValor(nome, Math.max(v, 1), { mexeuManual: false });
  });
  segredo = PARAM.classes[i];
  falar("Quem sou eu? 🤔");
  clearTimeout(temporizador);
  prever();
});

// ---------------------------------------------------------
// Erros
// ---------------------------------------------------------
function mostrarErro(nome, msg) {
  const campo = numero(nome).closest(".campo");
  campo.classList.remove("com-erro");
  void campo.offsetWidth;
  campo.classList.add("com-erro");
  form.querySelector(`[data-erro="${nome}"]`).textContent = msg;
}
function limparErro(nome) {
  numero(nome).closest(".campo").classList.remove("com-erro");
  form.querySelector(`[data-erro="${nome}"]`).textContent = "";
}

// ---------------------------------------------------------
// Eventos dos controles
// ---------------------------------------------------------
form.querySelectorAll(".deslizante").forEach((d) => {
  pintarDeslizante(d);
  d.addEventListener("input", () => definirValor(d.dataset.alvo, parseFloat(d.value)));
});
CAMPOS.forEach((c) => {
  numero(c.nome).addEventListener("input", () => {
    const v = parseFloat(numero(c.nome).value.replace(",", "."));
    if (Number.isFinite(v)) { deslizante(c.nome).value = v; pintarDeslizante(deslizante(c.nome)); }
    limparErro(c.nome);
    segredo = null;
    aoMudar();
  });
});

document.querySelectorAll("[data-exemplo]").forEach((chip) => chip.addEventListener("click", () => {
  const ex = JSON.parse(chip.dataset.exemplo);
  Object.entries(ex).forEach(([nome, v]) => definirValor(nome, v));
  clearTimeout(temporizador);
  prever();
}));

form.addEventListener("submit", (e) => {
  e.preventDefault();
  clearTimeout(temporizador);
  prever();
});

botao.addEventListener("pointerdown", (e) => {
  const r = botao.getBoundingClientRect();
  botao.style.setProperty("--x", `${e.clientX - r.left}px`);
  botao.style.setProperty("--y", `${e.clientY - r.top}px`);
  botao.classList.remove("clicou");
  void botao.offsetWidth;
  botao.classList.add("clicou");
});

aoVivo.addEventListener("change", () => {
  falar(aoVivo.checked ? "Modo ao vivo ligado!" : "Agora só com o botão.");
  if (aoVivo.checked) agendarPrevisao();
});

// ---------------------------------------------------------
// Tema claro/escuro
// ---------------------------------------------------------
document.getElementById("botao-tema").addEventListener("click", () => {
  const raiz = document.documentElement;
  const escuroAgora = raiz.dataset.theme
    ? raiz.dataset.theme === "dark"
    : window.matchMedia("(prefers-color-scheme: dark)").matches;
  raiz.dataset.theme = escuroAgora ? "light" : "dark";
  try { localStorage.setItem("tema", raiz.dataset.theme); } catch (e) { /* ok */ }
});

// ---------------------------------------------------------
// Início
// ---------------------------------------------------------
montarGraficos();
desenharPinguim();
atualizarGraficos();
desenharHistorico();
desenharPlacar();

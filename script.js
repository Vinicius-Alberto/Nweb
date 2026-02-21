// Organizador de Banca Conjunta - versão alinhada ao seu protótipo (cards 220px, ocupação horizontal)

const varal = document.getElementById("varal");
const andamento = document.getElementById("andamento");
const pagos = document.getElementById("pagos");

const saldoVaral = document.getElementById("saldo-varal");
const saldoAndamento = document.getElementById("saldo-andamento");
const saldoPagos = document.getElementById("saldo-pagos");
const totalLucroDiv = document.getElementById("total-lucro");
const searchBar = document.getElementById("search-bar");

let proximoId = parseInt(localStorage.getItem("proximoId") || "1");

// -------------------- UTILIDADES --------------------

function gerarCorPastel() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 85%)`;
}

function formatarReal(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function calcularSaldo(container) {
  let total = 0;
  container.querySelectorAll(".card:not(.hidden)").forEach(card => {
    const valorTexto = card.querySelector(".banca-formada")?.textContent
      ?.trim()
      ?.replace("Banca formada:", "")
      ?.replace(/[^\d.,]/g, '')
      ?.replace(',', '.') || "0";
    total += parseFloat(valorTexto) || 0;
  });
  return total;
}

function calcularTotalLucro() {
  let totalLucro = 0;
  document.querySelectorAll(".card:not(.hidden)").forEach(card => {
    if (card.parentElement.id === "varal") return;
    if (!card.dataset.pagou || parseFloat(card.dataset.pagou) === 0) return;

    const mandouEl = card.querySelector(".mandou");
    if (!mandouEl) return;

    const mandouTexto = mandouEl.textContent
      .trim()
      .replace("Mandou:", "")
      .replace(/[^\d.,]/g, '')
      .replace(',', '.');
    const mandou = parseFloat(mandouTexto) || 0;
    const pagou = parseFloat(card.dataset.pagou) || 0;
    const lucro = pagou - mandou * 2;
    totalLucro += lucro;
  });
  return totalLucro;
}

function atualizarSaldos() {
  saldoVaral.textContent = `Saldo: ${formatarReal(calcularSaldo(varal))}`;
  saldoAndamento.textContent = `Saldo: ${formatarReal(calcularSaldo(andamento))}`;
  saldoPagos.textContent = `Saldo: ${formatarReal(calcularSaldo(pagos))}`;

  const totalLucro = calcularTotalLucro();
  totalLucroDiv.textContent = `Lucro/Prejuízo total: ${formatarReal(totalLucro)}`;
  totalLucroDiv.style.color = totalLucro > 0 ? '#16a34a' : (totalLucro < 0 ? '#dc2626' : '#6b7280');
}

// -------------------- PESQUISA --------------------

searchBar.addEventListener("keyup", () => {
  const termo = searchBar.value.toLowerCase().trim();
  document.querySelectorAll(".card").forEach(card => {
    const nome = card.querySelector("strong")?.textContent?.toLowerCase() || "";
    card.classList.toggle("hidden", !nome.includes(termo));
  });
  atualizarSaldos();
});

// -------------------- PARSER --------------------

function extrairDados(linha) {
  const partes = linha.trim().split(/\s+/);
  if (partes.length < 2) return null;

  const nome = partes[0];
  let motivo = "";
  let numeros = [];

  partes.slice(1).forEach(p => {
    if (/^\d+[.,]?\d*$/.test(p)) {
      numeros.push(parseFloat(p.replace(",", ".")));
    } else if (!["pago"].includes(p.toLowerCase())) {
      motivo += p + " ";
    }
  });

  const total = numeros.reduce((acc, n) => acc + n, 0);
  const pago = linha.toLowerCase().includes("pago");

  if (total === 0) return null;

  return { nome, motivo: motivo.trim() || "Não informado", total, pago };
}

// -------------------- PERSISTÊNCIA --------------------

function salvarEstado() {
  const estado = {
    varal: Array.from(varal.children).map(card => extrairDadosDoCard(card)),
    andamento: Array.from(andamento.children).map(card => extrairDadosDoCard(card)),
    pagos: Array.from(pagos.children).map(card => extrairDadosDoCard(card))
  };
  localStorage.setItem("kanban-investimentos", JSON.stringify(estado));
  localStorage.setItem("proximoId", proximoId);
}

function extrairDadosDoCard(card) {
  const id = card.dataset.id;
  const nome = card.querySelector("strong")?.textContent || "";
  const motivo = card.querySelector(".motivo")?.textContent || "Não informado";

  const mandouEl = card.querySelector(".mandou");
  const mandou = mandouEl ? parseFloat(mandouEl.textContent.replace("Mandou:", "").replace(/[^\d.,]/g, '').replace(',', '.')) || 0 : 0;

  const bancaEl = card.querySelector(".banca-formada");
  const banca = bancaEl ? parseFloat(bancaEl.textContent.replace("Banca formada:", "").replace(/[^\d.,]/g, '').replace(',', '.')) || 0 : 0;

  const pagou = parseFloat(card.dataset.pagou) || 0;
  const pago = card.classList.contains("pago");
  const prioridade = card.classList.contains("prioridade");
  const background = card.style.backgroundColor;
  const resultado = card.querySelector(".resultado")?.innerHTML || "";
  const rendeu = card.querySelector(".rendeu")?.innerHTML || "";
  const alertHidden = card.dataset.alertHidden === "true";

  return { id, nome, motivo, mandou, banca, pagou, pago, prioridade, background, resultado, rendeu, alertHidden };
}

function carregarEstado() {
  const estadoSalvo = localStorage.getItem("kanban-investimentos");
  if (!estadoSalvo) return;

  const estado = JSON.parse(estadoSalvo);

  ["varal", "andamento", "pagos"].forEach(id => {
    const container = document.getElementById(id);
    if (!container) return;
    container.innerHTML = "";
    estado[id]?.forEach(dados => {
      dados.id = dados.id || proximoId++;
      const card = criarCard(dados);
      if (dados.prioridade) card.classList.add("prioridade");
      if (dados.pago) card.classList.add("pago");
      card.style.backgroundColor = dados.background;
      card.querySelector(".resultado").innerHTML = dados.resultado || "";
      card.querySelector(".rendeu").innerHTML = dados.rendeu || "";
      card.dataset.pagou = dados.pagou;
      card.dataset.alertHidden = dados.alertHidden ? "true" : "false";
      card.dataset.id = dados.id;
      container.appendChild(card);
    });
  });

  atualizarSaldos();
}

// -------------------- ADICIONAR CARDS --------------------

function gerarCards() {
  const texto = document.getElementById("entrada").value;
  const linhas = texto.split("\n").filter(l => l.trim() !== "");

  linhas.forEach(linha => {
    const dados = extrairDados(linha);
    if (!dados) return;

    dados.mandou = dados.total;
    dados.banca = dados.total * 2;
    dados.id = proximoId++;
    const card = criarCard(dados);

    if (dados.pago) {
      card.classList.add("pago");
      pagos.appendChild(card);
    } else {
      varal.appendChild(card);
    }
  });

  atualizarSaldos();
  salvarEstado();
}

// -------------------- CRIAR CARD --------------------

function criarCard(dados) {
  const mandou = dados.mandou || dados.total;
  let banca = dados.banca || mandou * 2;
  let pagou = dados.pagou || 0;

  const card = document.createElement("div");
  card.classList.add("card");
  card.style.backgroundColor = dados.background || gerarCorPastel();
  card.draggable = true;
  card.dataset.pagou = pagou;
  card.dataset.id = dados.id;

  card.innerHTML = `
    <div class="card-id">#${dados.id.toString().padStart(3, '0')}</div>
    <div class="card-top">
      <strong>${dados.nome}</strong>
      <div class="acoes">
        <button class="prioridade-btn"></button>
        <button class="excluir"></button>
      </div>
    </div>

    <div class="motivo">${dados.motivo}</div>
    <div class="mandou">Mandou: ${formatarReal(mandou)}</div>
    <div class="banca-formada">Banca formada: ${formatarReal(banca)}</div>
    <div class="pagou">Pagou: ${formatarReal(pagou)}</div>
    <div class="metade"></div>
    <div class="rendeu"></div>

    <div class="retorno-area">
      <button class="btn-retorno">Pagou?</button>
    </div>

    <div class="resultado">${dados.resultado || ""}</div>
  `;

  const resultadoDiv = card.querySelector(".resultado");
  const btnRetorno = card.querySelector(".btn-retorno");
  const bancaDiv = card.querySelector(".banca-formada");
  const pagouDiv = card.querySelector(".pagou");
  const metadeDiv = card.querySelector(".metade");
  const rendeuDiv = card.querySelector(".rendeu");

  function atualizarMetade() {
    if (pagou > 0) {
      const metade = pagou / 2;
      metadeDiv.innerHTML = `<strong>Metade pra cada:</strong> ${formatarReal(metade)}`;
    }
  }

  atualizarMetade();

  // Editar banca formada
  bancaDiv.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "text";
    input.value = bancaDiv.textContent.replace("Banca formada:", "").trim().replace(/[^\d.,]/g, '').replace(',', '.');
    bancaDiv.innerHTML = "Banca formada: ";
    bancaDiv.appendChild(input);
    input.focus();

    input.addEventListener("blur", () => {
      let novoValor = parseFloat(input.value.replace(",", "."));
      if (isNaN(novoValor)) novoValor = banca;
      banca = novoValor;
      bancaDiv.textContent = `Banca formada: ${formatarReal(novoValor)}`;
      atualizarSaldos();
      salvarEstado();
    });

    input.addEventListener("keydown", e => {
      if (e.key === "Enter") input.blur();
    });
  });

  // Informar quanto pagou
  btnRetorno.addEventListener("click", () => {
    const valorDigitado = prompt("Quanto pagou essa banca?");

    if (!valorDigitado) return;

    const valorRecebido = parseFloat(valorDigitado.replace(",", "."));

    if (isNaN(valorRecebido)) {
      alert("Valor inválido.");
      return;
    }

    pagou = valorRecebido;
    card.dataset.pagou = pagou;

    pagouDiv.textContent = `Pagou: ${formatarReal(pagou)}`;
    atualizarMetade();

    const lucro = pagou - banca;

    rendeuDiv.innerHTML = lucro > 0
      ? `<span class="lucro">Resultado: +${formatarReal(lucro)}</span>`
      : lucro < 0
        ? `<span class="prejuizo">Resultado: ${formatarReal(lucro)}</span>`
        : `<span class="neutro">Resultado: ${formatarReal(lucro)}</span>`;

    atualizarSaldos();
    salvarEstado();
  });

  // Prioridade
  card.querySelector(".prioridade-btn").addEventListener("click", () => {
    card.classList.toggle("prioridade");
    salvarEstado();
  });

  // Excluir
  card.querySelector(".excluir").addEventListener("click", () => {
    if (confirm("Tem certeza que deseja excluir este card?")) {
      card.remove();
      atualizarSaldos();
      salvarEstado();
    }
  });

  // Duplo clique para mover + alerta
  card.addEventListener("dblclick", () => {
    const parentId = card.parentElement.id;

    if (parentId === "varal") {
      andamento.appendChild(card);
    } else if (parentId === "andamento") {
      card.classList.add("pago");
      card.classList.remove("prioridade");
      pagos.appendChild(card);
      atualizarMetade();

      if (pagou === 0 && card.dataset.alertHidden !== "true") {
        const alerta = document.createElement("div");
        alerta.className = "alerta-sem-pagou";
        alerta.innerHTML = `
          <input type="checkbox" id="noalert-${dados.id}">
          <label for="noalert-${dados.id}">Não mostrar mais</label>
          <span>Card movido para pagos sem informar o valor pago!</span>
        `;
        card.appendChild(alerta);

        alerta.querySelector("input").addEventListener("change", (e) => {
          if (e.target.checked) {
            card.dataset.alertHidden = "true";
            alerta.remove();
            salvarEstado();
          }
        });
      }
    } else {
      card.classList.remove("pago");
      andamento.appendChild(card);
    }

    atualizarSaldos();
    salvarEstado();
  });

  adicionarDragAndDrop(card);

  if (card.classList.contains("pago")) {
    atualizarMetade();
  }

  return card;
}

// -------------------- DRAG & DROP --------------------

function configurarColunas() {
  [varal, andamento, pagos].forEach(coluna => {
    coluna.addEventListener("dragover", e => e.preventDefault());

    coluna.addEventListener("drop", e => {
      e.preventDefault();
      const card = document.querySelector(".dragging");
      if (card) {
        coluna.appendChild(card);
        if (coluna.id === "pagos") {
          card.classList.add("pago");
          card.classList.remove("prioridade");
          const pagou = parseFloat(card.dataset.pagou) || 0;
          if (pagou > 0) {
            const metadeDiv = card.querySelector(".metade");
            const metade = pagou / 2;
            metadeDiv.innerHTML = `<strong>Metade pra cada:</strong> ${formatarReal(metade)}`;
          }
          if (pagou === 0 && card.dataset.alertHidden !== "true") {
            const alerta = document.createElement("div");
            alerta.className = "alerta-sem-pagou";
            alerta.innerHTML = `
              <input type="checkbox" id="noalert-${card.dataset.id}">
              <label for="noalert-${card.dataset.id}">Não mostrar mais</label>
              <span>Card movido para pagos sem informar o valor pago!</span>
            `;
            card.appendChild(alerta);

            alerta.querySelector("input").addEventListener("change", (e) => {
              if (e.target.checked) {
                card.dataset.alertHidden = "true";
                alerta.remove();
                salvarEstado();
              }
            });
          }
        } else {
          card.classList.remove("pago");
        }
        atualizarSaldos();
        salvarEstado();
      }
    });
  });
}

function adicionarDragAndDrop(card) {
  card.addEventListener("dragstart", () => card.classList.add("dragging"));
  card.addEventListener("dragend", () => card.classList.remove("dragging"));
}

// -------------------- EXPORTAR PDF --------------------

document.getElementById("export-pdf").addEventListener("click", () => {
  const printContent = document.getElementById("pagos").outerHTML;

  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
    <html>
      <head>
        <title>Pagos - Banca Conjunta</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .cards-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 15px; }
          .card { border: 1px solid #ddd; padding: 12px; border-radius: 8px; background: #f9f9f9; page-break-inside: avoid; }
          h1 { text-align: center; }
        </style>
      </head>
      <body>
        <h1>Pagos - Banca Conjunta</h1>
        ${printContent}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 500);
});

// -------------------- TEMA CLARO/ESCURO --------------------

function toggleTheme() {
  document.body.classList.toggle("dark-mode");
  const isDark = document.body.classList.contains("dark-mode");
  
  // Muda o src da imagem com base no estado
  const themeIcon = document.getElementById("theme-icon");
  if (isDark) {
    themeIcon.src = "./assets/moon.svg"; // Estado dark: mostra switch off/lua
  } else {
    themeIcon.src = "./assets/sun.svg"; // Estado light: mostra switch on/sol
  }
  
  
  localStorage.setItem("theme", isDark ? "dark" : "light");
}

function loadTheme() {
  const theme = localStorage.getItem("theme");
  if (theme === "dark") {
    document.body.classList.add("dark-mode");
    document.getElementById("theme-icon").src = "./assets/moon.svg";
  } else {
    document.getElementById("theme-icon").src = "./assets/sun.svg";
  }
}
// Inicializa
document.addEventListener("DOMContentLoaded", () => {
  configurarColunas();
  carregarEstado();
  loadTheme();
  document.getElementById("toggle-theme").addEventListener("click", toggleTheme);
});
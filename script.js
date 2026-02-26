// Organizador de Banca Conjunta 

const varal = document.getElementById("varal");
const andamento = document.getElementById("andamento");
const pagos = document.getElementById("pagos");

const saldoVaral = document.getElementById("saldo-varal");
const saldoAndamento = document.getElementById("saldo-andamento");
const saldoPagos = document.getElementById("saldo-pagos");
const totalLucroDiv = document.getElementById("total-lucro");
const searchBar = document.getElementById("search-bar");

let proximoId = parseInt(localStorage.getItem("proximoId") || "1");

// ────────────────────────────────────────────────
// UTILIDADES
// ────────────────────────────────────────────────

function gerarCorPastel() {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 50 + Math.floor(Math.random() * 30);
  const lightness = 80 + Math.floor(Math.random() * 15);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function ajustarClaridade(hslString, percentMaisClaro = 10) {
  const match = hslString.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return hslString;
  let [_, h, s, l] = match.map(Number);
  l = Math.min(95, l + percentMaisClaro);
  return `hsl(${h}, ${s}%, ${l}%)`;
}

function formatarReal(valor) {
  const numero = Number(Number(valor).toFixed(2));
  if (isNaN(numero)) return "R$ 0,00";
  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function parseValor(str) {
  if (typeof str !== 'string' || !str.trim()) return 0;

  let s = str
    .replace(/R\$\s*/gi, '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  s = s.replace(/\./g, '').replace(',', '.');
  s = s.replace(/[^0-9.-]/g, '');

  const num = parseFloat(s);
  return isNaN(num) ? 0 : num;
}

function toCentavos(reais) {
  return Math.round(reais * 100);
}

function fromCentavos(centavos) {
  return centavos / 100;
}

// ────────────────────────────────────────────────
// CÁLCULOS
// ────────────────────────────────────────────────

function calcularSaldo(container) {
  let totalCentavos = 0;
  container.querySelectorAll(".card:not(.hidden)").forEach(card => {
    let valorTexto;

    if (container.id === "pagos") {
      const pagouCentavos = Number(card.dataset.pagouCentavos) || 0;
      if (pagouCentavos > 0) {
        valorTexto = formatarReal(fromCentavos(pagouCentavos));
      } else {
        valorTexto = "0";
      }
    } else {
      valorTexto = card.querySelector(".banca-valor")?.textContent || "0";
    }

    totalCentavos += toCentavos(parseValor(valorTexto));
  });
  return fromCentavos(totalCentavos);
}

function calcularTotalLucro() {
  let totalLucroCentavos = 0;
  document.querySelectorAll("#andamento .card, #pagos .card").forEach(card => {
    const resultadoEl = card.querySelector(".valor-resultado");
    if (resultadoEl && resultadoEl.parentElement.style.display !== "none") {
      totalLucroCentavos += toCentavos(parseValor(resultadoEl.textContent));
    }
  });
  return fromCentavos(totalLucroCentavos);
}

function atualizarSaldos() {
  if (saldoVaral) saldoVaral.textContent = `Saldo: ${formatarReal(calcularSaldo(varal))}`;
  if (saldoAndamento) saldoAndamento.textContent = `Saldo: ${formatarReal(calcularSaldo(andamento))}`;
  if (saldoPagos) saldoPagos.textContent = `Saldo: ${formatarReal(calcularSaldo(pagos))}`;

  const totalLucro = calcularTotalLucro();
  if (totalLucroDiv) {
    totalLucroDiv.textContent = `Lucro/Prejuízo total: ${formatarReal(totalLucro)}`;
    totalLucroDiv.style.color = totalLucro > 0 ? '#16a34a' : (totalLucro < 0 ? '#dc2626' : '#6b7280');
  }
}

// ────────────────────────────────────────────────
// PESQUISA – corrigida para novo layout do card
// ────────────────────────────────────────────────

if (searchBar) {
  searchBar.addEventListener("input", () => {   // 
    const termo = searchBar.value.toLowerCase().trim();

    document.querySelectorAll(".card").forEach(card => {
      const nomeEl     = card.querySelector(".card-header-name");
      const motivoEl   = card.querySelector(".motivo");
      const idEl       = card.querySelector(".card-id");
      const resultadoEl = card.querySelector(".valor-resultado");

      const textos = [
        nomeEl?.textContent || "",
        motivoEl?.textContent || "",
        idEl?.textContent || "",
        resultadoEl?.textContent || ""
      ].join(" ").toLowerCase();

      const visivel = textos.includes(termo);
      card.classList.toggle("hidden", !visivel);
    });

    atualizarSaldos();
  });
}

// ────────────────────────────────────────────────
// PARSER
// ────────────────────────────────────────────────

function extrairDados(linha) {
  const match = linha.match(/^(.+?)\s+([\d.,\s]+)(?:\s+(pago))?\s*(.*)$/i);
  if (!match) return null;

  const nome = match[1].trim();
  const numerosStr = match[2];
  const pago = !!match[3];
  const motivo = (match[4] || "Não informado").trim();

  const numeros = numerosStr.match(/\d+[.,]?\d*/g)?.map(n => parseValor(n)) || [];
  const total = numeros.reduce((acc, n) => acc + n, 0);

  if (total === 0) return null;

  return { nome, motivo, total, pago };
}

// ────────────────────────────────────────────────
// PERSISTÊNCIA
// ────────────────────────────────────────────────

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
  const nome = card.querySelector(".card-header-name")?.textContent?.trim() || "";  // 
  const motivo = card.querySelector(".motivo")?.textContent?.trim() || "Não informado";

  const mandouCentavos = toCentavos(parseValor(card.querySelector(".mandou-valor")?.textContent || "0"));
  const bancaCentavos  = toCentavos(parseValor(card.querySelector(".banca-valor")?.textContent || "0"));
  const pagouCentavos  = Number(card.dataset.pagouCentavos) || 0;

  const pago = card.classList.contains("pago");
  const prioridade = card.classList.contains("prioridade");
  const corOriginal = card.dataset.corOriginal || '';
  const resultado = card.querySelector(".valor-resultado")?.textContent || "";
  const rendeu = card.querySelector(".rendeu")?.innerHTML || "";
  const alertHidden = card.dataset.alertHidden === "true";

  return { id, nome, motivo, mandouCentavos, bancaCentavos, pagouCentavos, pago, prioridade, corOriginal, resultado, rendeu, alertHidden };
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
      if (dados.corOriginal) card.dataset.corOriginal = dados.corOriginal;
      atualizarCorCard(card);
      card.dataset.pagouCentavos = dados.pagouCentavos || "0";
      card.dataset.alertHidden = dados.alertHidden ? "true" : "false";
      card.dataset.id = dados.id;
      container.appendChild(card);
    });
  });

  atualizarSaldos();
}

// ────────────────────────────────────────────────
// ADICIONAR CARDS
// ────────────────────────────────────────────────

function gerarCards() {
  const texto = document.getElementById("entrada").value;
  const linhas = texto.split("\n").filter(l => l.trim() !== "");

  linhas.forEach(linha => {
    const dados = extrairDados(linha);
    if (!dados) return;

    dados.mandouCentavos = toCentavos(dados.total);
    dados.bancaCentavos = dados.mandouCentavos * 2;
    dados.id = proximoId++;
    const card = criarCard(dados);

    if (dados.pago) {
      card.classList.add("pago");
      pagos.appendChild(card);
    } else {
      varal.appendChild(card);
    }
  });

  document.getElementById("entrada").value = "";
  atualizarSaldos();
  salvarEstado();
}

// ────────────────────────────────────────────────
// CRIAR CARD 
// ────────────────────────────────────────────────

function criarCard(dados) {
  let mandouCentavos = dados.mandouCentavos || toCentavos(dados.mandou || dados.total || 0);
  let bancaCentavos  = dados.bancaCentavos  || mandouCentavos * 2;
  let pagouCentavos  = dados.pagouCentavos  || 0;

  const mandou = fromCentavos(mandouCentavos);
  const banca  = fromCentavos(bancaCentavos);
  const pagou  = fromCentavos(pagouCentavos);

  const card = document.createElement("div");
  card.classList.add("card");
  card.draggable = true;
  card.dataset.pagouCentavos = pagouCentavos;
  card.dataset.id = dados.id;

  const corBase = gerarCorPastel();
  card.dataset.corOriginal = corBase;
  atualizarCorCard(card);

  card.innerHTML = `
    <div class="card-header">
      <div class="card-header-top">
        <div class="card-id">#${(dados.id || 0).toString().padStart(3, '0')}</div>
        <div class="acoes">
          <button class="prioridade-btn" title="Prioridade">⭐</button>
          <button class="excluir" title="Excluir">🗑️</button>
        </div>
      </div>
      <div class="card-header-name">${dados.nome || 'Nome'}</div>
    </div>

    <div class="motivo">${(dados.motivo || 'Não informado').toUpperCase()}</div>

    <div class="valores-iniciais">
      <div class="comanda-linha">
        <span>Mandou:</span>
        <span class="mandou-valor">${formatarReal(mandou)}</span>
      </div>
      <div class="comanda-linha">
        <span>Banca:</span>
        <span class="banca-valor">${formatarReal(banca)}</span>
      </div>
      <div class="pagou-unica comanda-linha">
        <span>Pagou:</span>
        <span class="pagou-valor">${formatarReal(pagou)}</span>
      </div>
    </div>

    <div class="resultado-total-area">
      <div class="linha-resultado">
        <span>Resultado:</span>
        <span class="valor-resultado"></span>
      </div>
      <div class="linha-total">
        <span>TOTAL:</span>
        <strong class="total-valor">${formatarReal(pagou)}</strong>
      </div>
      <div class="linha-metade">
        <span>Metade:</span>
        <span class="metade-valor"></span>
      </div>
    </div>

    <div class="retorno-area">
      <button class="btn-retorno">Pagou?</button>
    </div>
  `;

  // Referências aos elementos dinâmicos
  const pagouValorEl     = card.querySelector(".pagou-valor");
  const valorResultadoEl = card.querySelector(".valor-resultado");
  const totalValorEl     = card.querySelector(".total-valor");
  const metadeValorEl    = card.querySelector(".metade-valor");
  const btnRetorno       = card.querySelector(".btn-retorno");

  function atualizarMetade() {
    if (!metadeValorEl) return;
    if (pagouCentavos > 0) {
      const metade = fromCentavos(Math.round(pagouCentavos / 2));
      metadeValorEl.textContent = formatarReal(metade);
    } else {
      metadeValorEl.textContent = "";
    }
  }

  function atualizarResultadoELucro() {
    if (pagouCentavos <= 0 || !valorResultadoEl) return;

    const lucroCentavos = pagouCentavos - (mandouCentavos * 2);
    const lucroReais    = fromCentavos(lucroCentavos);

    let texto = lucroReais > 0 ? `+${formatarReal(lucroReais)}` : formatarReal(lucroReais);
    let classe = lucroReais > 0 ? 'lucro' : (lucroReais < 0 ? 'prejuizo' : 'neutro');

    valorResultadoEl.textContent = texto;
    valorResultadoEl.className = `valor-resultado ${classe}`;
  }

  function atualizarTotalCard() {
    if (totalValorEl) {
      totalValorEl.textContent = formatarReal(fromCentavos(pagouCentavos));
    }
  }

  // Inicializa valores
  atualizarMetade();
  atualizarResultadoELucro();
  atualizarTotalCard();

  // ─── Edição da Banca ───
  const bancaValorEl = card.querySelector(".banca-valor");
  if (bancaValorEl) {
    bancaValorEl.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "text";
      input.value = bancaValorEl.textContent?.trim() || '';
      const parent = bancaValorEl.parentElement;
      parent.innerHTML = "<span>Banca formada:</span> ";
      parent.appendChild(input);
      input.focus();

      input.addEventListener("blur", () => {
        let novo = parseValor(input.value);
        if (isNaN(novo) || novo < 0) novo = fromCentavos(bancaCentavos);
        bancaCentavos = toCentavos(novo);
        parent.innerHTML = `<span>Banca formada:</span> <span class="banca-valor">${formatarReal(fromCentavos(bancaCentavos))}</span>`;
        atualizarResultadoELucro();
        atualizarSaldos();
        salvarEstado();
      });

      input.addEventListener("keydown", e => {
        if (e.key === "Enter") input.blur();
      });
    });
  }

  // ─── Botão Pagou ───
  if (btnRetorno) {
    btnRetorno.addEventListener("click", () => {
      const valorDigitado = prompt("Quanto pagou essa banca?");
      if (!valorDigitado) return;

      const valorRecebido = parseValor(valorDigitado);
      if (isNaN(valorRecebido) || valorRecebido <= 0) {
        alert("Valor inválido.");
        return;
      }

      pagouCentavos = toCentavos(valorRecebido);
      card.dataset.pagouCentavos = pagouCentavos;

      if (pagouValorEl) pagouValorEl.textContent = formatarReal(fromCentavos(pagouCentavos));

      atualizarMetade();
      atualizarResultadoELucro();
      atualizarTotalCard();
      atualizarSaldos();
      salvarEstado();
    });
  }

  // Prioridade
  card.querySelector(".prioridade-btn")?.addEventListener("click", () => {
    card.classList.toggle("prioridade");
    salvarEstado();
  });

  // Excluir
  card.querySelector(".excluir")?.addEventListener("click", () => {
    if (confirm("Tem certeza que deseja excluir este card?")) {
      card.remove();
      atualizarSaldos();
      salvarEstado();
    }
  });

  // Duplo clique para mover
  card.addEventListener("dblclick", () => {
    const parentId = card.parentElement.id;

    if (parentId === "varal") {
      andamento.appendChild(card);
    } else if (parentId === "andamento") {
      card.classList.add("pago");
      card.classList.remove("prioridade");
      pagos.appendChild(card);
      atualizarMetade();
      atualizarResultadoELucro();
      atualizarTotalCard();

      if (pagouCentavos === 0 && card.dataset.alertHidden !== "true") {
        const alerta = document.createElement("div");
        alerta.className = "alerta-sem-pagou";
        alerta.innerHTML = `
          <input type="checkbox" id="noalert-${dados.id}">
          <label for="noalert-${dados.id}">Não mostrar mais</label>
          <span>Card movido para pagos sem informar o valor pago!</span>
        `;
        card.appendChild(alerta);

        alerta.querySelector("input").addEventListener("change", e => {
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

  return card;
}

// ────────────────────────────────────────────────
// COR DINÂMICA AO MUDAR TEMA
// ────────────────────────────────────────────────

function atualizarCorCard(card) {
  const corOriginal = card.dataset.corOriginal;
  if (!corOriginal) return;

  let bgStyle, borderColor;

  if (document.body.classList.contains("dark-mode")) {
    const match = corOriginal.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (match) {
      const hue = match[1];
      bgStyle = `linear-gradient(145deg, hsl(${hue}, 55%, 28%), hsl(${hue}, 65%, 42%))`;
      borderColor = `hsl(${hue}, 60%, 35%)`;
    } else {
      bgStyle = `linear-gradient(145deg, #1e1e2e, #2d1b2e)`;
      borderColor = '#4a1d38';
    }
  } else {
    const corClara = ajustarClaridade(corOriginal, 10);
    bgStyle = `linear-gradient(135deg, ${corOriginal}, ${corClara})`;
    borderColor = '#e5e7eb';
  }

  card.style.background = bgStyle;
  card.style.borderColor = borderColor;
}

// ────────────────────────────────────────────────
// DRAG & DROP
// ────────────────────────────────────────────────

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
          atualizarCorCard(card);
          if (Number(card.dataset.pagouCentavos) === 0 && card.dataset.alertHidden !== "true") {
            const alerta = document.createElement("div");
            alerta.className = "alerta-sem-pagou";
            alerta.innerHTML = `
              <input type="checkbox" id="noalert-${card.dataset.id}">
              <label for="noalert-${card.dataset.id}">Não mostrar mais</label>
              <span>Card movido para pagos sem informar o valor pago!</span>
            `;
            card.appendChild(alerta);

            alerta.querySelector("input").addEventListener("change", e => {
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

// ────────────────────────────────────────────────
// EXPORT PDF
// ────────────────────────────────────────────────

document.getElementById("export-pdf")?.addEventListener("click", () => {
  const printContent = document.getElementById("pagos")?.outerHTML || '';

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>Pagos - Banca Conjunta</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .cards-container { display: flex; flex-wrap: wrap; gap: 15px; }
            .card { border: 1px solid #ddd; padding: 12px; border-radius: 8px; background: #f9f9f9; page-break-inside: avoid; width: 220px; }
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
  }
});

// ────────────────────────────────────────────────
// TEMA
// ────────────────────────────────────────────────

function toggleTheme() {
  document.body.classList.toggle("dark-mode");
  const isDark = document.body.classList.contains("dark-mode");
  const icon = document.getElementById("theme-icon");

  if (icon) {
    icon.src = isDark ? "assets/moon.svg" : "assets/sun.svg";
    icon.alt = isDark ? "Modo claro" : "Modo escuro";
  }

  document.querySelectorAll(".card").forEach(card => {
    atualizarCorCard(card);
  });

  localStorage.setItem("theme", isDark ? "dark" : "light");
}

function loadTheme() {
  const theme = localStorage.getItem("theme");
  const icon = document.getElementById("theme-icon");

  if (theme === "dark") {
    document.body.classList.add("dark-mode");
    if (icon) {
      icon.src = "assets/moon.svg";
      icon.alt = "Modo claro";
    }
  } else {
    if (icon) {
      icon.src = "assets/sun.svg";
      icon.alt = "Modo escuro";
    }
  }

  document.querySelectorAll(".card").forEach(card => {
    atualizarCorCard(card);
  });
}

// ────────────────────────────────────────────────
// RESETAR DADOS
// ────────────────────────────────────────────────

function resetarTodosDados() {
  if (confirm("Tem certeza que deseja apagar TODOS os dados salvos?")) {
    localStorage.clear();
    location.reload();
  }
}

// ────────────────────────────────────────────────
// INICIALIZA
// ────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  configurarColunas();
  carregarEstado();
  loadTheme();
  document.getElementById("toggle-theme")?.addEventListener("click", toggleTheme);
});
// ================= TAXAS PAGAMENTO =================
const TAXAS = { dinheiro: 0, pix: 0, debito: 0.019, credito: 0.039 };

// Configuração de Gasto de Açaí por Produto (Gramas)
const GASTO_PRODUTO = {
    copo400: 280,
    copo500: 350,
    shakeSimples: 300,
    shakePacoca: 300
};
const GRAMAS_POR_EXTRA = 20; // Média de gramas por adicional

// ================= DADOS SALVOS =================
let vendas = JSON.parse(localStorage.getItem("vendas")) || [];
let gastos = JSON.parse(localStorage.getItem("gastos")) || [];
let historicoPrecos = JSON.parse(localStorage.getItem("historicoPrecos")) || [];

// Estoque atualizado com MORANGO e PAÇOCA
let estoque = JSON.parse(localStorage.getItem("estoque")) || {
    acai: 10000, nutella: 650, leitePo: 400, leiteCondensado: 395,
    ouroBranco: 1000, sonhoValsa: 1000, kitkat: 36, banana: 1000,
    disquete: 500, granola: 500, ovomaltine: 500, morango: 1000, pacoca: 50
};

const NOMES_INSUMOS = {
    acai: "Açaí", nutella: "Nutella", leitePo: "Leite em Pó",
    leiteCondensado: "Leite Condensado", ouroBranco: "Ouro Branco",
    sonhoValsa: "Sonho de Valsa", kitkat: "KitKat", banana: "Banana",
    disquete: "Disquete", granola: "Granola", ovomaltine: "Ovomaltine",
    morango: "Morango", pacoca: "Paçoca"
};

function salvarDados() {
    localStorage.setItem("vendas", JSON.stringify(vendas));
    localStorage.setItem("gastos", JSON.stringify(gastos));
    localStorage.setItem("estoque", JSON.stringify(estoque));
    localStorage.setItem("historicoPrecos", JSON.stringify(historicoPrecos));
}

// ================= CONFIG & CUSTOS =================
const META_LUCRO_DIA = 200;
let promocaoAtiva = false;

const custos = {
    acaiPorGrama: 16.5 / 1000,
    embalagem: 1.73,
    adicionais: {
        nutella: 44 / 650,
        leitePo: 20.99 / 400,
        leiteCondensado: 6.90 / 395,
        ouroBranco: 52.90 / 1000,
        sonhoValsa: 59.90 / 1000,
        kitkatUnidade: 68 / 36,
        morango: 15.00 / 1000,
        pacoca: 0.50, // por unidade
        geralExtras: 0.60
    }
};

// Preços de Venda por Produto
const PRECOS_PRODUTOS = {
    copo400: 17,
    copo500: 20,
    shakeSimples: 16,
    shakePacoca: 18
};

// ================= PROMOÇÃO =================
function togglePromo() {
    promocaoAtiva = !promocaoAtiva;
    const btn = document.querySelector(".btn.promo");
    if (btn) btn.innerHTML = promocaoAtiva ? "🔥 Promoção ATIVA" : "Ativar Promoção";
    alert(promocaoAtiva ? "🔥 Promoção ATIVADA (-R$ 2,00 nos copos)" : "❌ Promoção DESATIVADA");
}

// ================= REGISTRAR VENDA =================
function registrarVenda() {
    const tipo = document.getElementById("tipoProduto")?.value || "copo400";
    let PRECO_BASE = PRECOS_PRODUTOS[tipo];

    // Aplica promoção apenas nos copos
    if (promocaoAtiva && tipo.includes("copo")) {
        PRECO_BASE -= 2;
    }

    let cliente = document.getElementById("nomeCliente")?.value || "Balcão";
    let forma = document.getElementById("formaPagamento")?.value || "dinheiro";
    let qtdItens = parseInt(document.getElementById("quantidadeCopos")?.value) || 1;

    let valorUnitario = PRECO_BASE;
    let custoExtrasUnitario = 0;
    let extrasSelecionados = [];

    // Lógica de extras e cobranças
    document.querySelectorAll('input[type="checkbox"]:checked').forEach(e => {
        if (e.id === "tradicional") return;
        extrasSelecionados.push(e.value);

        if (e.classList.contains("extra4")) { // R$ 4,00
            valorUnitario += 4;
            if (e.value === "nutella") {
                custoExtrasUnitario += custos.adicionais.nutella * 20;
                estoque.nutella -= (20 * qtdItens);
            }
        } else if (e.classList.contains("extra3")) { // R$ 3,00
            valorUnitario += 3;
            if (e.value === "ouroBranco") { custoExtrasUnitario += custos.adicionais.ouroBranco * 20; estoque.ouroBranco -= (20 * qtdItens); }
            if (e.value === "sonhoValsa") { custoExtrasUnitario += custos.adicionais.sonhoValsa * 20; estoque.sonhoValsa -= (20 * qtdItens); }
            if (e.value === "kitkat") { custoExtrasUnitario += custos.adicionais.kitkatUnidade; estoque.kitkat -= (1 * qtdItens); }
        } else if (e.classList.contains("extra2")) { // R$ 2,00
            valorUnitario += 2;
            custoExtrasUnitario += custos.adicionais.geralExtras;
            if (estoque[e.value] !== undefined) estoque[e.value] -= (GRAMAS_POR_EXTRA * qtdItens);
        } else if (e.classList.contains("extraGratis")) { // R$ 0,00 (Mas baixa estoque)
            if (e.value === "morango") custoExtrasUnitario += custos.adicionais.morango * 20;
            if (estoque[e.value] !== undefined) estoque[e.value] -= (GRAMAS_POR_EXTRA * qtdItens);
        }
    });

    // Cálculos de custos específicos do tamanho
    let gramasAcai = GASTO_PRODUTO[tipo] || 280;
    let custoAcaiTotal = (custos.acaiPorGrama * gramasAcai) * qtdItens;
    let custoBaseObrigatorio = ((custos.adicionais.leiteCondensado * 20) + (custos.adicionais.leitePo * 20)) * qtdItens;
    let custoEmbalagemTotal = custos.embalagem * qtdItens;

    // Se for shake de paçoca, debita a paçoca
    if (tipo === "shakePacoca") {
        estoque.pacoca -= (1 * qtdItens);
        custoBaseObrigatorio += (custos.adicionais.pacoca * qtdItens);
    }

    let valorVendaTotal = valorUnitario * qtdItens;
    let custoTotalVenda = custoAcaiTotal + custoBaseObrigatorio + (custoExtrasUnitario * qtdItens) + custoEmbalagemTotal;

    // Baixa estoque base
    estoque.acai -= (gramasAcai * qtdItens);
    estoque.leiteCondensado -= (20 * qtdItens);
    estoque.leitePo -= (20 * qtdItens);

    let taxa = valorVendaTotal * (TAXAS[forma] || 0);
    let lucro = valorVendaTotal - custoTotalVenda - taxa;

    vendas.push({
        cliente: `${cliente} (${qtdItens}x ${tipo})`,
        pagamento: forma,
        valor: valorVendaTotal,
        lucro: lucro,
        extras: extrasSelecionados,
        data: new Date().toLocaleDateString()
    });

    salvarDados();
    atualizarTudo();

    document.getElementById("quantidadeCopos").value = 1;
    alert(`Venda registrada! Total: R$ ${valorVendaTotal.toFixed(2)}`);
}

// ================= GESTÃO DE ESTOQUE =================
function registrarEntradaEstoque() {
    const insumo = document.getElementById("selecaoInsumo").value;
    const valorPago = parseFloat(document.getElementById("valorGasto").value);
    let qtd = parseFloat(document.getElementById("qtdEntrada").value);

    if (!valorPago || !qtd) return alert("Preencha valor e quantidade!");

    let qtdGramas = (insumo !== "kitkat" && insumo !== "pacoca" && qtd < 50) ? qtd * 1000 : qtd;
    let precoUnitarioAtual = valorPago / qtdGramas;

    historicoPrecos.push({
        insumo: insumo, nome: NOMES_INSUMOS[insumo],
        valorPago: valorPago, quantidade: qtd,
        precoPorGrama: precoUnitarioAtual, data: new Date().toLocaleDateString()
    });

    estoque[insumo] += qtdGramas;
    gastos.push({ descricao: `Entrada: ${NOMES_INSUMOS[insumo]}`, valor: valorPago, data: new Date().toLocaleDateString() });

    salvarDados();
    atualizarTudo();
    document.getElementById("valorGasto").value = "";
    document.getElementById("qtdEntrada").value = "";
    alert("Estoque e Histórico de Preços atualizados!");
}

function ajustarEstoqueManual() {
    const item = document.getElementById("ajusteInsumo").value;
    const qtd = parseFloat(document.getElementById("novaQtd").value);
    if (isNaN(qtd)) return alert("Digite um valor!");
    if (confirm(`Deseja ajustar o estoque de ${NOMES_INSUMOS[item]} para ${qtd}?`)) {
        estoque[item] = qtd;
        salvarDados();
        atualizarTudo();
        document.getElementById("novaQtd").value = "";
        alert("Ajuste realizado!");
    }
}

// ================= RENDERIZAÇÃO =================
function renderizarListaInsumos() {
    const lista = document.getElementById("listaInsumos");
    const listaDuplicada = document.getElementById("listaInsumosDuplicado");
    if (!lista) return;
    lista.innerHTML = "";
    if (listaDuplicada) listaDuplicada.innerHTML = "";

    for (let item in estoque) {
        let qtd = estoque[item];
        let rendimento = (item === "acai") ? Math.floor(qtd / 300) :
            (item === "kitkat" || item === "pacoca") ? qtd : Math.floor(qtd / GRAMAS_POR_EXTRA);

        let unit = (item === "kitkat" || item === "pacoca") ? "un" : "g";
        let labelRendimento = (item === "acai") ? "copos" : "porções";
        let corAlerta = (rendimento <= 5) ? "#ff5252" : (rendimento <= 12) ? "#ffab40" : "#00e676";

        let htmlItem = `
            <li style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #555;">
                <span style="color: #eee;">${NOMES_INSUMOS[item]}: <b>${qtd >= 1000 && unit === 'g' ? (qtd / 1000).toFixed(2) + 'kg' : qtd + unit}</b></span>
                <span style="color: ${corAlerta}; font-weight: bold;">~ ${rendimento} ${labelRendimento}</span>
            </li>`;

        lista.innerHTML += htmlItem;
        if (listaDuplicada) listaDuplicada.innerHTML += htmlItem;
    }
}

function renderizarHistoricoPrecos() {
    const lista = document.getElementById("listaHistoricoPrecos");
    if (!lista) return;
    lista.innerHTML = "";
    historicoPrecos.slice().reverse().slice(0, 5).forEach(compra => {
        lista.innerHTML += `
            <li style="font-size: 0.85rem; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                <b>${compra.data}</b> - ${compra.nome}<br>
                R$ ${compra.valorPago.toFixed(2)} (${compra.quantidade}${compra.insumo === 'kitkat' ? 'un' : 'kg/g'}) 
                <span style="color: #ffab40;">(R$ ${compra.precoPorGrama.toFixed(4)}/g)</span>
            </li>`;
    });
}

// ================= RELATÓRIO WHATSAPP =================
function enviarRelatorioWhatsApp() {
    let hoje = new Date().toLocaleDateString();
    let vendasHoje = vendas.filter(v => v.data === hoje);

    if (vendasHoje.length === 0) return alert("Nenhuma venda realizada hoje!");

    let totalBruto = vendasHoje.reduce((s, v) => s + v.valor, 0);
    let totalLucro = vendasHoje.reduce((s, v) => s + v.lucro, 0);
    let totalItens = 0;

    vendasHoje.forEach(v => {
        let match = v.cliente.match(/\((\d+)x/);
        totalItens += match ? parseInt(match[1]) : 1;
    });

    let extrasHoje = {};
    vendasHoje.forEach(v => { (v.extras || []).forEach(ex => { extrasHoje[ex] = (extrasHoje[ex] || 0) + 1; }); });
    let topExtraArr = Object.entries(extrasHoje).sort((a, b) => b[1] - a[1])[0];
    let extraDestaque = topExtraArr ? `${NOMES_INSUMOS[topExtraArr[0]] || topExtraArr[0]} (${topExtraArr[1]}x)` : "Nenhum";

    let mensagem = `*📊 RELATÓRIO DIÁRIO - NOVA ORIGEM* \n`;
    mensagem += `*Data:* ${hoje}\n`;
    mensagem += `----------------------------\n`;
    mensagem += `*✅ Total Bruto:* R$ ${totalBruto.toFixed(2)}\n`;
    mensagem += `*💵 Lucro Líquido:* R$ ${totalLucro.toFixed(2)}\n`;
    mensagem += `*🥤 Itens Vendidos:* ${totalItens}\n`;
    mensagem += `*🔝 Mais pedido:* ${extraDestaque}\n`;
    mensagem += `----------------------------\n`;
    mensagem += `*📦 ESTOQUE PRINCIPAL:*\n`;
    mensagem += `Açaí: ${(estoque.acai / 1000).toFixed(2)}kg\n`;
    mensagem += `Morango: ${estoque.morango}g\n`;
    mensagem += `----------------------------\n`;
    mensagem += `_Gerado por Gestão Nova Origem_`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(mensagem)}`, "_blank");
}

// ================= ANALISES FINANCEIRAS MELHORADAS =================
function atualizarResumo() {
    let hoje = new Date().toLocaleDateString();
    let vendasHoje = vendas.filter(v => v.data === hoje);

    let totalBruto = vendasHoje.reduce((s, v) => s + v.valor, 0);
    let lucroVendas = vendasHoje.reduce((s, v) => s + v.lucro, 0);
    let totalGastos = gastos.filter(g => g.data === hoje).reduce((s, g) => s + g.valor, 0);
    let saldoReal = lucroVendas - totalGastos;

    // Atualiza interface básica
    if (document.getElementById("totalVendas")) document.getElementById("totalVendas").textContent = totalBruto.toFixed(2);
    if (document.getElementById("totalGastos")) document.getElementById("totalGastos").textContent = totalGastos.toFixed(2);
    const elLucro = document.getElementById("lucro");
    if (elLucro) { elLucro.textContent = saldoReal.toFixed(2); elLucro.style.color = saldoReal < 0 ? "#ff5252" : "#00e676"; }

    // CÁLCULO DE MARGEM E TICKET MÉDIO (NOVIDADE)
    let margem = totalBruto > 0 ? (lucroVendas / totalBruto) * 100 : 0;
    let totalItensVenda = vendasHoje.length || 0;
    let ticket = totalItensVenda > 0 ? totalBruto / totalItensVenda : 0;

    if (document.getElementById("margemLucro")) document.getElementById("margemLucro").textContent = margem.toFixed(0);
    if (document.getElementById("ticketMedio")) document.getElementById("ticketMedio").textContent = ticket.toFixed(2);

    // Atualiza Meta
    const metaStatus = document.getElementById("metaStatus");
    if (metaStatus) {
        if (saldoReal >= META_LUCRO_DIA) {
            metaStatus.textContent = "🚀 Meta Batida!";
            metaStatus.className = "alerta-sucesso";
        } else if (saldoReal > 0) {
            metaStatus.textContent = `Faltam R$ ${(META_LUCRO_DIA - saldoReal).toFixed(2)} para a meta.`;
            metaStatus.className = "alerta-neutro";
        }
    }
}

function previsaoMensal() {
    let lucroTotal = vendas.reduce((s, v) => s + v.lucro, 0);
    let dias = new Set(vendas.map(v => v.data)).size || 1;
    let media = (lucroTotal / dias) * 30;
    if (document.getElementById("previsao")) document.getElementById("previsao").textContent = media.toFixed(2);
    if (document.getElementById("coposHoje")) {
        let hoje = new Date().toLocaleDateString();
        document.getElementById("coposHoje").textContent = vendas.filter(v => v.data === hoje).length;
    }
}

function mostrarRankingExtras() {
    let lista = document.getElementById("rankingExtras");
    if (!lista) return;
    lista.innerHTML = "";
    let ranking = {};
    vendas.forEach(v => {
        (v.extras || []).forEach(ex => { ranking[ex] = (ranking[ex] || 0) + (v.lucro / (v.extras.length || 1)); });
    });
    Object.entries(ranking).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([ex, luc]) => {
        lista.innerHTML += `<li>🥇 ${NOMES_INSUMOS[ex] || ex}: R$${luc.toFixed(2)}</li>`;
    });
}

function fecharDia() {
    if (!confirm("Isso gerará o PDF e limpará as vendas atuais. Continuar?")) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("FECHAMENTO DE CAIXA - NOVA ORIGEM", 10, 10);
    let y = 20;
    vendas.forEach(v => { doc.text(`${v.cliente}: R$${v.valor.toFixed(2)}`, 10, y); y += 7; });
    doc.save(`caixa_${new Date().toLocaleDateString()}.pdf`);
    vendas = []; gastos = []; salvarDados(); location.reload();
}

// ================= ATUALIZAÇÕES GERAIS =================
function atualizarTudo() {
    atualizarResumo();
    listarVendas();
    renderizarListaInsumos();
    previsaoMensal();
    mostrarRankingExtras();
    renderizarHistoricoPrecos();
}

function listarVendas() {
    let lista = document.getElementById("historico");
    if (!lista) return;
    lista.innerHTML = "";
    vendas.slice().reverse().slice(0, 10).forEach((v, i) => {
        lista.innerHTML += `<li><b>#${vendas.length - i}</b> | ${v.cliente} | R$${v.valor.toFixed(2)}</li>`;
    });
}

document.addEventListener("DOMContentLoaded", atualizarTudo);

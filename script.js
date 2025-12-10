/**
 * NexStock - Sistema de Controle de Estoque Stickfran
 * Script Principal (Refatorado e Modularizado)
 * 
 * Este arquivo contém a lógica principal da aplicação,
 * dividida em módulos lógicos para melhor manutenção.
 */

// ============================================
// ESTADO GLOBAL DA APLICAÇÃO
// ============================================

// Variáveis de Controle
let chartPrincipal = null;
let chartPizza = null;
let dadosHistoricoGlobal = []; 
let estoqueSelecionadoAtual = 0; 

// ============================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ============================================

window.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    try {
        // Exibir data atual
        exibirDataAtual();

        // Preencher filtros
        preencherFiltroMeses();
        preencherFiltroAnos();

        // Carregar dados iniciais
        await carregarDadosIniciais();
        await carregarHistoricoMovimentacoes();

        // Configurar data padrão do formulário
        const campoData = document.getElementById('mov-data');
        if(campoData) campoData.value = DateUtils.getCurrentDateString();

        // Configurar listeners de eventos
        setupEventListeners();

        notify.success('Sistema carregado com sucesso!', 3000);
    } catch (error) {
        ErrorHandler.handle(error, 'initializeApp');
    }
}

function setupEventListeners() {
    // Formulário de Movimentação
    const formMov = document.getElementById('form-movimentacao');
    if (formMov) {
        formMov.addEventListener('submit', handleMovimentacaoSubmit);
    }

    // Formulário de Produto
    const formProd = document.getElementById('form-produto');
    if (formProd) {
        formProd.addEventListener('submit', handleProdutoSubmit);
    }
    
    // Listeners de mudança de filtro
    document.getElementById('filtro-mes').addEventListener('change', atualizarDashboard);
    document.getElementById('filtro-ano').addEventListener('change', atualizarDashboard);
    document.getElementById('filtro-produto-dash').addEventListener('change', atualizarDashboard);
    document.querySelector('.btn-refresh').addEventListener('click', atualizarDashboard);
    
    // Listeners de movimentação
    document.getElementById('mov-produto').addEventListener('change', atualizarPreviewSaldo);
    document.getElementById('opt-entrada').addEventListener('change', atualizarEstiloForm);
    document.getElementById('opt-saida').addEventListener('change', atualizarEstiloForm);
    
    // Listener de busca
    document.getElementById('busca-historico').addEventListener('keyup', filtrarHistorico);
}

// ============================================
// GERENCIAMENTO DE TELAS
// ============================================

function mostrarTela(telaId, elementoMenu) {
    // Ocultar todas as telas
    document.querySelectorAll('.screen').forEach(el => {
        el.classList.add('hidden');
    });

    // Remover classe ativa de todos os itens do menu
    document.querySelectorAll('.sidebar li').forEach(el => {
        el.classList.remove('active');
    });

    // Mostrar tela selecionada
    const tela = document.getElementById(telaId);
    if (tela) {
        tela.classList.remove('hidden');
    }

    // Marcar item do menu como ativo
    if (elementoMenu) {
        elementoMenu.classList.add('active');
    }

    // Atualizar título da página
    const titles = {
        dashboard: 'Dashboard Operacional',
        movimentacao: 'Movimentações de Estoque',
        produtos: 'Catálogo de Produtos'
    };
    DOMUtils.setText('page-title', titles[telaId] || 'Stickfran');

    // Atualizar dashboard se for a tela de dashboard
    if (telaId === 'dashboard') {
        atualizarDashboard();
    }
}

// ============================================
// GERENCIAMENTO DE DATA E FILTROS
// ============================================

function exibirDataAtual() {
    const opts = {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    };
    const dataStr = new Date().toLocaleDateString('pt-BR', opts);
    const dataFormatada = dataStr.charAt(0).toUpperCase() + dataStr.slice(1);
    DOMUtils.setText('data-atual', dataFormatada);
}

function preencherFiltroMeses() {
    const select = document.getElementById('filtro-mes');
    select.innerHTML = ""; 

    const optTodos = document.createElement('option');
    optTodos.value = "todos";
    optTodos.innerText = "Todo o Ano";
    select.appendChild(optTodos);

    const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    meses.forEach((m, i) => {
        const opt = document.createElement('option');
        opt.value = i + 1;
        opt.innerText = m;
        if (i + 1 === new Date().getMonth() + 1) {
            opt.selected = true;
        }
        select.appendChild(opt);
    });
}

function preencherFiltroAnos() {
    const select = document.getElementById('filtro-ano');
    const anoAtual = new Date().getFullYear();

    for (let i = anoAtual - 5; i <= anoAtual + 1; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.innerText = i;
        if (i === anoAtual) {
            opt.selected = true;
        }
        select.appendChild(opt);
    }
}

// ============================================
// CARREGAMENTO E RENDERIZAÇÃO DE DADOS
// ============================================

async function carregarDadosIniciais() {
    try {
        const { data: produtos, error } = await SupabaseService.getProdutos();

        if (error) throw error;

        preencherSelectProdutos(produtos || []);
        renderizarTabelaProdutos(produtos || []);
    } catch (error) {
        ErrorHandler.handle(error, 'carregarDadosIniciais');
    }
}

function preencherSelectProdutos(produtos) {
    const selects = [
        document.getElementById('mov-produto'),
        document.getElementById('filtro-produto-dash')
    ];

    selects.forEach(select => {
        if (!select) return;

        // Mantém a primeira opção (Selecione... ou Todos os Produtos)
        const firstChild = select.querySelector('option');
        select.innerHTML = '';

        if (firstChild) {
            select.appendChild(firstChild);
        }

        produtos.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.innerText = `${p.codigo || ''} - ${p.descricao}`;
            select.appendChild(opt);
        });
    });
}

function renderizarTabelaProdutos(produtos) {
    const tbody = document.getElementById('tabela-produtos');
    if (!tbody) return;

    tbody.innerHTML = '';

    produtos.forEach(p => {
        const critico = p.saldo_atual <= p.minimo;
        const statusText = critico ? 'CRÍTICO' : 'NORMAL';
        const statusColor = critico ? '#fee2e2' : '#dcfce7';
        const textColor = critico ? '#dc2626' : '#16a34a';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${p.codigo || '-'}</strong></td>
            <td>${p.descricao}</td>
            <td>${p.localizacao || '-'}</td>
            <td>${NumberUtils.formatNumber(p.saldo_atual)}</td>
            <td>
                <span style="
                    color: ${textColor};
                    font-weight: bold;
                    background: ${statusColor};
                    padding: 4px 8px;
                    border-radius: 10px;
                    font-size: 0.75rem;
                ">
                    ${statusText}
                </span>
            </td>
            <td>
                <button onclick="deletarProduto(${p.id})" class="btn-delete" title="Deletar">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ============================================
// DASHBOARD (COM FILTRAGEM DE DATA NO SERVIDOR)
// ============================================

async function atualizarDashboard() {
    try {
        const mesFiltro = DOMUtils.getValue('filtro-mes');
        const anoFiltro = DOMUtils.getValue('filtro-ano');
        const prodFiltro = DOMUtils.getValue('filtro-produto-dash');

        let startDate = null;
        let endDate = null;

        if (mesFiltro !== 'todos') {
            // Filtra por mês e ano
            const range = DateUtils.getDateRange(parseInt(mesFiltro), parseInt(anoFiltro));
            startDate = range.start;
            endDate = range.end;
        } else {
            // Filtra por ano inteiro
            startDate = `${anoFiltro}-01-01`;
            endDate = `${anoFiltro}-12-31`;
        }

        // 1. Buscar movimentações com filtro de data no Supabase (Correção de Performance)
        const { data: movimentacoes, error: movError } = await SupabaseService.getMovimentacoes({
            startDate: startDate,
            endDate: endDate,
            produto_id: prodFiltro !== 'todos' ? prodFiltro : null
        });

        if (movError) throw movError;

        // 2. Buscar produtos para estatísticas
        const { data: produtos, error: prodError } = await SupabaseService.getProdutos();

        if (prodError) throw prodError;

        // 3. Calcular KPIs
        let entradas = 0,
            saidas = 0;
        (movimentacoes || []).forEach(m => {
            if (m.tipo === 'ENTRADA') {
                entradas += m.quantidade;
            } else {
                saidas += m.quantidade;
            }
        });

        let saldoTotal = 0;
        let criticos = 0;

        if (prodFiltro === 'todos') {
            saldoTotal = (produtos || []).reduce((acc, p) => acc + (p.saldo_atual || 0), 0);
            criticos = (produtos || []).filter(p => p.saldo_atual <= p.minimo).length;
        } else {
            const produtoSelecionado = (produtos || []).find(p => p.id == prodFiltro);
            if (produtoSelecionado) {
                saldoTotal = produtoSelecionado.saldo_atual;
                if (produtoSelecionado.saldo_atual <= produtoSelecionado.minimo) {
                    criticos = 1;
                }
            }
        }

        // 4. Atualizar KPIs na interface
        DOMUtils.setText('kpi-entradas', NumberUtils.formatNumber(entradas));
        DOMUtils.setText('kpi-saidas', NumberUtils.formatNumber(saidas));
        DOMUtils.setText('kpi-saldo-total', NumberUtils.formatNumber(saldoTotal));
        DOMUtils.setText('kpi-criticos-dash', NumberUtils.formatNumber(criticos));

        // 5. Atualizar mensagem de alerta
        const alerta = document.getElementById('msg-alerta');
        if (alerta) {
            if (criticos > 0) {
                alerta.style.color = 'var(--danger)';
                const msg = prodFiltro === 'todos' ? `${NumberUtils.formatNumber(criticos)} Itens Críticos` : `Estoque Crítico`;
                alerta.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${msg}`;
            } else {
                alerta.style.color = 'var(--success)';
                const msg = prodFiltro === 'todos' ? `Tudo Normal` : `Estoque OK`;
                alerta.innerHTML = `<i class="fa-solid fa-check"></i> ${msg}`;
            }
        }

        // 6. Atualizar tabelas e gráficos
        atualizarTabelaRecenteDash(movimentacoes || []);
        atualizarTopProdutos(movimentacoes || [], produtos || []);
        gerarGraficoPrincipal(movimentacoes || [], mesFiltro, anoFiltro);
        gerarGraficoPizza(produtos || [], prodFiltro);
    } catch (error) {
        ErrorHandler.handle(error, 'atualizarDashboard');
    }
}

function atualizarTabelaRecenteDash(dados) {
    const tbody = document.getElementById('tabela-dash-recente');
    if (!tbody) return;

    tbody.innerHTML = '';

    const recentes = dados
        .sort((a, b) => DateUtils.lerDataSegura(b.data_movimentacao) - DateUtils.lerDataSegura(a.data_movimentacao))
        .slice(0, 8);

    recentes.forEach(m => {
        const tr = document.createElement('tr');
        const dataF = DateUtils.formatToBR(m.data_movimentacao);
        const cor = m.tipo === 'ENTRADA' ? 'var(--success)' : 'var(--danger)';
        const descricao = m.produtos?.descricao || '-';

        tr.innerHTML = `
            <td>${dataF}</td>
            <td>${descricao.substring(0, 20)}${descricao.length > 20 ? '...' : ''}</td>
            <td style="color: ${cor}; font-weight: bold;">${m.tipo.charAt(0)}</td>
            <td>${NumberUtils.formatNumber(m.quantidade)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function atualizarTopProdutos(movs, prods) {
    const contagem = {};

    movs.forEach(m => {
        if (!contagem[m.produto_id]) {
            contagem[m.produto_id] = 0;
        }
        contagem[m.produto_id] += m.quantidade;
    });

    const rank = Object.keys(contagem)
        .map(id => {
            const p = prods.find(x => x.id == id);
            return {
                nome: p ? p.descricao : 'Item Removido',
                qtd: contagem[id]
            };
        })
        .sort((a, b) => b.qtd - a.qtd)
        .slice(0, 5);

    const ul = document.getElementById('lista-top-produtos');
    if (!ul) return;

    ul.innerHTML = '';
    
    if (rank.length === 0) {
        ul.innerHTML = '<li style="text-align:center; padding:10px; color:#64748b;">Sem dados no período</li>';
        return;
    }

    const max = rank[0]?.qtd || 1;

    rank.forEach(item => {
        const pct = (item.qtd / max) * 100;
        const li = document.createElement('li');
        li.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <strong>${item.nome}</strong>
                <span style="color: #64748b; font-size: 0.8rem;">${NumberUtils.formatNumber(item.qtd)} mov</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${pct}%;"></div>
            </div>
        `;
        ul.appendChild(li);
    });
}

// ============================================
// GRÁFICOS
// ============================================

function gerarGraficoPrincipal(dados, mesFiltro, anoFiltro) {
    const agrupado = {};
    let labels = [];
    const nomesMeses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
    const tituloGrafico = document.querySelector('.main-chart-section h3');
    
    if(mesFiltro === 'todos') {
        tituloGrafico.innerHTML = `<i class="fa-solid fa-chart-column"></i> Evolução Mensal (${anoFiltro})`;
        
        nomesMeses.forEach(m => agrupado[m] = { ent: 0, sai: 0 });
        labels = nomesMeses;

        dados.forEach(d => {
            const dataObj = DateUtils.lerDataSegura(d.data_movimentacao);
            const nomeMes = nomesMeses[dataObj.getMonth()];
            if (d.tipo === 'ENTRADA') agrupado[nomeMes].ent += d.quantidade;
            else agrupado[nomeMes].sai += d.quantidade;
        });

    } else {
        const nomeMesSel = nomesMeses[parseInt(mesFiltro) - 1];
        tituloGrafico.innerHTML = `<i class="fa-solid fa-chart-column"></i> Fluxo Diário (${nomeMesSel}/${anoFiltro})`;

        dados.forEach(d => {
            const dataObj = DateUtils.lerDataSegura(d.data_movimentacao);
            const dataStr = dataObj.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'});
            
            if(!agrupado[dataStr]) agrupado[dataStr] = { ent: 0, sai: 0 };
            if (d.tipo === 'ENTRADA') agrupado[dataStr].ent += d.quantidade;
            else agrupado[dataStr].sai += d.quantidade;
        });
        labels = Object.keys(agrupado).sort((a, b) => {
            const [dA, mA] = a.split('/').map(Number);
            const [dB, mB] = b.split('/').map(Number);
            if (mA !== mB) return mA - mB;
            return dA - dB;
        });
    }

    const dataEnt = labels.map(l => agrupado[l].ent);
    const dataSai = labels.map(l => agrupado[l].sai);
    const dataLiq = labels.map(l => agrupado[l].ent - agrupado[l].sai);

    const ctx = document.getElementById('graficoPrincipal');
    if (!ctx) return;

    if (chartPrincipal) {
        chartPrincipal.destroy();
    }

    chartPrincipal = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Saldo Líquido',
                    data: dataLiq,
                    type: 'line',
                    borderColor: '#1c3949',
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 3,
                    fill: false
                },
                {
                    label: 'Entradas',
                    data: dataEnt,
                    backgroundColor: '#10b981',
                    borderRadius: 4,
                    order: 2
                },
                {
                    label: 'Saídas',
                    data: dataSai,
                    backgroundColor: '#ef4444',
                    borderRadius: 4,
                    order: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) label += NumberUtils.formatNumber(context.parsed.y);
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: { grid: { display: false } },
                y: {
                    grid: { color: '#f1f5f9' },
                    ticks: { callback: function(value) { return NumberUtils.formatNumber(value); } }
                }
            }
        }
    });
}

function gerarGraficoPizza(produtos, prodFiltro) {
    let criticos = 0, ok = 0;

    if (prodFiltro === 'todos') {
        criticos = produtos.filter(p => p.saldo_atual <= p.minimo).length;
        ok = produtos.length - criticos;
    } else {
        const p = produtos.find(p => p.id == prodFiltro);
        if (p) {
            if (p.saldo_atual <= p.minimo) { criticos = 1; ok = 0; }
            else { criticos = 0; ok = 1; }
        }
    }

    const ctx = document.getElementById('graficoPizza');
    if (!ctx) return;

    if(chartPizza) chartPizza.destroy();

    chartPizza = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Normal', 'Crítico'],
            datasets: [
                {
                    data: [ok, criticos],
                    backgroundColor: ['#1c3949', '#ef4444'],
                    borderWidth: 0
                }
            ]
        },
        options: {
            cutout: '75%',
            plugins: {
                legend: { position: 'bottom' },
                tooltip: { callbacks: { label: function(context) { return context.label + ': ' + NumberUtils.formatNumber(context.parsed); } } }
            }
        }
    });
}

// ============================================
// MOVIMENTAÇÕES
// ============================================

function atualizarEstiloForm() {
    const tipo = document.querySelector('input[name="tipo"]:checked').value;
    const btn = document.getElementById('btn-confirmar-mov');

    if (!btn) return;

    if (tipo === 'ENTRADA') {
        btn.className = 'btn-block btn-success';
        btn.innerHTML = '<i class="fa-solid fa-arrow-down"></i> Confirmar Entrada';
    } else {
        btn.className = 'btn-block btn-danger';
        btn.innerHTML = '<i class="fa-solid fa-arrow-up"></i> Confirmar Saída';
    }
}

async function atualizarPreviewSaldo() {
    const produtoId = DOMUtils.getValue('mov-produto');
    const badge = document.getElementById('saldo-preview');

    if (!produtoId || !badge) {
        if (badge) badge.classList.add('hidden');
        return;
    }

    try {
        const { data } = await SupabaseService.getProdutoById(produtoId);

        if (data) {
            estoqueSelecionadoAtual = data.saldo_atual;
            badge.innerHTML = `Disponível: <strong>${NumberUtils.formatNumber(data.saldo_atual)} ${data.unidade || ''}</strong>`;
            badge.classList.remove('hidden');
        }
    } catch (error) {
        ErrorHandler.handle(error, 'atualizarPreviewSaldo');
    }
}

async function handleMovimentacaoSubmit(e) {
    e.preventDefault();

    try {
        const tipo = document.querySelector('input[name="tipo"]:checked').value;
        const produtoId = DOMUtils.getValue('mov-produto');
        const qtd = parseInt(DOMUtils.getValue('mov-qtd'));
        const dataSelecionada = DOMUtils.getValue('mov-data');

        // Validações
        if (!produtoId) {
            throw new Error('Selecione um produto');
        }

        if (!ValidationUtils.isValidQuantity(qtd)) {
            throw new Error('Quantidade inválida');
        }

        if (!ValidationUtils.isValidDate(dataSelecionada)) {
            throw new Error('Data inválida');
        }

        // Desabilitar botão
        const btn = document.getElementById('btn-confirmar-mov');
        const txtOriginal = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processando...';
        btn.disabled = true;

        // Criar movimentação
        const { data, error } = await SupabaseService.createMovimentacao({
            tipo,
            produto_id: produtoId,
            quantidade: qtd,
            data_movimentacao: dataSelecionada
        });

        btn.innerHTML = txtOriginal;
        btn.disabled = false;

        if (error) throw error;

        // Sucesso
        notify.success('Movimentação registrada com sucesso!');
        e.target.reset();
        DOMUtils.setValue('mov-data', DateUtils.getCurrentDateString());
        DOMUtils.hide('saldo-preview');
        atualizarEstiloForm();
        await carregarDadosIniciais();
        await carregarHistoricoMovimentacoes();
    } catch (error) {
        ErrorHandler.handle(error, 'handleMovimentacaoSubmit');
    }
}

// ============================================
// HISTÓRICO E EXPORTAÇÃO
// ============================================

async function carregarHistoricoMovimentacoes() {
    try {
        const { data, error } = await SupabaseService.getMovimentacoes({
            limit: 200
        });

        if (error) throw error;

        dadosHistoricoGlobal = data || [];
        renderizarTabelaHistorico(dadosHistoricoGlobal);
    } catch (error) {
        ErrorHandler.handle(error, 'carregarHistoricoMovimentacoes');
    }
}

function renderizarTabelaHistorico(lista) {
    const tbody = document.getElementById('tabela-historico');
    if (!tbody) return;

    tbody.innerHTML = '';

    lista.forEach(m => {
        const tr = document.createElement('tr');
        const dataFormatada = DateUtils.formatToBR(m.data_movimentacao);
        const descricao = m.produtos?.descricao || '-';
        const cor = m.tipo === 'ENTRADA' ? 'var(--success)' : 'var(--danger)';

        tr.innerHTML = `
            <td>${dataFormatada}</td>
            <td>${descricao}</td>
            <td><span style="color: ${cor}; font-weight: bold;">${m.tipo}</span></td>
            <td>${NumberUtils.formatNumber(m.quantidade)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function filtrarHistorico() {
    const termo = DOMUtils.getValue('busca-historico').toLowerCase();
    const filtrados = dadosHistoricoGlobal.filter(m =>
        (m.produtos?.descricao || '').toLowerCase().includes(termo) ||
        m.tipo.toLowerCase().includes(termo)
    );
    renderizarTabelaHistorico(filtrados);
}

function exportarExcel() {
    if (!dadosHistoricoGlobal.length) {
        notify.warning('Sem dados para exportar');
        return;
    }

    try {
        const dados = dadosHistoricoGlobal.map(m => ({
            Data: DateUtils.formatToBR(m.data_movimentacao),
            Produto: m.produtos?.descricao || '-',
            Tipo: m.tipo,
            Quantidade: m.quantidade
        }));

        const ws = XLSX.utils.json_to_sheet(dados);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
        XLSX.writeFile(wb, 'Stickfran_Estoque.xlsx');

        notify.success('Arquivo Excel exportado com sucesso!');
    } catch (error) {
        ErrorHandler.handle(error, 'exportarExcel');
    }
}

function exportarPDF() {
    if (!dadosHistoricoGlobal.length) {
        notify.warning('Sem dados para exportar');
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.text('Relatório de Movimentações - Stickfran', 14, 20);

        const dados = dadosHistoricoGlobal.map(m => [
            DateUtils.formatToBR(m.data_movimentacao),
            m.produtos?.descricao || '-',
            m.tipo,
            NumberUtils.formatNumber(m.quantidade)
        ]);

        doc.autoTable({
            head: [['Data', 'Produto', 'Tipo', 'Qtd']],
            body: dados,
            startY: 30,
            headStyles: { fillColor: [28, 57, 73] }
        });

        doc.save('Stickfran_Relatorio.pdf');
        notify.success('Arquivo PDF exportado com sucesso!');
    } catch (error) {
        ErrorHandler.handle(error, 'exportarPDF');
    }
}

// ============================================
// CADASTRO DE PRODUTOS
// ============================================

async function handleProdutoSubmit(e) {
    e.preventDefault();

    try {
        const novo = {
            codigo: DOMUtils.getValue('prod-codigo'),
            descricao: DOMUtils.getValue('prod-desc'),
            unidade: DOMUtils.getValue('prod-un'),
            minimo: parseInt(DOMUtils.getValue('prod-min')) || 0,
            localizacao: DOMUtils.getValue('prod-local'),
            saldo_atual: 0
        };

        // Validações
        if (!novo.codigo || !novo.descricao) {
            throw new Error('Código e Descrição são obrigatórios');
        }

        const { data, error } = await SupabaseService.createProduto(novo);

        if (error) throw error;

        notify.success('Produto cadastrado com sucesso!');
        e.target.reset();
        await carregarDadosIniciais();
    } catch (error) {
        ErrorHandler.handle(error, 'handleProdutoSubmit');
    }
}

async function deletarProduto(id) {
    if (!confirm('Tem certeza que deseja deletar este produto? Todas as movimentações relacionadas serão removidas.')) {
        return;
    }

    try {
        const { error } = await SupabaseService.deleteProduto(id);

        if (error) throw error;

        notify.success('Produto deletado com sucesso!');
        await carregarDadosIniciais();
    } catch (error) {
        ErrorHandler.handle(error, 'deletarProduto');
    }
}

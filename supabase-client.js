/**
 * Cliente Supabase - Centralizado e com tratamento de erros
 * 
 * AVISO DE SEGURANÇA:
 * As credenciais do Supabase estão expostas neste arquivo.
 * Embora a chave seja "publishable", recomenda-se implementar um backend
 * para intermediar as chamadas ao banco de dados em um ambiente de produção.
 * Certifique-se de que o RLS (Row Level Security) está rigorosamente configurado
 * no Supabase para evitar acesso não autorizado.
 */

const SUPABASE_URL = 'https://ytjbgxpmalajyjesjeow.supabase.co';
const SUPABASE_KEY = 'sb_publishable_AVkKp7zfV-vdYAgd-T0BPw_wuuyhpMJ';

// Inicializar cliente Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Wrapper para operações do Supabase com tratamento de erros centralizado
 */
const SupabaseService = {
    /**
     * Buscar produtos com filtros opcionais
     */
    async getProdutos(filters = {}) {
        try {
            let query = supabase.from('produtos').select('*');

            if (filters.codigo) {
                query = query.ilike('codigo', `%${filters.codigo}%`);
            }

            const { data, error } = await query.order('descricao');

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            ErrorHandler.handle(error, 'getProdutos');
            return { data: null, error };
        }
    },

    /**
     * Buscar um produto específico por ID
     */
    async getProdutoById(id) {
        try {
            const { data, error } = await supabase
                .from('produtos')
                .select('saldo_atual, unidade')
                .eq('id', id)
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            ErrorHandler.handle(error, 'getProdutoById');
            return { data: null, error };
        }
    },

    /**
     * Criar novo produto
     */
    async createProduto(produto) {
        try {
            // Validação básica
            if (!produto.codigo || !produto.descricao) {
                throw new Error('Código e Descrição são obrigatórios');
            }

            const { data, error } = await supabase
                .from('produtos')
                .insert([produto])
                .select();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            ErrorHandler.handle(error, 'createProduto');
            return { data: null, error };
        }
    },

    /**
     * Deletar produto
     */
    async deleteProduto(id) {
        try {
            const { error } = await supabase
                .from('movimentacoes')
                .delete()
                .eq('produto_id', id);
            
            if (error) throw error;

            const { error: prodError } = await supabase
                .from('produtos')
                .delete()
                .eq('id', id);

            if (prodError) throw prodError;
            return { error: null };
        } catch (error) {
            ErrorHandler.handle(error, 'deleteProduto');
            return { error };
        }
    },

    /**
     * Buscar movimentações com filtros avançados
     * Implementa a correção de performance: filtra por data no servidor.
     */
    async getMovimentacoes(filters = {}) {
        try {
            let query = supabase
                .from('movimentacoes')
                .select('*, produtos(descricao, codigo, saldo_atual, minimo)');

            // Filtro por produto
            if (filters.produto_id) {
                query = query.eq('produto_id', filters.produto_id);
            }

            // Filtro por intervalo de datas (Correção de Performance)
            if (filters.startDate && filters.endDate) {
                query = query
                    .gte('data_movimentacao', filters.startDate)
                    .lte('data_movimentacao', filters.endDate);
            }

            // Ordenação
            const { data, error } = await query.order('data_movimentacao', {
                ascending: false
            }).limit(filters.limit || 200); // Aumenta o limite para histórico

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            ErrorHandler.handle(error, 'getMovimentacoes');
            return { data: null, error };
        }
    },

    /**
     * Criar nova movimentação (entrada ou saída)
     */
    async createMovimentacao(movimentacao) {
        try {
            // Validações
            if (!movimentacao.produto_id || !movimentacao.quantidade || !movimentacao.tipo) {
                throw new Error('Produto, Quantidade e Tipo são obrigatórios');
            }

            if (!['ENTRADA', 'SAIDA'].includes(movimentacao.tipo)) {
                throw new Error('Tipo deve ser ENTRADA ou SAIDA');
            }

            if (movimentacao.quantidade <= 0) {
                throw new Error('Quantidade deve ser maior que zero');
            }

            // Validação de saldo para saídas
            if (movimentacao.tipo === 'SAIDA') {
                const { data: produto } = await this.getProdutoById(movimentacao.produto_id);
                if (produto && movimentacao.quantidade > produto.saldo_atual) {
                    throw new Error(
                        `Saldo insuficiente! Disponível: ${produto.saldo_atual}`
                    );
                }
            }

            // Inserir movimentação
            const { data, error } = await supabase
                .from('movimentacoes')
                .insert([movimentacao])
                .select();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            ErrorHandler.handle(error, 'createMovimentacao');
            return { data: null, error };
        }
    }
};

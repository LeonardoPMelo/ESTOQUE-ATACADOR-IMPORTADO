/**
 * Cliente Supabase - Centralizado e Corrigido
 */

// Configurações do Projeto
const SUPABASE_URL = 'https://ytjbgxpmalajyjesjeow.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0amJneHBtYWxhanlqZXNqZW93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNzk3ODUsImV4cCI6MjA4MDg1NTc4NX0.uyhFyPDd5DBsy902-Qp9JR5iuWMDQRQznUBluxaYygU';

// Verificação de segurança no console para garantir que a lib carregou
if (!window.supabase) {
    console.error('ERRO CRÍTICO: A biblioteca do Supabase não foi carregada! Verifique se o script do CDN está no <head> do index.html.');
}

// Inicializar cliente Supabase
// Usamos uma variável local 'client' para evitar conflitos globais
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Wrapper para operações do Supabase
 * Usamos 'window.SupabaseService' para garantir que o script.js consiga enxergar 
 * este serviço globalmente, corrigindo o erro "is not defined".
 */
window.SupabaseService = {
    
    /**
     * Buscar produtos com filtros opcionais
     */
    async getProdutos(filters = {}) {
        try {
            let query = client.from('produtos').select('*');

            if (filters.codigo) {
                query = query.ilike('codigo', `%${filters.codigo}%`);
            }

            const { data, error } = await query.order('descricao');

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            tratarErro(error, 'getProdutos');
            return { data: null, error };
        }
    },

    /**
     * Buscar um produto específico por ID
     */
    async getProdutoById(id) {
        try {
            const { data, error } = await client
                .from('produtos')
                .select('saldo_atual, unidade')
                .eq('id', id)
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            tratarErro(error, 'getProdutoById');
            return { data: null, error };
        }
    },

    /**
     * Criar novo produto
     */
    async createProduto(produto) {
        try {
            if (!produto.codigo || !produto.descricao) {
                throw new Error('Código e Descrição são obrigatórios');
            }

            const { data, error } = await client
                .from('produtos')
                .insert([produto])
                .select();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            tratarErro(error, 'createProduto');
            return { data: null, error };
        }
    },

    /**
     * Deletar produto
     */
    async deleteProduto(id) {
        try {
            // Primeiro remove movimentações associadas (Integridade Referencial)
            const { error: movError } = await client
                .from('movimentacoes')
                .delete()
                .eq('produto_id', id);
            
            if (movError) throw movError;

            // Depois remove o produto
            const { error } = await client
                .from('produtos')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return { error: null };
        } catch (error) {
            tratarErro(error, 'deleteProduto');
            return { error };
        }
    },

    /**
     * Buscar movimentações com filtros avançados
     */
    async getMovimentacoes(filters = {}) {
        try {
            let query = client
                .from('movimentacoes')
                .select('*, produtos(descricao, codigo, saldo_atual, minimo)');

            // Filtro por produto
            if (filters.produto_id) {
                query = query.eq('produto_id', filters.produto_id);
            }

            // Filtro por intervalo de datas
            if (filters.startDate && filters.endDate) {
                query = query
                    .gte('data_movimentacao', filters.startDate)
                    .lte('data_movimentacao', filters.endDate);
            }

            // Ordenação
            const { data, error } = await query.order('data_movimentacao', {
                ascending: false
            }).limit(filters.limit || 200);

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            tratarErro(error, 'getMovimentacoes');
            return { data: null, error };
        }
    },

    /**
     * Criar nova movimentação
     */
    async createMovimentacao(movimentacao) {
        try {
            // Validações básicas
            if (!movimentacao.produto_id || !movimentacao.quantidade || !movimentacao.tipo) {
                throw new Error('Dados incompletos');
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

            const { data, error } = await client
                .from('movimentacoes')
                .insert([movimentacao])
                .select();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            tratarErro(error, 'createMovimentacao');
            return { data: null, error };
        }
    }
};

/**
 * Função auxiliar interna para evitar falha se o ErrorHandler não existir
 */
function tratarErro(error, contexto) {
    if (window.ErrorHandler) {
        window.ErrorHandler.handle(error, contexto);
    } else {
        console.error(`[${contexto}]`, error);
        alert(`Erro: ${error.message || error}`);
    }
}

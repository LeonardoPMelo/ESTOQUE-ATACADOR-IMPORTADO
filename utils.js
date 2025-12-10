/**
 * Utilitários e Funções Auxiliares
 */

// Formatação de Datas
const DateUtils = {
    // Função de Correção de Data (Resolve o "Invalid Date" de forma segura)
    lerDataSegura(dataString) {
        if (!dataString) return new Date();
        // Pega apenas a parte YYYY-MM-DD e adiciona meio-dia para evitar fuso horário
        const dataLimpa = dataString.split('T')[0]; 
        return new Date(dataLimpa + 'T12:00:00');
    },

    formatToBR(date) {
        if (typeof date === 'string') {
            date = this.lerDataSegura(date);
        }
        return date.toLocaleDateString('pt-BR');
    },

    formatToBRWithTime(date) {
        if (typeof date === 'string') {
            date = this.lerDataSegura(date);
        }
        return date.toLocaleDateString('pt-BR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    getCurrentDateString() {
        const today = new Date();
        return today.toISOString().split('T')[0];
    },

    getDateRange(month, year) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        return {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0]
        };
    }
};

// Validação de Entrada
const ValidationUtils = {
    isValidQuantity(qty) {
        const num = parseInt(qty);
        return !isNaN(num) && num > 0;
    },

    isValidDate(dateString) {
        const date = new Date(dateString);
        return !isNaN(date.getTime());
    },

    isEmpty(value) {
        return !value || value.trim() === '';
    }
};

// Manipulação de DOM
const DOMUtils = {
    show(elementId) {
        const el = document.getElementById(elementId);
        if (el) el.classList.remove('hidden');
    },

    hide(elementId) {
        const el = document.getElementById(elementId);
        if (el) el.classList.add('hidden');
    },

    toggle(elementId) {
        const el = document.getElementById(elementId);
        if (el) el.classList.toggle('hidden');
    },

    setText(elementId, text) {
        const el = document.getElementById(elementId);
        if (el) el.innerText = text;
    },

    setHTML(elementId, html) {
        const el = document.getElementById(elementId);
        if (el) el.innerHTML = html;
    },

    getValue(elementId) {
        const el = document.getElementById(elementId);
        return el ? el.value : '';
    },

    setValue(elementId, value) {
        const el = document.getElementById(elementId);
        if (el) el.value = value;
    },

    addClass(elementId, className) {
        const el = document.getElementById(elementId);
        if (el) el.classList.add(className);
    },

    removeClass(elementId, className) {
        const el = document.getElementById(elementId);
        if (el) el.classList.remove(className);
    },

    setDisabled(elementId, disabled = true) {
        const el = document.getElementById(elementId);
        if (el) el.disabled = disabled;
    }
};

// Formatação de Números
const NumberUtils = {
    formatNumber(value, decimals = 0) {
        if (value === undefined || value === null) return '0';
        return value.toLocaleString('pt-BR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }
};

// Tratamento de Erros
const ErrorHandler = {
    handle(error, context = '') {
        console.error(`[${context}] Erro:`, error);
        
        let message = 'Ocorreu um erro inesperado.';
        
        if (error.message) {
            message = error.message;
        } else if (typeof error === 'string') {
            message = error;
        }

        // Tratamento específico para erros do Supabase
        if (error.status === 401 || error.status === 403) {
            message = 'Acesso não autorizado. Verifique suas permissões.';
        } else if (error.status === 404) {
            message = 'Recurso não encontrado.';
        } else if (error.status >= 500) {
            message = 'Erro no servidor. Tente novamente mais tarde.';
        }

        notify.error(message);
        return message;
    }
};

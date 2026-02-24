const express = require('express');
const router = express.Router();
const axios = require('axios');

const { SUAP_BASE_URL } = process.env;

// Middleware para verificar token
const verificarToken = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.session?.accessToken;
    
    if (!token) {
        return res.status(401).json({ erro: 'Não autenticado' });
    }
    
    req.token = token;
    next();
};

// DADOS DO ALUNO (dados pessoais fixos)
router.get('/me', verificarToken, async (req, res) => {
    try {
        const headers = {
            Authorization: `Bearer ${req.token}`,
            Accept: 'application/json'
        };

        // Busca dados acadêmicos
        const alunoRes = await axios.get(
            `${SUAP_BASE_URL}/api/ensino/meus-dados-aluno/`,
            { headers }
        );

        // Busca dados pessoais (RH)
        let pessoalRes;
        try {
            pessoalRes = await axios.get(
                `${SUAP_BASE_URL}/api/rh/eu/`,
                { headers }
            );
        } catch (e) {
            pessoalRes = { data: {} };
        }

        // Mescla dados
        const alunoCompleto = {
            ...alunoRes.data,
            ...pessoalRes.data,
            foto: pessoalRes.data?.foto || alunoRes.data?.url_foto_75x100
        };

        res.json({ aluno: alunoCompleto });

    } catch (err) {
        console.error('Erro /me:', err.response?.data || err.message);
        res.status(500).json({ erro: 'Erro ao buscar dados do aluno' });
    }
});

// DADOS COMPLETOS POR ANO (dinâmico)
router.get('/dashboard/:ano?', verificarToken, async (req, res) => {
    try {
        const headers = {
            Authorization: `Bearer ${req.token}`,
            Accept: 'application/json'
        };

        // Busca períodos letivos para encontrar o mais recente
        const periodosRes = await axios.get(
            `${SUAP_BASE_URL}/api/ensino/meus-periodos-letivos/`,
            { headers }
        );

        const periodos = periodosRes.data?.results || [];
        
        // Determina o ano a usar
        let ano = parseInt(req.params.ano);
        if (!ano || isNaN(ano)) {
            // Se não especificou ano, usa o mais recente
            ano = Math.max(...periodos.map(p => p.ano_letivo), new Date().getFullYear());
        }

        // Encontra o período letivo mais recente do ano
        const periodosDoAno = periodos.filter(p => p.ano_letivo === ano);
        const periodoMaisRecente = periodosDoAno[periodosDoAno.length - 1] || { ano_letivo: ano, periodo_letivo: 1 };
        const periodo = periodoMaisRecente.periodo_letivo;

        // Busca dados em paralelo
        const [avaliacoesRes, boletimRes, turmasRes] = await Promise.all([
            axios.get(`${SUAP_BASE_URL}/api/ensino/minhas-proximas-avaliacoes/`, { headers })
                .catch(() => ({ data: { results: [] } })),
            axios.get(`${SUAP_BASE_URL}/api/ensino/meu-boletim/${ano}/${periodo}/`, { headers })
                .catch(() => ({ data: { results: [] } })),
            axios.get(`${SUAP_BASE_URL}/api/ensino/minhas-turmas-virtuais/${ano}/${periodo}/`, { headers })
                .catch(() => ({ data: { results: [] } }))
        ]);

        res.json({
            anoSelecionado: ano,
            periodoAtual: { ano, periodo },
            periodos: periodosRes.data,
            avaliacoes: avaliacoesRes.data,
            boletim: boletimRes.data,
            turmas: turmasRes.data
        });

    } catch (err) {
        console.error('Erro API:', err.response?.data || err.message);
        
        if (err.response?.status === 401) {
            return res.status(401).json({ erro: 'Token inválido ou expirado' });
        }
        
        res.status(500).json({ 
            erro: 'Erro ao buscar dados do SUAP',
            detalhe: err.message
        });
    }
});

// BOLETIM ANUAL (AMBOS OS SEMESTRES)
router.get('/boletim-anual/:ano', verificarToken, async (req, res) => {
    try {
        const { ano } = req.params;
        const headers = { Authorization: `Bearer ${req.token}`, Accept: 'application/json' };
        
        // Busca ambos os semestres
        const [semestre1, semestre2] = await Promise.all([
            axios.get(`${SUAP_BASE_URL}/api/ensino/meu-boletim/${ano}/1/`, { headers })
                .catch(() => ({ data: { results: [] } })),
            axios.get(`${SUAP_BASE_URL}/api/ensino/meu-boletim/${ano}/2/`, { headers })
                .catch(() => ({ data: { results: [] } }))
        ]);

        const disciplinas1 = semestre1.data?.results || [];
        const disciplinas2 = semestre2.data?.results || [];
        
        // Cria mapa de disciplinas
        const disciplinasMap = new Map();
        
        // Processa 1º semestre
        disciplinas1.forEach(d => {
            const codigo = d.codigo_diario;
            const key = d.disciplina; // Usa nome da disciplina como chave para agrupar
            
            if (!disciplinasMap.has(key)) {
                disciplinasMap.set(key, {
                    codigo_diario: d.codigo_diario,
                    disciplina: d.disciplina,
                    carga_horaria: d.carga_horaria,
                    numero_faltas: parseInt(d.numero_faltas) || 0,
                    percentual_carga_horaria_frequentada: d.percentual_carga_horaria_frequentada || 0,
                    situacao: d.situacao,
                    media_final_disciplina: d.media_final_disciplina,
                    nota_etapa_1: d.nota_etapa_1,
                    nota_etapa_2: d.nota_etapa_2,
                    nota_etapa_3: { nota: null, faltas: 0 },
                    nota_etapa_4: { nota: null, faltas: 0 },
                    segundo_semestre: false
                });
            }
        });
        
        // Processa 2º semestre (mescla)
        disciplinas2.forEach(d => {
            const key = d.disciplina;
            
            if (disciplinasMap.has(key)) {
                // Atualiza disciplina existente
                const existente = disciplinasMap.get(key);
                existente.nota_etapa_3 = d.nota_etapa_1 || { nota: null, faltas: 0 };
                existente.nota_etapa_4 = d.nota_etapa_2 || { nota: null, faltas: 0 };
                existente.numero_faltas += parseInt(d.numero_faltas) || 0;
                existente.segundo_semestre = true;
                
                // Atualiza média e situação se tiver
                if (d.media_final_disciplina) {
                    existente.media_final_disciplina = d.media_final_disciplina;
                    existente.situacao = d.situacao;
                }
            } else {
                // Disciplina só do 2º semestre
                disciplinasMap.set(key, {
                    codigo_diario: d.codigo_diario,
                    disciplina: d.disciplina,
                    carga_horaria: d.carga_horaria,
                    numero_faltas: parseInt(d.numero_faltas) || 0,
                    percentual_carga_horaria_frequentada: d.percentual_carga_horaria_frequentada || 0,
                    situacao: d.situacao,
                    media_final_disciplina: d.media_final_disciplina,
                    nota_etapa_1: { nota: null, faltas: 0 },
                    nota_etapa_2: { nota: null, faltas: 0 },
                    nota_etapa_3: d.nota_etapa_1 || { nota: null, faltas: 0 },
                    nota_etapa_4: d.nota_etapa_2 || { nota: null, faltas: 0 },
                    segundo_semestre: true
                });
            }
        });

        res.json({
            ano,
            disciplinas: Array.from(disciplinasMap.values()),
            total_disciplinas: disciplinasMap.size
        });

    } catch (err) {
        console.error('Erro boletim anual:', err);
        res.status(500).json({ erro: 'Erro ao buscar boletim anual' });
    }
});

module.exports = router;
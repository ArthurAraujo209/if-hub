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

    //// ===== ADICIONADO =====
    const cacheKey = `me_${req.token}`;
    const cached = req.cache.get(cacheKey);
    if (cached) {
        return res.json(cached);
    }
    //// =====================

    try {
        const headers = {
            Authorization: `Bearer ${req.token}`,
            Accept: 'application/json'
        };

        const alunoRes = await axios.get(
            `${SUAP_BASE_URL}/api/ensino/meus-dados-aluno/`,
            { headers }
        );

        let pessoalRes;
        try {
            pessoalRes = await axios.get(
                `${SUAP_BASE_URL}/api/rh/eu/`,
                { headers }
            );
        } catch (e) {
            pessoalRes = { data: {} };
        }

        const alunoCompleto = {
            ...alunoRes.data,
            ...pessoalRes.data,
            foto: pessoalRes.data?.foto || alunoRes.data?.url_foto_75x100
        };

        const response = { aluno: alunoCompleto };

        //// ===== ADICIONADO =====
        req.cache.set(cacheKey, response);
        //// =====================

        res.json(response);

    } catch (err) {
        console.error('Erro /me:', err.response?.data || err.message);
        res.status(500).json({ erro: 'Erro ao buscar dados do aluno' });
    }
});

// DADOS COMPLETOS POR ANO
router.get('/dashboard/:ano?', verificarToken, async (req, res) => {

    //// ===== ADICIONADO =====
    const cacheKey = `dashboard_${req.token}_${req.params.ano || 'auto'}`;
    const cached = req.cache.get(cacheKey);
    if (cached) {
        return res.json(cached);
    }
    //// =====================

    try {
        const headers = {
            Authorization: `Bearer ${req.token}`,
            Accept: 'application/json'
        };

        const periodosRes = await axios.get(
            `${SUAP_BASE_URL}/api/ensino/meus-periodos-letivos/`,
            { headers }
        );

        const periodos = periodosRes.data?.results || [];

        let ano = parseInt(req.params.ano);
        if (!ano || isNaN(ano)) {
            ano = Math.max(...periodos.map(p => p.ano_letivo), new Date().getFullYear());
        }

        const periodosDoAno = periodos.filter(p => p.ano_letivo === ano);
        const periodoMaisRecente = periodosDoAno[periodosDoAno.length - 1] || { ano_letivo: ano, periodo_letivo: 1 };
        const periodo = periodoMaisRecente.periodo_letivo;

        const [avaliacoesRes, boletimRes, turmasRes] = await Promise.all([
            axios.get(`${SUAP_BASE_URL}/api/ensino/minhas-proximas-avaliacoes/`, { headers })
                .catch(() => ({ data: { results: [] } })),
            axios.get(`${SUAP_BASE_URL}/api/ensino/meu-boletim/${ano}/${periodo}/`, { headers })
                .catch(() => ({ data: { results: [] } })),
            axios.get(`${SUAP_BASE_URL}/api/ensino/minhas-turmas-virtuais/${ano}/${periodo}/`, { headers })
                .catch(() => ({ data: { results: [] } }))
        ]);

        const response = {
            anoSelecionado: ano,
            periodoAtual: { ano, periodo },
            periodos: periodosRes.data,
            avaliacoes: avaliacoesRes.data,
            boletim: boletimRes.data,
            turmas: turmasRes.data
        };

        //// ===== ADICIONADO =====
        req.cache.set(cacheKey, response);
        //// =====================

        res.json(response);

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

// BOLETIM ANUAL
router.get('/boletim-anual/:ano', verificarToken, async (req, res) => {

    //// ===== ADICIONADO =====
    const cacheKey = `boletim_${req.token}_${req.params.ano}`;
    const cached = req.cache.get(cacheKey);
    if (cached) {
        return res.json(cached);
    }
    //// =====================

    try {
        const { ano } = req.params;
        const headers = { Authorization: `Bearer ${req.token}`, Accept: 'application/json' };
        
        const [semestre1, semestre2] = await Promise.all([
            axios.get(`${SUAP_BASE_URL}/api/ensino/meu-boletim/${ano}/1/`, { headers })
                .catch(() => ({ data: { results: [] } })),
            axios.get(`${SUAP_BASE_URL}/api/ensino/meu-boletim/${ano}/2/`, { headers })
                .catch(() => ({ data: { results: [] } }))
        ]);

        const disciplinas1 = semestre1.data?.results || [];
        const disciplinas2 = semestre2.data?.results || [];
        
        const disciplinasMap = new Map();
        
        disciplinas1.forEach(d => {
            const key = d.disciplina;
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

        disciplinas2.forEach(d => {
            const key = d.disciplina;
            
            if (disciplinasMap.has(key)) {
                const existente = disciplinasMap.get(key);
                existente.nota_etapa_3 = d.nota_etapa_1 || { nota: null, faltas: 0 };
                existente.nota_etapa_4 = d.nota_etapa_2 || { nota: null, faltas: 0 };
                existente.numero_faltas += parseInt(d.numero_faltas) || 0;
                existente.segundo_semestre = true;

                if (d.media_final_disciplina) {
                    existente.media_final_disciplina = d.media_final_disciplina;
                    existente.situacao = d.situacao;
                }
            } else {
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

        const response = {
            ano,
            disciplinas: Array.from(disciplinasMap.values()),
            total_disciplinas: disciplinasMap.size
        };

        //// ===== ADICIONADO =====
        req.cache.set(cacheKey, response);
        //// =====================

        res.json(response);

    } catch (err) {
        console.error('Erro boletim anual:', err);
        res.status(500).json({ erro: 'Erro ao buscar boletim anual' });
    }
});

module.exports = router;
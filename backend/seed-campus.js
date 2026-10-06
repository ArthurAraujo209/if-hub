// ============================================================
// SCRIPT: Inicializar campus no Firestore
// EXECUÇÃO: node seed-campus.js
// ============================================================

require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
});

const db = admin.firestore();

// ✅ Features liberadas por padrão para campus novos.
//    Sem isso, o frontend escondia TODAS as abas em campus recém-criados.
const DEFAULT_FEATURES = ['dashboard', 'horarios', 'notas', 'avaliacoes', 'mapa'];

const CAMPUS = {
  'santa-cruz':    { nome: 'Campus Santa Cruz',    sigla: 'SC',  endereco: 'Santa Cruz, RN',          descricao: 'Campus Santa Cruz do IFRN' },
  'zona-norte':    { nome: 'Campus Zona Norte',    sigla: 'ZN',  endereco: 'Zona Norte - Natal, RN',  descricao: 'Campus Zona Norte do IFRN' },
  'natal-central': { nome: 'Campus Natal Central', sigla: 'NC',  endereco: 'Natal Central, RN',       descricao: 'Campus Natal Central do IFRN' },
  'mossoro':       { nome: 'Campus Mossoró',       sigla: 'MO',  endereco: 'Mossoró, RN',             descricao: 'Campus Mossoró do IFRN' },
  'apodi':         { nome: 'Campus Apodi',         sigla: 'AP',  endereco: 'Apodi, RN',               descricao: 'Campus Apodi do IFRN' },
  'caico':         { nome: 'Campus Caicó',         sigla: 'CA',  endereco: 'Caicó, RN',               descricao: 'Campus Caicó do IFRN' },
  'ipanguacu':     { nome: 'Campus Ipanguaçu',     sigla: 'IP',  endereco: 'Ipanguaçu, RN',           descricao: 'Campus Ipanguaçu do IFRN' },
  'joao-camara':   { nome: 'Campus João Câmara',   sigla: 'JC',  endereco: 'João Câmara, RN',         descricao: 'Campus João Câmara do IFRN' },
  'macau':         { nome: 'Campus Macau',         sigla: 'MC',  endereco: 'Macau, RN',               descricao: 'Campus Macau do IFRN' },
  'nova-cruz':     { nome: 'Campus Nova Cruz',     sigla: 'NC2', endereco: 'Nova Cruz, RN',           descricao: 'Campus Nova Cruz do IFRN' },
  'parelhas':      { nome: 'Campus Parelhas',      sigla: 'PR',  endereco: 'Parelhas, RN',            descricao: 'Campus Parelhas do IFRN' },
  'pau-dos-ferros':{ nome: 'Campus Pau dos Ferros',sigla: 'PF',  endereco: 'Pau dos Ferros, RN',      descricao: 'Campus Pau dos Ferros do IFRN' },
};

async function seedCampus() {
  console.log('═════════════════════════════════════════');
  console.log('🌱 SEED: Inicializando campus no Firestore');
  console.log('═════════════════════════════════════════\n');

  try {
    let criados = 0;
    let atualizados = 0;

    for (const [key, data] of Object.entries(CAMPUS)) {
      try {
        const ref = db.collection('campus').doc(key);
        const snap = await ref.get();

        if (snap.exists) {
          const existente = snap.data();
          // Preserva `features` e `ativo` existentes; só adiciona se faltando.
          const update = {
            nome: data.nome,
            sigla: data.sigla,
            endereco: data.endereco,
            descricao: data.descricao,
            atualizado_em: admin.firestore.FieldValue.serverTimestamp(),
          };
          if (!Array.isArray(existente.features)) update.features = DEFAULT_FEATURES;
          if (typeof existente.ativo !== 'boolean') update.ativo = true;

          await ref.update(update);
          console.log(`🔄 Atualizado: ${data.nome}`);
          atualizados++;
        } else {
          await ref.set({
            id: key,
            ...data,
            ativo: true,
            features: DEFAULT_FEATURES,
            config: {},
            criado_em: admin.firestore.FieldValue.serverTimestamp(),
            atualizado_em: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log(`✅ Criado: ${data.nome}`);
          criados++;
        }
      } catch (err) {
        console.error(`❌ Erro em ${data.nome}:`, err.message);
      }
    }

    console.log('\n═════════════════════════════════════════');
    console.log('✅ SEED CONCLUÍDO');
    console.log(`   Criados: ${criados}`);
    console.log(`   Atualizados: ${atualizados}`);
    console.log(`   Total: ${criados + atualizados}\n`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro fatal:', err);
    process.exit(1);
  }
}

seedCampus();
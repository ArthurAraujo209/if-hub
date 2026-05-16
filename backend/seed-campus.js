// ============================================================
// SCRIPT: Inicializar campus no Firestore
// EXECUÇÃO: node seed-campus.js
// ============================================================

require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

// Inicializar Firebase Admin
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
});

const db = admin.firestore();

// Campus do IFRN com suas informações
const CAMPUS = {
  'santa-cruz': {
    id: 'santa-cruz',
    nome: 'Campus Santa Cruz',
    sigla: 'SC',
    endereco: 'Santa Cruz, RN',
    descricao: 'Campus Santa Cruz do IFRN',
  },
  'zona-norte': {
    id: 'zona-norte',
    nome: 'Campus Zona Norte',
    sigla: 'ZN',
    endereco: 'Zona Norte - Natal, RN',
    descricao: 'Campus Zona Norte do IFRN',
  },
  'natal-central': {
    id: 'natal-central',
    nome: 'Campus Natal Central',
    sigla: 'NC',
    endereco: 'Natal Central, RN',
    descricao: 'Campus Natal Central do IFRN',
  },
  'mossoro': {
    id: 'mossoro',
    nome: 'Campus Mossoró',
    sigla: 'MO',
    endereco: 'Mossoró, RN',
    descricao: 'Campus Mossoró do IFRN',
  },
  'apodi': {
    id: 'apodi',
    nome: 'Campus Apodi',
    sigla: 'AP',
    endereco: 'Apodi, RN',
    descricao: 'Campus Apodi do IFRN',
  },
  'caico': {
    id: 'caico',
    nome: 'Campus Caicó',
    sigla: 'CA',
    endereco: 'Caicó, RN',
    descricao: 'Campus Caicó do IFRN',
  },
  'ipanguacu': {
    id: 'ipanguacu',
    nome: 'Campus Ipanguaçu',
    sigla: 'IP',
    endereco: 'Ipanguaçu, RN',
    descricao: 'Campus Ipanguaçu do IFRN',
  },
  'joao-camara': {
    id: 'joao-camara',
    nome: 'Campus João Câmara',
    sigla: 'JC',
    endereco: 'João Câmara, RN',
    descricao: 'Campus João Câmara do IFRN',
  },
  'macau': {
    id: 'macau',
    nome: 'Campus Macau',
    sigla: 'MC',
    endereco: 'Macau, RN',
    descricao: 'Campus Macau do IFRN',
  },
  'nova-cruz': {
    id: 'nova-cruz',
    nome: 'Campus Nova Cruz',
    sigla: 'NC2',
    endereco: 'Nova Cruz, RN',
    descricao: 'Campus Nova Cruz do IFRN',
  },
  'parelhas': {
    id: 'parelhas',
    nome: 'Campus Parelhas',
    sigla: 'PR',
    endereco: 'Parelhas, RN',
    descricao: 'Campus Parelhas do IFRN',
  },
  'pau-dos-ferros': {
    id: 'pau-dos-ferros',
    nome: 'Campus Pau dos Ferros',
    sigla: 'PF',
    endereco: 'Pau dos Ferros, RN',
    descricao: 'Campus Pau dos Ferros do IFRN',
  },
};

async function seedCampus() {
  console.log('═════════════════════════════════════════');
  console.log('🌱 SEED: Inicializando campus no Firestore');
  console.log('═════════════════════════════════════════\n');

  try {
    let criados = 0;
    let atualizados = 0;

    for (const [key, campusData] of Object.entries(CAMPUS)) {
      try {
        const campusRef = db.collection('campus').doc(key);
        const snap = await campusRef.get();

        if (snap.exists) {
          console.log(`🔄 Atualizando: ${campusData.nome}`);
          await campusRef.update({
            ...campusData,
            atualizado_em: admin.firestore.FieldValue.serverTimestamp(),
          });
          atualizados++;
        } else {
          console.log(`✅ Criando: ${campusData.nome}`);
          await campusRef.set({
            ...campusData,
            criado_em: admin.firestore.FieldValue.serverTimestamp(),
            atualizado_em: admin.firestore.FieldValue.serverTimestamp(),
          });
          criados++;
        }
      } catch (err) {
        console.error(`❌ Erro ao processar ${campusData.nome}:`, err.message);
      }
    }

    console.log('\n═════════════════════════════════════════');
    console.log('✅ SEED CONCLUÍDO');
    console.log('═════════════════════════════════════════');
    console.log(`📊 Resultados:`);
    console.log(`   Criados: ${criados}`);
    console.log(`   Atualizados: ${atualizados}`);
    console.log(`   Total: ${criados + atualizados}\n`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Erro fatal no seed:', err.message);
    console.error('   Stack:', err.stack);
    process.exit(1);
  }
}

seedCampus();

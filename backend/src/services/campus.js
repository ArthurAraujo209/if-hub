function identificarCampus(dadosSuap) {
  const campusRaw =
    dadosSuap?.campus ||
    dadosSuap?.unidade_ensino ||
    dadosSuap?.campus_sigla ||
    '';

  let campusExtraido = campusRaw;
  if (!campusExtraido && dadosSuap?.curso) {
    const match = dadosSuap.curso.match(/\(CAMPUS ([^)]+)\)/i);
    if (match) {
      campusExtraido = match[1];
    }
  }

  const mapeamento = {
    ap: 'apodi',
    sc: 'santa-cruz',
    ca: 'caico',
    cang: 'canguaretama',
    ch: 'natal-centro-historico',
    cm: 'ceara-mirim',
    cn: 'currais-novos',
    cnat: 'natal-central',
    ip: 'ipanguacu',
    jc: 'joao-camara',
    juc: 'jucurutu',
    laj: 'lajes',
    mc: 'macau',
    mo: 'mossoro',
    nc: 'nova-cruz',
    paas: 'parelhas',
    par: 'parnamirim',
    pf: 'pau-dos-ferros',
    sga: 'sao-goncalo-do-amarante',
    sm: 'sao-miguel',
    spp: 'sao-paulo-do-potengi',
    tou: 'touros',
    umz: 'umarizal',
    zl: 'natal-zona-leste',
    zn: 'zona-norte',
    'santa cruz': 'santa-cruz',
    'zona norte': 'zona-norte',
    'natal central': 'natal-central',
    'natal - central': 'natal-central',
    'natal - centro histórico': 'natal-centro-historico',
    'ceará-mirim': 'ceara-mirim',
    'currais novos': 'currais-novos',
    'mossoró': 'mossoro',
    mossoro: 'mossoro',
    apodi: 'apodi',
    caicó: 'caico',
    caico: 'caico',
    ipanguaçu: 'ipanguacu',
    ipanguacu: 'ipanguacu',
    'joão câmara': 'joao-camara',
    'joao camara': 'joao-camara',
    canguaretama: 'canguaretama',
    jucurutu: 'jucurutu',
    lajes: 'lajes',
    macau: 'macau',
    'nova cruz': 'nova-cruz',
    parelhas: 'parelhas',
    parnamirim: 'parnamirim',
    'pau dos ferros': 'pau-dos-ferros',
    'são gonçalo do amarante': 'sao-goncalo-do-amarante',
    'sao goncalo do amarante': 'sao-goncalo-do-amarante',
    'são miguel': 'sao-miguel',
    'sao miguel': 'sao-miguel',
    'são paulo do potengi': 'sao-paulo-do-potengi',
    'sao paulo do potengi': 'sao-paulo-do-potengi',
    touros: 'touros',
    umarizal: 'umarizal',
    'zona leste': 'natal-zona-leste',
  };

  const chave = String(campusExtraido)
    .toLowerCase()
    .replace('campus ', '')
    .trim();
  const campusId = mapeamento[chave];

  if (!campusId) {
    console.warn(`⚠️ Campus não mapeado: "${campusExtraido}" (chave: "${chave}")`);
  }

  return campusId || 'desconhecido';
}

module.exports = { identificarCampus };

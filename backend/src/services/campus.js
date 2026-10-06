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
    'santa cruz': 'santa-cruz',
    'zona norte': 'zona-norte',
    'natal central': 'natal-central',
    'mossoró': 'mossoro',
    mossoro: 'mossoro',
    apodi: 'apodi',
    caicó: 'caico',
    caico: 'caico',
    ipanguaçu: 'ipanguacu',
    ipanguacu: 'ipanguacu',
    'joão câmara': 'joao-camara',
    'joao camara': 'joao-camara',
    macau: 'macau',
    'nova cruz': 'nova-cruz',
    parelhas: 'parelhas',
    'pau dos ferros': 'pau-dos-ferros',
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

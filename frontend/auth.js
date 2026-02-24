async function carregarDados() {
  try {
    const res = await fetch("http://localhost:3000/api/aluno");
    const data = await res.json();

    if (data.erro) {
      document.getElementById("status").innerText = "Você não está logado";
      return;
    }

    document.getElementById("status").innerText = "Logado no SUAP";

    const aluno = data.aluno;

    document.getElementById("curso").innerText = aluno.curso;
    document.getElementById("ira").innerText = aluno.ira;
    document.getElementById("situacao").innerText = aluno.situacao;
    document.getElementById("email").innerText = aluno.email_academico;
    document.getElementById("ingresso").innerText = aluno.ingresso;

    document.getElementById("periodos").innerText = JSON.stringify(data.periodos, null, 2);
    document.getElementById("avaliacoes").innerText = JSON.stringify(data.avaliacoes, null, 2);

  } catch (err) {
    console.error(err);
    document.getElementById("status").innerText = "Erro ao carregar dados do SUAP";
  }
}

carregarDados();
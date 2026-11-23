"""Back-end Flask do Trabalho N2 – classificação de espécies de pinguins com Naive Bayes.

Fluxo: o usuário preenche o formulário -> clica em "Prever" -> esta aplicação recebe os
dados, monta um DataFrame com as colunas na ordem usada no treinamento, aplica o
GaussianNB salvo em modelo/modelo_pinguins.joblib e devolve a espécie prevista junto com
a probabilidade de cada classe.

Rodar:  python app/app.py   ->   http://127.0.0.1:5000
"""

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from flask import Flask, jsonify, render_template, request

RAIZ = Path(__file__).resolve().parent.parent
CAMINHO_MODELO = RAIZ / "modelo" / "modelo_pinguins.joblib"

# Campos do formulário: mesmas variáveis (e mesma ordem) do treinamento.
# As faixas são os valores mínimo e máximo observados na base Palmer Penguins (após limpeza).
CAMPOS = [
    {"nome": "comprimento_bico_mm", "rotulo": "Comprimento do bico", "unidade": "mm",
     "min": 32.1, "max": 59.6, "passo": 0.1,
     "dica": "Da base do bico até a ponta."},
    {"nome": "profundidade_bico_mm", "rotulo": "Profundidade do bico", "unidade": "mm",
     "min": 13.1, "max": 21.5, "passo": 0.1,
     "dica": "Altura do bico, medida de cima a baixo."},
    {"nome": "comprimento_nadadeira_mm", "rotulo": "Comprimento da nadadeira", "unidade": "mm",
     "min": 172.0, "max": 231.0, "passo": 1,
     "dica": "Comprimento da asa (nadadeira)."},
]

# Médias por espécie (seção 8.2 do notebook) – usadas nos botões de exemplo.
EXEMPLOS = {
    "Adélia":   {"comprimento_bico_mm": 38.8, "profundidade_bico_mm": 18.3, "comprimento_nadadeira_mm": 190},
    "Barbicha": {"comprimento_bico_mm": 48.8, "profundidade_bico_mm": 18.4, "comprimento_nadadeira_mm": 196},
    "Gentoo":   {"comprimento_bico_mm": 47.6, "profundidade_bico_mm": 15.0, "comprimento_nadadeira_mm": 217},
}

ESPECIES = {
    "Adélia": {"cor": "#E67E22", "cientifico": "Pygoscelis adeliae",
               "descricao": "Bico curto e robusto. É a espécie mais numerosa da base e aparece nas três ilhas."},
    "Barbicha": {"cor": "#8E44AD", "cientifico": "Pygoscelis antarcticus",
                 "descricao": "Bico longo e alto; o nome vem da faixa preta sob o queixo, como uma barbicha."},
    "Gentoo": {"cor": "#16A085", "cientifico": "Pygoscelis papua",
               "descricao": "O maior dos três: bico longo e fino e nadadeiras bem compridas."},
}

app = Flask(__name__)
app.json.ensure_ascii = False

# O modelo é carregado uma única vez, quando o servidor inicia.
modelo = joblib.load(CAMINHO_MODELO)
COLUNAS = list(modelo.feature_names_in_)
assert COLUNAS == [c["nome"] for c in CAMPOS], "Os campos do formulário não batem com as colunas do modelo."

# Parâmetros aprendidos pelo GaussianNB: P(C) e, para cada classe e medida, a média e o desvio padrão
# da normal P(x_i | C). O front-end usa isso apenas para DESENHAR as curvas – a previsão é feita aqui.
PARAMETROS = {
    "classes": [str(c) for c in modelo.classes_],
    "atributos": COLUNAS,
    "priori": modelo.class_prior_.round(4).tolist(),
    "media": modelo.theta_.round(4).tolist(),
    "desvio": np.sqrt(modelo.var_).round(4).tolist(),
}


def pagina(valores=None, resultado=None, erros=None, status=200):
    return render_template("index.html", campos=CAMPOS, exemplos=EXEMPLOS, especies=ESPECIES,
                           parametros=PARAMETROS, valores=valores or {}, resultado=resultado,
                           erros=erros or {}), status


def ler_entrada(dados):
    """Converte e valida os valores recebidos. Devolve (valores, erros)."""
    valores, erros = {}, {}
    for campo in CAMPOS:
        bruto = str(dados.get(campo["nome"], "")).strip().replace(",", ".")
        if not bruto:
            erros[campo["nome"]] = "Campo obrigatório."
            continue
        try:
            valor = float(bruto)
        except ValueError:
            erros[campo["nome"]] = "Digite um número."
            continue
        if valor <= 0:
            erros[campo["nome"]] = "O valor deve ser positivo."
            continue
        valores[campo["nome"]] = valor
    return valores, erros


def prever(valores):
    """Aplica o Naive Bayes e monta a resposta para o usuário."""
    entrada = pd.DataFrame([valores])[COLUNAS]
    especie = modelo.predict(entrada)[0]
    probabilidades = modelo.predict_proba(entrada)[0]

    fora_da_faixa = [c["rotulo"] for c in CAMPOS
                     if not c["min"] <= valores[c["nome"]] <= c["max"]]

    return {
        "especie": especie,
        **ESPECIES[especie],
        "probabilidade": float(probabilidades[list(modelo.classes_).index(especie)]),
        "probabilidades": sorted(
            ({"classe": classe, "valor": float(p), "cor": ESPECIES[classe]["cor"]}
             for classe, p in zip(modelo.classes_, probabilidades)),
            key=lambda item: item["valor"], reverse=True),
        "fora_da_faixa": fora_da_faixa,
        "entrada": valores,
    }


@app.get("/")
def index():
    return pagina()


@app.post("/prever")
def rota_prever():
    quer_json = request.is_json or request.accept_mimetypes.best == "application/json"
    if request.is_json:
        dados = request.get_json(silent=True) or {}
    else:
        dados = request.form
    valores, erros = ler_entrada(dados)

    if quer_json:
        if erros:
            return jsonify({"erros": erros}), 400
        return jsonify(prever(valores))

    # Sem JavaScript: o formulário é enviado normalmente e a página é renderizada com o resultado.
    resultado = None if erros else prever(valores)
    return pagina(dados, resultado, erros, 400 if erros else 200)


if __name__ == "__main__":
    app.run(debug=True)

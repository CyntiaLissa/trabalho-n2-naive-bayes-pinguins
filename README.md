# Classificação de Espécies de Pinguins com Naive Bayes

Trabalho N2 – Probabilidade e Estatística (IFCE, Engenharia da Computação) – Prof. Valberto Feitosa.

Solução completa de Machine Learning: análise da base **Palmer Penguins**, treinamento de um
**Naive Bayes Gaussiano** (scikit-learn), salvamento do modelo com `joblib` e uma aplicação web
(Flask + HTML/CSS/JS) com formulário e botão **Prever**.

## Estrutura

```
notebooks/analise_e_treinamento.ipynb   # EDA, seleção de features, treino, avaliação, salvamento
modelo/                                 # modelo_pinguins.joblib (gerado pelo notebook)
app/                                    # back-end Flask (app.py), templates/ (HTML) e static/ (CSS/JS)
docs/enunciado.pdf                      # enunciado do trabalho
requirements.txt
```

## Base de dados

- **Origem:** Palmer Penguins (Horst, Hill & Gorman, 2020) – CSV do repositório `mwaskom/seaborn-data`.
- **Alvo:** `especie` – Adélia, Barbicha (Chinstrap), Gentoo.
- **Features usadas:** `comprimento_bico_mm`, `profundidade_bico_mm`, `comprimento_nadadeira_mm`.

## Como rodar

```bash
python -m venv .venv
.venv\Scripts\activate        # Windows  (Linux/macOS: source .venv/bin/activate)
pip install -r requirements.txt
```

1. (Opcional) Abra `notebooks/analise_e_treinamento.ipynb` com o kernel do `.venv` e execute todas as
   células – isso refaz a análise e salva o modelo em `modelo/modelo_pinguins.joblib`
   (o modelo já treinado está no repositório).
2. Rode a aplicação: `python app/app.py` e acesse http://127.0.0.1:5000.

## Resultados do modelo (conjunto de teste, 84 pinguins)

| Métrica | Valor |
|---|---|
| Acurácia | 0,976 |
| Precisão (macro) | 0,971 |
| Revocação (macro) | 0,971 |
| F1-Score (macro) | 0,971 |

## Aplicação web

- **Back-end (`app/app.py`, Flask):** carrega o modelo uma vez ao iniciar; a rota `POST /prever`
  recebe os dados do formulário (JSON ou form comum), valida os campos, monta um DataFrame com as
  colunas na ordem do treinamento e devolve a espécie prevista e a probabilidade de cada classe
  (`predict` + `predict_proba`). Avisa quando alguma medida está fora da faixa observada na base.
- **Front-end (`app/templates/index.html`, `app/static/style.css`, `app/static/script.js`):**
  - formulário com os 3 campos (controle deslizante + número) e botão **Prever**, com modo **ao vivo**
    (prevê a cada mudança, sempre pelo back-end);
  - pinguim ilustrado cujo bico e nadadeira mudam de tamanho com as medidas e que **assume os traços da
    espécie prevista** (anel no olho da Adélia, faixa no queixo da Barbicha, mancha e bico laranja do Gentoo);
  - resultado com probabilidade animada e barras para as três classes;
  - **Por dentro do Naive Bayes:** as normais *P(medida | espécie)* aprendidas pelo modelo, com uma linha
    arrastável que altera a medida e mostra qual espécie cada medida favorece;
  - botão **Sortear**, que gera um pinguim a partir das distribuições de uma espécie e mostra se o modelo acertou
    (com placar), histórico das últimas previsões e tema claro/escuro;
  - funciona também sem JavaScript (o formulário é enviado normalmente).

> Use a mesma versão do scikit-learn para treinar e para servir o modelo.

## Equipe

- (nomes dos integrantes – máx. 4)

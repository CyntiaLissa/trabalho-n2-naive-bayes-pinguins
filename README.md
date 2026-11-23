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

1. Abra `notebooks/analise_e_treinamento.ipynb` e execute todas as células – isso gera o modelo.
2. Mova/salve `modelo_pinguins.joblib` em `modelo/`.
3. Rode a aplicação: `python app/app.py` e acesse http://127.0.0.1:5000.

> Use a mesma versão do scikit-learn para treinar e para servir o modelo.

## Equipe

- (nomes dos integrantes – máx. 4)

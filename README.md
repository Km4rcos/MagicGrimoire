# 🔮 MagicGrimoire

Um sistema web premium para gerenciamento de coleção e construção de decks de **Magic: The Gathering**. Construído com React, backend em Supabase e integrado à API oficial da Scryfall.

# Acesse em: https://magic-grimoire.vercel.app/

## ✨ Funcionalidades

- **Fichário Inteligente:** Busque, adicione e gerencie suas cartas com suporte a buscas em Português e Inglês.
- **Gestão Financeira:** Cálculo automático em tempo real do valor total do seu acervo e de decks individuais (em USD).
- **Construtor de Decks (Deck Builder):** Crie e edite decks nos formatos **Standard** (60 cartas) e **Commander** (100 cartas), respeitando regras de limite de cópias.
- **Estatísticas Avançadas:** Visualize a curva de mana dinâmica (com cores baseadas na identidade do deck) e a distribuição por tipos de carta.
- **Playtest (Simulador de Mão):** Compre mãos iniciais (7 cartas) diretamente do seu deck e treine seus *mulligans* antes de jogar fisicamente.
- **Design Imersivo:** UI/UX focada no universo do MTG, com efeito "Foil" interativo ao passar o mouse nas cartas, fontes temáticas e ícones oficiais de mana.

## 🚀 Tecnologias Utilizadas

- **Front-end:** React.js, Vite, React Router DOM
- **Back-end e Banco de Dados:** Supabase (PostgreSQL)
- **Autenticação:** Supabase Auth (Login/Cadastro de usuários)
- **Consumo de Dados:** Fetch API conectada à Scryfall API

## 🛠️ Como rodar o projeto localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) instalado.
- Uma conta no [Supabase](https://supabase.com/) com as tabelas de `inventario` e `decks` configuradas.

### Passos

1. Clone o repositório:
```bash
git clone [https://github.com/SEU_USUARIO/magic-grimoire-db.git](https://github.com/SEU_USUARIO/magic-grimoire-db.git)
```
2. Acesse a pasta do projeto:
```bash
cd magic-grimoire-db
```
3. Instale as dependências:
```bash
npm install
```
4. Crie um arquivo .env.local na raiz do projeto e adicione suas chaves do Supabase:
```bash
VITE_SUPABASE_URL=sua_url_aqui
VITE_SUPABASE_ANON_KEY=sua_chave_aqui
```
5. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```
6. Abra o navegador e acesse: http://localhost:5173

Projeto criado de fã para fãs de Magic: The Gathering.

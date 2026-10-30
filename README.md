# Mandarim Tech AI — Front-end

Interface web do **Mandarim Tech AI** (React 18 + Vite + TypeScript + Tailwind CSS): flashcards com
repetição espaçada (SM-2) e áudio neural, explorador de vocabulário HSK 3.0 e um playground de sintaxe
S-T-L-V-O. Tema escuro por padrão, responsivo (barra lateral no desktop, barra inferior no celular).

## Como rodar

Requer Node 18+ e o backend rodando em `http://127.0.0.1:8000`.

```bash
npm install
npm run dev          # abra http://localhost:5173  (use "localhost", veja o aviso de CORS abaixo)
```

Outros comandos: `npm run build` (tsc + build de produção) · `npm test` (94 testes) ·
`npm run test:live` (contrato contra o backend real, veja abaixo).

Para apontar para outra API: copie `.env.example` para `.env` e ajuste `VITE_API_URL`.

> **CORS:** o backend só libera `http://localhost:3000` e `http://localhost:5173` por padrão. Abrir o
> front por `http://127.0.0.1:5173` é bloqueado pelo navegador (a tela mostra "API offline"). Para liberar
> outras origens, suba o backend com `CORS_ORIGINS="http://localhost:5173,http://meu-host:5173"`.

## Telas

| Rota | Tela | O que faz |
|---|---|---|
| `/` | Painel | Ofensiva, revisões de hoje, desafio de 30 dias, cartões devidos e cobertura por nível HSK |
| `/revisao` | Revisão (SRS) | Flashcards: ouvir (TTS), revelar, avaliar 0–5; mostra o agendamento devolvido pela API |
| `/vocabulario` | Vocabulário & HSK | Busca instantânea (Pinyin com/sem tom), filtros por categoria e nível, detalhes com radicais |
| `/playground` | Playground S-T-L-V-O | Monta a frase em blocos coloridos, sílabas com tons, checklist HSK |

Atalhos na revisão: **Espaço** revela/continua · **0–5** avalia · **P** ouve. O menu de áudio (ícone de
alto-falante no topo) escolhe voz, velocidade e "tocar ao revelar".

## Estrutura

```
src/
├── services/api.ts        # único ponto de contato com o backend (Axios, tipado, erros em português)
├── types/api.ts           # tipos iguais aos contratos reais da API
├── lib/                   # lógica pura: estatísticas locais, prévia do SM-2, radicais, formatação
├── hooks/                 # useAsync (aborta respostas antigas), useDebounce, useSpeech, useApiHealth
├── context/SettingsContext.tsx   # tema, voz, velocidade, autoplay (localStorage)
├── components/            # ReviewSession, AudioButton, CompileResult, RadicalBlocks, layout/...
├── pages/                 # Dashboard, Review, Vocabulary, Playground
└── test/                  # setup, fixtures e o teste de contrato (live.contract.test.ts)
```

## Diferenças entre o enunciado e a API real (o front segue a API)

- O significado em português vem em **`portuguese`** (não `meaning_pt`).
- A velocidade do TTS exige **sinal explícito** (`+0%`, `-10%`); `0%` seria rejeitado com 422. O
  `src/services/api.ts` normaliza e codifica o `+` (`%2B`) automaticamente.
- O compilador (`POST /api/grammar/compile`) **monta** a frase a partir das peças S, T, L, V, O (Hanzi
  ou Pinyin); ele não segmenta uma frase digitada de uma vez. Por isso o Playground tem um campo por
  peça e uma lista de frases de TI prontas.
- O backend não tem contas nem endpoint de ofensiva: **ofensiva, "hoje" e o desafio de 30 dias são
  calculados no navegador** a partir das revisões enviadas por ele (`localStorage`). Limpar os dados do
  site zera esses números (o agendamento do SRS continua no servidor).
- As barras de "Progresso no HSK 3.0" mostram quantos termos a plataforma oferece em relação à meta do
  nível, não o domínio pessoal do aluno. `HSK_TECH` não tem meta oficial e por isso não tem barra.

## Testes

- `npm test`: 94 testes (Vitest + Testing Library) — serviço de API e mapeamento de erros, estatísticas
  (ofensiva, fuso local), prévia do SM-2, fluxo completo dos flashcards (inclusive teclado e falha ao
  salvar nota), busca com debounce, playground, painel, áudio e shell.
- `npm run test:live` (com o backend rodando em `:8000`, de preferência com um banco descartável, pois
  grava revisões): confere que o JSON real tem todos os campos que a interface lê e que a **prévia do SM-2
  do cliente é idêntica ao agendamento do backend** em uma sequência de 8 notas.

## Limitações conhecidas

- A prévia de intervalo nos botões de nota (≈ 6 dias) replica o SM-2 do backend; se o algoritmo mudar lá,
  atualize `src/lib/sm2Preview.ts` (o teste de contrato avisa). O valor oficial é sempre o da resposta.
- Cartões errados (nota 0–2) voltam amanhã, como o backend agenda; não há repetição dentro da mesma sessão.
- O cache de áudio fica na memória da aba (links `blob:`); recarregar a página busca o MP3 de novo (o
  backend, por sua vez, guarda os MP3 em disco).

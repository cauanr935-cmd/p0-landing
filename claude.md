# CLAUDE.md — Be My Mentor

Arquivo de contexto do projeto para o Claude Code. Leia este arquivo antes de qualquer tarefa de desenvolvimento.

---

## Visão Geral do Produto

**Be My Mentor** é uma plataforma de mentoria entre pares universitários, onde estudantes se conectam para trocar conhecimento dentro e entre instituições. O incentivo central para mentores é a conversão das sessões em **horas complementares reconhecidas institucionalmente**. Os melhores mentores são premiados com certificados de destaque.

**Missão de longo prazo:** tornar-se a maior rede social universitária do mundo.

**Estágio atual:** pré-MVP / descoberta. O primeiro laboratório de validação é o **Inteli — Instituto de Tecnologia e Liderança**, São Paulo.

---

## Solução

Fluxo principal:

1. Aluno que precisa de ajuda abre o app, escolhe habilidade/disciplina e solicita sessão com um colega disponível.
2. Mentor aceita.
3. Sessão acontece (preferencialmente presencial no campus; online entre instituições diferentes).
4. Sessão é registrada → converte em **horas complementares** reconhecidas pela universidade para o mentor.

Incentivos:

- **Certificado de Horas (R$100):** qualquer mentor com volume relevante de sessões.
- **Certificado de Destaque (R$150):** 10% melhores mentores de cada campus, com reconhecimento por universidades parceiras e empresas de tecnologia.

---

## Fluxo de Validação de Sessões (MVP)

O processo foi desenhado para ser simples, auditável e sem infraestrutura técnica complexa nesta fase:

1. **Mentor** inicia Google Meet com transcrição automática ativada.
2. Ao final, mentor exporta o arquivo de transcrição e faz upload na plataforma, vinculado àquela sessão.
3. **Plataforma** gera automaticamente um documento de resumo (pontos principais, tempo efetivo, participantes) + mantém a transcrição completa disponível.
4. **Inteli** recebe resumo + transcrição e decide pela elegibilidade como horas complementares. A palavra final é sempre da instituição — a plataforma organiza a evidência, não valida automaticamente.

> À medida que o volume crescer e o processo for validado, etapas da análise poderão ser automatizadas, **sempre mantendo a homologação institucional como etapa final**.

---

## Certificados — Requisitos Técnicos Críticos

Certificados vagos são rejeitados automaticamente pelas secretarias universitárias. Cada certificado emitido pela plataforma **deve conter obrigatoriamente**:

- Nome completo e CPF do aluno
- CNPJ e Razão Social da plataforma
- Título estratégico da atividade (não "Mentoria", mas algo como "Programa Estruturado de Tutoria e Monitoria entre Pares em [Área/Disciplina]")
- Período exato de realização
- Carga horária discriminada
- Código verificador com QR Code vinculado ao banco de dados
- Assinatura eletrônica no padrão ICP-Brasil ou Gov.br

**Microcertificações são o padrão:** módulos de 20, 30 e no máximo 40 horas. Consolidação em certificados periódicos por semestre.

---

## Infraestrutura Técnica (MVP)

Todo o stack inicial roda em planos gratuitos:

| Ferramenta | Função |
|---|---|
| Vercel | Hospedagem frontend |
| Railway / Render | Backend e API |
| Supabase | Banco de dados, autenticação e storage |
| Resend | E-mail transacional (até 3.000/mês) |
| Cloudflare R2 | Armazenamento de arquivos (transcrições, certificados) |
| PostHog | Analytics de produto |

Os planos pagos das mesmas ferramentas são ativados somente quando o volume exigir, **sem custo de migração**.

---

## Convenções para Desenvolvimento

- **Idioma do código:** inglês (variáveis, funções, comentários técnicos).
- **Idioma da interface:** português brasileiro.
- **Idioma da documentação:** português brasileiro.
- Toda feature nova deve ter em mente o **fluxo de validação de sessão** e os **requisitos de metadados de certificado** descritos acima.
- A métrica de sucesso do MVP é **horas de uso semanal dentro da plataforma**, não cadastros.
- **Dark mode é automático.** O plugin em `vite.config.js` injeta `public/theme.css` (tokens claro/escuro), o script anti-flash e `public/theme-toggle.js` (botão no `<header>`) em **todo `.html`** da raiz, e o build também descobre as páginas sozinho. Página nova (ex.: `registro-5.html`) **não copia nenhum trecho de tema**; basta ter `<header>` (senão o botão fica flutuante) e usar `style.css`.
- **Cores só por token** (`var(--bg)`, `var(--card)`, `var(--text)`, `var(--purple)`, `var(--btn-bg)`, `var(--outline)`…, definidos em `public/theme.css`), nunca `#hex`/`rgb()` solto, senão a página não se adapta ao escuro. Rode `npm run check:theme` antes do deploy; exceções intencionais levam o comentário `theme-ok`.

## Home 3D: o diário de bordo em papel

- `index.html` + `src/diorama.js` (Three.js): a mesa do Inteli, Cauan e Bruno como figurinhas de papel (`public/scene/*.png`), o diário que abre e vira página com o scroll e o afastamento até o mapa do Brasil. A altura de `#stage` (1000vh) é a duração da cena; os trechos estão em `FLIPS`, `COVER` e `shots()`.
- Textos das páginas, fotos e vídeos de cada capítulo: `src/diorama-content.js` (sem mexer na cena).
- A sala é a R07 do Inteli, modelada a partir das fotos: `src/diorama-room.js` (medidas em `POD`, número em `POD.roomNumber`). A casca é desenhada centrada e deslocada em `POD.cx` para a mesa (na origem da cena) encostar na parede esquerda; a TV fica nessa parede e o quadro na oposta, com Cauan e Bruno de costas escrevendo (figurinhas desenhadas em `drawPersonBack`). Só a luminária fica acesa. No afastamento a sala se funde no ponto do Inteli no mapa. Casinha de pinus com frente de vidro e porta que abre quando a câmera chega, ripas diagonais por dentro, teto inclinado com LED, pendente sobre a mesa, TV com o relógio ao vivo (clique troca para o vídeo da visão), quadro branco na parede esquerda; por fora, tijolo, concreto, piso tátil, extintor e arandela. O telhado some no afastamento final para a câmera ver a mesa de cima.
- Legendas, voto e newsletter são HTML por cima do canvas (`.cap` com `data-from`/`data-to` em fração do scroll).
- Sem WebGL ou com "reduzir movimento", a página mostra só o conteúdo (`.no-3d`).
- Fontes de mão (Caveat Brush, Caveat) vêm de `@fontsource`, servidas pelo próprio site.
- Objetos clicáveis (figurinhas, celular, notebook, caneca, quadro, polaroids) usam `clickable()` em `src/diorama.js`; o balão é HTML posicionado sobre o objeto.
- Sons são sintetizados em `src/diorama-audio.js` e só tocam com o botão de som ligado.
- **Você decide:** `POST /api/vote` (`api/vote.js`) soma o voto na aba "Votos" da mesma planilha da newsletter. Depois de atualizar `google-apps-script.gs`, publique uma **nova versão** da implantação do Apps Script; sem isso o carimbo funciona, só não aparece a porcentagem.
- Registro novo: além da página e da lista, acrescente um capítulo em `src/diorama-content.js` (o #008 em branco vai para o fim).

## Linha do tempo de conteúdos (`linha-do-tempo.html`)

- Usa os tokens `--stage-*` de `public/theme.css` e os dados de `public/data/conteudos.json`, em ordem cronológica. Tipos de ilha: `conteudo`, `decisao`, `marco` e `registro`. Números desconhecidos ficam `null`.
- Prévias dos vídeos: `scripts/make-previews.sh <video> <id> <inicio> [duracao]` gera `public/previews/<id>.mp4` e `<id>.jpg`.
- **YouTube ao vivo:** `/api/youtube` (`api/youtube.js`, `lib/youtube.js`) com cache de 10 min. Variáveis: `YOUTUBE_API_KEY` e `YOUTUBE_CHANNEL_HANDLE` ou `YOUTUBE_CHANNEL_ID`.
- Registro novo: página `registro-N.html`, item no JSON, linha na lista "Todos os registros" da home e um capítulo em `src/diorama-content.js`.

---

*Be My Mentor · Inteli, São Paulo · 2026*
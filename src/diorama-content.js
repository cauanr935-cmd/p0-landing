// Conteúdo do diário 3D. Cada capítulo é uma página dupla: esquerda (o
// registro: o que aconteceu, o erro e o acerto) e direita (polaroid, post-its
// e rabiscos). Textos resumidos dos registros publicados; para mudar uma
// página, mexa só aqui.
//
// Elementos da página da direita (desenhados no papel):
//   polaroid: { image | video, aspect, caption, tilt, link }  → objeto 3D por cima
//   notes:    post-its [{ text, sub, x, y, rot, color }]
//   bubbles:  balões de mensagem [{ text, me }]
//   doodle:   'camadas' (fluxo desenhado à mão)
//   sticker:  { text, sub, link } → adesivo clicável

export const chapters = [
  {
    id: 'r001',
    link: 'registro-1.html',
    left: {
      kicker: 'registro #001 · 23 set',
      title: 'A decisão de sair da caixinha',
      lines: [
        'O Cauan largou o caminho corporativo seguro. O Bruno decidiu arrombar a caixinha de vez.',
        'E a regra desde o dia 1: contar tudo, em público.',
      ],
      erro: 'Pelo menos 20 ideias antes dessa. Todas falharam.',
      acerto: 'Ouvir antes de construir: pesquisa em 20+ universidades.',
    },
    right: {
      polaroid: { image: '/scene/polaroid-build.jpg', aspect: 1, caption: 'Bruno buildando', tilt: -0.05 },
      notes: [{ text: '77%', sub: 'já quiseram falar com alguém no campus e não conseguiram', x: 0.5, y: 0.86, rot: 0.06 }],
    },
  },
  {
    id: 'r002',
    link: 'registro-2.html',
    left: {
      kicker: 'registro #002 · 23 set',
      title: 'Um bot no Slack, não uma plataforma',
      lines: ['O Inteli já vive no Slack. Validar o ponto de entrada ali é mais rápido do que lançar um app.'],
      erro: 'Antes disso, uma startup de créditos de carbono. Deu muito errado.',
      acerto: 'Escolher um único ponto para ser o melhor: fazer as pessoas trocarem conhecimento.',
    },
    right: {
      polaroid: { image: '/scene/polaroid-network.jpg', aspect: 1, caption: 'New Journey, na Serena', tilt: 0.06 },
      notes: [{ text: 'quem paga?', sub: 'o elefante na sala', x: 0.5, y: 0.86, rot: -0.07, color: '#ffd3e0' }],
    },
  },
  {
    id: 'r003',
    link: 'registro-3.html',
    left: {
      kicker: 'registro #003 · 3 out',
      title: 'Abrindo a caixa-preta',
      lines: ['O Inteli topa as horas complementares, desde que possa confiar no sistema por dentro.'],
      erroLabel: '✗ descartado',
      erro: 'Cobrar do estudante. Fecharia ainda mais as bolhas.',
      acerto: 'Monetizar com empresas: a ponte entre o universitário e o mercado.',
    },
    right: {
      doodle: 'camadas',
      notes: [{ text: 'CNPJ', sub: 'quase de graça, pelo programa do governo', x: 0.62, y: 0.86, rot: 0.08, color: '#cdeccf' }],
    },
  },
  {
    id: 'r004',
    link: 'registro-4.html',
    left: {
      kicker: 'registro #004 · 10 out',
      title: 'Faculdade e startup ao mesmo tempo',
      lines: ['Prova do módulo, duas ou três reuniões por dia e o primeiro vídeo no YouTube.'],
      erro: '15 mensagens no LinkedIn, três tentativas cada. Nenhuma resposta.',
      acerto: 'Precisavam de 4 ou 5 na prova. Tiraram perto de 9.',
    },
    right: {
      bubbles: [
        { text: 'oi! topa uma call de 15 min?', me: true },
        { text: 'visualizado', meta: true },
        { text: 'oi de novo :)', me: true },
        { text: '…', meta: true },
      ],
      sticker: { text: '▶ Building a startup #01', sub: 'a rotina caótica, no YouTube', link: 'https://youtu.be/VY2pT_00GNI' },
    },
  },
  {
    id: 'r005',
    link: 'registro-5.html',
    left: {
      kicker: 'registro #005 · 17 out',
      title: 'A primeira mentoria da nossa história',
      lines: ['Um estudante da UFC e uma estudante do Inteli numa sala do Meet. O Cauan só abriu a boca duas vezes.'],
      erro: 'A transcrição tratava duas vozes femininas como se fossem uma só.',
      acerto: 'Começar controlado, sem abrir para todo mundo.',
    },
    right: {
      polaroid: { video: '/previews/produto.mp4', aspect: 16 / 9, caption: 'como uma mentoria vira hora complementar', tilt: -0.03 },
      notes: [{ text: '1ª', sub: 'mentoria da Be My Mentor', x: 0.3, y: 0.86, rot: -0.06 }],
    },
  },
  {
    id: 'r006',
    link: 'registro-6.html',
    left: {
      kicker: 'registro #006 · 24 out',
      title: 'O software não é o nosso diferencial',
      lines: ['Software ficou fácil e barato. A barreira de verdade é gente e processo, como os entregadores do iFood.'],
      erro: 'Tentar um transcritor 100% autoral. Má ideia.',
      acerto: 'WhisperX e Pyannote: transcritor pronto.',
    },
    right: {
      polaroid: { image: '/scene/polaroid-planejando.jpg', aspect: 1, caption: 'planejando os próximos passos', tilt: 0.04 },
      notes: [{ text: 'meta: 10', sub: 'mentorias antes de lançar', x: 0.5, y: 0.86, rot: 0.05, color: '#cde3ff' }],
    },
  },
  {
    id: 'r007',
    link: 'registro-7.html',
    vote: { poll: '007', question: 'Você abriria a Be My Mentor para todo mundo agora?', answer: 'Nós decidimos: ainda não. Reputação vale mais que pressa.' },
    left: {
      kicker: 'registro #007 · 31 out',
      title: 'Você decide',
      question: 'Você abriria a Be My Mentor para todo mundo agora?',
    },
    right: {
      polaroid: { image: '/scene/polaroid-evento.jpg', aspect: 1, caption: 'cada pessoa aqui é reputação', tilt: -0.08 },
      notes: [{ text: 'erro', sub: 'o analisador ainda se perde quando duas pessoas falam juntas', x: 0.5, y: 0.86, rot: -0.05, color: '#ffd3e0' }],
    },
  },
  {
    id: 'r008',
    newsletter: true,
    left: {
      kicker: 'registro #008',
      title: 'Ainda não aconteceu',
      lines: ['Essa página a gente escreve essa semana.'],
      blank: true,
    },
    right: {
      title: 'Quer ler antes de todo mundo?',
      lines: ['O próximo registro chega no seu e-mail assim que a gente escrever.'],
    },
  },
];

// Contorno aproximado do Brasil (lon, lat).
export const BRAZIL = [
  [-73.9, -7.3], [-72.9, -9.4], [-70.5, -9.5], [-69.4, -11.0], [-65.4, -9.8], [-64.5, -12.4],
  [-61.9, -13.5], [-60.4, -13.9], [-60.2, -16.3], [-58.4, -16.3], [-58.1, -19.8], [-57.6, -21.8],
  [-55.7, -22.1], [-54.6, -25.6], [-53.8, -27.1], [-55.8, -28.2], [-57.6, -30.2], [-53.4, -33.7],
  [-52.6, -33.1], [-50.3, -30.4], [-48.5, -27.5], [-48.4, -25.5], [-46.4, -23.9], [-44.6, -23.3],
  [-41.9, -22.9], [-40.9, -21.0], [-39.7, -19.0], [-39.0, -16.0], [-38.9, -13.0], [-37.6, -11.5],
  [-35.3, -9.0], [-34.8, -7.1], [-35.2, -5.4], [-37.2, -4.7], [-39.0, -3.2], [-41.5, -2.9],
  [-44.2, -2.4], [-46.5, -1.0], [-48.4, -0.9], [-50.0, 0.0], [-50.9, 2.0], [-51.6, 4.2],
  [-52.9, 2.2], [-54.4, 2.3], [-56.0, 1.9], [-57.4, 1.9], [-59.0, 1.4], [-60.0, 1.9],
  [-60.7, 2.9], [-60.1, 4.5], [-60.9, 5.2], [-62.8, 4.0], [-64.0, 3.9], [-64.6, 2.1],
  [-63.4, 2.2], [-64.4, 1.3], [-66.8, 1.2], [-69.6, 1.1], [-69.2, -1.0], [-69.9, -4.2],
  [-72.9, -5.2],
];

// Inteli (São Paulo) primeiro, depois as capitais. Trocar pelas 20+
// universidades pesquisadas quando a lista chegar.
export const CITIES = [
  [-46.72, -23.57],
  [-43.2, -22.9], [-43.9, -19.9], [-47.9, -15.8], [-49.3, -25.4], [-51.2, -30.0], [-48.5, -27.6],
  [-38.5, -12.97], [-34.9, -8.05], [-38.5, -3.73], [-60.0, -3.1], [-48.5, -1.45], [-49.25, -16.7],
  [-54.6, -20.45], [-56.1, -15.6], [-40.3, -20.3], [-35.7, -9.65], [-37.05, -10.9], [-34.9, -7.1],
  [-35.2, -5.8], [-42.8, -5.1], [-44.3, -2.5], [-48.3, -10.2], [-63.9, -8.76], [-67.8, -9.97],
  [-60.7, 2.8], [-51.1, 0.03],
];

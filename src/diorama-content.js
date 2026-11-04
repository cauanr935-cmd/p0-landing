// Conteúdo das páginas do diário 3D. Cada capítulo é uma página dupla:
// esquerda (texto) e direita (polaroid + legenda).
// Textos tirados dos registros publicados; ajuste aqui sem mexer na cena.

export const pages = {
  r001L: {
    side: 'left',
    kicker: 'registro #001 · 23 set',
    title: 'A decisão de sair da caixinha',
    lines: [
      'Trocamos o caminho seguro do mundo corporativo por construir algo nosso.',
      'E decidimos contar tudo, em público, toda semana.',
    ],
    acerto: 'Pôr o diário no ar no dia 1, antes de ter produto.',
    footer: 'dia 1 em público',
  },
  r001R: {
    side: 'right',
    top: 1130,
    lines: ['Bruno buildando o primeiro MVP.'],
    footer: 'pág. 1',
  },

  conteudoL: {
    side: 'left',
    kicker: 'outubro · os primeiros vídeos',
    title: 'Aprendendo a contar a história',
    lines: ['Building a startup #01 no YouTube e seis Shorts cortados dele.'],
    erro: 'Shorts em corte seco: quase ninguém via até o fim.',
    acerto: 'Refizemos todos animados, com som e legenda.',
    footer: 'Building a startup #01',
  },
  conteudoR: {
    side: 'right',
    top: 1130,
    lines: ['Network no evento da Serena.'],
    footer: 'pág. 2',
  },

  r005L: {
    side: 'left',
    kicker: 'registro #005 · 17 out',
    title: 'A primeira mentoria da nossa história',
    lines: ['Um mentor e uma mentorada, frente a frente. A ideia saiu do slide.'],
    acerto: 'Validar a mentoria na mão, antes de construir a plataforma.',
    footer: 'primeira mentoria',
  },
  r005R: {
    side: 'right',
    top: 1000,
    lines: ['Como uma mentoria vira hora complementar.'],
    footer: 'pág. 3',
  },

  r007L: {
    side: 'left',
    kicker: 'registro #007 · 31 out',
    title: 'Você decide',
    question: 'Você abriria a Be My Mentor para todo mundo agora?',
    answer: 'Nós decidimos: ainda não. Reputação vale mais que pressa.',
    footer: 'registro #007',
  },
  r007R: {
    side: 'right',
    top: 1110,
    lines: ['Cada pessoa aqui é a reputação que a gente não pode queimar.'],
    footer: 'pág. 4',
  },

  r008L: {
    side: 'left',
    kicker: 'registro #008',
    title: 'Ainda não aconteceu',
    lines: ['Essa página a gente escreve essa semana.'],
    blank: true,
  },
  r008R: {
    side: 'right',
    top: 160,
    title: 'Quer ler antes de todo mundo?',
    lines: ['O próximo registro chega no seu e-mail assim que a gente escrever.'],
  },
};

export const chapters = [
  { left: 'r001L', right: 'r001R', media: { image: '/scene/polaroid-build.jpg', aspect: 1, z: -0.035 } },
  { left: 'conteudoL', right: 'conteudoR', media: { image: '/scene/polaroid-network.jpg', aspect: 1, tilt: 0.06, z: -0.035 } },
  { left: 'r005L', right: 'r005R', media: { video: '/previews/produto.mp4', aspect: 16 / 9, z: -0.04 } },
  { left: 'r007L', right: 'r007R', vote: true, media: { image: '/scene/polaroid-evento.jpg', aspect: 1, tilt: -0.08, z: -0.035 } },
  { left: 'r008L', right: 'r008R' },
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

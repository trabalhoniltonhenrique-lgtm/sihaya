// Programas de treino do SIHAYA por nível, pensados para lipedema:
// baixo impacto (máquinas e polias, sem saltos ou corrida), aeróbico leve no
// início, panturrilha em todas as sessões (bomba muscular que favorece o
// retorno venoso e linfático) e progressão gradual de volume.
// Formato de cada exercício: [nome, repetições, séries, descanso em segundos].
// Revise com seu médico ou fisioterapeuta antes de começar.
self.SIHAYA_PROGRAMS = {
  iniciante: {
    name: 'Iniciante',
    summary: '3 dias · 2 séries · 12–15 repetições',
    focus: 'Adaptação: aprender os movimentos com cargas leves e criar constância.',
    next: { level: 'intermediario', workouts: 24, loadIncreases: 3 },
    days: {
      segunda: {
        title: 'Inferiores A',
        exercises: [
          ['Bicicleta ergométrica leve', '10 min', 1, 60],
          ['Leg press (só a resistência da máquina)', '12–15', 2, 75],
          ['Cadeira extensora', '12–15', 2, 75],
          ['Mesa flexora', '12–15', 2, 75],
          ['Abdutor', '15', 2, 75],
          ['Adutor', '15', 2, 75],
          ['Panturrilha sentado', '15–20', 2, 60],
        ],
      },
      quarta: {
        title: 'Superiores',
        exercises: [
          ['Bicicleta ou elíptico leve', '10 min', 1, 60],
          ['Puxada frontal na polia', '12–15', 2, 75],
          ['Remada sentada na polia', '12–15', 2, 75],
          ['Supino máquina', '12–15', 2, 75],
          ['Desenvolvimento de ombros na máquina', '12–15', 2, 75],
          ['Elevação pélvica no solo', '12–15', 2, 60],
          ['Panturrilha em pé na máquina', '15–20', 2, 60],
        ],
      },
      sexta: {
        title: 'Inferiores B',
        exercises: [
          ['Bicicleta ergométrica leve', '10 min', 1, 60],
          ['Elevação pélvica no solo', '12–15', 2, 75],
          ['Leg press (só a resistência da máquina)', '12–15', 2, 75],
          ['Mesa flexora', '12–15', 2, 75],
          ['Abdutor', '15', 2, 75],
          ['Adutor', '15', 2, 75],
          ['Panturrilha em pé na máquina', '15–20', 2, 60],
        ],
      },
    },
  },
  intermediario: {
    name: 'Intermediário',
    summary: '4 dias · 3 séries · 10–12 repetições',
    focus: 'Mais volume e carga moderada, alternando inferiores e superiores.',
    next: { level: 'avancado', workouts: 48, loadIncreases: 4 },
    days: {
      segunda: {
        title: 'Inferiores A',
        exercises: [
          ['Bicicleta ergométrica leve', '10 min', 1, 60],
          ['Leg press', '10–12', 3, 90],
          ['Cadeira extensora', '10–12', 3, 90],
          ['Elevação pélvica com anilha', '10–12', 3, 90],
          ['Abdutor', '12–15', 3, 75],
          ['Panturrilha sentado', '15–20', 3, 60],
        ],
      },
      terca: {
        title: 'Superiores A',
        exercises: [
          ['Elíptico leve', '10 min', 1, 60],
          ['Puxada frontal na polia', '10–12', 3, 90],
          ['Supino máquina', '10–12', 3, 90],
          ['Remada sentada na polia', '10–12', 3, 90],
          ['Desenvolvimento de ombros na máquina', '10–12', 3, 90],
          ['Prancha nos antebraços', '20–30 s', 3, 60],
          ['Panturrilha em pé na máquina', '15–20', 3, 60],
        ],
      },
      quinta: {
        title: 'Inferiores B',
        exercises: [
          ['Bicicleta ergométrica leve', '10 min', 1, 60],
          ['Mesa flexora', '10–12', 3, 90],
          ['Glúteo na máquina (coice)', '10–12', 3, 90],
          ['Leg press com pés altos', '10–12', 3, 90],
          ['Adutor', '12–15', 3, 75],
          ['Panturrilha em pé na máquina', '15–20', 3, 60],
        ],
      },
      sexta: {
        title: 'Superiores B',
        exercises: [
          ['Elíptico leve', '10 min', 1, 60],
          ['Crucifixo na máquina (peck deck)', '10–12', 3, 90],
          ['Remada na máquina', '10–12', 3, 90],
          ['Elevação lateral com halteres leves', '12–15', 3, 75],
          ['Rosca bíceps na máquina', '10–12', 3, 75],
          ['Tríceps pulley', '10–12', 3, 75],
          ['Panturrilha sentado', '15–20', 3, 60],
        ],
      },
    },
  },
  avancado: {
    name: 'Avançado',
    summary: '5 dias · 3–4 séries · 8–12 repetições',
    focus: 'Divisão por grupos musculares e um dia de corpo inteiro com condicionamento.',
    next: null,
    days: {
      segunda: {
        title: 'Inferiores A',
        exercises: [
          ['Bicicleta ergométrica leve', '10 min', 1, 60],
          ['Leg press', '8–12', 4, 120],
          ['Cadeira extensora', '10–12', 4, 90],
          ['Hack machine (amplitude confortável)', '10–12', 3, 120],
          ['Abdutor', '12–15', 4, 75],
          ['Panturrilha sentado', '15–20', 4, 60],
        ],
      },
      terca: {
        title: 'Superiores A',
        exercises: [
          ['Elíptico leve', '10 min', 1, 60],
          ['Supino máquina', '8–12', 4, 120],
          ['Desenvolvimento de ombros na máquina', '8–12', 4, 90],
          ['Crucifixo na máquina (peck deck)', '10–12', 3, 75],
          ['Elevação lateral com halteres leves', '12–15', 3, 60],
          ['Tríceps pulley', '10–12', 3, 75],
          ['Panturrilha em pé na máquina', '15–20', 3, 60],
        ],
      },
      quarta: {
        title: 'Inferiores B',
        exercises: [
          ['Bicicleta ergométrica leve', '10 min', 1, 60],
          ['Mesa flexora', '8–12', 4, 90],
          ['Elevação pélvica com anilha', '8–12', 4, 120],
          ['Glúteo na máquina (coice)', '10–12', 3, 75],
          ['Adutor', '12–15', 4, 75],
          ['Panturrilha em pé na máquina', '15–20', 4, 60],
        ],
      },
      quinta: {
        title: 'Superiores B',
        exercises: [
          ['Elíptico leve', '10 min', 1, 60],
          ['Puxada frontal na polia', '8–12', 4, 120],
          ['Remada sentada na polia', '8–12', 4, 90],
          ['Crucifixo inverso na máquina', '12–15', 3, 75],
          ['Rosca bíceps na máquina', '10–12', 3, 75],
          ['Prancha nos antebraços', '30–40 s', 3, 60],
          ['Panturrilha sentado', '15–20', 3, 60],
        ],
      },
      sexta: {
        title: 'Corpo inteiro',
        exercises: [
          ['Bicicleta ergométrica moderada', '15 min', 1, 60],
          ['Leg press', '12–15', 3, 90],
          ['Puxada frontal na polia', '12–15', 3, 90],
          ['Supino máquina', '12–15', 3, 90],
          ['Abdutor', '15', 3, 60],
          ['Panturrilha em pé na máquina', '20', 3, 60],
        ],
      },
    },
  },
};
self.SIHAYA_LEVEL_ORDER = ['iniciante', 'intermediario', 'avancado'];

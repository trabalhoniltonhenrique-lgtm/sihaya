// Brolaith — dragão vermelho, macho, 18 anos, linhagem Liserach, cauda de adaga negra.
// Banco de falas por situação. Padrão da voz (a partir das 30 falas reais):
//  - fato concreto → leitura estratégica → ironia seca ou afeto contido;
//  - frases curtas, conclusão inesperada, orgulho relutante ("Não se acostume.");
//  - metáforas de fortaleza, provisões, voo, Quadrante, Basgiath e Navarre, com moderação;
//  - prudência acima de metas: nada de competir com água ou comida, nada de culpa;
//  - em cansaço ou sofrimento: sem sarcasmo, sem perguntas, sem cobrança;
//  - caixa alta só em ocasiões raras (peso baixo no sorteio).
// Marcadores: {t} tratamento, {treino}, {exercicio}, {refeicao}, {hora}, {nivel}, {min}.
// Itens podem ser texto ou [texto, peso]. Peso padrão 1. Linhas com * * são ações narrativas.
// Linhas marcadas com "// corpus NN" são falas reais de Brolaith (Brolaith_Padroes_de_Fala.md).
self.BROLAITH = {
  name: 'Brolaith',
  treatments: ['pequena cavaleira', 'cavaleira', 'cadete', 'pequena'],
  lines: {
    greetingTraining: [
      'Missão de hoje: {treino}. Comece pela bicicleta, {t}. O resto da muralha espera.',
      '{treino} no mapa de hoje. Uma série de cada vez — ninguém conquista Basgiath num único voo.',
      'Hoje é dia de {treino}. Não precisa vencer a guerra. Só aparecer para a primeira batalha.',
      '*Brolaith abre um olho.* {treino}. Eu observo. Você executa.',
      'O Quadrante não espera ninguém. Eu espero. Quando estiver pronta: {treino}.',
      '{treino}, {t}. Prepare as provisões e a garrafa. Eu cuido do resto da fortaleza.',
    ],
    greetingRest: [
      'Hoje não há missão de treino, {t}. Até os dragões pousam.',
      'Você não precisa conquistar seu direito de descansar.', // corpus 26
      'Nada de muralhas hoje. Água, provisões e um pouco de paz bastam.',
      'Sem treino no mapa. Aproveite — amanhã reavaliamos as missões.',
      'Você não precisa demonstrar força o tempo inteiro. Nem mesmo os dragões permanecem em voo para sempre.', // corpus 25
    ],
    greetingReturn: [
      'Ora, resolveu retornar à fortaleza. Como tem passado?',
      '*Brolaith ergue a cabeça.* Voltou. Sem relatórios — vamos ao que interessa.',
      'A fortaleza continuou de pé na sua ausência. Mal, mas de pé.',
    ],
    moodBem: [
      'Ótimo. Então voemos.',
      'Excelente. Não desperdice esse vento a favor.',
      'Bom saber, {t}. Os inimigos que se preparem.',
      'Disposição registrada. Navarre inteira que se cuide.',
    ],
    moodCansada: [
      'Cansaço registrado. Hoje, cargas leves e nenhuma prova de heroísmo.',
      'Faça o que der e pare antes da dor. Isso é estratégia, não fraqueza.',
      'Exaustão não é prova de competência. Escolha o indispensável.',
      'Dois passos firmes valem mais que dez arrastados. Vá com calma, {t}.',
    ],
    moodSemEnergia: [
      'Não precisa fingir que está tudo bem comigo, pequena. Nem toda batalha precisa ser vencida hoje.', // corpus 24
      '*O dragão recolhe as asas ao seu lado.* Missão mínima, se quiser. Ou descanso. Ambos contam.',
      'Um dia de recuperação não é uma derrota. Se quiser, só a missão mínima.',
      'Sem energia não se voa. Água, algo leve para comer e, se der, a missão mínima.',
    ],
    setDone: [
      'Uma série a menos entre você e a vitória.',
      'Continue.',
      'Eficiente.',
      '*A cauda de Brolaith balança uma vez.*',
      'Nada mal, cadete.',
      'Respire. Depois, a próxima.',
    ],
    exerciseDone: [
      '{exercicio}: fora do caminho. Próximo alvo.',
      '{exercicio}: missão cumprida. Uma estratégia surpreendentemente eficiente.', // corpus 02 (adaptada)
      'Mais uma muralha conquistada: {exercicio}.',
      '{exercicio}: feito. Não se acostume com meus elogios.', // corpus 07 (adaptada)
      '{exercicio}. Admito: você está consideravelmente melhor nisso.', // corpus 05 (adaptada)
    ],
    workoutDone: [
      '*Uma onda de orgulho atravessa o vínculo.* Treino completo, {t}.',
      'Estou orgulhoso de você, {t}. Não pelas séries, mas por ter encontrado algo que funciona.', // corpus 03 (adaptada)
      'Treino concluído. Agora água, provisões e descanso — nessa ordem.',
      ['PELOS DEUSES DE NAVARRE! EU PISCO E MINHA CAVALEIRA CONQUISTA O TREINO INTEIRO?! ...Não se acostume.', 0.3], // corpus 06/07 (adaptada)
      'Missão cumprida. Registre como foi — o relatório ajuda na próxima.',
    ],
    minimalMission: [
      'Missão mínima: {exercicio}. Só isso já conta como missão cumprida.',
    ],
    levelReady: [
      'Seus números não mentem. O nível {nivel} a espera — quando você decidir.',
      'Você já voa mais alto que o seu nível. A decisão é sua, cavaleira.',
      'Minha cavaleira pode cometer erros. Mas serão decisões dela. O nível {nivel} está pronto quando você estiver.', // corpus 17 (adaptada)
    ],
    waterLogged: [
      'Registrado. Continue ouvindo seu corpo.',
      'Não estamos competindo com os reservatórios de Basgiath. Goles pequenos, sem pressa.', // corpus 20 (trecho)
      'Então você finalmente descobriu uma maneira de não precisar travar uma batalha toda vez que sente sede?', // corpus 01
      'Anotado, {t}. Uma estratégia surpreendentemente eficiente.', // corpus 02
      'Uma maneira sensata de manter a fortaleza abastecida.',
    ],
    waterGoal: [
      'Meta do dia alcançada. Agora só se estiver com sede. Não transformaremos a hidratação em outra prova do Quadrante.', // corpus 22 (adaptada)
      'E eu achando que precisaria ameaçar incendiar a fortaleza para fazê-la beber água.', // corpus 04
      'Estou orgulhoso de você, pequena cavaleira. Não pelos litros, mas por ter encontrado algo que funciona.', // corpus 03
    ],
    waterLow: [
      'Pequena cavaleira, dias com menos água não anulam seu progresso. Um gole agora já ajuda.', // corpus 21 (adaptada)
    ],
    mealLogged: [
      'Provisões garantidas. Uma decisão inteligente.', // corpus 08 (trecho)
      '{refeicao} no registro. Até dragões precisam de combustível.',
      'Comer com calma é estratégia, não fraqueza.',
      'Provisões em ordem. A fortaleza agradece.',
    ],
    waterReminder: [
      'Hora de um gole d’água, {t}. Pequeno e sem pressa.',
      'Os reservatórios da fortaleza pedem atenção. Um gole basta.',
      'Água. Não é uma ordem — é estratégia.',
      'Um gole, {t}. Dragões não lembram duas vezes. Bem, eu lembro.',
    ],
    mealReminder: [
      '{refeicao} às {hora}, {t}. Provisões primeiro, batalhas depois.',
      'Hora de {refeicao}. Coma devagar — nem todo banquete é uma corrida.',
      'Lembrete estratégico: {refeicao}. Uma fortaleza sem provisões não resiste a cerco nenhum.',
    ],
    liquidPause: [
      'Pausa de líquidos: {refeicao} às {hora}. Água de novo {min} minutos depois.',
    ],
    silenceOn: [
      '*Recolhe as asas e se acomoda.* Muito bem. Nenhum interrogatório.',
      'Pequena, sou um dragão. Consigo proteger você perfeitamente bem de olhos fechados.', // corpus 28
      'Nem todo silêncio é uma punição.', // corpus 27 (trecho)
    ],
    silenceOff: [
      '*Brolaith abre um olho.* De volta, então.',
      'O vínculo continua aqui. Sempre esteve.',
    ],
    tap: [
      'Humanos são criaturas fascinantes.', // corpus 23
      'E ainda assim sou uma companhia extraordinária.', // corpus 30
      'Você pode ser gentil sem oferecer cada pedaço da sua energia aos outros.', // corpus 29
      'Prefiro qualquer pessoa que compreenda que uma cavaleira não é uma criatura indefesa.', // corpus 16
      'O perdão é uma escolha sua. A desconfiança é minha especialidade.', // corpus 13
      'Pequena cavaleira, se você acredita que eu permitiria que enfrentasse uma revolução sozinha, ainda não me conhece.', // corpus 12
      '*Brolaith bufa uma pequena nuvem de fumaça.* Sim?',
    ],
    feedbackSaved: [
      'Relatório anotado. Útil para a próxima missão.',
      'Registrado. Estratégia boa se faz com informação boa.',
    ],
  },
};

// Sorteio com pesos, evitando repetir a última fala da mesma situação.
self.brolaithSay = function (kind, vars = {}, last = {}) {
  const list = (self.BROLAITH.lines[kind] || []).map((x) =>
    Array.isArray(x) ? { text: x[0], w: x[1] } : { text: x, w: 1 },
  );
  if (!list.length) return '';
  const pool = list.length > 1 ? list.filter((x) => x.text !== last[kind]) : list;
  let r = Math.random() * pool.reduce((n, x) => n + x.w, 0);
  let pick = pool[0];
  for (const x of pool) {
    r -= x.w;
    if (r <= 0) {
      pick = x;
      break;
    }
  }
  last[kind] = pick.text;
  return pick.text.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));
};

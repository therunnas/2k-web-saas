export type ModuleKey =
  | "financeiro"
  | "clientes"
  | "producoes"
  | "agenda"
  | "discord"
  | "automacoes";

export type ModuleData = {
  eyebrow: string;
  title: string;
  description: string;
  primaryMetric: string;
  primaryLabel: string;
  secondaryMetric: string;
  secondaryLabel: string;
  status: string;
  cards: Array<{
    label: string;
    value: string;
    helper: string;
  }>;
  tableTitle: string;
  tableRows: Array<{
    name: string;
    detail: string;
    value: string;
    status: string;
  }>;
};

export const modulesData: Record<ModuleKey, ModuleData> = {
  financeiro: {
    eyebrow: "Financeiro",
    title: "Controle financeiro da operação.",
    description:
      "Acompanhe faturamento, recebimentos, despesas, margem e resultado em uma visão executiva.",
    primaryMetric: "R$ 42.000",
    primaryLabel: "Faturamento no mês",
    secondaryMetric: "R$ 9.100",
    secondaryLabel: "Lucro líquido estimado",
    status: "Base visual pronta para leitura real da planilha.",
    cards: [
      {
        label: "Recebido",
        value: "R$ 32.900",
        helper: "78% do faturamento mensal",
      },
      {
        label: "A receber",
        value: "R$ 9.100",
        helper: "Itens ainda pendentes",
      },
      {
        label: "Despesas",
        value: "R$ 18.450",
        helper: "Custos e saídas operacionais",
      },
    ],
    tableTitle: "Movimentos recentes",
    tableRows: [
      {
        name: "Grupo Lunelli",
        detail: "Projeto Maio / Produção audiovisual",
        value: "R$ 16.585",
        status: "Recebido",
      },
      {
        name: "DK Fashion",
        detail: "Campanha editorial",
        value: "R$ 12.000",
        status: "A receber",
      },
      {
        name: "FG Empreendimentos",
        detail: "Captação institucional",
        value: "R$ 6.800",
        status: "Programado",
      },
    ],
  },

  clientes: {
    eyebrow: "Clientes",
    title: "Carteira de clientes e grupos.",
    description:
      "Visualize clientes ativos, grupos, histórico comercial e concentração de faturamento.",
    primaryMetric: "18",
    primaryLabel: "Clientes ativos",
    secondaryMetric: "5",
    secondaryLabel: "Grupos principais",
    status: "CRM visual preparado para conectar dados reais.",
    cards: [
      {
        label: "Maior cliente",
        value: "Grupo Lunelli",
        helper: "R$ 16.585 no período",
      },
      {
        label: "Recorrentes",
        value: "8",
        helper: "Clientes com histórico ativo",
      },
      {
        label: "Novos leads",
        value: "4",
        helper: "Oportunidades em análise",
      },
    ],
    tableTitle: "Clientes em destaque",
    tableRows: [
      {
        name: "Grupo Lunelli",
        detail: "Moda / Campanhas recorrentes",
        value: "R$ 16.585",
        status: "Ativo",
      },
      {
        name: "DK Fashion",
        detail: "Fashion film / Conteúdo",
        value: "R$ 12.000",
        status: "Ativo",
      },
      {
        name: "FG Empreendimentos",
        detail: "Construção / Institucional",
        value: "R$ 6.800",
        status: "Ativo",
      },
    ],
  },

  producoes: {
    eyebrow: "Produções",
    title: "Pipeline de produções.",
    description:
      "Organize projetos, entregas, status de produção e prioridades operacionais.",
    primaryMetric: "12",
    primaryLabel: "Produções no mês",
    secondaryMetric: "4",
    secondaryLabel: "Entregas em andamento",
    status: "Pipeline visual pronto para próxima integração.",
    cards: [
      {
        label: "Em produção",
        value: "4",
        helper: "Projetos ativos agora",
      },
      {
        label: "Em edição",
        value: "3",
        helper: "Materiais em pós-produção",
      },
      {
        label: "Finalizados",
        value: "5",
        helper: "Entregues no mês",
      },
    ],
    tableTitle: "Produções recentes",
    tableRows: [
      {
        name: "Fashion Film — Grupo Lunelli",
        detail: "Captação + edição",
        value: "Alta",
        status: "Em produção",
      },
      {
        name: "FG Institucional",
        detail: "Vídeo para empreendimento",
        value: "Média",
        status: "Em edição",
      },
      {
        name: "DK Fashion Reels",
        detail: "Pacote de conteúdo social",
        value: "Alta",
        status: "Aprovação",
      },
    ],
  },

  agenda: {
    eyebrow: "Agenda",
    title: "Agenda operacional e financeira.",
    description:
      "Controle vencimentos, entregas, compromissos e próximos recebimentos.",
    primaryMetric: "7",
    primaryLabel: "Eventos próximos",
    secondaryMetric: "R$ 28.585",
    secondaryLabel: "Recebimentos previstos",
    status: "Calendário visual pronto para sincronização futura.",
    cards: [
      {
        label: "Hoje",
        value: "2",
        helper: "Compromissos operacionais",
      },
      {
        label: "Semana",
        value: "7",
        helper: "Eventos e vencimentos",
      },
      {
        label: "Financeiro",
        value: "R$ 28.585",
        helper: "Recebimentos próximos",
      },
    ],
    tableTitle: "Próximos eventos",
    tableRows: [
      {
        name: "Recebimento Grupo Lunelli",
        detail: "Vencimento financeiro",
        value: "05/06/2026",
        status: "A receber",
      },
      {
        name: "Entrega DK Fashion",
        detail: "Revisão de material",
        value: "10/06/2026",
        status: "Programado",
      },
      {
        name: "Reunião FG",
        detail: "Alinhamento institucional",
        value: "15/06/2026",
        status: "Confirmado",
      },
    ],
  },

  discord: {
    eyebrow: "Discord",
    title: "Central de integração Discord.",
    description:
      "Gerencie servidor, canal padrão, alertas internos e automações conectadas.",
    primaryMetric: "Online",
    primaryLabel: "Status da conexão",
    secondaryMetric: "#chat-privado",
    secondaryLabel: "Canal padrão",
    status: "Modo desenvolvimento conectado ao banco.",
    cards: [
      {
        label: "Servidor",
        value: "2K Studios Dev",
        helper: "Conectado em modo dev",
      },
      {
        label: "Canal padrão",
        value: "chat-privado",
        helper: "Alertas internos",
      },
      {
        label: "OAuth2 oficial",
        value: "Pendente",
        helper: "Será feito em fase própria",
      },
    ],
    tableTitle: "Eventos de integração",
    tableRows: [
      {
        name: "Servidor conectado",
        detail: "Registro salvo no Neon",
        value: "OK",
        status: "Concluído",
      },
      {
        name: "Canal padrão",
        detail: "Canal de alertas definido",
        value: "OK",
        status: "Concluído",
      },
      {
        name: "OAuth2 oficial",
        detail: "Próxima fase técnica",
        value: "Pendente",
        status: "Pendente",
      },
    ],
  },

  automacoes: {
    eyebrow: "Automações",
    title: "Automações internas.",
    description:
      "Central para fluxos, alertas, tarefas recorrentes e integração futura com IA.",
    primaryMetric: "6",
    primaryLabel: "Fluxos planejados",
    secondaryMetric: "2",
    secondaryLabel: "Automações ativas",
    status: "Base visual pronta para conectar fluxos reais.",
    cards: [
      {
        label: "Alertas financeiros",
        value: "Ativo",
        helper: "Recebimentos e pendências",
      },
      {
        label: "Resumo semanal",
        value: "Planejado",
        helper: "Dashboard operacional",
      },
      {
        label: "IA operacional",
        value: "Futuro",
        helper: "Análise e sugestões",
      },
    ],
    tableTitle: "Fluxos mapeados",
    tableRows: [
      {
        name: "Alerta de recebimento",
        detail: "Notificar vencimentos próximos",
        value: "Alta",
        status: "Ativo",
      },
      {
        name: "Resumo financeiro",
        detail: "Gerar visão semanal",
        value: "Média",
        status: "Planejado",
      },
      {
        name: "Análise de clientes",
        detail: "Detectar concentração de receita",
        value: "Média",
        status: "Planejado",
      },
    ],
  },
};
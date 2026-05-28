import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Database,
  Settings2,
  SlidersHorizontal,
} from "lucide-react";

const cards = [
  {
    title: "Entradas",
    description: "Gerenciar grupos e marcas usados nos lançamentos de entrada.",
    href: "/configuracoes/entradas",
    icon: Database,
    tone: "cyan",
    tags: ["7 grupos", "12 marcas"],
  },
  {
    title: "Saídas",
    description:
      "Gerenciar fornecedores, categorias e subcategorias de despesas.",
    href: "/configuracoes/saidas",
    icon: SlidersHorizontal,
    tone: "rose",
    tags: ["35 fornecedores", "5 categorias"],
  },
  {
    title: "Financeiro",
    description:
      "Preparado para contas, cartões, formas de pagamento e centros de custo.",
    href: "/configuracoes/financeiro",
    icon: Banknote,
    tone: "emerald",
    tags: ["Em breve"],
  },
  {
    title: "Sistema",
    description:
      "Empresa, workspace, importação, integrações e preferências gerais.",
    href: "/configuracoes/sistema",
    icon: Settings2,
    tone: "violet",
    tags: ["Ano fiscal", "Importar planilha"],
  },
];

function ConfigSectionCard({
  title,
  description,
  href,
  icon: Icon,
  tone,
  tags,
  active = false,
}: {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tone: string;
  tags: string[];
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className="k-config-card"
      data-active={active ? "true" : undefined}
      data-tone={tone}
    >
      <div className="k-config-card-head">
        <span className="k-config-card-icon">
          <Icon size={16} />
        </span>

        <span className="k-config-card-arrow">
          <ArrowRight size={14} />
        </span>
      </div>

      <div className="k-config-card-content">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      <div className="k-config-card-tags">
        {tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
    </Link>
  );
}

export function ConfiguracoesHub() {
  return (
    <div className="k-config-page">
      <header className="k-config-header">
        <p>CONFIGURAÇÕES</p>
        <h1>Central de configurações.</h1>
        <span>
          Organize as bases do SaaS por área para não misturar grupos, marcas,
          fornecedores, categorias, contas e regras financeiras.
        </span>
      </header>

      <section className="k-config-grid">
        {cards.map((card) => (
          <ConfigSectionCard
            key={card.href}
            title={card.title}
            description={card.description}
            href={card.href}
            icon={card.icon}
            tone={card.tone}
            tags={card.tags}
            active={card.title === "Entradas"}
          />
        ))}
      </section>

      <section className="k-config-rule-card">
        <div className="k-config-rule-head">
          <div>
            <h2>Regra oficial de organização</h2>
            <p>
              Como entradas e saídas se diferenciam no painel.
            </p>
          </div>

          <span className="k-config-important-badge">Importante</span>
        </div>

        <div className="k-config-rule-columns">
          <div className="k-config-rule-item" data-tone="cyan">
            <div className="k-config-rule-title">
              <span>
                <ArrowUpRight size={12} />
              </span>
              <strong>Entradas</strong>
            </div>

            <p>
              Usam <strong>Grupos</strong> e <strong>Marcas</strong>. Grupo é
              quem emite/recebe NF. Marca é quem pediu o job.
            </p>
          </div>

          <div className="k-config-rule-item" data-tone="rose">
            <div className="k-config-rule-title">
              <span>
                <ArrowDownLeft size={12} />
              </span>
              <strong>Saídas</strong>
            </div>

            <p>
              Usam <strong>Fornecedores</strong>, <strong>Categorias</strong> e
              <strong> Subcategorias</strong>. Não entram em Marcas ou Grupos.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

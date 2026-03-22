import { Bug } from "lucide-react";

const REPO_URL = "https://github.com/MarcusQuirino/paxtools";

const BUG_REPORT_BODY = `## O que aconteceu?
<!-- Descreva o problema que você encontrou. Seja o mais claro possível. -->


## O que você esperava que acontecesse?
<!-- Descreva o comportamento que você esperava. -->


## Passos para reproduzir
<!-- Liste os passos que levaram ao problema: -->
1. Abri a página "..."
2. Cliquei em "..."
3. Vi o erro "..."

## Captura de tela
<!-- Se possível, cole uma imagem ou captura de tela do problema aqui (você pode colar diretamente). -->


## Informações do dispositivo
- **Aparelho**: <!-- ex: iPhone 15, computador Windows, MacBook -->
- **Navegador**: <!-- ex: Chrome, Safari, Firefox -->
- **Versão do app**: ${__APP_VERSION__}
`;

const bugReportUrl = `${REPO_URL}/issues/new?${new URLSearchParams({
  title: "[Bug] ",
  body: BUG_REPORT_BODY,
  labels: "bug",
}).toString()}`;

export function Footer({ className }: { className?: string }) {
  return (
    <footer className={className ?? "py-6 text-center text-xs text-muted-foreground"}>
      <p className="mb-2 opacity-70">
        Este serviço não é afiliado à UEB ou ao Paxtu. É um projeto pessoal de
        terceiros.
      </p>
      <div className="flex items-center justify-center gap-3">
        <span>v{__APP_VERSION__}</span>
        <span className="text-border">|</span>
        <a
          href={bugReportUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline transition-colors"
        >
          <Bug className="size-3.5" />
          Reportar um bug
        </a>
      </div>
    </footer>
  );
}

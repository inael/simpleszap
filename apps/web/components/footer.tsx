// Rodapé padrão com carimbo de versão.
// Versão, data/hora e SHA vêm de variáveis NEXT_PUBLIC_* inlinadas no build
// (ver apps/web/next.config.ts). Em cada deploy a data/hora é regerada.

const VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";
const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME ?? "";
const GIT_SHA = process.env.NEXT_PUBLIC_GIT_SHA ?? "";

export function Footer({ className = "" }: { className?: string }) {
  const year = new Date().getFullYear();

  const versionLabel = [
    `v${VERSION}`,
    BUILD_TIME && `build ${BUILD_TIME}`,
    GIT_SHA && GIT_SHA,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <footer
      className={`border-t border-border/60 py-4 text-center text-xs text-muted-foreground ${className}`}
    >
      <p>
        Copyright © {year} SimplesZap. Todos os direitos reservados.{" "}
        <span className="text-muted-foreground/70">·</span> Powered by{" "}
        <span className="font-medium text-primary">IT Booster</span>
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground/60" title={`Build: ${BUILD_TIME}`}>
        {versionLabel}
      </p>
    </footer>
  );
}

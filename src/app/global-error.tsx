"use client";

import { useEffect } from "react";
import Link from "next/link";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

export default function GlobalError({ error, retry }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <main
          style={{
            alignItems: "center",
            background: "#fafafa",
            color: "#18181b",
            display: "flex",
            fontFamily: "Arial, Helvetica, sans-serif",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "1.5rem",
            textAlign: "center",
          }}
        >
          <section style={{ maxWidth: "28rem" }}>
            <p style={{ color: "#991b1b", fontWeight: 700 }}>Erro 500</p>
            <h1 style={{ fontSize: "1.5rem", marginTop: "0.75rem" }}>
              O Agendaki encontrou um erro
            </h1>
            <p style={{ color: "#52525b", marginTop: "0.75rem" }}>
              Tente novamente. Se o problema continuar, recarregue a página.
            </p>
            <button
              onClick={retry}
              style={{
                background: "#115e59",
                border: 0,
                borderRadius: "0.5rem",
                color: "white",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: 600,
                marginTop: "1.5rem",
                padding: "0.75rem 1rem",
              }}
              type="button"
            >
              Tentar novamente
            </button>
            <Link
              href="/"
              style={{
                color: "#115e59",
                display: "block",
                fontWeight: 600,
                marginTop: "1rem",
              }}
            >
              Voltar ao início
            </Link>
          </section>
        </main>
      </body>
    </html>
  );
}

import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/produto")({
  beforeLoad: () => {
    throw redirect({ to: "/solucoes" });
  },
  component: () => null,
});

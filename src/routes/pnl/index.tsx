import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/pnl/")({
  beforeLoad: () => {
    throw redirect({ to: "/pnl/dashboard" });
  },
  component: () => null,
});

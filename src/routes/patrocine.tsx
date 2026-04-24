import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/patrocine")({
  beforeLoad: () => {
    throw redirect({ to: "/apoiar" });
  },
  component: () => null,
});

import { createFileRoute, redirect } from "@tanstack/react-router";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — route is registered once dev server regenerates routeTree.gen.ts
export const Route = createFileRoute("/painel/")({
  beforeLoad: () => {
    throw redirect({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      to: "/painel/chat" as any,
    });
  },
  component: () => null,
});

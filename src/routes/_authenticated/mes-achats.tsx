import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/mes-achats")({
  beforeLoad: () => {
    throw redirect({
      to: "/tableau-de-bord",
      search: { tab: "purchases" },
      replace: true,
    });
  },
  component: () => null,
});


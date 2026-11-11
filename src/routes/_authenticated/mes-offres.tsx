import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/mes-offres")({
  beforeLoad: () => {
    throw redirect({
      to: "/tableau-de-bord",
      search: { tab: "offers" },
      replace: true,
    });
  },
  component: () => null,
});

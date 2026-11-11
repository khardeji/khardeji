import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/mes-demandes")({
  beforeLoad: () => {
    throw redirect({
      to: "/tableau-de-bord",
      search: { tab: "requests" },
      replace: true,
    });
  },
  component: () => null,
});

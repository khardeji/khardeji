import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { getCatalog, getPricing } from "./catalog.functions";

export const catalogQuery = queryOptions({ queryKey: ["catalog"], queryFn: () => getCatalog() });
export const pricingQuery = queryOptions({ queryKey: ["pricing"], queryFn: () => getPricing() });

/** Live catalogue: approved listings and active categories. Routes must preload `catalogQuery` in their loader. */
export function useCatalog() {
  const { data } = useSuspenseQuery(catalogQuery);
  return useMemo(
    () => ({
      listings: data.listings,
      categories: data.categories,
      getListing: (id: string) => data.listings.find((l) => l.id === id),
      getCategory: (slug: string) => data.categories.find((c) => c.slug === slug),
    }),
    [data],
  );
}

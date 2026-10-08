import type { ComponentProps } from "react";
import { Link, type LinkProps } from "@tanstack/react-router";
import type { Id } from "../../../convex/_generated/dataModel";

/**
 * Opens Revisão rápida in escotista mode for one escoteiro
 * (`/revisao-rapida?escoteiroId=…`). The route options are cast so this
 * compiles before the route file exists; once it does, the cast can go and
 * `to`/`search` type-check against the route's search schema.
 */
export function RevisaoRapidaLink({
  escoteiroId,
  ...props
}: { escoteiroId: Id<"users"> } & Omit<ComponentProps<"a">, "href" | "ref">) {
  const route = {
    to: "/revisao-rapida",
    search: { escoteiroId },
  } as unknown as LinkProps;
  return <Link {...route} {...props} />;
}

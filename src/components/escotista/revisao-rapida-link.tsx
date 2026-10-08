import type { ComponentProps } from "react";
import { Link } from "@tanstack/react-router";
import type { Id } from "../../../convex/_generated/dataModel";

/**
 * Opens Revisão rápida in escotista mode for one escoteiro
 * (`/revisao-rapida?escoteiroId=…`).
 */
export function RevisaoRapidaLink({
  escoteiroId,
  ...props
}: { escoteiroId: Id<"users"> } & Omit<ComponentProps<"a">, "href" | "ref">) {
  return <Link to="/revisao-rapida" search={{ escoteiroId }} {...props} />;
}

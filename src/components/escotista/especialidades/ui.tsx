/**
 * Escotista-only pieces of the Especialidades surfaces (catalog, detail,
 * per-escoteiro ficha). Everything visual is a shared primitive:
 *   layout:  @/components/layout/page-header (PageHeader, BackButton, BackLink)
 *   ui:      @/components/ui/{section,list-row,search-input,filter-chips,
 *            segmented-control,status-pill,kpi-tile,progress-ring,
 *            empty-state,action-check,person-avatar}
 *   logic:   @/lib/specialty-catalog (catalog, search, ramo groups)
 *   colours: @/lib/design-tokens (+ @/data/eixo-colors)
 */
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { RamoGroup } from "@/lib/specialty-catalog";

export const RAMO_GROUP_LABEL: Record<RamoGroup, string> = {
  younger: "Lobinhos e Escoteiros",
  older: "Sêniores e Pioneiros",
};

/** The ramoGroup an escotista lands on: the first one they accompany. */
export function defaultRamoGroup(
  user: { isAdmin?: boolean; escotistaRamos?: string[] } | null,
): RamoGroup {
  const ramos = user?.escotistaRamos ?? [];
  if (user?.isAdmin) return "younger";
  if (ramos.some((r) => r === "lobinho" || r === "escoteiro")) return "younger";
  if (ramos.some((r) => r === "senior" || r === "pioneiro")) return "older";
  return "younger";
}

/** "/especialidades?escoteiroId=…&specialty=…" — the per-escoteiro ficha. */
export function FichaLink({
  escoteiroId,
  specialtyId,
  className,
  children,
}: {
  escoteiroId: string;
  specialtyId: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      to="/especialidades"
      search={{ escoteiroId, specialty: specialtyId }}
      className={className}
    >
      {children}
    </Link>
  );
}

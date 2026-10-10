import type { RequirementGroup } from "@/data/badge-data";
import type { BadgeStanding } from "@/lib/badge-standing";
import { ActionItem } from "./action-item";

/** Approved items a badge needs in all (Σ per-group `required`, else all). */
export function badgeNeeded(
  groups: RequirementGroup[],
  standing: BadgeStanding | undefined,
): number {
  return (
    standing?.needed ??
    groups.reduce((n, g) => n + Math.min(g.required ?? g.items.length, g.items.length), 0)
  );
}

/**
 * An insígnia's requirement checklist, grouped like the official list: each
 * group with its rule ("pelo menos duas…") and an x/needed counter, mandatory
 * items labelled. Tapping an item calls `onToggle` with its flat
 * requirementIndex; without `onToggle` the list is read-only.
 */
export function BadgeChecklist({
  badgeId,
  groups,
  standing,
  onToggle,
  color,
  lockApproved,
}: {
  badgeId: string;
  groups: RequirementGroup[];
  standing: BadgeStanding | undefined;
  onToggle?: (badgeId: string, requirementIndex: number) => void;
  color?: string;
  lockApproved?: boolean;
}) {
  const sections = groups.map((group, gi) => ({
    group,
    start: groups.slice(0, gi).reduce((n, g) => n + g.items.length, 0),
    gs: standing?.groups[gi],
  }));

  return (
    <div className="space-y-3">
      <p className="px-1 text-xs text-muted-foreground">
        Sem níveis: cumpra todos os grupos de requisitos para conquistar a
        insígnia.
      </p>
      {sections.map(({ group, start, gs }) => (
        <div
          key={start}
          className="border-2 border-black rounded-md divide-y-2 divide-black/20 bg-card"
        >
          {(group.title || group.rule) && (
            <div className="px-3 py-2 flex items-start gap-2">
              <div className="flex-1">
                {group.title && (
                  <p className="text-xs font-black uppercase tracking-wider">
                    {group.title}
                  </p>
                )}
                {group.rule && (
                  <p className="text-xs text-muted-foreground">{group.rule}</p>
                )}
              </div>
              <span
                className={`text-xs font-bold shrink-0 ${gs?.satisfied ? "text-emerald-700" : "text-muted-foreground"}`}
              >
                {gs?.satisfied ? "✓ " : ""}
                {Math.min(gs?.approvedCount ?? 0, gs?.needed ?? 0)}/
                {gs?.needed ?? group.required ?? group.items.length}
              </span>
            </div>
          )}
          {group.items.map((text, i) => {
            const index = start + i;
            const status = standing?.requirementStatus.get(index);
            const mandatory =
              group.required !== undefined && group.mandatory?.includes(i);
            return (
              <ActionItem
                key={index}
                id={`badge:${badgeId}:${index}`}
                text={mandatory ? `${text} (obrigatória)` : text}
                checked={!!status}
                status={status}
                onToggle={() => onToggle?.(badgeId, index)}
                color={color}
                lockApproved={lockApproved || !onToggle}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

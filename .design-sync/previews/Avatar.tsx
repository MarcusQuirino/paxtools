import {
  Avatar,
  AvatarFallback,
  AvatarBadge,
  AvatarGroup,
  AvatarGroupCount,
} from "paxtools";
import { Check } from "lucide-react";

export const Tamanhos = () => (
  <div className="flex items-center gap-4">
    <Avatar size="sm">
      <AvatarFallback>AB</AvatarFallback>
    </Avatar>
    <Avatar>
      <AvatarFallback>MC</AvatarFallback>
    </Avatar>
    <Avatar size="lg">
      <AvatarFallback>JP</AvatarFallback>
    </Avatar>
  </div>
);

/** AvatarBadge marks an escoteiro whose progression was just approved. */
export const ComBadge = () => (
  <div className="flex items-center gap-4">
    <Avatar size="lg">
      <AvatarFallback>AB</AvatarFallback>
      <AvatarBadge className="bg-primary text-white">
        <Check />
      </AvatarBadge>
    </Avatar>
    <Avatar>
      <AvatarFallback>MC</AvatarFallback>
      <AvatarBadge className="bg-destructive" />
    </Avatar>
  </div>
);

/** A patrulha roster collapses into an AvatarGroup with an overflow count. */
export const Patrulha = () => (
  <AvatarGroup>
    <Avatar>
      <AvatarFallback>AB</AvatarFallback>
    </Avatar>
    <Avatar>
      <AvatarFallback>MC</AvatarFallback>
    </Avatar>
    <Avatar>
      <AvatarFallback>JP</AvatarFallback>
    </Avatar>
    <AvatarGroupCount>+4</AvatarGroupCount>
  </AvatarGroup>
);

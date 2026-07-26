import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  Label,
} from "paxtools";

/** Closed trigger — the resting state in a form. */
export const Fechado = () => (
  <div className="flex flex-col gap-2 max-w-xs">
    <Label>Ramo</Label>
    <Select defaultValue="escoteiro">
      <SelectTrigger>
        <SelectValue placeholder="Selecione o ramo" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="lobinho">Lobinho</SelectItem>
        <SelectItem value="escoteiro">Escoteiro</SelectItem>
        <SelectItem value="senior">Sênior</SelectItem>
        <SelectItem value="pioneiro">Pioneiro</SelectItem>
      </SelectContent>
    </Select>
  </div>
);

/** Rendered `open` so the listbox surface is visible on the card. */
export const Aberto = () => (
  <div className="flex flex-col gap-2 max-w-xs">
    <Label>Ramo</Label>
    <Select open defaultValue="escoteiro">
      <SelectTrigger>
        <SelectValue placeholder="Selecione o ramo" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Ramos</SelectLabel>
          <SelectItem value="lobinho">Lobinho</SelectItem>
          <SelectItem value="escoteiro">Escoteiro</SelectItem>
          <SelectItem value="senior">Sênior</SelectItem>
          <SelectItem value="pioneiro">Pioneiro</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  </div>
);

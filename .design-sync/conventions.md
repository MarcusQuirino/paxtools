## How to build with PaxTools

PaxTools is the component library of a Brazilian Scouting progression tracker.
Its look is **neobrutalist**: warm cream background, emerald primary, a hard
2px black border on every interactive surface, and a solid offset drop shadow
instead of a blur. UI copy is **Portuguese (pt-BR)** — write labels in
Portuguese unless asked otherwise.

### Wrap the tree in `DesignPreviewProvider`

```jsx
const { DesignPreviewProvider, Button } = window.PaxTools;

<DesignPreviewProvider>
  <Button>Salvar progresso</Button>
</DesignPreviewProvider>
```

`PlanNav`, `SpecialtySection`, `BlocoCard` and `EixoSection` read TanStack
Router context (`useLocation`, `Link`). Outside the provider they throw and the
whole subtree renders nothing. It is harmless for components that don't need
it, so wrap once at the root and forget about it.

### Styling idiom: Tailwind utility classes + semantic tokens

Style with utility classes and **semantic token names**, never raw hex. The
token families below are all present in the shipped CSS:

| Family | Names |
|---|---|
| Surfaces | `bg-background` `bg-card` `bg-popover` `bg-muted` `bg-primary` `bg-secondary` `bg-accent` `bg-destructive` |
| Text | `text-foreground` `text-muted-foreground` `text-card-foreground` `text-primary` `text-primary-foreground` `text-secondary-foreground` `text-accent-foreground` |
| Borders / rings | `border-border` `border-input` `border-black` `ring-ring` |
| Hover | `hover:bg-primary` `hover:bg-secondary` `hover:bg-muted` `hover:bg-accent` `hover:bg-destructive` (and `hover:text-*` / `hover:border-*` of the same set) |

**IMPORTANT — the stylesheet is pre-compiled.** Designs are not run through
Tailwind, so only classes already in `_ds_bundle.css` do anything. The families
above plus ordinary layout/spacing/type utilities (`flex`, `grid`, `gap-*`,
`p-*`, `text-sm`, `font-bold`, `rounded-md`, `max-w-*`, …) are covered. A class
that isn't there fails **silently** — if something looks unstyled, that's why;
switch to a token above or use an inline `style`.

### The neobrutalist signature

Recreate it on your own containers with:

```
border-2 border-black rounded-md shadow-[3px_3px_0px_0px_#000]
```

Interactive surfaces "press" by moving into their shadow rather than dimming —
`Button` already does this, so prefer the real component over a styled `div`.
Shipped offsets are `1px`/`2px`/`3px`/`4px` and `0px_-2px` (used by `Sheet`).

### Colour that is NOT a token: eixo colours

The four progression axes carry catalog colours passed as **props**, not
classes — `color` / `colorLight` on `BlocoCard`, `ActionChecklist`,
`CustomActionInput`, `ActionItem`, `PlanStar`, and `indicatorColor` /
`pendingColor` on `Progress`. Pass hex here (e.g. `#E91E63` with `#FCE4EC`).

`Progress` renders two segments: `value` is approved progress and
`pendingValue` is work awaiting an escotista's approval.

### Where the truth lives

- `styles.css` → `@import`s `_ds_bundle.css`. Read it to confirm a class exists.
- `components/<group>/<Name>/<Name>.prompt.md` — per-component usage + props.
- `components/<group>/<Name>/<Name>.d.ts` — the exact prop contract.
- Compound parts (`AccordionItem`, `DialogContent`, `SelectItem`,
  `DropdownMenuItem`, `SheetContent`, `AvatarFallback`, …) have no cards of
  their own but are all on `window.PaxTools`.

### A representative composition

```jsx
const {
  DesignPreviewProvider, Accordion, AccordionItem, AccordionTrigger,
  AccordionContent, Badge, Progress, Button,
} = window.PaxTools;

<DesignPreviewProvider>
  <div className="bg-background p-6 flex flex-col gap-4 max-w-2xl">
    <h1 className="text-lg font-bold text-foreground">Minha progressão</h1>

    <div className="border-2 border-black rounded-md shadow-[3px_3px_0px_0px_#000] bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold">Habilidades para a Vida</span>
        <Badge variant="secondary">3/6</Badge>
      </div>
      <Progress value={40} pendingValue={70} indicatorColor="#E91E63" pendingColor="#FCE4EC" />
    </div>

    <Accordion type="single" collapsible defaultValue="a">
      <AccordionItem value="a">
        <AccordionTrigger>Aprendizagem Contínua</AccordionTrigger>
        <AccordionContent>
          <p className="text-sm text-muted-foreground">
            Explorar assuntos que você acha interessante.
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>

    <Button>Enviar para aprovação</Button>
  </div>
</DesignPreviewProvider>
```

### Toasts

`Toaster` renders nothing on its own. Mount it once and call `toast` — both
ship on `window.PaxTools` and share one sonner instance:

```jsx
const { Toaster, toast } = window.PaxTools;
// <Toaster /> somewhere in the tree, then:
toast.success("Progressão enviada para aprovação");
```

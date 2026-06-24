import { Toaster as SonnerToaster } from "sonner";

/**
 * App-styled sonner toaster. Mounted once at the root. Matches the bold
 * black-border / hard-shadow aesthetic used across the UI.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "border-2 border-black rounded-md shadow-[3px_3px_0px_0px_#000] bg-card text-foreground gap-2",
          title: "font-bold text-sm",
          description: "text-muted-foreground text-xs",
        },
      }}
    />
  );
}

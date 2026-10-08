import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { copyText } from "@/lib/clipboard";

// No DOM under bun test: stand in just enough of navigator/document to drive
// both the Clipboard API path and the textarea + execCommand fallback.
type FakeArea = {
  value: string;
  readOnly: boolean;
  style: { cssText: string };
  parent: FakeHost | null;
  selected: [number, number] | null;
  focus(): void;
  select(): void;
  setSelectionRange(a: number, b: number): void;
  remove(): void;
};
type FakeHost = { children: FakeArea[]; appendChild(a: FakeArea): void };

function fakeHost(): FakeHost {
  return {
    children: [],
    appendChild(a) {
      a.parent = this;
      this.children.push(a);
    },
  };
}

const g = globalThis as Record<string, unknown>;
const savedDocument = g.document;
const savedClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");

let body: FakeHost;
let execCommand: (cmd: string) => boolean;
let copiedOnExec: string | null;
// Hosts other than document.body that a test mounts the textarea into.
const extraHosts: FakeHost[] = [];

function setClipboard(writeText: (t: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
}

beforeEach(() => {
  body = fakeHost();
  copiedOnExec = null;
  execCommand = () => true;
  g.document = {
    body,
    createElement: (): FakeArea => ({
      value: "",
      readOnly: false,
      style: { cssText: "" },
      parent: null,
      selected: null,
      focus() {},
      select() {},
      setSelectionRange(a, b) {
        this.selected = [a, b];
      },
      remove() {
        if (this.parent) this.parent.children = this.parent.children.filter((c) => c !== this);
        this.parent = null;
      },
    }),
    execCommand: (cmd: string) => {
      // Record what was selected (in the DOM) at the moment of the copy.
      const area = [...body.children, ...extraHosts.flatMap((h) => h.children)].at(-1);
      copiedOnExec = area?.selected ? area.value : null;
      return execCommand(cmd);
    },
  };
});


afterEach(() => {
  g.document = savedDocument;
  if (savedClipboard) Object.defineProperty(navigator, "clipboard", savedClipboard);
  else delete (navigator as unknown as Record<string, unknown>).clipboard;
  extraHosts.length = 0;
});

describe("copyText", () => {
  it("uses the Clipboard API when it works", async () => {
    const written: string[] = [];
    setClipboard(async (t) => {
      written.push(t);
    });
    expect(await copyText("ABC123")).toBe(true);
    expect(written).toEqual(["ABC123"]);
    expect(body.children).toHaveLength(0);
  });

  it("falls back to a selected textarea + execCommand when the API refuses", async () => {
    setClipboard(async () => {
      throw new Error("NotAllowedError");
    });
    expect(await copyText("senha-temp")).toBe(true);
    expect(copiedOnExec).toBe("senha-temp");
    // The helper textarea never lingers.
    expect(body.children).toHaveLength(0);
  });

  it("falls back when the Clipboard API is missing entirely", async () => {
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    expect(await copyText("x")).toBe(true);
    expect(copiedOnExec).toBe("x");
  });

  it("mounts the textarea inside the given host (dialog focus trap)", async () => {
    setClipboard(async () => {
      throw new Error("denied");
    });
    const dialog = fakeHost();
    extraHosts.push(dialog);
    let seenInDialog = false;
    execCommand = () => {
      seenInDialog = dialog.children.length === 1;
      return true;
    };
    await copyText("y", dialog as unknown as HTMLElement);
    expect(seenInDialog).toBe(true);
    expect(body.children).toHaveLength(0);
    expect(dialog.children).toHaveLength(0);
  });

  it("reports failure when execCommand declines or throws", async () => {
    setClipboard(async () => {
      throw new Error("denied");
    });
    execCommand = () => false;
    expect(await copyText("z")).toBe(false);
    execCommand = () => {
      throw new Error("unsupported");
    };
    expect(await copyText("z")).toBe(false);
    expect(body.children).toHaveLength(0);
  });
});

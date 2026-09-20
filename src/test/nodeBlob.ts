import { afterAll, beforeAll, vi } from "vitest";

// fake-indexeddb structured-clones jsdom's Blob into {}; Node's Blob survives.
export function stubNodeBlob(): void {
  beforeAll(async () => {
    const { Blob: NodeBlob } = await vi.importActual<{ Blob: typeof Blob }>("node:buffer");
    vi.stubGlobal("Blob", NodeBlob);
  });
  afterAll(() => vi.unstubAllGlobals());
}

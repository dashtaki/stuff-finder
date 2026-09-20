import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../db/db";
import { addItem } from "../db/items";
import { routes } from "../routes";

describe("DebugPage", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", {
      ...navigator,
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 2_000_000, quota: 100_000_000 }),
        persisted: vi.fn().mockResolvedValue(true),
      },
    });
  });
  afterEach(async () => {
    vi.unstubAllGlobals();
    await db.items.clear();
  });

  it("shows count, storage, persistence, and version", async () => {
    await addItem({ name: "A", location: "B" });
    const router = createMemoryRouter(routes, { initialEntries: ["/debug"] });
    render(<RouterProvider router={router} />);

    await waitFor(() => expect(screen.getByText("Items: 1")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("Storage: 1.9 MB of 95.4 MB")).toBeInTheDocument());
    expect(screen.getByText("Persistent storage: yes")).toBeInTheDocument();
    expect(screen.getByText(/^Version: /)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
  });
});

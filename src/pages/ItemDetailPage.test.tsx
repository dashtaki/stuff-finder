import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { db } from "../db/db";
import { addItem, getItem } from "../db/items";
import { routes } from "../routes";

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

describe("ItemDetailPage", () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    await db.items.clear();
  });

  it("shows the item and links to edit", async () => {
    const id = await addItem({ name: "Passport", location: "Safe", note: "top shelf" });
    renderAt(`/item/${id}`);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Passport" })).toBeInTheDocument(),
    );
    expect(screen.getByText("Safe")).toBeInTheDocument();
    expect(screen.getByText("top shelf")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit" })).toHaveAttribute("href", `/item/${id}/edit`);
  });

  it("shows not found for an unknown id", async () => {
    renderAt("/item/9999");
    await waitFor(() => expect(screen.getByText("Item not found")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Back to all items" })).toHaveAttribute("href", "/");
  });

  it("shows not found for a non-numeric id", async () => {
    renderAt("/item/abc");
    await waitFor(() => expect(screen.getByText("Item not found")).toBeInTheDocument());
  });

  it("cancel in the confirm dialog keeps the item", async () => {
    const id = await addItem({ name: "Keys", location: "Hook" });
    renderAt(`/item/${id}`);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Keys" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await getItem(id)).toBeDefined();
  });

  it("confirm deletes and goes to the dashboard", async () => {
    const id = await addItem({ name: "Keys", location: "Hook" });
    const router = renderAt(`/item/${id}`);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Keys" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete item" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
    expect(await getItem(id)).toBeUndefined();
  });

  it("shows a delete error and closes the dialog when delete fails", async () => {
    const id = await addItem({ name: "Keys", location: "Hook" });
    renderAt(`/item/${id}`);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Keys" })).toBeInTheDocument());
    vi.spyOn(db.items, "delete").mockRejectedValue(new Error("boom"));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete item" }));
    await waitFor(() =>
      expect(screen.getByText("Could not delete this item.")).toBeInTheDocument(),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await getItem(id)).toBeDefined();
  });
});

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "../db/db";
import { addItem, getItem } from "../db/items";
import { routes } from "../routes";
import { stubNodeBlob } from "../test/nodeBlob";

stubNodeBlob();

describe("EditItemPage", () => {
  afterEach(() => db.items.clear());

  it("prefills, saves changes, and returns to the detail page", async () => {
    const id = await addItem({ name: "Keys", location: "Hook" });
    const router = createMemoryRouter(routes, { initialEntries: [`/item/${id}/edit`] });
    render(<RouterProvider router={router} />);

    await waitFor(() => expect(screen.getByLabelText("Name")).toHaveValue("Keys"));
    await userEvent.clear(screen.getByLabelText("Location"));
    await userEvent.type(screen.getByLabelText("Location"), "Drawer");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(router.state.location.pathname).toBe(`/item/${id}`));
    expect((await getItem(id))?.location).toBe("Drawer");
  });

  it("removes the photo when the user removes it", async () => {
    const photo = new Blob(["x"], { type: "image/jpeg" });
    const id = await addItem({ name: "Wallet", location: "Bag", photo });
    const router = createMemoryRouter(routes, { initialEntries: [`/item/${id}/edit`] });
    render(<RouterProvider router={router} />);

    await userEvent.click(await screen.findByRole("button", { name: "Remove photo" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(router.state.location.pathname).toBe(`/item/${id}`));
    expect((await getItem(id))?.photo).toBeUndefined();
  });

  it("shows not found for an unknown id", async () => {
    const router = createMemoryRouter(routes, { initialEntries: ["/item/9999/edit"] });
    render(<RouterProvider router={router} />);
    await waitFor(() => expect(screen.getByText("Item not found")).toBeInTheDocument());
  });
});

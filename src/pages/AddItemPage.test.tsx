import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "../db/db";
import { listItems } from "../db/items";
import { routes } from "../routes";

describe("AddItemPage", () => {
  afterEach(() => db.items.clear());

  it("saves an item and goes back to the dashboard", async () => {
    const router = createMemoryRouter(routes, { initialEntries: ["/new"] });
    render(<RouterProvider router={router} />);

    await userEvent.type(screen.getByLabelText("Name"), "Keys");
    await userEvent.type(screen.getByLabelText("Location"), "Hook");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
    const items = await listItems();
    expect(items.map((i) => i.name)).toEqual(["Keys"]);
  });

  it("cancel goes back to the dashboard without saving", async () => {
    const router = createMemoryRouter(routes, { initialEntries: ["/new"] });
    render(<RouterProvider router={router} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
    expect(await listItems()).toEqual([]);
  });
});

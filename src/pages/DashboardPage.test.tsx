import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "../db/db";
import { addItem } from "../db/items";
import { routes } from "../routes";

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

describe("DashboardPage", () => {
  afterEach(() => {
    cleanup();
    return db.items.clear();
  });

  it("shows the empty state with an add link when there are no items", async () => {
    renderAt("/");
    await waitFor(() =>
      expect(screen.getByText("Nothing saved yet. Add your first item.")).toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: "Add item" })).toHaveAttribute("href", "/new");
  });

  it("lists items and filters by search", async () => {
    await addItem({ name: "Car keys", location: "Drawer" });
    await addItem({ name: "Passport", location: "Safe" });
    renderAt("/");
    await waitFor(() => expect(screen.getByText("Passport")).toBeInTheDocument());

    await userEvent.type(screen.getByLabelText("Search items"), "car");
    await waitFor(() => expect(screen.queryByText("Passport")).not.toBeInTheDocument());
    expect(screen.getByText("Car keys")).toBeInTheDocument();
  });

  it("shows a no-match message", async () => {
    await addItem({ name: "Car keys", location: "Drawer" });
    renderAt("/");
    await waitFor(() => expect(screen.getByText("Car keys")).toBeInTheDocument());
    await userEvent.type(screen.getByLabelText("Search items"), "zzz");
    await waitFor(() => expect(screen.getByText("No items match")).toBeInTheDocument());
  });

  it("has a link to add a new item", async () => {
    await addItem({ name: "Car keys", location: "Drawer" });
    renderAt("/");
    await waitFor(() => expect(screen.getByText("Car keys")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Add item" })).toHaveAttribute("href", "/new");
  });
});

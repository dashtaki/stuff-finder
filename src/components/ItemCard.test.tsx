import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import type { Item } from "../db/db";
import { ItemCard } from "./ItemCard";

const item: Item = {
  id: 7,
  name: "Car keys",
  location: "Kitchen drawer",
  note: "",
  createdAt: Date.now() - 120_000,
  updatedAt: Date.now() - 120_000,
};

describe("ItemCard", () => {
  it("shows name, location, relative time, and links to detail", () => {
    render(
      <MemoryRouter>
        <ItemCard item={item} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Car keys")).toBeInTheDocument();
    expect(screen.getByText("Kitchen drawer")).toBeInTheDocument();
    expect(screen.getByText("2 minutes ago")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/item/7");
  });

  it("shows a placeholder when there is no photo", () => {
    render(
      <MemoryRouter>
        <ItemCard item={item} />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText("No photo")).toBeInTheDocument();
  });
});

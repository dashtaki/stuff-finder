import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Item } from "../db/db";
import { StorageError } from "../db/items";
import { ItemForm } from "./ItemForm";

describe("ItemForm", () => {
  it("blocks submit when name or location is empty", async () => {
    const onSubmit = vi.fn();
    render(<ItemForm submitLabel="Save" onSubmit={onSubmit} onCancel={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Name is required")).toBeInTheDocument();
    expect(screen.getByText("Location is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits trimmed values", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ItemForm submitLabel="Save" onSubmit={onSubmit} onCancel={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("Name"), "  Keys ");
    await userEvent.type(screen.getByLabelText("Location"), " Hook ");
    await userEvent.type(screen.getByLabelText("Note"), " spare ");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: "Keys",
        location: "Hook",
        note: "spare",
        photo: null,
      }),
    );
  });

  it("prefills from initial", () => {
    const initial: Item = {
      id: 1,
      name: "Passport",
      location: "Safe",
      note: "top shelf",
      createdAt: 1,
      updatedAt: 1,
    };
    render(<ItemForm initial={initial} submitLabel="Save" onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText("Name")).toHaveValue("Passport");
    expect(screen.getByLabelText("Location")).toHaveValue("Safe");
    expect(screen.getByLabelText("Note")).toHaveValue("top shelf");
  });

  it("shows the error message when onSubmit throws", async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(
        new StorageError("Could not save. Your device may be out of storage.", new Error("quota")),
      );
    render(<ItemForm submitLabel="Save" onSubmit={onSubmit} onCancel={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("Name"), "Keys");
    await userEvent.type(screen.getByLabelText("Location"), "Hook");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(
        screen.getByText("Could not save. Your device may be out of storage."),
      ).toBeInTheDocument(),
    );
  });

  it("calls onCancel", async () => {
    const onCancel = vi.fn();
    render(<ItemForm submitLabel="Save" onSubmit={vi.fn()} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });
});

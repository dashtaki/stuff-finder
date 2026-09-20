import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PhotoInput } from "./PhotoInput";

vi.mock("../lib/shrinkImage", () => ({
  shrinkImage: vi.fn(),
}));

import { shrinkImage } from "../lib/shrinkImage";

describe("PhotoInput", () => {
  afterEach(() => vi.clearAllMocks());

  it("shrinks the chosen file and reports it", async () => {
    const small = new Blob(["small"], { type: "image/jpeg" });
    vi.mocked(shrinkImage).mockResolvedValue(small);
    const onChange = vi.fn();
    render(<PhotoInput value={null} onChange={onChange} />);

    const file = new File(["big"], "photo.png", { type: "image/png" });
    await userEvent.upload(screen.getByLabelText("Take photo"), file);

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(small));
  });

  it("shows an error when shrinking fails", async () => {
    vi.mocked(shrinkImage).mockRejectedValue(new Error("Could not process the photo"));
    render(<PhotoInput value={null} onChange={vi.fn()} />);
    await userEvent.upload(
      screen.getByLabelText("Take photo"),
      new File(["x"], "p.png", { type: "image/png" }),
    );
    await waitFor(() =>
      expect(screen.getByText("Could not process the photo")).toBeInTheDocument(),
    );
  });

  it("offers remove when a photo is set", async () => {
    vi.stubGlobal("URL", { ...URL, createObjectURL: () => "blob:x", revokeObjectURL: () => {} });
    const onChange = vi.fn();
    render(<PhotoInput value={new Blob(["x"])} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Remove photo" }));
    expect(onChange).toHaveBeenCalledWith(null);
    vi.unstubAllGlobals();
  });
});

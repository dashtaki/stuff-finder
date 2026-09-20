import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_EDGE, shrinkImage, targetSize } from "./shrinkImage";

// jsdom's Blob has no text(); read it through FileReader so the assertions below can stay as-is.
if (typeof Blob.prototype.text !== "function") {
  Blob.prototype.text = function (this: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(this);
    });
  };
}

describe("targetSize", () => {
  it("keeps small images as they are", () => {
    expect(targetSize(800, 600)).toEqual({ width: 800, height: 600 });
  });
  it("caps the long edge for landscape", () => {
    expect(targetSize(4000, 3000)).toEqual({ width: MAX_EDGE, height: 900 });
  });
  it("caps the long edge for portrait", () => {
    expect(targetSize(3000, 4000)).toEqual({ width: 900, height: MAX_EDGE });
  });
});

describe("shrinkImage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function stubCanvas(width: number, height: number) {
    const drawImage = vi.fn();
    const close = vi.fn();
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width, height, close }));
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (
      this: HTMLCanvasElement,
      callback: BlobCallback,
      type?: string,
    ) {
      callback(new Blob([`${this.width}x${this.height}`], { type }));
    });
    return { drawImage, close };
  }

  it("returns a JPEG blob drawn at the target size", async () => {
    const { drawImage, close } = stubCanvas(4000, 3000);
    const input = new Blob(["fake"], { type: "image/png" });
    const output = await shrinkImage(input);
    expect(output.type).toBe("image/jpeg");
    expect(await output.text()).toBe("1200x900");
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1200, 900);
    expect(close).toHaveBeenCalled();
  });

  it("rejects when the canvas cannot encode", async () => {
    stubCanvas(100, 100);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) =>
      callback(null),
    );
    await expect(shrinkImage(new Blob(["x"]))).rejects.toThrow("Could not process the photo");
  });
});

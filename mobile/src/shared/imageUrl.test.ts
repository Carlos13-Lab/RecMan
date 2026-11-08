import { resolveImageUrl } from "./imageUrl";

describe("resolveImageUrl", () => {
  it("prefixes a relative path with the API origin", () => {
    expect(resolveImageUrl("/uploads/recipes/a.png", "http://10.0.2.2:4000")).toBe("http://10.0.2.2:4000/uploads/recipes/a.png");
  });
  it("tolerates a trailing slash on the base and a missing leading slash", () => {
    expect(resolveImageUrl("uploads/a.png", "http://api/")).toBe("http://api/uploads/a.png");
  });
  it("keeps absolute URLs", () => {
    expect(resolveImageUrl("https://cdn.x/a.png", "http://api")).toBe("https://cdn.x/a.png");
  });
  it("returns null when there is no image", () => {
    expect(resolveImageUrl(null, "http://api")).toBeNull();
    expect(resolveImageUrl(undefined, "http://api")).toBeNull();
    expect(resolveImageUrl("", "http://api")).toBeNull();
  });
});

/**
 * FacilitatorRegistry dispatch tests. Pure-fn — no chain, no HTTP.
 */

import { expect } from "chai";

import {
  FacilitatorAdapter,
  FacilitatorRegistry,
  MockFacilitator,
  NoFacilitatorRegisteredError,
  UnknownFacilitatorError,
  DuplicateFacilitatorError,
} from "../src/facilitators";

interface FakeReq {
  header(name: string): string | undefined;
}

function makeReq(headers: Record<string, string> = {}): FakeReq {
  return {
    header(name: string): string | undefined {
      return headers[name.toLowerCase()];
    },
  };
}

describe("FacilitatorRegistry", () => {
  let registry: FacilitatorRegistry;
  let mockA: FacilitatorAdapter;
  let mockB: FacilitatorAdapter;

  beforeEach(() => {
    delete process.env.TRUSTGATE_DEFAULT_FACILITATOR;
    registry = new FacilitatorRegistry();
    mockA = new MockFacilitator();
    mockB = Object.assign(new MockFacilitator(), { name: "alt" });
  });

  it("registers and looks up by name", () => {
    registry.register(mockA);
    expect(registry.has("mock")).to.equal(true);
    expect(registry.get("mock")).to.equal(mockA);
  });

  it("throws DuplicateFacilitatorError on second register of same name", () => {
    registry.register(mockA);
    expect(() => registry.register(new MockFacilitator()))
      .to.throw(DuplicateFacilitatorError);
  });

  it("get throws UnknownFacilitatorError on miss", () => {
    registry.register(mockA);
    expect(() => registry.get("does-not-exist")).to.throw(UnknownFacilitatorError);
  });

  it("getActiveAdapter throws NoFacilitatorRegisteredError when empty", () => {
    expect(() => registry.getActiveAdapter(makeReq() as any))
      .to.throw(NoFacilitatorRegisteredError);
  });

  it("dispatches via X-Facilitator header", () => {
    registry.register(mockA);
    registry.register(mockB);
    const req = makeReq({ "x-facilitator": "alt" });
    expect(registry.getActiveAdapter(req as any)).to.equal(mockB);
  });

  it("dispatches via env TRUSTGATE_DEFAULT_FACILITATOR when no header", () => {
    registry.register(mockA);
    registry.register(mockB);
    process.env.TRUSTGATE_DEFAULT_FACILITATOR = "alt";
    expect(registry.getActiveAdapter(makeReq() as any)).to.equal(mockB);
  });

  it("dispatches via programmatic default when no header / env", () => {
    registry.register(mockA);
    registry.register(mockB);
    registry.setDefault("mock");
    expect(registry.getActiveAdapter(makeReq() as any)).to.equal(mockA);
  });

  it("falls through to single registered adapter when no defaults set", () => {
    registry.register(mockA);
    expect(registry.getActiveAdapter(makeReq() as any)).to.equal(mockA);
  });

  it("X-Facilitator header overrides env + programmatic default", () => {
    registry.register(mockA);
    registry.register(mockB);
    process.env.TRUSTGATE_DEFAULT_FACILITATOR = "mock";
    registry.setDefault("mock");
    const req = makeReq({ "x-facilitator": "alt" });
    expect(registry.getActiveAdapter(req as any)).to.equal(mockB);
  });

  it("setDefault throws UnknownFacilitatorError on unregistered name", () => {
    registry.register(mockA);
    expect(() => registry.setDefault("missing")).to.throw(UnknownFacilitatorError);
  });

  it("UnknownFacilitatorError lists registered adapters", () => {
    registry.register(mockA);
    registry.register(mockB);
    try {
      registry.get("ghost");
      expect.fail("expected throw");
    } catch (e) {
      expect((e as Error).message).to.include("mock");
      expect((e as Error).message).to.include("alt");
    }
  });

  it("unregister removes adapter and clears default if matched", () => {
    registry.register(mockA);
    registry.setDefault("mock");
    expect(registry.unregister("mock")).to.equal(true);
    expect(registry.has("mock")).to.equal(false);
    expect(registry.getDefaultName()).to.equal(undefined);
  });
});

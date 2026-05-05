/**
 * `FacilitatorRegistry` — central Map of registered adapters + dispatch.
 *
 * Strategy + Registry pattern. Each registered `FacilitatorAdapter` lives at a
 * stable string key (its `.name`). Routes call `getActiveAdapter(req)` per
 * request to pick which adapter handles it.
 *
 * Resolution order (highest precedence first):
 *
 *   1. `X-Facilitator: <name>` request header
 *   2. `process.env.TRUSTGATE_DEFAULT_FACILITATOR`
 *   3. `setDefault(name)` — programmatic default at boot
 *   4. The single registered adapter (when only one is registered)
 *
 * If none of those resolve, throws `UnknownFacilitatorError` so the route
 * returns 400 with a clear "register or set default" diagnostic.
 *
 * The registry never silently falls back across adapters — picking the wrong
 * one corrupts policy decisions. Mismatches surface as 400, never 500.
 */

import type { Request as ExpressRequest } from "express";

import { FacilitatorAdapter } from "./types";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class UnknownFacilitatorError extends Error {
  constructor(name: string, available: ReadonlyArray<string>) {
    super(
      `Unknown facilitator "${name}". Registered: [${available.join(", ")}]. ` +
      `Set X-Facilitator header to one of those, or env ` +
      `TRUSTGATE_DEFAULT_FACILITATOR, or call registry.setDefault(name).`,
    );
    this.name = "UnknownFacilitatorError";
  }
}

export class NoFacilitatorRegisteredError extends Error {
  constructor() {
    super(
      "No facilitator adapters registered. Call registry.register(...) at boot " +
      "before mounting routes.",
    );
    this.name = "NoFacilitatorRegisteredError";
  }
}

export class DuplicateFacilitatorError extends Error {
  constructor(name: string) {
    super(`Facilitator "${name}" is already registered.`);
    this.name = "DuplicateFacilitatorError";
  }
}

/**
 * Thrown by stub adapters and by methods an adapter has not yet wired.
 * Routes catch this and surface 501 Not Implemented to the caller.
 */
export class NotImplementedError extends Error {
  constructor(adapterName: string, method: string) {
    super(`${adapterName}.${method} is not implemented in this build.`);
    this.name = "NotImplementedError";
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const X_FACILITATOR_HEADER = "x-facilitator";
const ENV_DEFAULT_FACILITATOR = "TRUSTGATE_DEFAULT_FACILITATOR";

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export class FacilitatorRegistry {
  private readonly adapters = new Map<string, FacilitatorAdapter>();
  private programmaticDefault?: string;

  /** Register an adapter. Throws on duplicate `.name`. */
  register(adapter: FacilitatorAdapter): this {
    if (this.adapters.has(adapter.name)) {
      throw new DuplicateFacilitatorError(adapter.name);
    }
    this.adapters.set(adapter.name, adapter);
    return this;
  }

  /** Remove an adapter by name. Returns whether it was present. */
  unregister(name: string): boolean {
    if (this.programmaticDefault === name) this.programmaticDefault = undefined;
    return this.adapters.delete(name);
  }

  has(name: string): boolean {
    return this.adapters.has(name);
  }

  /** Get adapter by name. Throws `UnknownFacilitatorError` on miss. */
  get(name: string): FacilitatorAdapter {
    const adapter = this.adapters.get(name);
    if (!adapter) throw new UnknownFacilitatorError(name, this.names());
    return adapter;
  }

  /** Names of every registered adapter, insertion order. */
  names(): ReadonlyArray<string> {
    return Array.from(this.adapters.keys());
  }

  /** Set the programmatic default. Adapter must already be registered. */
  setDefault(name: string): this {
    if (!this.adapters.has(name)) {
      throw new UnknownFacilitatorError(name, this.names());
    }
    this.programmaticDefault = name;
    return this;
  }

  /** Currently active programmatic default, if any. */
  getDefaultName(): string | undefined {
    return this.programmaticDefault;
  }

  /** Resolve the adapter that should handle this request. */
  getActiveAdapter(req: ExpressRequest): FacilitatorAdapter {
    if (this.adapters.size === 0) throw new NoFacilitatorRegisteredError();

    const headerName = readHeader(req, X_FACILITATOR_HEADER);
    if (headerName) return this.get(headerName);

    const envDefault = process.env[ENV_DEFAULT_FACILITATOR]?.trim();
    if (envDefault) return this.get(envDefault);

    if (this.programmaticDefault) return this.get(this.programmaticDefault);

    if (this.adapters.size === 1) {
      const only = this.adapters.values().next().value;
      if (only) return only;
    }

    throw new UnknownFacilitatorError("<no header, env, or default>", this.names());
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readHeader(req: ExpressRequest, name: string): string | undefined {
  const value = req.header(name);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

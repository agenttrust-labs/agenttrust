//! Smoke test — verifies the Kani toolchain compiles + runs against this crate.
//! Trivial property; if this fails, every other proof will fail.

#[kani::proof]
fn smoke_kani_works() {
    let x: u8 = kani::any();
    kani::assume(x < 10);
    kani::assert(x < 20, "x < 10 implies x < 20");
}

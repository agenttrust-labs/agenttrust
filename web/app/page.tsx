import { Foundation } from "@/components/Foundation";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { Integrate } from "@/components/Integrate";
import { Nav } from "@/components/Nav";
import { Trinity } from "@/components/Trinity";
import { Verification } from "@/components/Verification";

export default function Home() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <Hero />
        <Trinity />
        <Foundation />
        <Verification />
        <Integrate />
      </main>
      <Footer />
    </>
  );
}

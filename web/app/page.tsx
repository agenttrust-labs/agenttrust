import Hero from "@/components/Hero";
import SectionMarkers from "@/components/SectionMarkers";
import TopNav from "@/components/TopNav";

export default function Home() {
  return (
    <>
      <TopNav />
      <SectionMarkers />
      <main aria-label="AgentTrust landing page">
        <Hero />
      </main>
    </>
  );
}

import BenchmarkSection from "@/components/BenchmarkSection";
import Hero from "@/components/Hero";
import SectionMarkers from "@/components/SectionMarkers";
import StorytellingSection from "@/components/StorytellingSection";
import TopNav from "@/components/TopNav";

export default function Home() {
  return (
    <>
      <TopNav />
      <SectionMarkers />
      <main aria-label="AgentTrust landing page">
        <Hero />
        <BenchmarkSection />
        <StorytellingSection />
      </main>
    </>
  );
}

import BenchmarkSection from "@/components/BenchmarkSection";
import EventsSection from "@/components/EventsSection";
import ExploreSection from "@/components/ExploreSection";
import Hero from "@/components/Hero";
import MediaSection from "@/components/MediaSection";
import NetworkSection from "@/components/NetworkSection";
import PerformanceSection from "@/components/PerformanceSection";
import PlugAndPlaySection from "@/components/PlugAndPlaySection";
import SectionMarkers from "@/components/SectionMarkers";
import StorytellingSection from "@/components/StorytellingSection";
import TopNav from "@/components/TopNav";
import TrilemmaSection from "@/components/TrilemmaSection";

export default function Home() {
  return (
    <>
      <TopNav />
      <SectionMarkers />
      <main aria-label="AgentTrust landing page">
        <Hero />
        <BenchmarkSection />
        <StorytellingSection />
        <PerformanceSection />
        <PlugAndPlaySection />
        <NetworkSection />
        <TrilemmaSection />
        <ExploreSection />
        <EventsSection />
        <MediaSection />
      </main>
    </>
  );
}

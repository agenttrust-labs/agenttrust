import type { Metadata } from "next";
import Link from "next/link";
import BlogTopBar from "@/components/blog/BlogTopBar";
import { PUBLIC_LINKS } from "@/data/links";
import { formatPostDate, getAllPosts } from "@/lib/posts";

import styles from "@/app/blog/blog.module.css";

export const metadata: Metadata = {
  title: "Blog | AgentTrust",
  description:
    "Field notes from AgentTrust on agent identity, payment policy, and formal verification.",
  alternates: {
    canonical: `${PUBLIC_LINKS.site}/blog`,
  },
  openGraph: {
    type: "website",
    title: "Blog | AgentTrust",
    description:
      "Field notes from AgentTrust on agent identity, payment policy, and formal verification.",
    url: `${PUBLIC_LINKS.site}/blog`,
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog | AgentTrust",
    description:
      "Field notes from AgentTrust on agent identity, payment policy, and formal verification.",
  },
};

export default async function BlogIndexPage() {
  const posts = await getAllPosts();

  return (
    <div className={styles.page}>
      <BlogTopBar />
      <main className={styles.shell} aria-label="AgentTrust blog index">
        <header className={styles.indexHeader}>
          <p className={styles.eyebrow}>AGENTTRUST</p>
          <h1 className={styles.indexTitle}>Writing</h1>
          <p className={styles.indexLede}>
            Notes on identity, policy, and feedback as AgentTrust ships toward the
            Solana mainnet payment lane.
          </p>
        </header>

        <section className={styles.grid} aria-label="Blog posts">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className={styles.card}
              aria-label={post.title}
            >
              <div className={styles.cardCover} aria-hidden="true">
                <span className={styles.cardSlug}>{post.slug}</span>
              </div>
              <div className={styles.cardBody}>
                <h2 className={styles.cardTitle}>{post.title}</h2>
                <p className={styles.cardExcerpt}>{post.description}</p>
                <p className={styles.cardMeta}>
                  <time dateTime={post.date}>{formatPostDate(post.date)}</time>
                </p>
              </div>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}

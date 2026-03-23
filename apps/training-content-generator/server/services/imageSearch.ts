const UNSPLASH_BASE = "https://api.unsplash.com";

export async function searchTopicImages(
  queries: string[]
): Promise<Record<string, string>> {
  const accessKey = process.env["UNSPLASH_ACCESS_KEY"];
  if (!accessKey) {
    return {};
  }

  const unique = [...new Set(queries)];
  const results: Record<string, string> = {};

  await Promise.all(
    unique.map(async (query) => {
      try {
        const url = `${UNSPLASH_BASE}/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape&w=1200`;
        const searchRes = await fetch(url, {
          headers: { Authorization: `Client-ID ${accessKey}` },
        });

        if (!searchRes.ok) return;

        const data = (await searchRes.json()) as {
          results: { urls: { regular: string } }[];
        };
        const imgUrl = data.results?.[0]?.urls?.regular;
        if (!imgUrl) return;

        const imgRes = await fetch(imgUrl);
        if (!imgRes.ok) return;

        const buffer = Buffer.from(await imgRes.arrayBuffer());
        results[query] = `data:image/jpeg;base64,${buffer.toString("base64")}`;
      } catch (err) {
        console.error(`Image search failed for "${query}":`, err);
      }
    })
  );

  return results;
}

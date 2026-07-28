export async function fetchLoaderVersions(mcVersion, loaderType) {
  if (!mcVersion || !loaderType || loaderType === 'vanilla') {
    return [];
  }

  try {
    if (loaderType === 'fabric') {
      const res = await fetch(`https://meta.fabricmc.net/v2/versions/loader/${mcVersion}`);
      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data.map((item, index) => ({
        version: item.loader.version,
        isLatest: index === 0,
        isRecommended: item.loader.stable || index === 0,
      }));
    }

    if (loaderType === 'quilt') {
      const res = await fetch(`https://meta.quiltmc.org/v3/versions/loader/${mcVersion}`);
      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data.map((item, index) => ({
        version: item.loader.version,
        isLatest: index === 0,
        isRecommended: index === 0,
      }));
    }

    if (loaderType === 'forge') {
      const res = await fetch('https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json');
      if (!res.ok) return [];
      const data = await res.json();
      const promos = data.promos || {};
      const recommended = promos[`${mcVersion}-recommended`];
      const latest = promos[`${mcVersion}-latest`];
      const fallback = promos[mcVersion];
      const result = [];
      const added = new Set();

      if (recommended) {
        result.push({ version: recommended, isRecommended: true, isLatest: recommended === latest });
        added.add(recommended);
      }
      if (latest && !added.has(latest)) {
        result.push({ version: latest, isLatest: true, isRecommended: false });
        added.add(latest);
      }
      if (fallback && !added.has(fallback)) {
        result.push({ version: fallback, isLatest: false, isRecommended: false });
        added.add(fallback);
      }
      return result;
    }

    if (loaderType === 'neoforge') {
      const res = await fetch('https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoforge');
      if (!res.ok) return [];
      const data = await res.json();
      const all = Array.isArray(data.versions) ? data.versions : [];
      const parts = mcVersion.split('.');
      const minor = parts[1] || '20';
      const patch = parts[2] || '0';
      const prefix = `${minor}.${patch}.`;

      const matched = all.filter(v => v.startsWith(prefix)).reverse();
      if (matched.length === 0) {
        // Try matching minor prefix if no patch match
        const minorPrefix = `${minor}.`;
        const minorMatched = all.filter(v => v.startsWith(minorPrefix)).reverse();
        return minorMatched.slice(0, 15).map((v, index) => ({
          version: v,
          isLatest: index === 0,
          isRecommended: index === 0,
        }));
      }

      return matched.map((v, index) => ({
        version: v,
        isLatest: index === 0,
        isRecommended: index === 0,
      }));
    }
  } catch (err) {
    console.error('Error fetching loader versions:', err);
  }

  return [];
}

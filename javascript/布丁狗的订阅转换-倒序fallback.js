function toRegExp(pattern) {
  if (!pattern) return null;

  try {
    const caseInsensitive = pattern.startsWith("(?i)");
    const source = caseInsensitive ? pattern.slice(4) : pattern;
    return new RegExp(source, caseInsensitive ? "i" : "");
  } catch (error) {
    return null;
  }
}

function buildReversedProxyNames(config, group) {
  const proxies = Array.isArray(config.proxies) ? config.proxies : [];
  const includePattern = toRegExp(group.filter);
  const excludePattern = toRegExp(group["exclude-filter"]);

  const names = proxies
    .filter((proxy) => {
      if (!proxy || !proxy.name) return false;
      if (excludePattern && excludePattern.test(proxy.name)) return false;
      if (includePattern && !includePattern.test(proxy.name)) return false;
      return true;
    })
    .map((proxy) => proxy.name)
    .reverse();

  if (Array.isArray(group.proxies) && group.proxies.length > 0) {
    return [...group.proxies].reverse();
  }

  return names;
}

function main(config) {
  if (!Array.isArray(config["proxy-groups"])) return config;

  for (const group of config["proxy-groups"]) {
    if (!group || group.type !== "fallback") continue;

    const reversedNames = buildReversedProxyNames(config, group);
    if (reversedNames.length === 0) continue;

    group.proxies = reversedNames;
    delete group["include-all"];
  }

  return config;
}

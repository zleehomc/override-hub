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

const TIER_SCORE = new Map([
  ["❻", 60],
  ["⑥", 60],
  ["➏", 60],
  ["❺", 50],
  ["⑤", 50],
  ["➎", 50],
  ["❹", 40],
  ["④", 40],
  ["➍", 40],
  ["❸", 30],
  ["③", 30],
  ["➌", 30],
  ["❷", 20],
  ["②", 20],
  ["➋", 20],
  ["❶", 10],
  ["①", 10],
  ["➊", 10],
  ["⓪", 0],
  ["⓿", 0],
]);

function tierScore(name) {
  for (const [marker, score] of TIER_SCORE) {
    if (name.includes(marker)) return score;
  }

  return -1;
}

function nodeCost(name) {
  const match = name.match(/\bx\s*(\d+(?:\.\d+)?)/i);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

function shouldExcludeProxyName(name, excludePattern) {
  if (excludePattern && excludePattern.test(name)) return true;

  return /维护|Maintenance|下载专用/i.test(name);
}

function preferredProxyNames(names) {
  return names
    .map((name, index) => ({ name, index }))
    .sort((a, b) => {
      const tierDiff = tierScore(b.name) - tierScore(a.name);
      if (tierDiff !== 0) return tierDiff;

      const costDiff = nodeCost(a.name) - nodeCost(b.name);
      if (costDiff !== 0) return costDiff;

      return a.index - b.index;
    })
    .map((item) => item.name);
}

function buildPreferredProxyNames(config, group) {
  const proxies = Array.isArray(config.proxies) ? config.proxies : [];
  const includePattern = toRegExp(group.filter);
  const excludePattern = toRegExp(group["exclude-filter"]);

  const names = proxies
    .filter((proxy) => {
      if (!proxy || !proxy.name) return false;
      if (shouldExcludeProxyName(proxy.name, excludePattern)) return false;
      if (includePattern && !includePattern.test(proxy.name)) return false;
      return true;
    })
    .map((proxy) => proxy.name);

  if (names.length > 0) {
    return preferredProxyNames(names);
  }

  if (Array.isArray(group.proxies) && group.proxies.length > 0) {
    return preferredProxyNames(group.proxies);
  }

  return [];
}

function prependUniqueRules(config, rules) {
  if (!Array.isArray(config.rules)) config.rules = [];

  for (const rule of [...rules].reverse()) {
    if (!config.rules.includes(rule)) {
      config.rules.unshift(rule);
    }
  }
}

function appendUniqueItems(target, items) {
  if (!Array.isArray(target)) return [...items];

  for (const item of items) {
    if (!target.includes(item)) target.push(item);
  }

  return target;
}

function patchKuaishouCorpDirect(config) {
  prependUniqueRules(config, [
    "DOMAIN-SUFFIX,corp.kuaishou.com,DIRECT",
    "DOMAIN-SUFFIX,kwaidc.com,DIRECT",
  ]);

  config.dns = config.dns || {};
  config.dns["fake-ip-filter"] = appendUniqueItems(config.dns["fake-ip-filter"], [
    "+.corp.kuaishou.com",
    "+.kwaidc.com",
  ]);

  if (config.tun && Array.isArray(config.tun["route-exclude-address"])) {
    config.tun["route-exclude-address"] = config.tun["route-exclude-address"].filter(
      (item) => item !== "*.corp.kuaishou.com" && item !== "*.kwaidc.com"
    );
  }
}

function main(config) {
  patchKuaishouCorpDirect(config);

  if (!Array.isArray(config["proxy-groups"])) return config;

  for (const group of config["proxy-groups"]) {
    if (!group || group.type !== "fallback") continue;

    const preferredNames = buildPreferredProxyNames(config, group);
    if (preferredNames.length === 0) continue;

    group.proxies = preferredNames;
    delete group["include-all"];
  }

  return config;
}

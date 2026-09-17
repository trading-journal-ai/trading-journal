/** Apply a custom date range while retaining the active analytics investigation. */
export function analyticsDateRangeHref(href: string, from: string, to: string) {
  const [path, query] = href.split("?");
  const params = new URLSearchParams(query);
  for (const key of ["date", "page", "drill"]) params.delete(key);
  params.set("preset", "custom");
  params.set("from", from);
  params.set("to", to);
  return `${path}?${params}`;
}

export function isDataVizPreviewEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ENABLE_DATA_VIZ_PREVIEWS === "true"
  );
}

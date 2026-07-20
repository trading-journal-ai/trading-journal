export type DataVizPreviewRoute = {
  href: string;
  version: `V${number}`;
  title: string;
  description: string;
  meta: string;
  phase: "current" | "evidence" | "foundation" | "exploration";
};

export const dataVizPreviewRoutes: DataVizPreviewRoute[] = [
  {
    href: "/preview/data-viz/v1",
    version: "V1",
    title: "Chart vocabulary",
    description: "The original sticker sheet: outcome pulse, trade tape, excursion braid, calendar cluster, hold-time views, and more.",
    meta: "Vocabulary",
    phase: "foundation",
  },
  {
    href: "/preview/data-viz/v2",
    version: "V2",
    title: "The Lens Lab",
    description: "A broad exploration of trade relationships and alternate chart forms across daily and multi-trade review.",
    meta: "Exploration",
    phase: "foundation",
  },
  {
    href: "/preview/data-viz/v3",
    version: "V3",
    title: "The Join Lab",
    description: "Real trade×candle analytics: MAE/MFE, capture, fresh-high timing, relative volume, ignition, extension, and volume profile.",
    meta: "Data join",
    phase: "evidence",
  },
  {
    href: "/preview/data-viz/v4",
    version: "V4",
    title: "The Factor Lens",
    description: "A configurable way to choose one factor, compare winners and losers, switch chart forms, and keep sample size visible.",
    meta: "Analysis tool",
    phase: "evidence",
  },
  {
    href: "/preview/data-viz/v5",
    version: "V5",
    title: "Trade inside the move",
    description: "Five focused studies for trade location, excursion breathing, weekday opportunity, scanner participation, and stock selection.",
    meta: "Review vocabulary",
    phase: "current",
  },
  {
    href: "/preview/data-viz/v6",
    version: "V6",
    title: "Price-action quality",
    description: "How the stock moved—not just how far—with candle quality, EMA/VWAP rails, clean expansion, whippy action, and chop.",
    meta: "Price action",
    phase: "current",
  },
  {
    href: "/preview/data-viz/v7",
    version: "V7",
    title: "Journal Lenses",
    description: "The strongest discoveries distilled into one visual language across day, week, and month with honest sample boundaries.",
    meta: "Distillation",
    phase: "current",
  },
];

vi.mock("@scheduling/lib/next-seo.config", () => ({
  default: {
    headSeo: {
      siteName: "Scheduling",
    },
    defaultNextSeo: {
      title: "Scheduling",
      description: "Scheduling infrastructure for everyone.",
    },
  },
  seoConfig: {
    headSeo: {
      siteName: "Scheduling",
    },
  },
  buildSeoMeta: vi.fn().mockReturnValue({}),
}));

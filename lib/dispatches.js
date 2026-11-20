// Only approved, public copy belongs in this file.
export const dispatches = [
  {
    slug: "introducing-dispatches",
    title: "Introducing Deep Clearance Dispatch",
    summary: "A public record of new documents and what they change.",
    date: "2026-11-20",
    paragraphs: [
      "Deep Clearance researches institutional power through primary sources. Dispatches brings that approach to new filings, releases, and public records.",
      "Each dispatch links to the original source. When the record changes, we'll add a dated update to the same page.",
    ],
    sources: [
      {
        title: "Deep Clearance methodology",
        url: "https://deepclearance.com/methodology/",
      },
    ],
    updates: [],
  },
];

export function dispatchDate(date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(date));
}

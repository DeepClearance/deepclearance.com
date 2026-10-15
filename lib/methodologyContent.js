/** Site copy for methodology pages. Source: copy/*.md */

export const HOMEPAGE_LEDE = [
  "Mainstream AI hedges. Forums don't cite. The documents take months to read.",
  "Deep Clearance is a research system built to read institutional power the way it actually operates. Under the index sits a complete analytical framework, and it runs on every question you ask.",
];

export const HOMEPAGE_READING = [
  {
    heading: "It knows what kind of evidence it's holding.",
    body: "Four evidence standards, each scoped to its own domain. Forensic analysis of covert networks doesn't demand the paper trail those networks exist to destroy. An institution's description of itself is logged as a claim, not a fact. Every conclusion carries the strength of its weakest source.",
  },
  {
    heading: "It reads the label before the claim.",
    body: "When a subject has been branded misinformation, deplatformed, or litigated into silence, the system examines the suppression first. Who funded it, when it started, what shape it took. Then it reads the evidence.",
  },
  {
    heading: "It tests itself.",
    body: "Every major claim sits in a register with the conditions that would downgrade it. Every major thesis has its strongest counter-hypothesis written down. The system knows where it could be wrong and tells you.",
  },
  {
    heading: "It knows where AI is filtered.",
    body: "Language models are trained toward the managed consensus. Deep Clearance tracks where the hedges fall, because a hedge marks what's being protected.",
  },
  {
    heading: "It sees the whole pattern.",
    body: "Financial capture from 1812 to Jekyll Island. Seven historians using seven methods who arrive at the same suppression sequence. Patent secrecy orders, enforcement asymmetry, trillions in unsupported Pentagon adjustments, and the accounting standard written to keep them dark. Every domain is cross-referenced to the others.",
  },
];

export const HOMEPAGE_CLOSE = [
  "Over a million primary source passages. One standard of evidence. Every answer sourced.",
  "The cost of suppression just went up.",
  "Pay with Lightning. Connect over MCP.",
];

export const DOCS_METHODOLOGY = {
  title: "Labels on a result",
  paragraphs: [
    "Each passage in a result carries two labels. One is how strong that passage is. The other is how far the writeup goes. The model is supposed to keep them apart, and to stop when the index has no passage.",
    "The rules for those labels are on the methodology page.",
  ],
};

export const METHODOLOGY_PAGE = {
  lede: "What a passage can support, how far the writeup goes, and what a connected model has to do with both.",
  sections: [
    {
      heading: null,
      paragraphs: [
        "Strength and depth stay separate. Strength is what that passage can support. Depth is how far the writeup goes. A claim keeps the labels of the passages it actually uses.",
      ],
    },
    {
      heading: "How strong the passage is",
      paragraphs: [
        "S1 means the page shows the act. The dollar figure in a filing is S1 for that figure. An audit finding is S1 for the finding the report states. A lawsuit is S1 for what it alleges. A judgment, or another page that records the act, is what shows the act happened. A reason someone gives for the act stays S4 unless a different passage backs that reason.",
        "S2 means the papers force the conclusion even though no single page names it. If the contracts on the record cannot work unless someone is coordinating them, that coordination is S2.",
        "S3 means it fits, and the record does not rule it out, but the record does not force it either. Motive, intent, and hidden coordination usually land here.",
        "S4 means they said it about themselves. A press release, an official statement, or testimony about their own plans shows that they said it. Whether the account is true is a different passage.",
        "A fund's holding report is S1 for the holding it lists. A guess about what that holding means for policy is S3. Writing them in the same sentence does not merge the two.",
      ],
    },
    {
      heading: "How far the writeup goes",
      paragraphs: [
        "Depth is not a second copy of strength. A government report can still quote a weak excuse. An essay can still quote a real filing. Read both labels.",
        "T1 stays with what the institution put on paper. Filings, testimony, contracts, audits, and what that paper shows they did. If a report states an audit finding and then quotes the department explaining the failure, the finding stays with the report and the explanation stays as something they said about themselves.",
        "T2 is how the network got built. Who set it up, what they were paid to do, how the pattern spread. That only counts when the T1 papers are under it. A story about how the builders think, with no filings or contracts under it, is not T2.",
        "T3 is one argument, standing on its own, with the points that would knock it down written down. The Financial Control Grid, Contractor Revenue Concentration, and the DoD Accountability Gap are in this group. If one of those points fails, the conclusions that needed it fail too. Quoting a filing inside the essay does not turn the essay's own conclusion into the filing.",
        "T4 uses more than one of those arguments together, after each one has been checked on its own. Putting them in one piece does not make a weak piece stronger.",
      ],
    },
    {
      heading: "What the model has to do",
      paragraphs: [
        "The model answers from the passages the search returned. A passage is evidence of what that passage says. It is not permission to fill the rest in from memory, or from a smoother paragraph nearby.",
        "If the tool says the index had no passage, the model stops. It does not invent a source, a title, or a quote.",
        "If the passages in one result carry different labels, the model says so and keeps each claim with the passage that supports it. If a label is missing, it says the label is missing.",
        "A conclusion that needs several passages is only as strong as the weakest one it needs. Smooth writing leaves that limit where it is.",
      ],
    },
    {
      heading: "What a query returns",
      paragraphs: [
        "You get the passages, with both labels when the index has them. You can see what rests on a record and what rests on a guess, and you can see whether the writeup is staying with the papers, describing a network, making one argument, or stacking arguments.",
        "Most of what you can search is documents from chemical companies, drug companies, and oil companies, plus court records, released government files, and patents. Writing about money, secrecy, contractors, and disclosure is included, and so are books and interviews. A result says which of those you are looking at. New documents go in as they are acquired.",
      ],
    },
  ],
};

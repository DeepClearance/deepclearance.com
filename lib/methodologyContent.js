/** Site copy for methodology pages. Source: copy/*.md */

export const HOMEPAGE_LEDE = [
  "Mainstream AI hedges. Forums don't cite. The documents take months to read.",
  "The public story is what a chemical company, a court, or an agency was willing to say. The documents show what they did, and what they spent to keep the rest quiet. Deep Clearance searches those documents and returns the passage with the source still on it.",
];

export const HOMEPAGE_READING = [
  {
    heading: "Four standards, and they stay apart.",
    body: "S1 is the page that shows the act. A dollar figure in a filing is S1 for that figure. A press release is S4, evidence that they said it, until another page shows the act. A conclusion stays as strong as the weakest passage it needed.",
  },
  {
    heading: "The branded subject gets read second.",
    body: "When a subject has been branded misinformation, deplatformed, or litigated into silence, the first pass is the suppression itself. Who paid for it, when it started, and what form it took come before the documents.",
  },
  {
    heading: "The way it could be wrong is written down.",
    body: "Major claims carry the conditions that would downgrade them, and the strongest account on the other side sits with the thesis.",
  },
  {
    heading: "A hedge marks what the training protects.",
    body: "Language models are trained toward the managed consensus. Deep Clearance tracks where those hedges fall.",
  },
  {
    heading: "The domains already point at each other.",
    body: "Financial capture from 1812 to Jekyll Island. Seven historians, seven methods, and the same suppression sequence. Patent secrecy orders, enforcement asymmetry, trillions in unsupported Pentagon adjustments, and the accounting standard written to keep them dark.",
  },
];

export const HOMEPAGE_CLOSE = [
  "Over a million primary source passages, under one standard, with the source attached to the answer.",
  "Pay with Lightning. Connect over MCP.",
  "The cost of suppression just went up.",
];

export const HOMEPAGE_FAQ = [
  {
    q: "What comes back from a search?",
    a: "A stored passage and the source it came from. Strength and depth are labeled when the index has them. If the index has no passage, the tool says so.",
  },
  {
    q: "What is in the index?",
    a: "About 1,476,000 passages from company files, court records, released government files, patents, interviews, and short excerpts from books. Classified documents are outside the index.",
  },
  {
    q: "What does a plan buy?",
    a: "Days on the index and a set of queries each day. Trial is 7 days and 50 queries a day, for 15,000 sats. Researcher is 250 a day. Control is 500. The documents are the same on every plan. After the day's set is used, a Lightning top up pays for more. Replaying a snapshot is free.",
  },
  {
    q: "How do I connect it?",
    a: "Sign in with GitHub or Nostr, pay the Lightning invoice, and put the key in your client. Claude uses OAuth. Cursor and other clients send a Bearer key to the MCP endpoint.",
  },
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

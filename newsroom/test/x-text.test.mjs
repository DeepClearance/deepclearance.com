import assert from "node:assert/strict";
import test from "node:test";
import { checkPost, composePost, weightedLength } from "../lib/x-text.mjs";

test("counts X weighted length with 23-character links", () => {
  assert.equal(weightedLength("hello"), 5);
  assert.equal(weightedLength("https://deepclearance.com/dispatches/a-very-long-slug-that-is-longer-than-23/"), 23);
  assert.equal(weightedLength("日本"), 4);
  assert.equal(weightedLength("👍🏽"), 2);
  assert.equal(weightedLength("🇺🇸"), 2);
  assert.equal(weightedLength("Deep Clearance · Ukraine"), 24);
});

test("the approved Kryvyi Rih copy is over the limit once the link is added, and a trimmed copy fits", () => {
  const url = "https://deepclearance.com/dispatches/kryvyi-rih/";
  const approved = "A Russian strike on central Kryvyi Rih killed two people Friday night, including a seven-year-old boy. Regional officials reported 60 wounded, six of them children. A hospital, schools and about 25 apartment buildings were damaged.\n\nDeep Clearance Dispatch · Ukraine";
  const full = checkPost(composePost(approved, url));
  assert.equal(full.length, 291);
  assert.equal(full.ok, false);
  const trimmed = approved.replace("\n\nDeep Clearance Dispatch · Ukraine", "");
  assert.equal(checkPost(composePost(trimmed, url)).ok, true);
});

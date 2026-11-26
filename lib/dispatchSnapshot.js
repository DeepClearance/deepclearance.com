import { readFile } from "node:fs/promises";
import { dispatches } from "./dispatches";

export async function dispatchSnapshot() {
  try {
    return JSON.parse(await readFile(".newsroom-dispatches.json", "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return dispatches;
  }
}

// Asks GitHub to run the Pages workflow on main (the site build reads published editions only).
export async function deployment(env) {
  if (!env.GITHUB_PUBLISH_TOKEN) return { queued: false };
  try {
    const response = await fetch(
      "https://api.github.com/repos/DeepClearance/deepclearance.com/actions/workflows/static.yml/dispatches",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${env.GITHUB_PUBLISH_TOKEN}`,
          accept: "application/vnd.github+json",
          "user-agent": "DeepClearance-Newsroom",
          "content-type": "application/json",
        },
        body: JSON.stringify({ ref: "main" }),
      },
    );
    return { queued: response.ok, status: response.status };
  } catch { return { queued: false }; }
}

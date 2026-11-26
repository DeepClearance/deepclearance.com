const $ = (id) => document.getElementById(id);
const form = $("editor");
const fields = form.elements;
let token;
let revision = 0;
let image;
let lockedSlug;
let busy = false;

async function request(path, options = {}) {
  const { headers, ...init } = options;
  const response = await fetch(`/api/editor/${path}`, {
    ...init, headers: token ? { ...headers, authorization: `Bearer ${token}` } : { ...headers },
    credentials: "same-origin",
  });
  if (!response.ok) throw new Error((await response.json()).error);
  return response;
}

function row(container, fieldSpecs, values = {}) {
  const element = document.createElement("div");
  for (const [name, label, type] of fieldSpecs) {
    const wrapper = document.createElement("label");
    wrapper.textContent = label;
    const input = document.createElement("input");
    input.type = type;
    input.dataset.field = name;
    input.value = values[name] || "";
    wrapper.append(input);
    element.append(wrapper);
  }
  const remove = document.createElement("button");
  remove.type = "button";
  remove.textContent = "Remove";
  remove.onclick = () => element.remove();
  element.append(remove);
  $(container).append(element);
}

const sourceFields = [["title", "Source name", "text"], ["url", "Source URL", "url"]];
const updateFields = [["date", "Correction date", "date"], ["text", "Correction", "text"]];
const readRows = (id) => [...$(id).children].map((element) =>
  Object.fromEntries([...element.querySelectorAll("input")].map(input => [input.dataset.field, input.value])));

function load(story = {}) {
  form.reset();
  revision = story.revision || 0;
  lockedSlug = story.slug;
  image = story.image || null;
  fields.slug.readOnly = Boolean(lockedSlug);
  for (const name of ["slug", "title", "summary", "date", "xCopy"]) fields[name].value = story[name] || "";
  fields.article.value = story.paragraphs?.join("\n\n") || "";
  fields.alt.value = image?.alt || "";
  $("image-status").textContent = image ? "Card uploaded" : "";
  $("sources").replaceChildren();
  $("updates").replaceChildren();
  (story.sources || []).forEach(source => row("sources", sourceFields, source));
  (story.updates || []).forEach(update => row("updates", updateFields, update));
}

async function refresh() {
  const records = await (await request("dispatches")).json();
  $("stories").replaceChildren(...records.map(story => {
    const button = document.createElement("button");
    button.textContent = `${story.title || story.slug} · ${story.published ? "Published" : "Draft"}`;
    button.onclick = () => { if (!busy) load(story); };
    return button;
  }));
}

function article() {
  return {
    revision, title: fields.title.value, summary: fields.summary.value, date: fields.date.value,
    xCopy: fields.xCopy.value, paragraphs: fields.article.value.split(/\n\s*\n/).filter(Boolean),
    sources: readRows("sources"), updates: readRows("updates"),
    image: image ? { key: image.key, alt: fields.alt.value } : null,
  };
}

async function action(fn) {
  if (busy) return;
  busy = true;
  $("status").textContent = "";
  try { await fn(); } catch (error) { $("status").textContent = error.message; }
  finally { busy = false; }
}

$("login").onsubmit = (event) => {
  event.preventDefault();
  action(async () => {
    token = $("key").value || undefined;
    const me = await (await request("whoami")).json();
    $("whoami").textContent = `Signed in as ${me.user} (${me.method})`;
    await refresh();
    $("key").value = "";
    $("login").hidden = true;
    $("workspace").hidden = false;
    load();
  });
};

$("logout").onclick = () => { if (!busy) location.reload(); };
$("new").onclick = () => { if (!busy) load(); };
$("add-source").onclick = () => row("sources", sourceFields);
$("add-update").onclick = () => row("updates", updateFields);
$("deploy").onclick = () => action(async () => {
  const result = await (await request("deploy", { method: "POST" })).json();
  $("status").textContent = result.queued ? "Site update queued." : "GitHub did not accept the deployment request.";
});
$("export").onclick = () => action(async () => {
  const response = await request("export");
  const href = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = href;
  link.download = "deep-clearance-editions.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
});

$("preview").onclick = () => action(async () => {
  const story = article();
  const preview = $("preview-content");
  preview.replaceChildren();
  function add(tag, value) {
    const element = document.createElement(tag);
    element.textContent = value;
    preview.append(element);
    return element;
  }
  add("h1", story.title);
  add("p", story.summary);
  add("p", story.date);
  const card = fields.card.files[0];
  if (card || story.image) {
    const blob = card || await (await request(`media/${story.image.key}`)).blob();
    const src = URL.createObjectURL(blob);
    const img = add("img", "");
    img.alt = fields.alt.value;
    img.src = src;
    $("preview-dialog").addEventListener("close", () => URL.revokeObjectURL(src), { once: true });
  }
  story.paragraphs.forEach(paragraph => add("p", paragraph));
  story.sources.forEach(source => add("p", `${source.title} · ${source.url}`));
  story.updates.forEach(update => add("p", `${update.date} · ${update.text}`));
  $("preview-dialog").showModal();
});

form.onsubmit = (event) => {
  event.preventDefault();
  const publish = event.submitter?.id === "publish";
  action(async () => {
    const card = fields.card.files[0];
    if (card) {
      image = await (await request("media", {
        method: "POST", headers: { "content-type": card.type }, body: card,
      })).json();
      fields.card.value = "";
      $("image-status").textContent = "Card uploaded";
    }
    const response = await request(`dispatches/${encodeURIComponent(fields.slug.value)}`, {
      method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...article(), publish }),
    });
    const saved = await response.json();
    load(saved);
    $("status").textContent = !publish ? "Draft saved."
      : saved.deployment.queued ? "Published in the newsroom. Site update queued."
      : "Published in the newsroom. Use Retry site update to deploy.";
    await refresh();
  });
};

function download(name, blob) {
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
$("ledger").onclick = () => action(async () => {
  download("deep-clearance-approvals.md", await (await request("ledger?format=holds")).blob());
});
$("quality").onclick = () => action(async () => {
  download("deep-clearance-quality.json", await (await request("quality")).blob());
});

$("review-x").onclick = () => action(async () => {
  if (!lockedSlug) throw new Error("Publish this Dispatch to the website first.");
  const path = `x/${encodeURIComponent(lockedSlug)}`;
  const review = await (await request(path)).json();
  $("x-copy").textContent = review.text;
  $("x-length").textContent = `${review.length} of ${review.maxLength} weighted characters (the link counts as 23)`;
  const dialog = $("x-dialog");
  const card = $("x-card");
  card.hidden = true;
  if (review.image) {
    const blob = await (await request(`media/${review.image.key}`)).blob();
    card.src = URL.createObjectURL(blob);
    card.alt = review.image.alt;
    card.hidden = false;
    dialog.addEventListener("close", () => URL.revokeObjectURL(card.src), { once: true });
  }
  const send = $("send-x");
  const reject = $("reject-x");
  const status = $("x-status");
  status.textContent = review.postUrl ? `Published: ${review.postUrl}`
    : !review.canApprove ? "Only a named approver can decide on X posts."
    : !review.configured ? "X account setup required."
    : review.length > review.maxLength ? "Too long for X. Shorten the X copy and publish again."
    : ["sending", "uncertain"].includes(review.status) ? "Check the X account before retrying." : "";
  send.disabled = !review.canApprove || !review.configured || !review.text || review.length > review.maxLength
    || !["ready", "failed"].includes(review.status);
  reject.disabled = !review.canApprove || !review.text || review.status === "posted";
  const decide = async (decision) => {
    send.disabled = true;
    reject.disabled = true;
    status.textContent = decision === "approve" ? "Recording approval and sending…" : "Recording rejection…";
    try {
      const outcome = await (await request(path, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ revision: review.revision, text: review.text, decision, note: $("x-note").value }),
      })).json();
      status.textContent = decision === "approve" ? `Published: ${outcome.postUrl} (ledger ${outcome.ref})`
        : `Rejected (ledger ${outcome.ref})`;
    } catch (error) {
      status.textContent = error.message;
    }
  };
  send.onclick = () => decide("approve");
  reject.onclick = () => decide("reject");
  dialog.showModal();
});

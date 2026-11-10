// End-to-end test in headless Edge/Chrome against a running TinyWins connected to a TEST Supabase
// project with the migration applied. Creates two confirmed users with the service role key and
// deletes them afterwards.
//   E2E_BASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   ->   npm run test:e2e
/* eslint-disable @typescript-eslint/no-require-imports -- plain Node script */
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

for (const file of [".env.local", ".env"]) {
  const p = path.join(__dirname, "..", file);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const BASE = (process.env.E2E_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const EDGE = process.env.EDGE_PATH || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (a test project).");
  process.exit(1);
}
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = "") => results.push([ok ? "PASS" : "FAIL", name, detail]);

(async () => {
  const tag = Date.now().toString(36);
  const password = `Tw-${tag}-pass!`;
  const people = {};
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), "tw-e2e-"));
  const port = 9300 + Math.floor(Math.random() * 300);
  const edge = spawn(EDGE, ["--headless=new", "--disable-gpu", `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, "--window-size=430,1000", "about:blank"], { stdio: "ignore" });
  try {
    for (const key of ["main", "other"]) {
      const email = `e2e-${key}-${tag}@example.test`;
      const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: `E2E ${key}`, timezone: "Africa/Accra" } });
      if (error) throw error;
      people[key] = { id: data.user.id, email };
    }

    let ws;
    for (let i = 0; i < 50 && !ws; i++) {
      await sleep(200);
      try {
        const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
        const page = list.find((t) => t.type === "page");
        if (page) ws = new WebSocket(page.webSocketDebuggerUrl);
      } catch {
        /* starting */
      }
    }
    await new Promise((r) => ws.addEventListener("open", r, { once: true }));
    let id = 0;
    const waiting = new Map();
    const errors = [];
    ws.addEventListener("message", (m) => {
      const d = JSON.parse(m.data);
      if (d.id && waiting.has(d.id)) {
        waiting.get(d.id)(d);
        waiting.delete(d.id);
      }
      if (d.method === "Runtime.exceptionThrown") errors.push(String((d.params.exceptionDetails.exception || {}).description || d.params.exceptionDetails.text).slice(0, 200));
    });
    const cdp = (method, params = {}) => new Promise((res, rej) => { const i = ++id; waiting.set(i, (d) => (d.error ? rej(new Error(d.error.message)) : res(d.result))); ws.send(JSON.stringify({ id: i, method, params })); });
    const ev = async (e) => (await cdp("Runtime.evaluate", { expression: e, awaitPromise: true, returnByValue: true })).result.value;
    const text = () => ev("document.body.innerText");
    const waitFor = async (e, what, n = 120) => {
      for (let i = 0; i < n; i++) {
        if (await ev(e).catch(() => false)) return;
        await sleep(250);
      }
      throw new Error(`timeout: ${what} @ ${await ev("location.href")} :: ${(await text()).slice(0, 300)}`);
    };
    const waitText = (t, what) => waitFor(`document.body.innerText.includes(${JSON.stringify(t)})`, what || t);
    const go = async (p) => { await cdp("Page.navigate", { url: `${BASE}${p}` }); await sleep(400); await waitFor("document.readyState === 'complete'", `load ${p}`); };
    const setVal = (sel, v) => ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) throw new Error('missing ' + ${JSON.stringify(sel)});
      const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(v)}); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    const click = (label, scope = "button, a, label") => ev(`(() => { const b = [...document.querySelectorAll(${JSON.stringify(scope)})].find(x => x.textContent.trim().includes(${JSON.stringify(label)}) && !x.disabled);
      if (!b) throw new Error('no element: ' + ${JSON.stringify(label)}); b.click(); return true; })()`);
    const signIn = async (who) => {
      await cdp("Network.clearBrowserCookies");
      await go("/login");
      await setVal("input[name=email]", people[who].email);
      await setVal("input[name=password]", password);
      await click("Sign in", "button");
      await waitFor("location.pathname === '/' && !document.body.innerText.includes('Getting your day ready')", `${who} signed in`);
    };
    const addTask = async (title, minutes) => {
      await click("+ Add a task", "button");
      await waitFor("!!document.querySelector('input[placeholder^=\"What do you want\"]')", "add form");
      await setVal('input[placeholder^="What do you want"]', title);
      if (minutes) await setVal('input[placeholder="e.g. 20"]', String(minutes));
      await click("Add to my day", "button");
      await waitText(title, `task ${title} added`);
      await sleep(300);
    };

    await cdp("Page.enable");
    await cdp("Runtime.enable");
    await cdp("Network.enable");

    await go("/");
    check("signed-out visitors see the welcome page", (await ev("location.pathname")) === "/welcome" && (await text()).includes("Plan small. Win big."));

    await signIn("main");
    check("energy check-in is asked", (await text()).includes("How's your energy today?"));
    await click("Low", "button");
    await waitText("Low-energy day mode", "low-energy mode on");
    check("low-energy mode turns on", true);

    await addTask(`Write report ${tag}`, 90);
    await addTask(`Drink water ${tag}`, 2);
    await addTask(`Tidy desk ${tag}`, 15);
    await addTask(`Call mum ${tag}`, 20);
    await addTask(`Pay bill ${tag}`, 10);
    check("five tasks added", (await text()).includes("5 is the magic number"));
    const order = await ev(`[...document.querySelectorAll('article h3')].map(h => h.textContent)`);
    check("easiest task listed first on a low day", order[0].startsWith("Drink water"), order.join(" | "));
    check("'Just 2 minutes' start offered", (await text()).includes("Just 2 minutes"));

    const { error: capErr } = await admin.from("tasks").insert({ user_id: people.main.id, date: (await admin.from("tasks").select("date").eq("user_id", people.main.id).limit(1)).data[0].date, title: "Sixth", day_start_at: new Date().toISOString() });
    check("database refuses a 6th task even with full access", Boolean(capErr), capErr && capErr.message);

    await ev(`document.querySelector('article button[aria-label^="Mark Drink water"]').click()`);
    await waitFor("!!document.querySelector('[role=alertdialog]')", "celebration");
    check("finishing a task shows a celebration", (await text()).includes("Keep going"));
    check("first badge awarded", (await text()).includes("First win"));
    await click("Yay! Keep going", "button");
    await sleep(500);

    await click("Keep 3 today", "button");
    await waitText("Today is lighter now", "lighter day");
    const left = await ev(`document.querySelectorAll('article').length`);
    check("lighter day keeps 3 tasks today", left === 3, `${left} tasks`);

    await go("/now");
    check("focus mode shows one task", (await ev(`document.querySelectorAll('h1').length`)) === 1 && (await text()).includes("Right now, just this"));
    await click("Just 2 min", "button");
    await waitText("Focus time", "timer running");
    check("focus timer starts", true);
    await click("Stop", "button");

    await go("/wins");
    check("points and badges shown", (await text()).includes("points to spend") && (await text()).includes("Badges"));

    await go("/settings");
    check("settings load", (await text()).includes("Reminders") && (await text()).includes("Time zone"));

    await signIn("other");
    await click("Okay", "button");
    await sleep(800);
    const otherText = await text();
    check("another user sees none of these tasks", !otherText.includes(tag), "");

    check("no uncaught browser errors", errors.length === 0, errors.join(" | "));
  } catch (e) {
    check("run completed", false, e.message);
  } finally {
    edge.kill();
    for (const p of Object.values(people)) await admin.auth.admin.deleteUser(p.id);
    await sleep(1500);
    try {
      fs.rmSync(prof, { recursive: true, force: true });
    } catch {
      /* Windows may still hold a file */
    }
    for (const [s, n, d] of results) console.log(`${s}  ${n}${d ? ` (${d})` : ""}`);
    const failed = results.filter((r) => r[0] === "FAIL").length;
    console.log(`${results.length - failed}/${results.length} passed`);
    process.exit(failed ? 1 : 0);
  }
})();

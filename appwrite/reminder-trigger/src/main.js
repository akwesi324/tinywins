// Appwrite scheduled function (every minute): asks the TinyWins site to send the reminders that
// are due. The site does the work; this only triggers it with the shared secret.
export default async ({ res, log, error }) => {
  const site = (process.env.SITE_URL || "").replace(/\/$/, "");
  if (!site || !process.env.CRON_SECRET) {
    error("SITE_URL and CRON_SECRET must be set on this function");
    return res.json({ ok: false }, 500);
  }
  try {
    const r = await fetch(`${site}/api/cron/reminders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
      signal: AbortSignal.timeout(50000),
    });
    const body = await r.text();
    log(`reminders: HTTP ${r.status} ${body.slice(0, 200)}`);
    return res.json({ ok: r.ok, status: r.status });
  } catch (e) {
    error(`reminders failed: ${e}`);
    return res.json({ ok: false }, 502);
  }
};

// Rapport journalier des accès au Container Tracker.
// - Programmée automatiquement tous les jours à 22h00 UTC (23h00 Algérie) via netlify.toml
// - Peut aussi être déclenchée manuellement en visitant :
//   /.netlify/functions/daily-report?manual=1

const INDEX_BLOB_ID = "019f7eaf-590e-7f20-95c3-a123666923cc";

const EMAILJS_SERVICE_ID       = "service_kwugeur";
const EMAILJS_REPORT_TEMPLATE  = "template_6cjc4gf"; // template partagé (notification + rapport), variables : subject_line, message, to_email
const EMAILJS_PUBLIC_KEY       = "mqdvTg5A-1OQiXo1K";
const EMAILJS_PRIVATE_KEY      = "kgzF6l7oDf2PUUDUKmaIN";
const ADMIN_EMAIL              = "samhad31@gmail.com";

function formatDate(ts){
  return new Date(ts).toLocaleString("fr-FR", { timeZone: "Africa/Algiers", dateStyle: "short", timeStyle: "medium" });
}

function statusLabel(status){
  if (status === "approved") return "✅ Approuvé";
  if (status === "rejected") return "❌ Refusé";
  return "⏳ En attente";
}

function buildReportHtml(entries){
  if (entries.length === 0){
    return "<p>Aucune tentative d'accès durant les dernières 24 heures.</p>";
  }
  const rows = entries.map(e => `
    <tr>
      <td style="padding:6px 12px;border:1px solid #ddd;">${e.email}</td>
      <td style="padding:6px 12px;border:1px solid #ddd;">${formatDate(e.requestedAt)}</td>
      <td style="padding:6px 12px;border:1px solid #ddd;">${statusLabel(e.status)}</td>
    </tr>`).join("");

  return `
    <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
      <tr style="background:#f0f0f0;">
        <th style="padding:6px 12px;border:1px solid #ddd;text-align:left;">Email</th>
        <th style="padding:6px 12px;border:1px solid #ddd;text-align:left;">Heure de la demande</th>
        <th style="padding:6px 12px;border:1px solid #ddd;text-align:left;">Statut</th>
      </tr>
      ${rows}
    </table>`;
}

async function sendReportEmail(reportHtml, countText){
  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_REPORT_TEMPLATE,
      user_id: EMAILJS_PUBLIC_KEY,
      accessToken: EMAILJS_PRIVATE_KEY,
      template_params: {
        to_email: ADMIN_EMAIL,
        subject_line: `Rapport journalier - Accès Container Tracker (${formatDate(Date.now())})`,
        message: `Rapport journalier des accès - ${formatDate(Date.now())}\n\n${countText}\n\n${reportHtml}`,
      },
    }),
  });

  if (!res.ok){
    const text = await res.text().catch(() => "");
    throw new Error(`EmailJS REST échec: ${res.status} ${text}`);
  }
}

exports.handler = async function (event) {
  try{
    const res = await fetch(`https://jsonblob.com/api/jsonBlob/${INDEX_BLOB_ID}`, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Lecture registre échouée: HTTP ${res.status}`);

    const data = await res.json();
    const allEntries = data.entries || [];

    const since = Date.now() - 24 * 60 * 60 * 1000;
    const last24h = allEntries
      .filter(e => e.requestedAt >= since)
      .sort((a, b) => b.requestedAt - a.requestedAt);

    const approved = last24h.filter(e => e.status === "approved").length;
    const rejected = last24h.filter(e => e.status === "rejected").length;
    const pending  = last24h.filter(e => e.status === "pending").length;
    const countText = `${last24h.length} demande(s) — ${approved} approuvée(s), ${rejected} refusée(s), ${pending} en attente`;

    const reportHtml = buildReportHtml(last24h);
    await sendReportEmail(reportHtml, countText);

    return { statusCode: 200, body: `Rapport envoyé : ${countText}` };
  }catch(err){
    console.error("Erreur génération/envoi du rapport:", err);
    return { statusCode: 500, body: `Erreur : ${err.message || err}` };
  }
};

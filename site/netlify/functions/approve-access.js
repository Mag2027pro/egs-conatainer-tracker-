// Page cliquée par l'administrateur depuis l'email de notification.
// Appel : GET /.netlify/functions/approve-access?token=...&action=approve|reject

const INDEX_BLOB_ID = "019f7eaf-590e-7f20-95c3-a123666923cc";

async function updateIndexDecision(token, status, decidedAt){
  try{
    const res = await fetch(`https://jsonblob.com/api/jsonBlob/${INDEX_BLOB_ID}`, { headers: { Accept: "application/json" } });
    if (!res.ok) return;
    const data = await res.json();
    data.entries = data.entries || [];
    const entry = data.entries.find(e => e.token === token);
    if (entry){
      entry.status = status;
      entry.decidedAt = decidedAt;
      await fetch(`https://jsonblob.com/api/jsonBlob/${INDEX_BLOB_ID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data),
      });
    }
  }catch(err){
    console.error("Erreur mise à jour registre:", err);
  }
}

function htmlPage(title, message, color) {
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8">
<title>${title}</title>
<style>
  body{font-family:'Segoe UI',sans-serif;background:#0b0f18;color:#f5f6f8;
       display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}
  .box{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);
       border-radius:16px;padding:40px;text-align:center;max-width:420px;}
  h1{color:${color};font-size:22px;margin-bottom:12px;}
  p{color:#aab2c0;font-size:14px;}
</style></head>
<body><div class="box"><h1>${title}</h1><p>${message}</p></div></body></html>`;
}

exports.handler = async function (event) {
  const token = event.queryStringParameters && event.queryStringParameters.token;
  const action = (event.queryStringParameters && event.queryStringParameters.action) || "approve";

  if (!token) {
    return { statusCode: 400, headers: { "Content-Type": "text/html" }, body: htmlPage("Erreur", "Lien invalide : jeton manquant.", "#ef4444") };
  }

  const getRes = await fetch(`https://jsonblob.com/api/jsonBlob/${token}`, {
    headers: { "Accept": "application/json" },
  });

  if (getRes.status === 404) {
    return { statusCode: 404, headers: { "Content-Type": "text/html" }, body: htmlPage("Introuvable", "Cette demande n'existe plus ou a expiré.", "#ef4444") };
  }
  if (!getRes.ok) {
    return { statusCode: 502, headers: { "Content-Type": "text/html" }, body: htmlPage("Erreur", "Impossible de lire la demande. Réessaie.", "#ef4444") };
  }

  const request = await getRes.json();
  const newStatus = action === "reject" ? "rejected" : "approved";
  request.status = newStatus;
  request.decidedAt = Date.now();

  const putRes = await fetch(`https://jsonblob.com/api/jsonBlob/${token}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(request),
  });

  if (!putRes.ok) {
    return { statusCode: 502, headers: { "Content-Type": "text/html" }, body: htmlPage("Erreur", "Impossible d'enregistrer la décision. Réessaie.", "#ef4444") };
  }

  await updateIndexDecision(token, newStatus, request.decidedAt);

  const isApproved = newStatus === "approved";
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html" },
    body: htmlPage(
      isApproved ? "✅ Accès approuvé" : "❌ Accès refusé",
      isApproved
        ? `L'accès pour <b>${request.email}</b> a été approuvé. Le code de vérification lui sera envoyé automatiquement.`
        : `L'accès pour <b>${request.email}</b> a été refusé.`,
      isApproved ? "#22c55e" : "#ef4444"
    ),
  };
};



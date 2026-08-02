// Enregistre une demande d'accès en attente d'approbation.
// Appel : POST /.netlify/functions/request-access   body: { "email": "..." }
// Retour : { "token": "..." }
// Stockage : JSONBlob.com (aucune inscription requise, un blob par demande)

const INDEX_BLOB_ID = "019f7eaf-590e-7f20-95c3-a123666923cc";

async function logToIndex(entry){
  try{
    const res = await fetch(`https://jsonblob.com/api/jsonBlob/${INDEX_BLOB_ID}`, { headers: { Accept: "application/json" } });
    if (!res.ok) return;
    const data = await res.json();
    data.entries = data.entries || [];
    data.entries.push(entry);
    await fetch(`https://jsonblob.com/api/jsonBlob/${INDEX_BLOB_ID}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(data),
    });
  }catch(err){
    console.error("Erreur écriture registre:", err);
  }
}

exports.handler = async function (event) {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: cors, body: "Méthode non autorisée." };
  }

  let email;
  try {
    const body = JSON.parse(event.body || "{}");
    email = (body.email || "").trim().toLowerCase();
  } catch (e) {
    return { statusCode: 400, headers: cors, body: "JSON invalide." };
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, headers: cors, body: "Email invalide." };
  }

  const record = { email, status: "pending", createdAt: Date.now() };

  const createRes = await fetch("https://jsonblob.com/api/jsonBlob", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(record),
  });

  if (!createRes.ok) {
    const errText = await createRes.text().catch(() => "");
    console.error("jsonblob.com POST échec:", createRes.status, errText);
    return { statusCode: 502, headers: cors, body: "Échec de l'enregistrement de la demande." };
  }

  const location = createRes.headers.get("Location") || createRes.headers.get("location");
  const token = location ? location.split("/").pop() : null;

  if (!token) {
    return { statusCode: 502, headers: cors, body: "Échec : identifiant de demande introuvable." };
  }

  await logToIndex({ token, email, requestedAt: Date.now(), status: "pending" });

  return {
    statusCode: 200,
    headers: { ...cors, "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  };
};



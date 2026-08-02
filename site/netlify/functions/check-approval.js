// Vérifie le statut d'une demande d'accès (interrogé régulièrement par la page).
// Appel : GET /.netlify/functions/check-approval?token=...
// Retour : { "status": "pending" | "approved" | "rejected" | "not_found", "email": "..." }

exports.handler = async function (event) {
  const cors = { "Access-Control-Allow-Origin": "*" };
  const token = event.queryStringParameters && event.queryStringParameters.token;

  if (!token) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ status: "not_found" }) };
  }

  const getRes = await fetch(`https://jsonblob.com/api/jsonBlob/${token}`, {
    headers: { "Accept": "application/json" },
  });

  if (getRes.status === 404) {
    return {
      statusCode: 200,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "not_found" }),
    };
  }
  if (!getRes.ok) {
    return {
      statusCode: 200,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "pending" }), // on continue de sonder plutôt que de casser le flux
    };
  }

  const request = await getRes.json();

  return {
    statusCode: 200,
    headers: { ...cors, "Content-Type": "application/json" },
    body: JSON.stringify({ status: request.status, email: request.email }),
  };
};



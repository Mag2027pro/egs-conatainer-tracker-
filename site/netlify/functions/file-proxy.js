// Fonction serveur Netlify : va chercher un fichier distant (Dropbox, etc.)
// depuis le serveur (pas depuis le navigateur), donc aucun blocage CORS possible.
// Appel : /.netlify/functions/file-proxy?url=<URL_ENCODEE>

exports.handler = async function (event) {
  const targetUrl = event.queryStringParameters && event.queryStringParameters.url;

  if (!targetUrl) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: "Paramètre 'url' manquant.",
    };
  }

  try {
    const response = await fetch(targetUrl);

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: `Erreur en récupérant le fichier distant : HTTP ${response.status}`,
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
      body: base64,
      isBase64Encoded: true,
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: `Erreur serveur lors du fetch : ${err.message || err}`,
    };
  }
};

function ok(body, statusCode = 200) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(body),
  };
}

function badRequest(message, details) {
  return ok({ message, details }, 400);
}

function serverError(message, details) {
  return ok({ message, details }, 500);
}

module.exports = { ok, badRequest, serverError };


function splitOrigins(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map(normalizeOrigin)
    .filter(Boolean);
}

function normalizeOrigin(value) {
  try {
    return new URL(String(value).trim()).origin;
  } catch {
    return "";
  }
}

function getForwardedValue(request, name) {
  const value = request?.headers?.get(name);
  if (!value) return "";
  return value.split(",")[0].trim();
}

function getConfiguredOrigins() {
  return [
    process.env.AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_URL,
    process.env.CORS_ORIGINS,
  ]
    .flatMap(splitOrigins)
    .filter(Boolean);
}

function getEffectiveRequestOrigin(request) {
  const host =
    getForwardedValue(request, "x-forwarded-host") ||
    request?.headers?.get("host") ||
    "";

  const forwardedProto = getForwardedValue(request, "x-forwarded-proto");

  if (host) {
    const trustProxy = process.env.TRUST_PROXY === "true";

    if (forwardedProto && trustProxy) {
      return normalizeOrigin(`${forwardedProto}://${host}`);
    }

    try {
      return normalizeOrigin(
        `${new URL(request.url).protocol}//${host}`,
      );
    } catch {
      // Fall through to the URL origin below.
    }
  }

  try {
    return new URL(request.url).origin;
  } catch {
    return "";
  }
}

function isLocalOrigin(origin) {
  try {
    const url = new URL(origin);

    return (
      url.protocol === "http:" &&
      (url.hostname === "localhost" ||
        url.hostname === "127.0.0.1" ||
        url.hostname === "0.0.0.0")
    );
  } catch {
    return false;
  }
}

export function getClientIp(request) {
  const forwarded = request?.headers?.get("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return request?.headers?.get("x-real-ip") || "unknown";
}

export function isSameOrigin(request) {
  const originHeader = request?.headers?.get("origin");

  // Browsers may omit Origin for some same-origin requests.
  if (!originHeader) return true;

  const origin = normalizeOrigin(originHeader);

  if (!origin) return false;

  const requestOrigin = getEffectiveRequestOrigin(request);

  // Normal same-origin request.
  if (requestOrigin && origin === requestOrigin) {
    return true;
  }

  // Explicitly configured application origins.
  const configuredOrigins = getConfiguredOrigins();

  if (configuredOrigins.includes(origin)) {
    return true;
  }

  /*
   * Local development:
   * allow localhost / loopback variants only when the effective request
   * origin is also local. This fixes localhost vs 127.0.0.1 mismatches
   * without opening production routes to arbitrary origins.
   */
  if (process.env.NODE_ENV !== "production") {
    if (isLocalOrigin(origin) && isLocalOrigin(requestOrigin)) {
      return true;
    }
  }

  return false;
}

const express = require("express");
const db = require("./db");
const dns = require("node:dns").promises;
const ipaddr = require("ipaddr.js");

const app = express();

app.use(express.json());

// Check whether a URL uses HTTP/HTTPS and resolves to public IP addresses.
async function isPublicHttpUrl(value) {
  try {
    const parsed = new URL(value);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false;
    }

    if (parsed.username || parsed.password) {
      return false;
    }

    let hostname = parsed.hostname.toLowerCase();

    // Remove brackets around IPv6 addresses.
    if (hostname.startsWith("[") && hostname.endsWith("]")) {
      hostname = hostname.slice(1, -1);
    }

    // Block local and internal hostnames.
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname === "metadata.google.internal"
    ) {
      return false;
    }

    // Validate literal IP addresses.
    if (ipaddr.isValid(hostname)) {
      const address = ipaddr.parse(hostname);

      if (
        address.kind() === "ipv6" &&
        address.isIPv4MappedAddress()
      ) {
        return address.toIPv4Address().range() === "unicast";
      }

      return address.range() === "unicast";
    }

    // Resolve domain names to all IPv4 and IPv6 addresses.
    const addresses = await dns.lookup(hostname, {
      all: true,
      verbatim: true
    });

    if (addresses.length === 0) {
      return false;
    }

    // Reject the hostname if any resolved address is non-public.
    return addresses.every(({ address }) => {
      if (!ipaddr.isValid(address)) {
        return false;
      }

      const parsedAddress = ipaddr.parse(address);

      if (
        parsedAddress.kind() === "ipv6" &&
        parsedAddress.isIPv4MappedAddress()
      ) {
        return (
          parsedAddress.toIPv4Address().range() === "unicast"
        );
      }

      return parsedAddress.range() === "unicast";
    });
  } catch {
    return false;
  }
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy"
  });
});

// Add a website
app.post("/api/endpoints", async (req, res) => {
  const { name, url } = req.body || {};

  // Validate website name.
  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({
      error: "Please enter a website name."
    });
  }

  // Validate URL input.
  if (typeof url !== "string" || !url.trim()) {
    return res.status(400).json({
      error: "Please enter a website URL."
    });
  }

  // Parse URL.
  let parsedUrl;

  try {
    parsedUrl = new URL(url.trim());
  } catch {
    return res.status(400).json({
      error: "Please enter a valid URL, such as https://example.com."
    });
  }

  if (
    !["http:", "https:"].includes(parsedUrl.protocol) ||
    parsedUrl.username ||
    parsedUrl.password
  ) {
    return res.status(400).json({
      error: "URL must use HTTP or HTTPS and cannot contain login credentials."
    });
  }

  // DNS-aware URL validation.
  if (!(await isPublicHttpUrl(parsedUrl.href))) {
    return res.status(400).json({
      error: "This URL is not allowed. Please use a public website URL."
    });
  }

  // Save the validated website.
  try {
    const insert = db.prepare(`
      INSERT INTO endpoints (name, url)
      VALUES (?, ?)
    `);

    const result = insert.run(
      name.trim(),
      parsedUrl.href
    );

    return res.status(201).json({
      message: "Endpoint saved",
      id: result.lastInsertRowid
    });
  } catch (error) {
    console.error("Error saving endpoint:", error);

    return res.status(500).json({
      error: "Could not save the website. Please try again."
    });
  }
});

// List websites
app.get("/api/endpoints", (req, res) => {
  const endpoints = db.prepare(`
    SELECT * FROM endpoints
  `).all();

  res.json(endpoints);
});

// Check a website
app.post("/api/endpoints/:id/check", async (req, res) => {
  // Find the endpoint.
  const endpoint = db.prepare(`
    SELECT * FROM endpoints WHERE id = ?
  `).get(req.params.id);

  if (!endpoint) {
    return res.status(404).json({
      error: "Endpoint not found"
    });
  }

  // Validate the URL again before requesting it.
  if (!(await isPublicHttpUrl(endpoint.url))) {
    return res.status(400).json({
      error: "This URL is not allowed for monitoring."
    });
  }

  const startTime = Date.now();

  let statusCode = null;
  let success = false;
  let errorMessage = null;

  // Contact the website without following redirects.
  try {
    const response = await fetch(endpoint.url, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(5000)
    });

    if (response.status >= 300 && response.status < 400) {
      errorMessage =
        "Website redirected. Redirects are not followed for security.";

      statusCode = response.status;
      success = false;
    } else {
      statusCode = response.status;
      success = response.ok;
    }
  } catch (error) {
    errorMessage = error.name === "TimeoutError"
      ? "Request timed out after 5 seconds."
      : "Could not connect to this website.";
  }

  // Calculate latency.
  const latency = Date.now() - startTime;

  // Save the check result.
  db.prepare(`
    INSERT INTO checks
      (endpoint_id, status_code, latency_ms, success)
    VALUES (?, ?, ?, ?)
  `).run(
    endpoint.id,
    statusCode,
    latency,
    success ? 1 : 0
  );

  // Return the result.
  res.json({
    name: endpoint.name,
    url: endpoint.url,
    statusCode: statusCode,
    latencyMs: latency,
    success: success,
    error: errorMessage
  });
});

// View check history
app.get("/api/endpoints/:id/checks", (req, res) => {
  const endpointId = req.params.id;

  const checks = db.prepare(`
    SELECT * FROM checks
    WHERE endpoint_id = ?
    ORDER BY checked_at DESC
  `).all(endpointId);

  res.json(checks);
});

// View analytics
app.get("/api/endpoints/:id/analytics", (req, res) => {
  const endpointId = req.params.id;

  const analytics = db.prepare(`
    SELECT
      COUNT(*) AS total_checks,
      SUM(success) AS successful_checks,
      AVG(latency_ms) AS average_latency_ms
    FROM checks
    WHERE endpoint_id = ?
  `).get(endpointId);

  const totalChecks = analytics.total_checks;
  const successfulChecks = analytics.successful_checks ?? 0;

  const successRate = totalChecks === 0
    ? 0
    : (successfulChecks / totalChecks) * 100;

  res.json({
    totalChecks: totalChecks,
    successfulChecks: successfulChecks,
    successRate: Number(successRate.toFixed(2)),
    averageLatencyMs: analytics.average_latency_ms === null
      ? null
      : Math.round(analytics.average_latency_ms)
  });
});

// Start server
const server = app.listen(5000, () => {
  console.log("PulseCheck server is running on port 5000");
});

server.on("close", () => {
  console.log("SERVER CLOSED");
});

server.on("error", (err) => {
  console.log("SERVER ERROR:", err);
});

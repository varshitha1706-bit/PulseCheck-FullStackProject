
import { useEffect, useState } from "react";
import "./App.css";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";


function getDisplayStatus(check) {
  if (!check || check.statusCode == null) {
    return {
      label: "Unreachable",
      className: "failure",
    };
  }

  if (check.statusCode >= 300 && check.statusCode < 400) {
    return {
      label: "Redirect",
      className: "redirect",
    };
  }

  if (check.statusCode >= 200 && check.statusCode < 300) {
    return {
      label: "Healthy",
      className: "success",
    };
  }

  return {
    label: "HTTP Error",
    className: "failure",
  };
}




function App() {
  const [endpoints, setEndpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [checkResults, setCheckResults] = useState({});
  const [checkingId, setCheckingId] = useState(null);
  const [analytics, setAnalytics] = useState({});
  const [histories, setHistories] = useState({});
  const [activePage, setActivePage] = useState("Dashboard");

  async function loadData() {
    try {
      const response = await fetch("/api/endpoints");

      if (!response.ok) {
        throw new Error("Could not load websites");
      }

      const data = await response.json();
      setEndpoints(data);

      const results = {};
      const analyticsData = {};
      const historiesData = {};

      await Promise.all(
        data.map(async (endpoint) => {
          const [historyResponse, analyticsResponse] =
            await Promise.all([
              fetch(`/api/endpoints/${endpoint.id}/checks`),
              fetch(`/api/endpoints/${endpoint.id}/analytics`),
            ]);

          if (historyResponse.ok) {
            const history = await historyResponse.json();
            historiesData[endpoint.id] = history;

            if (history.length > 0) {
              const latest = history[0];

              results[endpoint.id] = {
                success: Boolean(latest.success),
                statusCode: latest.status_code,
                latencyMs: latest.latency_ms,
              };
            }
          }

          if (analyticsResponse.ok) {
            analyticsData[endpoint.id] =
              await analyticsResponse.json();
          }
        })
      );

      setCheckResults(results);
      setAnalytics(analyticsData);
      setHistories(historiesData);
      setError("");
    } catch {
      setError("Could not connect to the backend.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function addWebsite(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/endpoints", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          url: url.trim(),
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Could not save website");
      }

      setName("");
      setUrl("");
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function checkWebsite(endpointId) {
    setCheckingId(endpointId);
    setError("");

    try {
      const response = await fetch(
        `/api/endpoints/${endpointId}/check`,
        { method: "POST" }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Check failed");
      }

      setCheckResults((current) => ({
        ...current,
        [endpointId]: result,
      }));

      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setCheckingId(null);
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">P</span>
          <span>PulseCheck</span>
        </div>

        <p className="nav-label">WORKSPACE</p>

        <button
          className={`nav-item ${
            activePage === "Dashboard" ? "active" : ""
          }`}
          onClick={() => setActivePage("Dashboard")}
        >
          ▦ &nbsp; Dashboard
        </button>

        <button
          className={`nav-item ${
            activePage === "Check history" ? "active" : ""
          }`}
          onClick={() => setActivePage("Check history")}
        >
          ◷ &nbsp; Check history
        </button>

        <button
          className={`nav-item ${
            activePage === "Analytics" ? "active" : ""
          }`}
          onClick={() => setActivePage("Analytics")}
        >
          ⌘ &nbsp; Analytics
        </button>

        <div className="sidebar-bottom">
          <div className="status-dot" />
          <span>Monitoring workspace</span>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <span className="breadcrumb">
            Workspace / {activePage}
          </span>
          <span className="live-label">
            <span className="status-dot" />
            API monitoring
          </span>
        </header>

        {error && <p className="message error">{error}</p>}

        {/* DASHBOARD */}
        {activePage === "Dashboard" && (
          <>
            <section className="welcome">
              <p className="eyebrow">YOUR WEBSITES, AT A GLANCE</p>
              <h1>Good to see you.</h1>
              <p className="subtitle">
                Monitor website health and understand performance,
                all in one place.
              </p>
            </section>

            <section className="stats">
              <div className="stat-card">
                <p>Registered websites</p>
                <h2>{endpoints.length}</h2>
                <span>Saved in your workspace</span>
              </div>

              <div className="stat-card">
                <p>Monitoring status</p>
                <h2 className="stat-text">Ready</h2>
                <span>Manual checks available</span>
              </div>

              <div className="stat-card">
                <p>Check mode</p>
                <h2 className="stat-text">On demand</h2>
                <span>Run a check when you need it</span>
              </div>
            </section>

            <section className="websites-section">
              <div className="section-heading">
                <div>
                  <h2>Your websites</h2>
                  <p>Websites registered with PulseCheck</p>
                </div>
                <span className="count-badge">
                  {endpoints.length} total
                </span>
              </div>

              <form className="add-form" onSubmit={addWebsite}>
                <input
                  type="text"
                  placeholder="Website name (e.g. GitHub)"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />

                <input
                  type="url"
                  placeholder="Website URL (e.g. https://github.com)"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  required
                />

                <button type="submit" disabled={saving}>
                  {saving ? "Adding..." : "+ Add website"}
                </button>
              </form>

              {loading && (
                <p className="message">Loading your websites...</p>
              )}

              {!loading && endpoints.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">◎</div>
                  <h3>No websites yet</h3>
                  <p>Your registered websites will appear here.</p>
                </div>
              )}

              {!loading && endpoints.length > 0 && (
                <div className="website-list">
                  {endpoints.map((endpoint) => (
                    <div className="website-card" key={endpoint.id}>
                      <div className="website-icon">↗</div>

                      <div className="website-info">
                        <h3>{endpoint.name}</h3>
                        <p>{endpoint.url}</p>

                        {checkResults[endpoint.id] && (
                          <div className="check-result">
                            
{(() => {
  const status = getDisplayStatus(checkResults[endpoint.id]);

  return (
    <span className={`result-status ${status.className}`}>
      ● {status.label}
    </span>
  );
})()}


                            <span>
                              HTTP{" "}
                              {checkResults[endpoint.id].statusCode ??
                                "N/A"}
                            </span>

                            <span>
                              {checkResults[endpoint.id].latencyMs ?? "—"} ms
                            </span>
                          </div>
                        )}

                        {analytics[endpoint.id] && (
                          <div className="analytics-row">
                            <div>
                              <span>Total checks</span>
                              <strong>
                                {analytics[endpoint.id].totalChecks}
                              </strong>
                            </div>

                            <div>
                              <span>Success rate</span>
                              <strong>
                                {analytics[endpoint.id].successRate}%
                              </strong>
                            </div>

                            <div>
                              <span>Avg. latency</span>
                              <strong>
                                {analytics[endpoint.id]
                                  .averageLatencyMs == null
                                  ? "—"
                                  : `${analytics[endpoint.id].averageLatencyMs} ms`}
                              </strong>
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        className="check-button"
                        onClick={() => checkWebsite(endpoint.id)}
                        disabled={checkingId === endpoint.id}
                      >
                        {checkingId === endpoint.id
                          ? "Checking..."
                          : "Check now"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* CHECK HISTORY */}
        {activePage === "Check history" && (
          <section className="websites-section">
            <div className="welcome">
              <p className="eyebrow">PAST MONITORING RESULTS</p>
              <h1>Check history</h1>
              <p className="subtitle">
                Review saved checks, HTTP status codes, and response times.
              </p>
            </div>

            {loading && (
              <p className="message">Loading check history...</p>
            )}

            {!loading &&
              endpoints.map((endpoint) => (
                <div className="history-group" key={endpoint.id}>
                  <h2>{endpoint.name}</h2>
                  <p className="subtitle">{endpoint.url}</p>

                  {(histories[endpoint.id] || []).length === 0 ? (
                    <p className="message">No checks recorded yet.</p>
                  ) : (
                    <div className="website-list">
                      {histories[endpoint.id].map((check) => (
                        <div className="website-card" key={check.id}>
                          <div className="website-info">
                               <h3>
  {getDisplayStatus({
    statusCode: check.status_code,
  }).label}
</h3>

                            <p>
                              {check.checked_at} · HTTP{" "}
                              {check.status_code ?? "N/A"} ·{" "}
                              {check.latency_ms ?? "—"} ms
                            </p>
                          </div>

                          <span
                            className={`registered-badge ${
                              check.success ? "" : "failure"
                            }`}
                          >
                            {check.success ? "Success" : "Failed"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </section>
        )}

        {/* ANALYTICS + LATENCY CHART */}
        {activePage === "Analytics" && (
          <section className="websites-section">
            <div className="welcome">
              <p className="eyebrow">PERFORMANCE OVERVIEW</p>
              <h1>Analytics</h1>
              <p className="subtitle">
                Explore recorded check totals, success rates, and average
                response times.
              </p>
            </div>

            {loading && (
              <p className="message">Loading analytics...</p>
            )}

            {!loading &&
              endpoints.map((endpoint) => {
                const stats = analytics[endpoint.id];

                const chartData = [...(histories[endpoint.id] || [])]
                  .filter((check) => check.latency_ms != null)
                  .reverse()
                  .map((check, index) => ({
                    check: `Check ${index + 1}`,
                    latency: Number(check.latency_ms),
                    checkedAt: check.checked_at,
                  }));

                return (
                  <div className="history-group" key={endpoint.id}>
                    <h2>{endpoint.name}</h2>
                    <p className="subtitle">{endpoint.url}</p>

                    <div className="stats">
                      <div className="stat-card">
                        <p>Total checks</p>
                        <h2>{stats?.totalChecks ?? 0}</h2>
                        <span>Recorded checks</span>
                      </div>

                      <div className="stat-card">
                        <p>Success rate</p>
                        <h2>{stats?.successRate ?? 0}%</h2>
                        <span>Successful recorded checks</span>
                      </div>

                      <div className="stat-card">
                        <p>Average latency</p>
                        <h2 className="stat-text">
                          {stats?.averageLatencyMs == null
                            ? "—"
                            : `${stats.averageLatencyMs} ms`}
                        </h2>
                        <span>Across recorded checks</span>
                      </div>
                    </div>

                    {/* LATENCY CHART */}
                    <div className="chart-card">
                      <h3>Response time over time</h3>
                      <p className="subtitle">
                        Latency measured in milliseconds
                      </p>

                      {chartData.length === 0 ? (
                        <p className="message">
                          Run a website check to start building your chart.
                        </p>
                      ) : (
                        <ResponsiveContainer width="100%" height={260}>
                          <LineChart data={chartData}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#293241"
                            />

                            <XAxis
                              dataKey="check"
                              stroke="#9aa6b8"
                            />

                            <YAxis
                              stroke="#9aa6b8"
                              label={{
                                value: "Latency (ms)",
                                angle: -90,
                                position: "insideLeft",
                                fill: "#9aa6b8",
                              }}
                            />

                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#151b26",
                                border: "1px solid #293241",
                                borderRadius: "8px",
                                color: "#ffffff",
                              }}
                              labelFormatter={(label, payload) =>
                                payload?.[0]?.payload?.checkedAt || label
                              }
                              formatter={(value) => [
                                `${value} ms`,
                                "Latency",
                              ]}
                            />

                            <Line
                              type="monotone"
                              dataKey="latency"
                              name="Latency"
                              stroke="#8ee6b0"
                              strokeWidth={3}
                              dot={{ r: 4, fill: "#8ee6b0" }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                );
              })}

            {!loading && endpoints.length === 0 && (
              <p className="message">
                Add a website to start collecting analytics.
              </p>
            )}
          </section>
        )}

        <footer>
          PulseCheck · Website reliability, made understandable.
        </footer>
      </main>
    </div>
  );
}

export default App;

/**
 * Risk Dashboard - Vanilla JavaScript Version
 * Displays risk management metrics and interactive dashboard
 */

const COLORS = {
  critical: "#dc2626",
  high: "#f97316",
  medium: "#eab308",
  low: "#16a34a",
};

const SEVERITY_ORDER = { low: 1, medium: 2, high: 3, critical: 4 };
const STATUS_ORDER = { resolved: 1, mitigated: 2, monitoring: 3, active: 4 };

class RiskDashboard {
  constructor() {
    this.selectedLocation = "all";
    this.selectedSeverity = "all";
    this.selectedStatus = "all";
    this.searchQuery = "";
    this.selectedRisk = null;
    this.dialogOpen = false;
    this.currentTab = "overview";
  }

  init() {
    this.setupEventListeners();
    this.render();
  }

  setupEventListeners() {
    // Tab navigation
    document.addEventListener("click", (e) => {
      const tab = e.target.closest("[data-tab]");
      if (tab) {
        this.currentTab = tab.dataset.tab;
        this.render();
      }
    });

    // Filters
    document.addEventListener("change", (e) => {
      if (e.target.id === "location-filter") {
        this.selectedLocation = e.target.value;
        this.render();
      }
      if (e.target.id === "severity-filter") {
        this.selectedSeverity = e.target.value;
        this.render();
      }
      if (e.target.id === "status-filter") {
        this.selectedStatus = e.target.value;
        this.render();
      }
    });

    // Search
    document.addEventListener("input", (e) => {
      if (e.target.id === "search-input") {
        this.searchQuery = e.target.value;
        this.render();
      }
    });

    // Clear filters button
    document.addEventListener("click", (e) => {
      if (e.target.id === "clear-filters") {
        this.selectedLocation = "all";
        this.selectedSeverity = "all";
        this.selectedStatus = "all";
        this.searchQuery = "";
        this.render();
      }
    });

    // Risk card clicks
    document.addEventListener("click", (e) => {
      const riskCard = e.target.closest("[data-risk-id]");
      if (riskCard) {
        const riskId = riskCard.dataset.riskId;
        this.selectedRisk = mockRisks.find((r) => r.id === riskId);
        this.render();
      }
    });

    // Close dialog
    document.addEventListener("click", (e) => {
      if (e.target.id === "close-dialog") {
        this.selectedRisk = null;
        this.render();
      }
    });

    // Location card clicks
    document.addEventListener("click", (e) => {
      const locCard = e.target.closest("[data-location-id]");
      if (locCard && this.currentTab === "locations") {
        const locId = locCard.dataset.locationId;
        this.selectedLocation = locId;
        this.currentTab = "risks";
        this.render();
      }
    });
  }

  getFilteredRisks() {
    return mockRisks.filter((risk) => {
      const matchesLocation =
        this.selectedLocation === "all" ||
        risk.locationId === this.selectedLocation;
      const matchesSeverity =
        this.selectedSeverity === "all" ||
        risk.severity === this.selectedSeverity;
      const matchesStatus =
        this.selectedStatus === "all" ||
        risk.status === this.selectedStatus;
      const matchesSearch =
        this.searchQuery === "" ||
        risk.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        risk.description.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        risk.category.toLowerCase().includes(this.searchQuery.toLowerCase());

      return (
        matchesLocation &&
        matchesSeverity &&
        matchesStatus &&
        matchesSearch
      );
    });
  }

  calculateStats() {
    const totalCritical = mockRisks.filter(
      (r) => r.severity === "critical"
    ).length;
    const totalActive = mockRisks.filter(
      (r) => r.status === "active"
    ).length;
    const avgScore = Math.round(
      siteLocations.reduce((sum, loc) => sum + loc.overallRiskScore, 0) /
        siteLocations.length
    );

    return {
      totalLocations: siteLocations.length,
      totalActive,
      totalCritical,
      averageRiskScore: avgScore,
    };
  }

  getSeverityColor(severity) {
    return COLORS[severity] || "#666";
  }

  getStatusBadgeClass(status) {
    const classes = {
      active: "bg-red-100 text-red-800",
      mitigated: "bg-blue-100 text-blue-800",
      monitoring: "bg-yellow-100 text-yellow-800",
      resolved: "bg-green-100 text-green-800",
    };
    return classes[status] || "bg-gray-100 text-gray-800";
  }

  getSeverityBadgeClass(severity) {
    const classes = {
      critical: "bg-red-600 text-white",
      high: "bg-orange-500 text-white",
      medium: "bg-yellow-500 text-black",
      low: "bg-green-500 text-white",
    };
    return classes[severity] || "bg-gray-500 text-white";
  }

  // --- Logic for value-dependent coloring ---
  getDynamicColor(type, value) {
    if (type === 'active') {
      if (value <= 10) return COLORS.low;
      if (value <= 15) return COLORS.medium;
      if (value <= 20) return COLORS.high;
      return COLORS.critical;
    }
    
    if (type === 'critical') {
      if (value <= 3) return COLORS.low;
      if (value <= 6) return COLORS.medium;
      if (value <= 9) return COLORS.high;
      return COLORS.critical;
    }
    
    if (type === 'score') {
      if (value <= 15) return COLORS.low;
      if (value <= 30) return COLORS.medium;
      if (value <= 50) return COLORS.high;
      return COLORS.critical;
    }
    
    return "var(--card-foreground)"; // Default for locations
  }

  renderHeaderStats() {
    const stats = this.calculateStats();
    
    const headerData = [
      { label: "Total Locations", value: stats.totalLocations, icon: "🏢", type: 'locations' },
      { label: "Active Risks", value: stats.totalActive, icon: "⚠️", type: 'active' },
      { label: "Critical Risks", value: stats.totalCritical, icon: "🔴", type: 'critical' },
      { label: "Avg Risk Score", value: stats.averageRiskScore, icon: "🛡️", type: 'score' }
    ];

    return `
      <div style="display: flex; flex-wrap: wrap; gap: 1rem; margin: 2rem 2rem; position: sticky; top: 65px; z-index: 10;">
          ${headerData.map(item => `
        <div class="card" style="flex: 1; min-width: 200px; padding: 1rem 1.5rem; border: 1px solid var(--border); border-radius: var(--radius); background: var(--card); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <p style="color: var(--muted-foreground); margin: 0; font-size: 1rem; font-weight: 500; white-space: nowrap;">${item.label}</p>
              <p style="font-size: 2.5rem; font-weight: 800; color: ${this.getDynamicColor(item.type, item.value)}; margin: -4px 0 0 0;">${item.value}</p>
            </div>
            <span style="font-size: 2.5rem; opacity: 0.8;">${item.icon}</span>
          </div>
        </div>
          `).join('')}
      </div>
    `;
  }

  renderRiskCard(risk) {
    const location = siteLocations.find((l) => l.id === risk.locationId);
    const locationName = location?.name || "Unknown";

    return `
      <div class="risk-card" data-risk-id="${risk.id}" style="padding: 1.5rem; border: 1px solid var(--border); border-left: 4px solid ${this.getSeverityColor(risk.severity)}; border-radius: var(--radius); background: var(--card); cursor: pointer; transition: box-shadow 0.2s;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
          <h3 style="font-size: 1.1rem; font-weight: 600; color: var(--card-foreground); margin: 0;">${risk.title}</h3>
          <span class="badge ${this.getSeverityBadgeClass(risk.severity)}" style="padding: 0.25rem 0.75rem; border-radius: 0.25rem; font-size: 0.875rem; font-weight: 500;">${risk.severity.toUpperCase()}</span>
        </div>

        <p style="color: var(--muted-foreground); font-size: 0.875rem; margin-bottom: 0.75rem;">${risk.description.substring(0, 100)}...</p>

        <div style="display: flex; gap: 1rem; margin-bottom: 1rem; font-size: 0.875rem;">
          <span class="badge ${this.getStatusBadgeClass(risk.status)}" style="padding: 0.25rem 0.75rem; border-radius: 0.25rem;">Status: ${risk.status}</span>
          <span style="color: var(--muted-foreground);">📍 ${locationName}</span>
          <span style="color: var(--muted-foreground);">🏷️ ${risk.category}</span>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 0.75rem; border-top: 1px solid var(--border);">
          <span style="font-size: 0.875rem; color: var(--muted-foreground);">Trend: ${risk.trend}</span>
          <span style="font-size: 0.875rem; color: var(--muted-foreground);">Impact: ${risk.impact}/10</span>
        </div>
      </div>
    `;
  }

  renderLocationCard(location) {
    const locationRisks = mockRisks.filter((r) => r.locationId === location.id);
    const critical = locationRisks.filter((r) => r.severity === "critical").length;
    const high = locationRisks.filter((r) => r.severity === "high").length;
    const medium = locationRisks.filter((r) => r.severity === "medium").length;
    const low = locationRisks.filter((r) => r.severity === "low").length;

    return `
      <div class="location-card" data-location-id="${location.id}" style="padding: 1.5rem; border: 1px solid var(--border); border-top: 4px solid var(--primary); border-radius: var(--radius); background: var(--card); cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;">
        <h3 style="font-size: 1.125rem; font-weight: 600; color: var(--card-foreground); margin: 0 0 0.5rem 0;">${location.name}</h3>

        <p style="font-size: 0.875rem; color: var(--muted-foreground); white-space: pre-line; margin-bottom: 1rem;">${location.address}</p>

        <div style="margin-bottom: 1rem;">
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            ${location.type.map((t) => `<span class="badge" style="padding: 0.25rem 0.75rem; border-radius: 0.25rem; font-size: 0.75rem; background: rgba(0,0,0,0.1); color: var(--card-foreground);">${t}</span>`).join("")}
          </div>
        </div>

        <p style="font-size: 0.875rem; color: var(--muted-foreground); margin-bottom: 1rem;">${location.description.substring(0, 80)}...</p>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem;">
          <div style="padding: 0.5rem; background: rgba(220, 38, 38, 0.1); border-radius: 0.25rem; text-align: center;">
            <p style="font-weight: 600; color: #dc2626; margin: 0;">${critical}</p>
            <p style="font-size: 0.75rem; color: var(--muted-foreground); margin: 0;">Critical</p>
          </div>
          <div style="padding: 0.5rem; background: rgba(249, 115, 22, 0.1); border-radius: 0.25rem; text-align: center;">
            <p style="font-weight: 600; color: #f97316; margin: 0;">${high}</p>
            <p style="font-size: 0.75rem; color: var(--muted-foreground); margin: 0;">High</p>
          </div>
          <div style="padding: 0.5rem; background: rgba(234, 179, 8, 0.1); border-radius: 0.25rem; text-align: center;">
            <p style="font-weight: 600; color: #eab308; margin: 0;">${medium}</p>
            <p style="font-size: 0.75rem; color: var(--muted-foreground); margin: 0;">Med</p>
          </div>
          <div style="padding: 0.5rem; background: rgba(22, 163, 74, 0.1); border-radius: 0.25rem; text-align: center;">
            <p style="font-weight: 600; color: #16a34a; margin: 0;">${low}</p>
            <p style="font-size: 0.75rem; color: var(--muted-foreground); margin: 0;">Low</p>
          </div>
        </div>

        <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border);">
          <p style="font-size: 0.875rem; color: var(--muted-foreground); margin: 0;">Overall Risk Score: <strong style="color: var(--card-foreground);">${location.overallRiskScore}</strong></p>
        </div>
      </div>
    `;
  }

  renderOverviewTab() {
    return `
      <div style="padding: 1.5rem;">
        <h2 style="font-size: 1.5rem; font-weight: 600; margin: 0 0 1.5rem 0;">Dashboard Overview</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">
          <div style="background: var(--card); padding: 1.5rem; border-radius: var(--radius); border: 1px solid var(--border); min-height: 300px;">
            <h3 style="font-size: 1rem; color: var(--card-foreground); margin-bottom: 1rem;">Risk Severity Distribution</h3>
            <canvas id="severityChart"></canvas>
          </div>
          
          <div style="background: var(--card); padding: 2rem; border-radius: var(--radius); border: 1px solid var(--border); text-align: center; color: var(--muted-foreground);">
            <p>📊 Chart visualizations coming soon</p>
          </div>
      </div>
    `;
  }

  renderLocationsTab() {
    return `
      <div style="padding: 1.5rem;">
        <h2 style="font-size: 1.5rem; font-weight: 600; margin: 0 0 1.5rem 0;">Site Locations</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">
          ${siteLocations.map((loc) => this.renderLocationCard(loc)).join("")}
        </div>
      </div>
    `;
  }

  renderRisksTab() {
    const filteredRisks = this.getFilteredRisks();
    const hasFilters =
      this.selectedLocation !== "all" ||
      this.selectedSeverity !== "all" ||
      this.selectedStatus !== "all" ||
      this.searchQuery !== "";

    return `
      <div style="padding: 1.5rem;">
        <h2 style="font-size: 1.5rem; font-weight: 600; margin: 0 0 1.5rem 0;">Risk Details</h2>

        <div style="background: var(--card); padding: 1.5rem; border-radius: var(--radius); border: 1px solid var(--border); margin-bottom: 1.5rem;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
            <div>
              <label for="search-input" style="display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem; color: var(--card-foreground);">Search</label>
              <input type="text" id="search-input" placeholder="Search risks..." value="${this.searchQuery}" 
                style="width: 100%; padding: 0.5rem; border: 1px solid var(--border); border-radius: 0.375rem; background: var(--background); color: var(--foreground); font-family: inherit;">
            </div>

            <div>
              <label for="location-filter" style="display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem; color: var(--card-foreground);">Location</label>
              <select id="location-filter" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border); border-radius: 0.375rem; background: var(--background); color: var(--foreground); font-family: inherit;">
                <option value="all">All Locations</option>
                ${siteLocations.map((loc) => `<option value="${loc.id}" ${this.selectedLocation === loc.id ? "selected" : ""}>${loc.name}</option>`).join("")}
              </select>
            </div>

            <div>
              <label for="severity-filter" style="display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem; color: var(--card-foreground);">Severity</label>
              <select id="severity-filter" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border); border-radius: 0.375rem; background: var(--background); color: var(--foreground); font-family: inherit;">
                <option value="all">All Severities</option>
                <option value="critical" ${this.selectedSeverity === "critical" ? "selected" : ""}>Critical</option>
                <option value="high" ${this.selectedSeverity === "high" ? "selected" : ""}>High</option>
                <option value="medium" ${this.selectedSeverity === "medium" ? "selected" : ""}>Medium</option>
                <option value="low" ${this.selectedSeverity === "low" ? "selected" : ""}>Low</option>
              </select>
            </div>

            <div>
              <label for="status-filter" style="display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem; color: var(--card-foreground);">Status</label>
              <select id="status-filter" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border); border-radius: 0.375rem; background: var(--background); color: var(--foreground); font-family: inherit;">
                <option value="all">All Statuses</option>
                <option value="active" ${this.selectedStatus === "active" ? "selected" : ""}>Active</option>
                <option value="monitoring" ${this.selectedStatus === "monitoring" ? "selected" : ""}>Monitoring</option>
                <option value="mitigated" ${this.selectedStatus === "mitigated" ? "selected" : ""}>Mitigated</option>
                <option value="resolved" ${this.selectedStatus === "resolved" ? "selected" : ""}>Resolved</option>
              </select>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 1rem;">
            <span style="font-size: 0.875rem; color: var(--card-foreground);">Showing ${filteredRisks.length} of ${mockRisks.length} risks</span>
            ${hasFilters ? `<button id="clear-filters" style="padding: 0.5rem 0.75rem; background: var(--accent); color: var(--accent-foreground); border: none; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem;">Clear Filters</button>` : ""}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 1.5rem;">
          ${filteredRisks.length > 0 ? filteredRisks.map((risk) => this.renderRiskCard(risk)).join("") : `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--muted-foreground);">No risks found matching the current filters.</div>`}
        </div>
      </div>
    `;
  }

  renderMitigationTab() {
    return `
      <div style="padding: 1.5rem;">
        <h2 style="font-size: 1.5rem; font-weight: 600; margin: 0 0 1.5rem 0;">Mitigation Tracker</h2>
        <div style="background: var(--card); padding: 2rem; border-radius: var(--radius); border: 1px solid var(--border); text-align: center; color: var(--muted-foreground);">
          <p>📈 Mitigation tracking and progress visualization coming soon</p>
          <p style="font-size: 0.875rem;">Monitor remediation efforts, trends, and risk reduction progress.</p>
        </div>
      </div>
    `;
  }

  renderDialog() {
    if (!this.selectedRisk) return "";

    const location = siteLocations.find(
      (l) => l.id === this.selectedRisk.locationId
    );
    const locationName = location?.name || "Unknown";

    return `
      <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 50;" id="dialog-backdrop">
        <div style="background: var(--card); border-radius: var(--radius); border: 1px solid var(--border); max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto; padding: 2rem;" id="dialog-content">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem;">
            <div>
              <h2 style="font-size: 1.5rem; font-weight: 600; color: var(--card-foreground); margin: 0 0 0.5rem 0;">${this.selectedRisk.title}</h2>
              <span class="badge ${this.getSeverityBadgeClass(this.selectedRisk.severity)}" style="display: inline-block; padding: 0.25rem 0.75rem; border-radius: 0.375rem; font-size: 0.875rem;">${this.selectedRisk.severity.toUpperCase()}</span>
            </div>
            <button id="close-dialog" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--muted-foreground);">✕</button>
          </div>

          <div style="space-y: 1rem;">
            <div style="margin-bottom: 1.5rem;">
              <h3 style="font-size: 0.875rem; font-weight: 600; color: var(--muted-foreground); margin: 0 0 0.5rem 0;">DESCRIPTION</h3>
              <p style="color: var(--card-foreground); margin: 0;">${this.selectedRisk.description}</p>
            </div>

            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
              <div>
                <p style="font-size: 0.875rem; color: var(--muted-foreground); margin: 0 0 0.25rem 0;">Status</p>
                <span class="badge ${this.getStatusBadgeClass(this.selectedRisk.status)}" style="display: inline-block; padding: 0.25rem 0.75rem; border-radius: 0.375rem; font-size: 0.875rem;">${this.selectedRisk.status}</span>
              </div>
              <div>
                <p style="font-size: 0.875rem; color: var(--muted-foreground); margin: 0 0 0.25rem 0;">Category</p>
                <p style="margin: 0; color: var(--card-foreground);">${this.selectedRisk.category}</p>
              </div>
              <div>
                <p style="font-size: 0.875rem; color: var(--muted-foreground); margin: 0 0 0.25rem 0;">Location</p>
                <p style="margin: 0; color: var(--card-foreground);">${locationName}</p>
              </div>
              <div>
                <p style="font-size: 0.875rem; color: var(--muted-foreground); margin: 0 0 0.25rem 0;">Trend</p>
                <p style="margin: 0; color: var(--card-foreground);">${this.selectedRisk.trend}</p>
              </div>
            </div>

            ${this.selectedRisk.mitigationPlan ? `<div style="margin-bottom: 1.5rem;">
              <h3 style="font-size: 0.875rem; font-weight: 600; color: var(--muted-foreground); margin: 0 0 0.5rem 0;">MITIGATION PLAN</h3>
              <p style="color: var(--card-foreground); margin: 0;">${this.selectedRisk.mitigationPlan}</p>
            </div>` : ""}

            <div style="padding-top: 1rem; border-top: 1px solid var(--border);">
              <p style="font-size: 0.75rem; color: var(--muted-foreground); margin: 0;">Last Updated: ${this.selectedRisk.lastUpdated}</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  render() {
    const main = document.querySelector("main");
    if (!main) return;

    const tabContent = (() => {
      switch (this.currentTab) {
        case "overview":
          return this.renderOverviewTab();
        case "locations":
          return this.renderLocationsTab();
        case "risks":
          return this.renderRisksTab();
        case "mitigation":
          return this.renderMitigationTab();
        default:
          return this.renderOverviewTab();
      }
    })();

    main.innerHTML = `
      ${this.renderHeaderStats()}

      <div style="margin: 0 2rem;">
        <div style="display: flex; gap: 0; border-bottom: 2px solid var(--border); margin-bottom: 1.5rem;">
          <button data-tab="overview" style="padding: 1rem 1.5rem; border: none; background: none; color: ${this.currentTab === "overview" ? "var(--primary)" : "var(--muted-foreground)"}; border-bottom: ${this.currentTab === "overview" ? "2px solid var(--primary)" : "2px solid transparent"}; cursor: pointer; font-weight: 500; transition: all 0.2s;">Overview</button>
          <button data-tab="locations" style="padding: 1rem 1.5rem; border: none; background: none; color: ${this.currentTab === "locations" ? "var(--primary)" : "var(--muted-foreground)"}; border-bottom: ${this.currentTab === "locations" ? "2px solid var(--primary)" : "2px solid transparent"}; cursor: pointer; font-weight: 500; transition: all 0.2s;">Locations</button>
          <button data-tab="risks" style="padding: 1rem 1.5rem; border: none; background: none; color: ${this.currentTab === "risks" ? "var(--primary)" : "var(--muted-foreground)"}; border-bottom: ${this.currentTab === "risks" ? "2px solid var(--primary)" : "2px solid transparent"}; cursor: pointer; font-weight: 500; transition: all 0.2s;">Risk Details</button>
          <button data-tab="mitigation" style="padding: 1rem 1.5rem; border: none; background: none; color: ${this.currentTab === "mitigation" ? "var(--primary)" : "var(--muted-foreground)"}; border-bottom: ${this.currentTab === "mitigation" ? "2px solid var(--primary)" : "2px solid transparent"}; cursor: pointer; font-weight: 500; transition: all 0.2s;">Mitigation</button>
        </div>

        ${tabContent}
      </div>

      ${this.renderDialog()}
    `;
  }
}

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  const dashboard = new RiskDashboard();
  dashboard.init();
});
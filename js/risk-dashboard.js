/**
 * Risk Dashboard - Vanilla JavaScript Version
 * Main Controller for data fetching, filtering, and tab management.
 */

import { renderRiskDialog } from './risk-details-dialog.js';
import { renderLocationCard } from './location-card.js';
import { ChartHelpers } from './charts.js';

const COLORS = {
  critical: "#dc2626",
  high: "#f97316",
  medium: "#eab308",
  low: "#16a34a",
};

class RiskDashboard {
  constructor() {
    this.risks = [];
    this.locations = [];
    this.selectedLocation = "all";
    this.selectedSeverity = "all";
    this.selectedStatus = "all";
    this.searchQuery = "";
    this.selectedRisk = null;
    this.currentTab = "overview";
  }

  // --- 1. DATA INITIALIZATION ---
  async loadData() {
    try {
      const [riskResponse, locationResponse] = await Promise.all([
        fetch('./data/risks.json'),
        fetch('./data/locations.json')
      ]);
      
      this.risks = await riskResponse.json();
      this.locations = await locationResponse.json();
      
      this.render(); 
      console.log("Dashboard Data Loaded", { risks: this.risks.length, locations: this.locations.length });
    } catch (error) {
      console.error("Data Load Failed:", error);
    }
  }

  init() {
    this.setupEventListeners();
    this.loadData();
  }

  // --- 2. EVENT HANDLING ---
  setupEventListeners() {
    document.addEventListener("click", (e) => {
      const tab = e.target.closest("[data-tab]");
      if (tab) {
        this.currentTab = tab.dataset.tab;
        this.render(); 
        return;
      }

      if (e.target.id === "close-dialog" || e.target.id === "dialog-backdrop") {
        this.selectedRisk = null;
        this.render();
        return;
      }

      if (e.target.id === "clear-filters") {
        this.selectedLocation = "all";
        this.selectedSeverity = "all";
        this.selectedStatus = "all";
        this.searchQuery = "";
        this.render();
        return;
      }

      const riskCard = e.target.closest("[data-risk-id]");
      if (riskCard) {
        const riskId = riskCard.dataset.riskId;
        this.selectedRisk = this.risks.find((r) => r.id === riskId);
        this.render();
        return;
      }
    });

    document.addEventListener("change", (e) => {
      const filters = ["location-filter", "severity-filter", "status-filter"];
      if (filters.includes(e.target.id)) {
        if (e.target.id === "location-filter") this.selectedLocation = e.target.value;
        if (e.target.id === "severity-filter") this.selectedSeverity = e.target.value;
        if (e.target.id === "status-filter") this.selectedStatus = e.target.value;
        this.render();
      }
    });

    document.addEventListener("input", (e) => {
      if (e.target.id === "search-input") {
        this.searchQuery = e.target.value;
        this.render();
      }
    });
  }

  // --- 3. LOGIC & CALCULATIONS ---
  calculateStats() {
  const totalCritical = this.risks.filter((r) => r.severity === "critical").length;
  const totalActive = this.risks.filter((r) => r.status === "active").length;
  
  // Calculate the total impact of every risk in the system
  const totalImpact = this.risks.reduce((sum, risk) => sum + (Number(risk.impact) || 0), 0);
  
  // Average Site Score = Total System Impact / Number of Locations
  const avgSiteScore = this.locations.length > 0 
    ? (totalImpact / this.locations.length).toFixed(1) 
    : "0.0";

  return { 
    totalLocations: this.locations.length, 
    totalActive, 
    totalCritical, 
    averageRiskScore: avgSiteScore 
  };
}

  getFilteredRisks() {
    return this.risks.filter((risk) => {
      const matchesLocation = this.selectedLocation === "all" || risk.locationId === this.selectedLocation;
      const matchesSeverity = this.selectedSeverity === "all" || risk.severity === this.selectedSeverity;
      const matchesStatus   = this.selectedStatus === "all"   || risk.status === this.selectedStatus;
      const matchesSearch   = this.searchQuery === "" || 
        [risk.title, risk.description, risk.category].some(text => 
          text.toLowerCase().includes(this.searchQuery.toLowerCase())
        );
      return matchesLocation && matchesSeverity && matchesStatus && matchesSearch;
    });
  }

  // --- 4. STYLING HELPERS ---
  getBadgeClass(type, value) {
    const maps = {
      status: { active: "bg-red-100 text-red-800", mitigated: "bg-blue-100 text-blue-800", monitoring: "bg-yellow-100 text-yellow-800", resolved: "bg-green-100 text-green-800" },
      severity: { critical: "bg-red-600 text-white", high: "bg-orange-500 text-white", medium: "bg-yellow-500 text-black", low: "bg-green-500 text-white" }
    };
    return maps[type][value] || "bg-gray-100 text-gray-800";
  }

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
    if (type === 'count') {
      if (value <= 4) return COLORS.low;
      if (value <= 5) return COLORS.medium;
      if (value <= 6) return COLORS.high;
      return COLORS.critical;
    }
    return "var(--foreground)";
  }

  // --- 5. RENDER COMPONENTS ---
  renderHeaderStats() {
    const stats = this.calculateStats();
    const headerData = [
      { label: "Total Locations", value: stats.totalLocations, icon: "🏢", type: 'locations' },
      { label: "Active Risks", value: stats.totalActive, icon: "⚠️", type: 'active' },
      { label: "Critical Risks", value: stats.totalCritical, icon: "🚨", type: 'critical' },
      { label: "Avg Risk Score", value: stats.averageRiskScore, icon: "📋", type: 'score' }
    ];

    return `
      <div class="stats-header" style="display: flex; gap: 1rem; padding: 1.5rem 2rem; position: sticky; top: 110px; z-index: 99; background: var(--background); border-bottom: 1px solid var(--border); overflow-x: auto;">
        ${headerData.map(item => `
          <div class="card" style="flex: 1; min-width: 220px; padding: 1.25rem; border: 1px solid var(--border); border-radius: var(--radius); background: var(--card);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <p style="color: var(--muted-foreground); margin: 0; font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">${item.label}</p>
                <p style="font-size: 2rem; font-weight: 800; color: ${this.getDynamicColor(item.type, item.value)}; margin: 0;">${item.value}</p>
              </div>
              <span style="font-size: 1.75rem;">${item.icon}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderRiskCard(risk) {
    const location = this.locations.find((l) => l.id === risk.locationId);
    return `
      <div class="risk-card" data-risk-id="${risk.id}" style="padding: 1.5rem; border: 1px solid var(--border); border-left: 5px solid ${COLORS[risk.severity]}; border-radius: var(--radius); background: var(--card); cursor: pointer;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
          <h3 style="font-size: 1rem; font-weight: 700; margin: 0; flex: 1; padding-right: 1rem;">${risk.title}</h3>
          <span class="badge ${this.getBadgeClass('severity', risk.severity)}" style="padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">${risk.severity.toUpperCase()}</span>
        </div>
        <p style="color: var(--muted-foreground); font-size: 0.85rem; margin-bottom: 1rem; line-height: 1.4;">${risk.description.substring(0, 100)}...</p>
        <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; font-size: 0.8rem; padding-top: 1rem; border-top: 1px solid var(--border);">
          <span class="badge ${this.getBadgeClass('status', risk.status)}" style="padding: 0.2rem 0.5rem; border-radius: 4px;">${risk.status}</span>
          <span>📍 ${location?.name || "Unknown"}</span>
          <span>🏷️ ${risk.category}</span>
          <span style="margin-left: auto; font-weight: 600;">Impact: ${risk.impact}/10</span>
        </div>
      </div>
    `;
  }

  // --- 6. TAB RENDERING ---
  renderOverviewTab() {
    return `
      <div style="padding: 2rem 0;">
        <h2 style="margin-bottom: 1.5rem;">Dashboard Overview</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem;">
          <div class="card" style="padding: 1.5rem; min-height: 400px; display: flex; flex-direction: column;">
            <h3 style="font-size: 1rem; margin-bottom: 1.5rem;">Risk Severity Distribution</h3>
            <div style="flex: 1;"><canvas id="severityChart"></canvas></div>
          </div>
          <div class="card" style="padding: 1.5rem; min-height: 400px; display: flex; flex-direction: column;">
            <h3 style="font-size: 1rem; margin-bottom: 1.5rem;">Risks by Category & Location</h3>
            <div style="flex: 1;"><canvas id="categoryChart"></canvas></div>
          </div>
        </div>
      </div>
    `;
  }

  renderRisksTab() {
    const filteredRisks = this.getFilteredRisks();
    return `
      <div style="padding: 2rem 0;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <h2>Risk Details</h2>
          <span style="font-size: 0.85rem; color: var(--muted-foreground);">Showing ${filteredRisks.length} of ${this.risks.length} entries</span>
        </div>
        <div style="background: var(--card); padding: 1.5rem; border-radius: var(--radius); border: 1px solid var(--border); margin-bottom: 2rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; align-items: end;">
          <div>
            <label style="display: block; font-size: 0.75rem; font-weight: 700; margin-bottom: 0.5rem; text-transform: uppercase;">Search</label>
            <input type="text" id="search-input" placeholder="Search keywords..." value="${this.searchQuery}" style="width: 100%; padding: 0.6rem; border: 1px solid var(--border); border-radius: 6px; background: var(--background); color: var(--foreground);">
          </div>
          <div>
            <label style="display: block; font-size: 0.75rem; font-weight: 700; margin-bottom: 0.5rem; text-transform: uppercase;">Location</label>
            <select id="location-filter" style="width: 100%; padding: 0.6rem; border: 1px solid var(--border); border-radius: 6px; background: var(--background); color: var(--foreground);">
              <option value="all">All Sites</option>
              ${this.locations.map(loc => `<option value="${loc.id}" ${this.selectedLocation === loc.id ? "selected" : ""}>${loc.name}</option>`).join("")}
            </select>
          </div>
          <div>
            <label style="display: block; font-size: 0.75rem; font-weight: 700; margin-bottom: 0.5rem; text-transform: uppercase;">Severity</label>
            <select id="severity-filter" style="width: 100%; padding: 0.6rem; border: 1px solid var(--border); border-radius: 6px; background: var(--background); color: var(--foreground);">
              <option value="all">All Severities</option>
              <option value="critical" ${this.selectedSeverity === "critical" ? "selected" : ""}>Critical</option>
              <option value="high" ${this.selectedSeverity === "high" ? "selected" : ""}>High</option>
              <option value="medium" ${this.selectedSeverity === "medium" ? "selected" : ""}>Medium</option>
              <option value="low" ${this.selectedSeverity === "low" ? "selected" : ""}>Low</option>
            </select>
          </div>
          <button id="clear-filters" style="padding: 0.6rem; background: var(--primary); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Reset Filters</button>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 1.5rem;">
          ${filteredRisks.length > 0 ? filteredRisks.map(risk => this.renderRiskCard(risk)).join("") : `<p style="grid-column: 1/-1; text-align: center; padding: 3rem;">No risks found matching those criteria.</p>`}
        </div>
      </div>
    `;
  }

  renderLocationsTab() {
  const cardsHtml = this.locations.map(loc => {
    // 1. Filter risks for this location
    const locationRisks = this.risks.filter(r => r.locationId === loc.id);
    const riskCount = locationRisks.length;
    
    // 2. Sum the impact of all risks for this site
    const siteScore = locationRisks.reduce((sum, r) => sum + (Number(r.impact) || 0), 0);

    // 3. Establish dynamic colors using the dashboard's internal logic
    // countColor follows the 'active' thresholds (10/15/20)
    const countColor = this.getDynamicColor('count', riskCount);
    
    // scoreColor follows the 'score' thresholds (15/30/50)
    const scoreColor = this.getDynamicColor('score', siteScore);

    // 4. Return the component string
    return renderLocationCard(loc, riskCount, siteScore, scoreColor, countColor);
  }).join('');

  return `
    <div style="padding: 2rem 0;">
      <h2 style="margin-bottom: 1.5rem;">Regional Risk Centers</h2>
      <div class="location-grid">
        ${cardsHtml}
      </div>
    </div>
  `;
}

  // --- 7. CORE RENDER CYCLE ---
  render() {
    const main = document.querySelector("main");
    if (!main) return;

    document.body.style.overflow = this.selectedRisk ? 'hidden' : '';

    const activeElementId = document.activeElement?.id;
    const start = document.activeElement?.selectionStart;
    const end = document.activeElement?.selectionEnd;

    const tabContent = (() => {
      switch (this.currentTab) {
        case "overview":   return this.renderOverviewTab();
        case "locations":  return this.renderLocationsTab(); // Removed the extra wrapper div that was adding padding
        case "risks":      return this.renderRisksTab();
        case "mitigation": return `<div style="padding:2rem 0; text-align:center;"><h2>Mitigation Tracker</h2><div class="card" style="padding:3rem;">Coming Soon...</div></div>`;
        default:           return this.renderOverviewTab();
      }
    })();

    main.innerHTML = `
      <div style="width: 100%;">
        ${this.renderHeaderStats()}
        <div style="max-width: 1600px; margin: 0 auto; padding: 0 2rem;">
          ${tabContent}
        </div>
      </div>
      ${this.selectedRisk ? renderRiskDialog(this.selectedRisk, this.locations.find(l => l.id === this.selectedRisk.locationId)?.name, COLORS) : ""}
    `;

    // Re-attach interactivity for Location Cards
    if (this.currentTab === 'locations') {
      main.querySelectorAll('.location-card').forEach(card => {
        card.addEventListener('click', () => {
          const locId = card.getAttribute('data-location-id');
          if (locId) {
            this.selectedLocation = locId;
            this.currentTab = 'risks';
            this.render();
          }
        });
      });
    }

    if (activeElementId) {
      const el = document.getElementById(activeElementId);
      if (el) { el.focus(); if (start !== null) el.setSelectionRange(start, end); }
    }

    document.querySelectorAll('.tab-btn').forEach(btn => 
      btn.classList.toggle('active-tab', btn.dataset.tab === this.currentTab)
    );

    if (this.currentTab === 'overview') this.initCharts();
  }

  initCharts() {
    const severityCtx = document.getElementById('severityChart');
    const categoryCtx = document.getElementById('categoryChart');
    if (!severityCtx || !categoryCtx) return;

    [severityCtx, categoryCtx].forEach(ctx => {
      const existing = Chart.getChart(ctx);
      if (existing) existing.destroy();
    });

    const counts = {
      critical: this.risks.filter(r => r.severity === 'critical').length,
      high: this.risks.filter(r => r.severity === 'high').length,
      medium: this.risks.filter(r => r.severity === 'medium').length,
      low: this.risks.filter(r => r.severity === 'low').length
    };
    ChartHelpers.initSeverityChart(severityCtx, counts, COLORS, (ev, el) => {
      if (el.length > 0) {
        this.selectedSeverity = ['critical', 'high', 'medium', 'low'][el[0].index];
        this.currentTab = 'risks';
        this.render();
      }
    });

    const categories = [...new Set(this.risks.map(r => r.category))];
    const palette = ['#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1'];
    const datasets = this.locations.map((loc, idx) => ({
      label: loc.name,
      data: categories.map(cat => this.risks.filter(r => r.locationId === loc.id && r.category === cat).length),
      backgroundColor: palette[idx % palette.length]
    }));
    ChartHelpers.initCategoryChart(categoryCtx, categories, datasets, (ev, el) => {
      if (el.length > 0) {
        this.searchQuery = categories[el[0].index];
        this.currentTab = 'risks';
        this.render();
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const dashboard = new RiskDashboard();
  dashboard.init();
});
/**
 * Risk Dashboard - Vanilla JavaScript Version
 * Displays risk management metrics and interactive dashboard
 */

import { renderRiskDialog } from './risk-details-dialog.js';
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
    this.risks = []; // This will hold the risk data, ideally fetched from an API or database //
    this.locations = []; // This will hold the location data, ideally fetched from an API or database //
    this.selectedLocation = "all";
    this.selectedSeverity = "all";
    this.selectedStatus = "all";
    this.searchQuery = "";
    this.selectedRisk = null;
    this.dialogOpen = false;
    this.currentTab = "overview";
  }

  // This is what "pulls" the data that feeds the following lines of code that render the dashboard. It simulates an API call by fetching a local JSON file, but in a real application, this would be where you connect to your backend or database.
  async loadData() {
    try {
      // 1. Ask for the file
      const [riskResponse, locationResponse] = await Promise.all([
        fetch('./data/risks.json'),
        fetch('./data/locations.json')
      ]);
      
      // 2. Wait for it to be converted to JSON
      const risksData = await riskResponse.json();
      const locationsData = await locationResponse.json();
      
      // 3. Put that data into our bucket
      this.risks = risksData;
      this.locations = locationsData;
      
      // 4. IMPORTANT: Tell the dashboard to draw itself NOW that the bucket is full
      this.render(); 
      
      console.log("Everything Loaded!", {risks: this.risks, locations: this.locations});
    } catch (error) {
      console.error("The data failed to load. Check your file path!", error);
    }
  }

  init() {
    this.setupEventListeners();
    this.loadData(); //THIS STARTS THE FETCHING OF DATA, WHICH THEN CALLS RENDER
    this.render(); 
  }

  setupEventListeners() {
    // 1. Tab Navigation
    document.addEventListener("click", (e) => {
      const tab = e.target.closest("[data-tab]");
      if (tab) {
        this.currentTab = tab.dataset.tab;
        this.render(); 
      }
    });

    // 2. Close Dialog (New - goes right here!)
    document.addEventListener("click", (e) => {
      if (e.target.id === "close-dialog" || e.target.id === "dialog-backdrop") {
        this.selectedRisk = null;
        this.render(); // This will also trigger the "Scroll Unlock" in your render() method
      }
    });

    // 2. Filters (Location, Severity, Status)
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

    // 3. Search Input
    document.addEventListener("input", (e) => {
      if (e.target.id === "search-input") {
        this.searchQuery = e.target.value;
        this.render();
      }
    });

    // 4. Clear Filters Button
    document.addEventListener("click", (e) => {
      if (e.target.id === "clear-filters") {
        this.selectedLocation = "all";
        this.selectedSeverity = "all";
        this.selectedStatus = "all";
        this.searchQuery = "";
        this.render();
      }
    });

    // 5. Risk Card Clicks (Open Dialog)
    document.addEventListener("click", (e) => {
      const riskCard = e.target.closest("[data-risk-id]");
      if (riskCard) {
        const riskId = riskCard.dataset.riskId;
        this.selectedRisk = this.risks.find((r) => r.id === riskId);
        this.render();
      }
    });

    // 6. Close Dialog
    document.addEventListener("click", (e) => {
      if (e.target.id === "close-dialog" || e.target.id === "dialog-backdrop") {
        this.selectedRisk = null;
        this.render();
      }
    });

    // 7. Location Card Clicks (Jump to Risks Tab)
    document.addEventListener("click", (e) => {
      const locCard = e.target.closest("[data-location-id]");
      if (locCard && this.currentTab === "locations") {
        const locId = locCard.dataset.locationId;
        this.selectedLocation = locId;
        this.currentTab = "risks";
        this.render();
      }
    });
  } // <--- This one closing brace now correctly ends the function

  getFilteredRisks() {
    return this.risks.filter((risk) => {
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
    const totalCritical = this.risks.filter((r) => r.severity === "critical").length;
    const totalActive = this.risks.filter((r) => r.status === "active").length;

    // 1. Calculate live scores for every location based on risk impact
    const liveLocationScores = this.locations.map(loc => {
      const locRisks = this.risks.filter(r => r.locationId === loc.id);
      // Sum the 'impact' property of every risk at this location
      return locRisks.reduce((sum, risk) => sum + (Number(risk.impact) || 0), 0);
    });

    // 2. Calculate the average of those live scores
    const avgScore = liveLocationScores.length > 0 
      ? Math.round(liveLocationScores.reduce((a, b) => a + b, 0) / liveLocationScores.length) 
      : 0;

    return {
      totalLocations: this.locations.length,
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
      { label: "Critical Risks", value: stats.totalCritical, icon: "🚨", type: 'critical' },
      { label: "Avg Risk Score", value: stats.averageRiskScore, icon: "📋", type: 'score' }
    ];

    return `
      <div style="
        display: flex;
        flex-wrap: nowrap;
        overflow-x: auto;
        gap: 1rem;
        margin: 0;
        padding: 1.5rem 2rem;
        position: sticky;
        top: 110px;
        z-index: 99;
        background: rgba(255, 255, 255, 0.05); /* Very slight tint */
        backdrop-filter: blur(4px); /* Optional: slight glass effect */
        border-bottom: 1px solid var(--border);
      ">

          ${headerData.map(item => `
        <div class="card" style="flex: 1; min-width: 200px; padding: 1rem 1.5rem; border: 1px solid var(--border); border-radius: var(--radius); background: var(--card); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <p style="color: var(--primary-foreground); margin: 0; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.025em;">${item.label}</p>
              <p style="font-size: 2.25rem; font-weight: 800; color: ${this.getDynamicColor(item.type, item.value)}; margin: -2px 0 0 0;">${item.value}</p>
            </div>
            <span style="font-size: 2rem; opacity: 0.9;">${item.icon}</span>
          </div>
        </div>
          `).join('')}
      </div>
    `;
}

  renderRiskCard(risk) {
    const location = this.locations.find((l) => l.id === risk.locationId);
    const locationName = location?.name || "Unknown";

    return `
      <div class="risk-card" data-risk-id="${risk.id}" style="padding: 1.5rem; border: 1px solid var(--border); border-left: 4px solid ${this.getSeverityColor(risk.severity)}; border-radius: var(--radius); background: var(--card); cursor: pointer; transition: box-shadow 0.2s;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
          <h3 style="font-size: 1.1rem; font-weight: 600; color: var(--card-foreground); margin: 0;">${risk.title}</h3>
          <span class="badge ${this.getSeverityBadgeClass(risk.severity)}" style="padding: 0.25rem 0.75rem; border-radius: 0.25rem; font-size: 0.875rem; font-weight: 500;">${risk.severity.toUpperCase()}</span>
        </div>

        <p style="color: var(--primary-foreground); font-size: 0.875rem; margin-bottom: 0.75rem;">${risk.description.substring(0, 100)}...</p>

        <div style="display: flex; gap: 1rem; margin-bottom: 1rem; font-size: 0.875rem;">
          <span class="badge ${this.getStatusBadgeClass(risk.status)}" style="padding: 0.25rem 0.75rem; border-radius: 0.25rem;">Status: ${risk.status}</span>
          <span style="color: var(--primary-foreground);">📍 ${locationName}</span>
          <span style="color: var(--primary-foreground);">🏷️ ${risk.category}</span>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 0.75rem; border-top: 1px solid var(--border);">
          <span style="font-size: 0.875rem; color: var(--primary-foreground);">Trend: ${risk.trend}</span>
          <span style="font-size: 0.875rem; color: var(--primary-foreground);">Impact: ${risk.impact}/10</span>
        </div>
      </div>
    `;
  }

  renderLocationCard(location) {
    // 1. This line is the "Link". It finds all risks belonging to THIS location.
    const locationRisks = this.risks.filter((r) => r.locationId === location.id);

    // 2. Calculate the live overall risk score for this location by summing the 'impact' of all its risks
    const liveScore = locationRisks.reduce((sum, risk) => sum + (Number(risk.impact) || 0), 0);

    // 3. These lines count the risks by severity
    const critical = locationRisks.filter((r) => r.severity === "critical").length;
    const high = locationRisks.filter((r) => r.severity === "high").length;
    const medium = locationRisks.filter((r) => r.severity === "medium").length;
    const low = locationRisks.filter((r) => r.severity === "low").length;

    // 4. Let's calculate the TOTAL count
    const totalrisksatthislocation = locationRisks.length;
    
    return `
      <div class="location-card" data-location-id="${location.id}" style="padding: 1.5rem; border: 1px solid var(--border); border-top: 4px solid var(--primary); border-radius: var(--radius); background: var(--card); cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;">
       <h3 style="font-size: 1.125rem; font-weight: 600; color: var(--card-foreground); margin: 0 0 0.5rem 0;">${location.name}</h3>
       
       <p style="font-size: 0.9rem; font-weight: 700; color: var(--primary); margin-bottom: 0.5rem;">Total Risks: ${totalrisksatthislocation}</p>
       
       <p style="font-size: 0.875rem; color: var(--primary-foreground); white-space: pre-line; margin-bottom: 1rem;">${location.address}</p>

        <div style="margin-bottom: 1rem;">
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            ${location.type.map((t) => `<span class="badge" style="padding: 0.25rem 0.75rem; border-radius: 0.25rem; font-size: 0.75rem; background: rgba(0,0,0,0.1); color: var(--card-foreground);">${t}</span>`).join("")}
          </div>
        </div>

        <p style="font-size: 0.875rem; color: var(--primary-foreground); margin-bottom: 1rem;">${location.description.substring(0, 80)}...</p>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem;">
          <div style="padding: 0.5rem; background: rgba(220, 38, 38, 0.1); border-radius: 0.25rem; text-align: center;">
            <p style="font-weight: 600; color: #dc2626; margin: 0;">${critical}</p>
            <p style="font-size: 0.75rem; color: var(--primary-foreground); margin: 0;">Critical</p>
          </div>
          <div style="padding: 0.5rem; background: rgba(249, 115, 22, 0.1); border-radius: 0.25rem; text-align: center;">
            <p style="font-weight: 600; color: #f97316; margin: 0;">${high}</p>
            <p style="font-size: 0.75rem; color: var(--primary-foreground); margin: 0;">High</p>
          </div>
          <div style="padding: 0.5rem; background: rgba(234, 179, 8, 0.1); border-radius: 0.25rem; text-align: center;">
            <p style="font-weight: 600; color: #eab308; margin: 0;">${medium}</p>
            <p style="font-size: 0.75rem; color: var(--primary-foreground); margin: 0;">Med</p>
          </div>
          <div style="padding: 0.5rem; background: rgba(22, 163, 74, 0.1); border-radius: 0.25rem; text-align: center;">
            <p style="font-weight: 600; color: #16a34a; margin: 0;">${low}</p>
            <p style="font-size: 0.75rem; color: var(--primary-foreground); margin: 0;">Low</p>
          </div>
        </div>

        <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border);">
          <p style="font-size: 0.875rem; color: var(--primary-foreground); margin: 0;">Overall Risk Score: <strong style="color: var(--card-foreground);">${liveScore}</strong></p>
        </div>
      </div>
    `;
  }

  renderOverviewTab() {
    return `
    <div style="padding: 1.5rem;">
      <h2 style="font-size: 1.5rem; font-weight: 600; margin: 0 0 1.5rem 0;">Dashboard Overview</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">
        
        <div class="card" style="padding: 1.5rem; height: 400px; display: flex; flex-direction: column; overflow: hidden;">
          <h3 style="font-size: 1rem; color: var(--card-foreground); margin-bottom: 1rem;">Risk Severity Distribution</h3>
          <div style="flex: 1; position: relative; height: 300px;"> <canvas id="severityChart"></canvas>
          </div>
        </div>
        
        <div class="card" style="padding: 1.5rem; height: 400px; display: flex; flex-direction: column; overflow: hidden;">
          <h3 style="font-size: 1rem; margin-bottom: 1rem;">Risks by Category</h3>
          <div style="flex: 1; position: relative; height: 300px;"> <canvas id="categoryChart"></canvas>
          </div>
        </div>

      </div>
    </div>
  `;
  }

  renderLocationsTab() {
    return `
      <div style="padding: 1.5rem;">
        <h2 style="font-size: 1.5rem; font-weight: 600; margin: 0 0 1.5rem 0;">Site Locations</h2>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem;">
          ${this.locations.map((loc) => this.renderLocationCard(loc)).join("")}
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
                ${this.locations.map((loc) => `<option value="${loc.id}" ${this.selectedLocation === loc.id ? "selected" : ""}>${loc.name}</option>`).join("")}
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
            <span style="font-size: 0.875rem; color: var(--card-foreground);">Showing ${filteredRisks.length} of ${this.risks.length} risks</span>
            ${hasFilters ? `<button id="clear-filters" style="padding: 0.5rem 0.75rem; background: var(--accent); color: var(--accent-foreground); border: none; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem;">Clear Filters</button>` : ""}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 1.5rem;">
          ${filteredRisks.length > 0 
            ? filteredRisks.map((risk) => this.renderRiskCard(risk)).join("") 
            : `
              <div style="grid-column: 1/-1; text-align: center; padding: 4rem; background: var(--card); border: 2px dashed var(--border); border-radius: var(--radius);">
                <p style="font-size: 2.5rem; margin: 0;">🔍</p>
                <h3 style="margin: 1rem 0 0.5rem 0; color: var(--card-foreground); font-weight: 600;">No risks match your search</h3>
                <p style="color: var(--card-foreground); margin-bottom: 1.5rem;">Try adjusting your filters or clearing your search term.</p>
                <button id="clear-filters" style="padding: 0.6rem 1.2rem; background: var(--primary); color: var(--primary-foreground); border: none; border-radius: 0.375rem; cursor: pointer; font-weight: 500; transition: opacity 0.2s;">
                  Clear All Filters
                </button>
              </div>
            `
          }
        </div>
      </div>
    `;
  }

  renderMitigationTab() {
    return `
      <div style="padding: 1.5rem;">
        <h2 style="font-size: 1.5rem; font-weight: 600; margin: 0 0 1.5rem 0;">Mitigation Tracker</h2>
        <div style="background: var(--card); padding: 2rem; border-radius: var(--radius); border: 1px solid var(--border); text-align: center; color: var(--primary-foreground);">
          <p>📈 Mitigation tracking and progress visualization coming soon</p>
          <p style="font-size: 0.875rem;">Monitor remediation efforts, trends, and risk reduction progress.</p>
        </div>
      </div>
    `;
  }

  renderDialog() {
    if (!this.selectedRisk) return "";
    const location = this.locations.find(l => l.id === this.selectedRisk.locationId);
    return renderRiskDialog(this.selectedRisk, location ? location.name : "Unknown", COLORS);
  }
  
 render() {
    const main = document.querySelector("main");
    if (!main) return;

    if (this.selectedRisk) {
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = '15px'; // Optional: prevents "jump" when scrollbar disappears
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    // --- STEP 1: SAVE FOCUS STATE ---
    // Check if the user is currently typing in an input (like search)
    const activeElementId = document.activeElement ? document.activeElement.id : null;
    const selectionStart = document.activeElement ? document.activeElement.selectionStart : null;
    const selectionEnd = document.activeElement ? document.activeElement.selectionEnd : null;

    const tabContent = (() => {
      switch (this.currentTab) {
        case "overview": return this.renderOverviewTab();
        case "locations": return this.renderLocationsTab();
        case "risks": return this.renderRisksTab();
        case "mitigation": return this.renderMitigationTab();
        default: return this.renderOverviewTab();
      }
    })();

    // --- STEP 2: UPDATE THE DOM ---
    main.innerHTML = `
      <div style="width: 100%;">
        ${this.renderHeaderStats()}
        <div style="margin: 0 2rem;">
          ${tabContent}
        </div>
      </div>
      ${this.renderDialog()}
    `;

    // --- STEP 3: RESTORE FOCUS STATE ---
    // If the element we were just in still exists (by ID), put the cursor back
    if (activeElementId) {
      const elementToFocus = document.getElementById(activeElementId);
      if (elementToFocus) {
        elementToFocus.focus();
        // This prevents the cursor from jumping to the start of the word
        if (selectionStart !== null && elementToFocus.setSelectionRange) {
          elementToFocus.setSelectionRange(selectionStart, selectionEnd);
        }
      }
    }

    // --- STEP 4: UI UPDATES (Tabs & Charts) ---
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active-tab', btn.dataset.tab === this.currentTab);
    });

    if (this.currentTab === 'overview') {
        this.initCharts();
    }
  }

  initCharts() {
    const severityCtx = document.getElementById('severityChart');
    if (!severityCtx) return;

    const existingChart = Chart.getChart(severityCtx);
    if (existingChart) existingChart.destroy();

    const counts = {
      critical: this.risks.filter(r => r.severity === 'critical').length,
      high: this.risks.filter(r => r.severity === 'high').length,
      medium: this.risks.filter(r => r.severity === 'medium').length,
      low: this.risks.filter(r => r.severity === 'low').length
    };
    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    new Chart(severityCtx, {
      type: 'doughnut',
      data: {
        labels: ['Critical', 'High', 'Medium', 'Low'],
        datasets: [{
          data: [counts.critical, counts.high, counts.medium, counts.low],
          backgroundColor: [COLORS.critical, COLORS.high, COLORS.medium, COLORS.low],
          hoverOffset: 15,
          borderWidth: 2,
          borderColor: 'white'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const severityLabels = ['critical', 'high', 'medium', 'low'];
            this.selectedSeverity = severityLabels[index];
            this.currentTab = 'risks';
            this.render();
          }
        },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw;
                const percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return ` ${context.label}: ${value} (${percent}%)`;
              }
            }
          }
        },
        cutout: '70%',
      }
    });

    // Start the Category Chart immediately after
    this.initCategoryChart();
  }
  initCategoryChart() {
    const categoryCtx = document.getElementById('categoryChart');
    if (!categoryCtx) return;

    const existingChart = Chart.getChart(categoryCtx);
    if (existingChart) existingChart.destroy();

    // 1. Get all unique categories for the Y-axis labels
    const categories = [...new Set(this.risks.map(r => r.category))];

    // 2. Create a dataset for every location
    // We'll use a simple color generator or a fixed palette
    const locationPalette = [
      '#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', 
      '#10b981', '#6366f1', '#f43f5e', '#14b8a6'
    ];

    const datasets = this.locations.map((loc, index) => {
      // For this specific location, count risks in each category
      const data = categories.map(cat => {
        return this.risks.filter(r => r.locationId === loc.id && r.category === cat).length;
      });

      return {
        label: loc.name,
        data: data,
        backgroundColor: locationPalette[index % locationPalette.length],
        borderRadius: 0
      };
    });

    new Chart(categoryCtx, {
      type: 'bar',
      data: {
        labels: categories,
        datasets: datasets
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const clickedCategory = categories[index];
            this.searchQuery = clickedCategory;
            this.currentTab = 'risks';
            this.render();
          }
        },
        plugins: {
          legend: { 
            position: 'bottom',
            labels: { boxWidth: 12, padding: 15, font: { size: 11 } }
          },
          tooltip: {
            mode: 'nearest',
            intersect: true,
            callbacks: {
              label: (context) => {
                const locationName = context.dataset.label;
                const categoryName = context.label;
                const value = context.raw;
                const categoryTotal = context.chart.data.datasets.reduce((sum, ds) => {
                  return sum + ds.data[context.dataIndex];
                }, 0);
                const percent = categoryTotal > 0 ? ((value / categoryTotal) * 100).toFixed(1) : 0;
                return ` ${locationName}: ${value} (${percent}% of ${categoryName})`;
              }
            }
          }
        }, // <--- Plugins ends here
        scales: { // <--- Scales is a direct child of 'options'
          x: { 
            stacked: true, 
            beginAtZero: true, 
            ticks: { stepSize: 1 },
            title: { display: true, text: 'Number of Risks', font: { size: 10 } }
          },
          y: { 
            stacked: true 
          }
        }
      }
    });
  } // Ends initCategoryChart
} // Ends RiskDashboard Class

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  const dashboard = new RiskDashboard();
  dashboard.init();
});
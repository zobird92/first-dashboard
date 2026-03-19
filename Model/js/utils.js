// --- MATH & CHRONOLOGICAL HELPERS ---

/**
 * Converts a Quarter string (e.g., "Q1 2024") into a numeric value.
 * This ensures "Q4 2024" correctly comes before "Q1 2025".
 */
function parseQuarterDate(qstr) {
    const m = /^Q([1-4])\s+(\\d{4})$/.exec(qstr?.trim() ?? "");
    if (!m) return Number.POSITIVE_INFINITY; // Push malformed dates to the end
    
    const q = Number(m[1]);
    const year = Number(m[2]);
    
    // Calculation: (Year * 4) + (Quarter - 1)
    return year * 4 + (q - 1);
}

/**
 * Maps a numerical risk score (0-25) to a specific Hex color.
 * These match the colors defined in RISK_CATEGORIES for UI consistency.
 */
function getRiskHexColor(score) {
    if (score >= 17) return 0xEF4444; // Red (Emerald/Tailwind 500)
    if (score >= 9) return 0xF59E0B;  // Orange
    return 0x10B981;                 // Green
}

/**
 * Returns the CSS class for 2D Matrix borders based on risk.
 */
function getRiskBorderClass(score) {
    if (score >= 17) return 'border-red-500';
    if (score >= 9) return 'border-orange-500';
    return 'border-green-500';
}

/**
 * Returns the text category for a given score.
 */
function getRiskCategory(score) {
    if (score >= 17) return 'Subverted - Risk Realized';
    if (score >= 9) return 'Risk Open';
    return 'Watch List';
}

// --- DATA EXPORT ENGINE ---

/**
 * Uses the XLSX library to generate a downloadable report.
 * It takes the current "filtered" state of the data.
 */
function exportToExcel(filteredData) {
    if (!filteredData || filteredData.length === 0) {
        alert("No data available to export with current filters.");
        return;
    }

    try {
        // 1. Create a worksheet from the JSON data
        const worksheet = XLSX.utils.json_to_sheet(filteredData);
        
        // 2. Create a new workbook
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Risk Assessment");

        // 3. Generate a timestamped filename
        const timestamp = new Date().toISOString().split('T')[0];
        const fileName = `Risk_Data_Export_${timestamp}.xlsx`;

        // 4. Trigger the download
        XLSX.writeFile(workbook, fileName);
        
        console.log(`Export Successful: ${filteredData.length} rows saved.`);
    } catch (err) {
        console.error("Critical Export Error:", err);
        alert("Export failed. Please ensure the XLSX library is properly loaded in model.html.");
    }
}

// --- SYSTEM STATE UTILS ---

/**
 * Global reset function to return dashboard to default state.
 */
function resetDashboard() {
    // Reset Globals
    currentXField = 'Vulnerability Surface';
    currentYField = 'Adversarial Subversion';
    activeFilters = {};
    activeSeverityFilters = new Set(['Watch List', 'Risk Open', 'Subverted - Risk Realized']);
    mitigationMode = false;

    // Reset Time to latest quarter
    currentDateIndex = uniqueDates.length - 1;

    // Refresh all UI components
    updateSliderUI();
    generateAxisControls();
    generateSeverityFilters();
    renderDynamicFilters();
    
    // Redraw Scene
    renderChart();
}
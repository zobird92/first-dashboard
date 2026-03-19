// --- MATH & FORMATTING HELPERS ---

/**
 * Returns the hex color code based on the risk score.
 */
function getRiskHexColor(score) {
    if (score >= 17) return 0xEF4444; // Red
    if (score >= 9) return 0xF59E0B;  // Orange
    return 0x10B981;                 // Green
}

/**
 * Returns the text category based on the risk score.
 */
function getRiskCategory(score) {
    if (score >= 17) return 'Subverted - Risk Realized';
    if (score >= 9) return 'Risk Open';
    return 'Watch List';
}

/**
 * Converts a Quarter string (e.g., "Q1 2024") into a numeric value for chronological sorting.
 */
function parseQuarterDate(qstr) {
    const m = /^Q([1-4])\s+(\d{4})$/.exec(qstr?.trim() ?? "");
    if (!m) return Number.POSITIVE_INFINITY;
    const q = Number(m[1]);
    const year = Number(m[2]);
    return year * 4 + (q - 1);
}
// --- DASHBOARD UTILITIES & EXPORT ---

/**
 * Resets all global filters and UI elements to their initial state.
 */
function resetFilters() {
    // Resetting global state to initial values
    currentXField = 'Vulnerability Surface';
    currentYField = 'Adversarial Subversion';
    activeFilters = {};
    activeSeverityFilters = new Set(['Watch List', 'Risk Open', 'Subverted - Risk Realized']);
    mitigationMode = false;

    // Reset UI Elements (Buttons and Selects)
    const mitBtn = document.getElementById('mitigation-btn');
    if (mitBtn) {
        mitBtn.classList.remove('bg-green-600');
        mitBtn.classList.add('bg-gray-700');
        mitBtn.innerText = 'Mitigation Analysis';
    }

    // Refresh all UI components defined in ui.js
    if (typeof generateAxisControls === "function") generateAxisControls();
    if (typeof generateSeverityFilters === "function") generateSeverityFilters();
    if (typeof renderDynamicFilters === "function") renderDynamicFilters();
    
    // Reset Time Slider to most recent quarter
    currentDateIndex = uniqueDates.length - 1;
    if (typeof updateSliderUI === "function") updateSliderUI();

    // Redraw 3D scene defined in engine.js
    if (typeof renderChart === "function") renderChart();
}

/**
 * Generates and downloads an Excel report of the currently filtered data.
 * Requires the SheetJS (XLSX) library to be loaded in the HTML.
 */
function exportToExcel() {
    const currentDate = uniqueDates[currentDateIndex];
    
    // Filter the data based on current active user selection
    const exportData = data.filter(d => {
        const dateMatch = d.Date === currentDate;
        const severityMatch = activeSeverityFilters.has(getRiskCategory(d['Risk Score']));
        
        let dynamicMatch = true;
        Object.keys(activeFilters).forEach(field => {
            if (activeFilters[field].size > 0 && !activeFilters[field].has(String(d[field]))) {
                dynamicMatch = false;
            }
        });
        return dateMatch && severityMatch && dynamicMatch;
    });

    if (exportData.length === 0) {
        alert("No data matched the current filters for export.");
        return;
    }

    // Prepare SheetJS workbook
    try {
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Risk Assessment Data");
        
        // Sanitize filename
        const safeDate = currentDate.replace(/\s+/g, '_');
        const fileName = `Risk_Report_${safeDate}.xlsx`;
        
        // Trigger download
        XLSX.writeFile(wb, fileName);
    } catch (err) {
        console.error("Export Error:", err);
        alert("Export failed. Ensure the XLSX library is loaded.");
    }
}

// --- MATH & FORMATTING HELPERS ---

/**
 * Returns the hex color code based on the risk score.
 */
function getRiskHexColor(score) {
    if (score >= 17) return 0xEF4444; // Red
    if (score >= 9) return 0xF59E0B;  // Orange
    return 0x10B981;                 // Green
}

/**
 * Returns the text category based on the risk score.
 */
function getRiskCategory(score) {
    if (score >= 17) return 'Subverted - Risk Realized';
    if (score >= 9) return 'Risk Open';
    return 'Watch List';
}

/**
 * Converts a Quarter string (e.g., "Q1 2024") into a numeric value for chronological sorting.
 */
function parseQuarterDate(qstr) {
    const m = /^Q([1-4])\s+(\d{4})$/.exec(qstr?.trim() ?? "");
    if (!m) return Number.POSITIVE_INFINITY;
    const q = Number(m[1]);
    const year = Number(m[2]);
    return year * 4 + (q - 1);
}

// --- DOM EVENT BINDING ---

document.addEventListener('DOMContentLoaded', () => {
    // These listeners ensure the persistent dashboard buttons link to the utility functions
    const resetBtn = document.getElementById('reset-dashboard-btn');
    if (resetBtn) resetBtn.onclick = resetFilters;

    const exportBtn = document.getElementById('export-data-btn');
    if (exportBtn) exportBtn.onclick = exportToExcel;
});
// --- STANDALONE UTILITIES & HELPERS ---

/**
 * Resets the dashboard state and refreshes the UI components.
 * This is a coordinator function that resets global variables and triggers re-renders.
 */
function resetFilters() {
    // Resetting global state to initial values
    currentXField = 'Vulnerability Surface';
    currentYField = 'Adversarial Subversion';
    activeFilters = {};
    activeSeverityFilters = new Set(['Watch List', 'Risk Open', 'Subverted - Risk Realized']);
    mitigationMode = false;

    // Reset UI Element states
    const mitBtn = document.getElementById('mitigation-btn');
    if (mitBtn) {
        mitBtn.classList.remove('bg-green-600');
        mitBtn.classList.add('bg-gray-700');
        mitBtn.innerText = 'Mitigation Analysis';
    }

    // Refresh all UI components (Assumes these exist in ui.js)
    if (typeof generateAxisControls === "function") generateAxisControls();
    if (typeof generateSeverityFilters === "function") generateSeverityFilters();
    if (typeof renderDynamicFilters === "function") renderDynamicFilters();
    
    // Reset Time Slider to most recent quarter
    currentDateIndex = uniqueDates.length - 1;
    if (typeof updateSliderUI === "function") updateSliderUI();

    // Redraw 3D scene (Assumes this exists in engine.js)
    if (typeof renderChart === "function") renderChart();
}

/**
 * High-level coordinator for Excel Export.
 * Filters the active data set and utilizes the XLSX library to generate a download.
 */
function exportToExcel() {
    const currentDate = uniqueDates[currentDateIndex];
    
    // Filter the data based on current active user selection
    const exportData = data.filter(d => {
        const dateMatch = d.Date === currentDate;
        const severityMatch = activeSeverityFilters.has(getRiskCategory(d['Risk Score']));
        
        let dynamicMatch = true;
        Object.keys(activeFilters).forEach(field => {
            if (activeFilters[field].size > 0 && !activeFilters[field].has(String(d[field]))) {
                dynamicMatch = false;
            }
        });
        return dateMatch && severityMatch && dynamicMatch;
    });

    if (exportData.length === 0) {
        alert("No data matched the current filters for export.");
        return;
    }

    // Prepare SheetJS workbook
    try {
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Risk Assessment Data");
        
        // Sanitize filename
        const safeDate = currentDate.replace(/\s+/g, '_');
        const fileName = `Risk_Report_${safeDate}.xlsx`;
        
        // Trigger download
        XLSX.writeFile(wb, fileName);
    } catch (err) {
        console.error("Export Error:", err);
        alert("Export failed. Ensure the XLSX library (SheetJS) is loaded in your HTML.");
    }
}

/**
 * DOM Event Binding
 * Ensures that the main dashboard buttons are linked to the utility functions.
 */
document.addEventListener('DOMContentLoaded', () => {
    const resetBtn = document.getElementById('reset-dashboard-btn');
    if (resetBtn) resetBtn.onclick = resetFilters;

    const exportBtn = document.getElementById('export-data-btn');
    if (exportBtn) exportBtn.onclick = exportToExcel;
});
// --- DASHBOARD UTILITIES & EXPORT ---

/**
 * Resets all global filter states and triggers a refresh of UI and 3D components.
 */
function resetFilters() {
    // Resetting global state to initial values
    currentXField = 'Vulnerability Surface';
    currentYField = 'Adversarial Subversion';
    activeFilters = {};
    activeSeverityFilters = new Set(['Watch List', 'Risk Open', 'Subverted - Risk Realized']);
    mitigationMode = false;

    // Reset UI Element states
    const mitBtn = document.getElementById('mitigation-btn');
    if (mitBtn) {
        mitBtn.classList.remove('bg-green-600');
        mitBtn.classList.add('bg-gray-700');
        mitBtn.innerText = 'Mitigation Analysis';
    }

    // Refresh UI components (Assumes these are defined in ui.js)
    if (typeof generateAxisControls === "function") generateAxisControls();
    if (typeof generateSeverityFilters === "function") generateSeverityFilters();
    if (typeof renderDynamicFilters === "function") renderDynamicFilters();
    
    // Reset Time Slider to most recent quarter
    currentDateIndex = uniqueDates.length - 1;
    if (typeof updateSliderUI === "function") updateSliderUI();

    // Redraw 3D scene (Assumes this is defined in engine.js)
    if (typeof renderChart === "function") renderChart();
}

/**
 * Extracts currently filtered data and triggers an Excel (.xlsx) download.
 * Requires the SheetJS (XLSX) library.
 */
function exportToExcel() {
    const currentDate = uniqueDates[currentDateIndex];
    
    // Filter the data based on current active user selection
    const exportData = data.filter(d => {
        const dateMatch = d.Date === currentDate;
        const severityMatch = activeSeverityFilters.has(getRiskCategory(d['Risk Score']));
        
        let dynamicMatch = true;
        Object.keys(activeFilters).forEach(field => {
            if (activeFilters[field].size > 0 && !activeFilters[field].has(String(d[field]))) {
                dynamicMatch = false;
            }
        });
        return dateMatch && severityMatch && dynamicMatch;
    });

    if (exportData.length === 0) {
        alert("No data matched the current filters for export.");
        return;
    }

    // Prepare SheetJS workbook
    try {
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Risk Assessment Data");
        
        // Sanitize filename
        const safeDate = currentDate.replace(/\s+/g, '_');
        const fileName = `Risk_Report_${safeDate}.xlsx`;
        
        // Trigger download
        XLSX.writeFile(wb, fileName);
    } catch (err) {
        console.error("Export Error:", err);
        alert("Export failed. Ensure the XLSX library is loaded.");
    }
}

// --- MATH & FORMATTING HELPERS ---

/**
 * Maps a numerical risk score to a hex color for the 3D meshes.
 */
function getRiskHexColor(score) {
    if (score >= 17) return 0xEF4444; // Red
    if (score >= 9) return 0xF59E0B;  // Orange
    return 0x10B981;                 // Green
}

/**
 * Categorizes a risk score into standard reporting buckets.
 */
function getRiskCategory(score) {
    if (score >= 17) return 'Subverted - Risk Realized';
    if (score >= 9) return 'Risk Open';
    return 'Watch List';
}

/**
 * Converts "QX YYYY" string to a sortable integer.
 */
function parseQuarterDate(qstr) {
    const m = /^Q([1-4])\s+(\d{4})$/.exec(qstr?.trim() ?? "");
    if (!m) return Number.POSITIVE_INFINITY;
    const q = Number(m[1]);
    const year = Number(m[2]);
    return year * 4 + (q - 1);
}

// --- DOM EVENT BINDINGS ---

document.addEventListener('DOMContentLoaded', () => {
    // Links global dashboard buttons to utility logic
    const resetBtn = document.getElementById('reset-dashboard-btn');
    if (resetBtn) resetBtn.onclick = resetFilters;

    const exportBtn = document.getElementById('export-data-btn');
    if (exportBtn) exportBtn.onclick = exportToExcel;
});
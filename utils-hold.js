// --- UTILITIES & EXPORT ---

function resetFilters() {
    // Resetting global state to initial values
    currentXField = 'Vulnerability Surface';
    currentYField = 'Adversarial Subversion';
    activeFilters = {};
    activeSeverityFilters = new Set(['Watch List', 'Risk Open', 'Subverted - Risk Realized']);
    mitigationMode = false;

    // Reset UI Elements
    const mitBtn = document.getElementById('mitigation-btn');
    if (mitBtn) {
        mitBtn.classList.remove('bg-green-600');
        mitBtn.classList.add('bg-gray-700');
        mitBtn.innerText = 'Mitigation Analysis';
    }

    // Refresh all UI components
    generateAxisControls();
    generateSeverityFilters();
    renderDynamicFilters();
    
    // Reset Time Slider to most recent quarter
    currentDateIndex = uniqueDates.length - 1;
    updateSliderUI();

    // Redraw 3D scene
    renderChart();
}

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

// --- DOM EVENT BINDING ---
document.addEventListener('DOMContentLoaded', () => {
    // These listeners ensure buttons in the HTML link to the functions
    const resetBtn = document.getElementById('reset-dashboard-btn');
    if (resetBtn) resetBtn.onclick = resetFilters;

    const exportBtn = document.getElementById('export-data-btn');
    if (exportBtn) exportBtn.onclick = exportToExcel;
});
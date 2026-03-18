// Global Configuration
window.RISK_CATEGORIES = {
    "Watch List": { color: "bg-green-500" },
    "Risk Open": { color: "bg-orange-500" },
    "Subverted - Risk Realized": { color: "bg-red-500" }
};

window.currentXField = "Subversion Ease";
window.currentYField = "Severity";
window.activeSeverityFilters = new Set(Object.keys(window.RISK_CATEGORIES));
window.activeFilters = {};
window.FIELD_MAP = {
    "Subversion Ease": "Subversion Ease",
    "Severity": "Severity",
    "Detection Capability": "Detection Capability"
};

window.FIELD_LABELS = Object.keys(window.FIELD_MAP);
// Shared Global Variables
window.data = [];
window.uniqueDates = [];
window.currentDate = "";
window.activeFilters = {};
window.activeSeverityFilters = new Set(["Watch List", "Risk Open", "Subverted - Risk Realized"]);
window.currentXField = 'Vulnerability Surface';
window.currentYField = 'Adversarial Subversion';
window.mitigationMode = false;
window.drilldownData = [];
window.aggregationKeys = { xVal: '', yVal: '' };

window.FIELD_MAP = {
    'Vulnerability Surface': 'Vulnerability Surface',
    'Adversarial Subversion': 'Adversarial Subversion',
    'Site': 'Site',
    'Subversion Risk Type': 'Subversion Risk Type',
    'Weapon System': 'Weapon System',
    'Facility': 'Facility',
    'Capability': 'Capability',
    'Date': 'Date',
    'Risk Level': 'Risk Level',
    'Mitigation Status': 'Mitigation Status',
    'Mitigation Cost': 'Mitigation Cost'
};

window.FIELD_LABELS = [
    'Vulnerability Surface',
    'Adversarial Subversion',
    'Site',
    'Subversion Risk Type',
    'Weapon System',
    'Facility',
    'Capability'
];

// Ported from old-script.js to fix timeline ordering
function parseQuarterDate(qstr) {
    const m = /^Q([1-4])\s+(\d{4})$/.exec(qstr?.trim() ?? "");
    if (!m) return Number.POSITIVE_INFINITY;
    return Number(m[2]) * 4 + (Number(m[1]) - 1);
}

window.loadDataFromJson = async function() {
    const response = await fetch('data/subversion_risk_data.json');
    const json = await response.json();
    
    window.data = json.map(row => ({
        ...row,
        "Mission Impact": Number(row["Mission Impact"]),
        "Difficulty": Number(row["Difficulty"]),
        "Risk Score": Number(row["Risk Score"]),
        "Mitigation Cost": Number(row["Mitigation Cost"])
    }));

    // Sort dates properly
    window.uniqueDates = [...new Set(window.data.map(d => d.Date))]
        .sort((a, b) => parseQuarterDate(a) - parseQuarterDate(b));
    
    window.currentDate = window.uniqueDates[0];

    // Initialize filter sets
    window.FIELD_LABELS.forEach(label => {
        const key = window.FIELD_MAP[label];
        const uniqueVals = [...new Set(window.data.map(d => d[key]))].sort();
        window.activeFilters[key] = new Set(uniqueVals);
    });
};
// --- GLOBAL STATE ---
let data = [];
let uniqueDates = [];
let currentDateIndex = 0;
let activeFilters = {}; // Stores Sets of selected values: { 'Site': Set(['LANL']), ... }
let activeSeverityFilters = new Set(['Watch List', 'Risk Open', 'Subverted - Risk Realized']);

let currentXField = 'Vulnerability Surface'; 
let currentYField = 'Adversarial Subversion';
let mitigationMode = false;

// FIELD_MAP must match the JSON keys exactly to prevent "undefined" errors
const FIELD_MAP = {
    'Vulnerability Surface': 'Vulnerability Surface',
    'Adversarial Subversion': 'Adversarial Subversion',
    'Site': 'Site',
    'Weapon System': 'Weapon System',
    'Subversion Risk Type': 'Subversion Risk Type'
};

const RISK_CATEGORIES = {
    'Watch List': { min: 0, max: 8, hex: 0x10B981 },
    'Risk Open': { min: 9, max: 16, hex: 0xF59E0B },
    'Subverted - Risk Realized': { min: 17, max: 25, hex: 0xEF4444 }
};

// --- CORE DATA OPERATIONS ---

/**
 * Loads and cleans the JSON data.
 * Preserves numeric types for calculations.
 */
async function loadDataFromJson() {
    try {
        const res = await fetch("./data/subversion_risk_data.json", { cache: "no-cache" });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const json = await res.json();

        // Ensure numbers are actual numbers, not strings
        data = json.map(row => ({
            ...row,
            "Risk Score": Number(row["Risk Score"]),
            "Mitigation Cost": Number(row["Mitigation Cost"]),
            "Mission Impact": Number(row["Mission Impact"]),
            "Difficulty": Number(row["Difficulty"])
        }));

        // Sort dates chronologically using the quarter parser
        uniqueDates = [...new Set(data.map(d => d.Date))]
            .sort((a, b) => parseQuarterDate(a) - parseQuarterDate(b));
        
        // Start at the latest available data point
        currentDateIndex = uniqueDates.length - 1; 
        
        console.log("Data Engine Initialized:", data.length, "records across", uniqueDates.length, "quarters");
    } catch (err) {
        console.error("Critical Data Load Error:", err);
    }
}

/**
 * Filters the master dataset based on the current UI state.
 * Preserves the ability to filter by multiple categories simultaneously.
 */
function getFilteredData() {
    const selectedDate = uniqueDates[currentDateIndex];

    return data.filter(d => {
        // 1. Timeline Filter
        if (d.Date !== selectedDate) return false;

        // 2. Risk Level (Z-Axis) Filter
        const category = getRiskCategory(d['Risk Score']);
        if (!activeSeverityFilters.has(category)) return false;

        // 3. Multi-select Sidebar Filters
        for (const [field, selectedSet] of Object.entries(activeFilters)) {
            if (selectedSet && selectedSet.size > 0) {
                if (!selectedSet.has(d[field])) return false;
            }
        }
        return true;
    });
}

/**
 * Aggregates individual data points into "Bars" for the 3D Scene.
 * IMPORTANT: This preserves the 'items' array for the 2D Detail Matrix.
 */
function getAggregatedData() {
    const filtered = getFilteredData();
    const aggregated = {};

    filtered.forEach(d => {
        const xVal = d[currentXField] || "N/A";
        const yVal = d[currentYField] || "N/A";
        const key = `${xVal}||${yVal}`;

        if (!aggregated[key]) {
            aggregated[key] = {
                x: xVal,
                y: yVal,
                totalScore: 0,
                count: 0,
                totalMitigationCost: 0,
                items: [] // This is vital for the detail view matrix
            };
        }

        aggregated[key].totalScore += d['Risk Score'];
        aggregated[key].count++;
        aggregated[key].totalMitigationCost += (d['Mitigation Cost'] || 0);
        aggregated[key].items.push(d);
    });

    return Object.values(aggregated);
}

/**
 * Helper to get unique values for dynamic filter generation in ui.js
 */
function getUniqueValuesForField(field) {
    return [...new Set(data.map(d => d[field]))].filter(Boolean).sort();
}
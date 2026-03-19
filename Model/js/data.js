// --- GLOBAL STATE & CONSTANTS ---
let data = [];
let uniqueDates = [];
let currentDateIndex = 0;
let activeFilters = {};
let activeSeverityFilters = new Set(['Watch List', 'Risk Open', 'Subverted - Risk Realized']);
let currentXField = 'Vulnerability Surface';
let currentYField = 'Adversarial Subversion';
let mitigationMode = false;

const FIELD_MAP = {
    'Vulnerability Surface': 'Mission Impact',
    'Adversarial Subversion': 'Difficulty',
    'Asset Criticality': 'Asset Criticality',
    'Detection Capability': 'Detection Capability'
};
const FIELD_LABELS = Object.keys(FIELD_MAP);

const RISK_CATEGORIES = {
    'Watch List': { min: 0, max: 8, color: 'bg-green-500', hex: 0x10B981 },
    'Risk Open': { min: 9, max: 16, color: 'bg-orange-500', hex: 0xF59E0B },
    'Subverted - Risk Realized': { min: 17, max: 25, color: 'bg-red-500', hex: 0xEF4444 }
};

// Detail View State
let selectedItem = null;
let viewMode = '3d'; // '3d' or 'detail'

// --- HELPERS ---
function parseQuarterDate(qstr) {
    const m = /^Q([1-4])\s+(\d{4})$/.exec(qstr?.trim() ?? "");
    if (!m) return Number.POSITIVE_INFINITY;
    const q = Number(m[1]);
    const year = Number(m[2]);
    return year * 4 + (q - 1);
}

// --- DATA LOADING ---
async function loadDataFromJson() {
    try {
        const res = await fetch("./data/subversion_risk_data.json", { cache: "no-cache" });
        if (!res.ok) throw new Error(`Failed to load JSON: ${res.status} ${res.statusText}`);
        const json = await res.json();

        data = json.map(row => ({
            ...row,
            "Mission Impact": Number(row["Mission Impact"]),
            "Difficulty": Number(row["Difficulty"]),
            "Risk Score": Number(row["Risk Score"]),
            "Mitigation Cost": Number(row["Mitigation Cost"])
        }));

        uniqueDates = [...new Set(data.map(d => d.Date))]
            .sort((a, b) => parseQuarterDate(a) - parseQuarterDate(b));
        
        currentDateIndex = uniqueDates.length - 1;
        
        // Initialize UI components that depend on data
        if (typeof updateSliderUI === "function") {
            updateSliderUI();
        }
    } catch (err) {
        console.error("Data Load Error:", err);
        const errDiv = document.getElementById('error-message');
        if (errDiv) {
            errDiv.innerText = "Error loading data. Check console.";
            errDiv.style.display = "block";
        }
    }
}
// --- DATA AGGREGATION LOGIC ---
// Note: This logic was extracted from the renderChart function to be consolidated

/*
    The following logic processes the 'filteredData' array into an 'aggregated' object 
    grouped by the current X and Y axis selections.
*/

const xKey = FIELD_MAP[currentXField];
const yKey = FIELD_MAP[currentYField];

const aggregated = {};
filteredData.forEach(d => {
    const key = `${d[xKey]}-${d[yKey]}`;
    if (!aggregated[key]) {
        aggregated[key] = {
            x: d[xKey],
            y: d[yKey],
            count: 0,
            totalScore: 0,
            items: []
        };
    }
    aggregated[key].count++;
    aggregated[key].totalScore += d['Risk Score'];
    aggregated[key].items.push(d);
});
// --- DATA HELPERS ---
// These functions map raw data values to logical categories and visual constants

function getRiskCategory(score) {
    if (score >= 17) return 'Subverted - Risk Realized';
    if (score >= 9) return 'Risk Open';
    return 'Watch List';
}

function getRiskHexColor(score) {
    if (score >= 17) return 0xEF4444; // Red
    if (score >= 9) return 0xF59E0B;  // Orange
    return 0x10B981;                // Green
}
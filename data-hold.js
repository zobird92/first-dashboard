// --- GLOBAL STATE & CONSTANTS ---
let data = [];
let uniqueDates = [];
let currentDateIndex = 0;
let activeFilters = {};
let activeSeverityFilters = new Set(['Watch List', 'Risk Open', 'Subverted - Risk Realized']);
let currentXField = 'Vulnerability Surface';
let currentYField = 'Adversarial Subversion';
let mitigationMode = false;

// Three.js Globals
let scene, camera, renderer, controls, raycaster, mouse;
let bars = [];
let hoveredBar = null;

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
function getRiskHexColor(score) {
    if (score >= 17) return 0xEF4444;
    if (score >= 9) return 0xF59E0B;
    return 0x10B981;
}

function getRiskCategory(score) {
    if (score >= 17) return 'Subverted - Risk Realized';
    if (score >= 9) return 'Risk Open';
    return 'Watch List';
}

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
        updateSliderUI();
    } catch (err) {
        console.error("Data Load Error:", err);
        const errDiv = document.getElementById('error-message');
        if (errDiv) {
            errDiv.innerText = "Error loading data. Check console.";
            errDiv.style.display = "block";
        }
    }
}

function updateSliderUI() {
    const slider = document.getElementById('time-slider');
    if (slider) {
        slider.max = uniqueDates.length - 1;
        slider.value = currentDateIndex;
    }
    const dateDisp = document.getElementById('current-date-display');
    if (dateDisp) dateDisp.innerText = uniqueDates[currentDateIndex] || "";
}
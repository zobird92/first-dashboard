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
            'Mission Impact': 'Mission Impact',
            'Difficulty': 'Difficulty',
            'Risk Score': 'Risk Score',
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

        const FIELD_LABELS = [
            'Vulnerability Surface',
            'Adversarial Subversion',
            'Site',
            'Subversion Risk Type',
            'Weapon System',
            'Facility',
            'Capability'
        ];

        const RISK_CATEGORIES = {
            "Watch List": { color: "bg-green-500" },
            "Risk Open": { color: "bg-orange-500" },
            "Subverted - Risk Realized": { color: "bg-red-500" }
        };

    window.loadDataFromJson = async function() {
        const response = await fetch('data/subversion_risk_data.json');
        window.data = await response.json();
    
         // 1. Extract unique dates and set default
        window.uniqueDates = [...new Set(window.data.map(d => d.Date))];
        window.currentDate = window.uniqueDates[0];

        // 2. Initialize activeFilters for every field in FIELD_LABELS
        FIELD_LABELS.forEach(label => {
            const key = FIELD_MAP[label];
            const uniqueValues = [...new Set(window.data.map(d => d[key]))];
            window.activeFilters[key] = new Set(uniqueValues);
        });
    }
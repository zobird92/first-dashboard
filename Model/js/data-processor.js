const FIELD_MAP = {
            'Mission Impact': 'Mission Impact',
            'Difficulty': 'Difficulty',
            'Risk Score': 'Risk Score',
            'Vulnerability Surface': 'Vulnerability Surface',
            'Adversarial Subversion (Trial Schema 3)': 'Adversarial Subversion',
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
            'Adversarial Subversion (Trial Schema 3)',
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

        async function loadDataFromJson() {
            const response = await fetch('subversion_risk_data.json');
            data = await response.json(); // Logic to extract uniqueDates and set default activeFilters...
        }
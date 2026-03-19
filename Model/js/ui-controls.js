const renderRiskMatrix2D = () => {
    const container = document.getElementById('view-2d-container');
    
    // Use the global window variables your 3D code populates
    const dData = window.drilldownData;
    const aggKeys = window.aggregationKeys;

    if (!dData || !aggKeys) {
        console.error("Missing drilldown data or keys");
        return;
    }

    const { xVal, yVal } = aggKeys;

    // Use window.FIELD_MAP to translate the axis labels to actual JSON keys
    const xKey = window.FIELD_MAP[window.currentXField]; 
    const yKey = window.FIELD_MAP[window.currentYField];

    const grouped = dData.reduce((g, i) => {
        // Use the raw values from the data row (e.g., 1, 2, 3, 4, 5)
        const xNum = i[xKey];
        const yNum = i[yKey];
        const k = `${xNum}-${yNum}`;
        if (!g[k]) g[k] = [];
        g[k].push(i);
        return g;
    }, {});

    const total = dData.length;
    const avg = total > 0 ? Math.round(dData.reduce((s, i) => s + Number(i['Risk Score'] || 0), 0) / total) : 0;

    const yLabels = [5, 4, 3, 2, 1];
    const xLabels = [1, 2, 3, 4, 5];

    container.innerHTML = `
        <div class="flex flex-col sm:flex-row justify-between items-start mb-8 bg-gray-800 p-4 rounded-lg border border-gray-700 sticky top-0 z-10">
            <button onclick="window.setViewMode('3D')" class="flex items-center space-x-2 px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition">
                <i data-lucide="refresh-ccw" class="w-4 h-4"></i>
                <span>Back to 3D View</span>
            </button>
            <div class="ml-4">
                <h2 class="text-xl font-bold text-indigo-400">Drill-down: ${xVal} / ${yVal}</h2>
            </div>
            <div class="bg-gray-900 p-4 rounded-lg border border-gray-700 w-full sm:max-w-xs mt-4 sm:mt-0 text-center sm:text-left">
                <h3 class="text-sm font-semibold text-gray-300">Risk Summary</h3>
                <p class="text-3xl font-bold ${avg >= 17 ? 'text-red-400' : avg >= 9 ? 'text-yellow-400' : 'text-green-400'}">${avg}</p>
                <p class="text-sm text-gray-500">Average Risk Level Score</p>
                <p class="mt-2 text-xl font-bold text-gray-300">${total} <span class="text-sm text-gray-400 ml-1">Total Items</span></p>
            </div>
        </div>

        <div class="flex flex-col border border-gray-700 rounded-xl bg-gray-900 mx-auto max-w-2xl p-4">
            <div class="flex">
                <div class="flex flex-col items-center justify-between py-2 mr-1 h-[320px]">
                    <span class="text-[9px] font-bold text-red-400 uppercase rotate-180" style="writing-mode: vertical-lr;">More Severe</span>
                    <div class="w-px flex-grow bg-gray-600 relative my-2"></div>
                    <span class="text-[9px] font-bold text-green-400 uppercase rotate-180" style="writing-mode: vertical-lr;">Less Severe</span>
                </div>

                <div class="flex items-center">
                    <div class="text-xs font-bold text-gray-400 uppercase rotate-180 mr-2" style="writing-mode: vertical-lr;">Severity</div>
                    <div class="w-12 flex flex-col justify-end text-sm text-gray-400">
                        ${yLabels.map(y => `<div class="h-16 flex items-center justify-center"><span class="p-1 rounded bg-gray-700">${y}</span></div>`).join('')}
                    </div>
                </div>

                <div class="flex-grow grid grid-cols-5 border-t border-l border-gray-700 relative">
                    ${yLabels.flatMap(y => xLabels.map(x => {
                        const risks = grouped[`${x}-${y}`] || [];
                        return `
                            <div class="h-16 border-r border-b border-gray-700 flex items-center justify-center p-1 relative ${getCellBackgroundColor(x, y)}">
                                ${risks.map((r, i) => `
                                    <div class="absolute w-3 h-3 rounded-full ring-2 ${getRiskColorClass(r['Risk Score'])}" 
                                         style="top: ${20 + (i * 10) % 60}%; left: ${20 + (i * 20) % 60}%;"
                                         title="Risk Score: ${r['Risk Score']}">
                                    </div>
                                `).join('')}
                                ${risks.length === 0 ? `<span class="text-[8px] text-gray-600 opacity-40">(${x},${y})</span>` : ''}
                            </div>
                        `;
                    })).join('')}
                </div>
            </div>

            <div class="flex">
                <div class="w-[88px]"></div>
                <div class="flex-grow grid grid-cols-5 text-sm text-gray-400">
                    ${xLabels.map(x => `<div class="h-8 flex items-center justify-center"><span class="p-1 rounded bg-gray-700">${x}</span></div>`).join('')}
                </div>
            </div>

            <div class="flex flex-col items-center mt-2">
                <div class="flex w-full items-center">
                    <div class="w-[88px]"></div>
                    <div class="flex-grow flex items-center justify-between px-4">
                        <span class="text-[9px] text-gray-500 uppercase">Harder</span>
                        <div class="h-px flex-grow bg-gray-600 mx-4"></div>
                        <span class="text-[9px] text-indigo-400 uppercase">Easier</span>
                    </div>
                </div>
                <h4 class="text-[12px] font-bold text-gray-400 uppercase tracking-widest py-1">Subversion Ease</h4>
            </div>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
};

        window.generateAxisControls = () => {
    const div = document.getElementById('axis-controls');
    if (!div) return;

    div.innerHTML = `
        <div class="control-section">
            <label class="block text-sm text-gray-400 mb-1">X-Axis</label>
            <select onchange="window.handleAxisChange('x', this.value)" class="w-full bg-gray-700 text-white border border-gray-600 rounded-md p-2 mb-3">
                ${window.FIELD_LABELS
                    .filter(l => l !== window.currentYField)
                    .map(l => `<option value="${l}" ${window.currentXField === l ? 'selected' : ''}>${l}</option>`).join('')}
            </select>

            <label class="block text-sm text-gray-400 mb-1">Y-Axis (Depth)</label>
            <select onchange="window.handleAxisChange('y', this.value)" class="w-full bg-gray-700 text-white border border-gray-600 rounded-md p-2">
                ${window.FIELD_LABELS
                    .filter(l => l !== window.currentXField)
                    .map(l => `<option value="${l}" ${window.currentYField === l ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
        </div>
    `;
};

        window.generateSeverityFilters = () => {
            const div = document.getElementById('severity-filters');
            let html = `<strong class="block text-gray-200 mb-3 text-sm">Filter by Risk Level</strong>`;
            Object.keys(RISK_CATEGORIES).forEach(cat => {
                const checked = activeSeverityFilters.has(cat) ? 'checked' : '';
                html += `
                    <label class="flex items-center text-sm text-gray-300 cursor-pointer mb-2">
                        <input type="checkbox" class="mr-3 rounded bg-gray-700 border-gray-600" onchange="handleSeverityChange('${cat}', this.checked)" ${checked} />
                        <span class="w-3 h-3 rounded-full ${RISK_CATEGORIES[cat].color} mr-2"></span>
                        <span>${cat}</span>
                    </label>
                `;
            });
            div.innerHTML = html;
        };

    window.setViewMode = (mode) => {
    const container3d = document.getElementById('view-3d-container');
    const container2d = document.getElementById('view-2d-container');

    if (!container3d || !container2d) {
        console.error("View containers not found in HTML!");
        return;
    }

    if (mode === '2D') {
            container3d.classList.add('hidden');
            container2d.classList.remove('hidden');
            if (typeof renderRiskMatrix2D === 'function') {
                renderRiskMatrix2D();
            }
            } else {
                container2d.classList.add('hidden');
                container3d.classList.remove('hidden');
                // Re-render the 3D view if needed
                if (window.renderChart) window.renderChart();
            }
        };

        // Initialize the Back Button Listener
        const backBtn = document.getElementById('backTo3dBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => window.setViewMode('3D'));
        }

        window.updateLegend = () => {
            const legendTitle = document.getElementById('legend-title');
            const legendContent = document.getElementById('legend-content');

            if (mitigationMode) {
                legendTitle.textContent = "Mitigation Status";
                legendContent.innerHTML = `
                    <div class="flex items-center gap-2">
                        <div class="w-4 h-4 rounded-sm border border-gray-500" style="background-color: #FFFFFF;"></div>
                        <span class="text-xs text-gray-400">Mitigated</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-4 h-4 rounded-sm" style="background-color: #EF4444;"></div>
                        <span class="text-xs text-gray-400">Unmitigated</span>
                    </div>
                `;
            } else {
                legendTitle.textContent = "Risk Level";
                legendContent.innerHTML = `
                    <div class="flex items-center gap-2">
                        <div class="w-4 h-4 rounded-sm bg-green-500"></div>
                        <span class="text-xs text-gray-400">Watch List</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-4 h-4 rounded-sm bg-orange-500"></div>
                        <span class="text-xs text-gray-400">Risk Open</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-4 h-4 rounded-sm bg-red-500"></div>
                        <span class="text-xs text-gray-400">Subverted - Risk Realized</span>
                    </div>
                `;
            }
        };

        const getCellBackgroundColor = (x, y) => {
            const score = x * y;
            if (score >= 17) return 'bg-red-900/20';
            if (score >= 9) return 'bg-orange-900/20';
            return 'bg-green-900/20';
        };

        const getRiskColorClass = (score) => {
            if (score >= 17) return 'bg-red-500 ring-red-400';
            if (score >= 9) return 'bg-orange-500 ring-orange-400';
            return 'bg-green-500 ring-green-400';
        };

    window.renderDynamicFilters = () => {
    const div = document.getElementById('dynamic-filters');
    if (!div) return;
    
    div.innerHTML = '<strong class="block text-gray-200 mb-3 text-sm">Active Filters</strong>';
    
    const xK = window.FIELD_MAP[window.currentXField];
    const yK = window.FIELD_MAP[window.currentYField];
    const relevantFields = [xK, yK];

    relevantFields.forEach(field => {
        if (!window.activeFilters[field]) return;

        const fieldLabel = Object.keys(window.FIELD_MAP).find(key => window.FIELD_MAP[key] === field);
        const section = document.createElement('div');
        section.className = 'mb-4';
        section.innerHTML = `<span class="text-xs font-bold text-indigo-400 uppercase tracking-widest">${fieldLabel}</span>`;

        const list = document.createElement('div');
        list.className = 'mt-2 space-y-1 max-h-40 overflow-y-auto pr-2 custom-scrollbar';

        // Get unique values for this field from the data
        const uniqueValues = [...new Set(window.data.map(d => d[field]))].sort();

        uniqueValues.forEach(val => {
            const isChecked = window.activeFilters[field].has(val);
            const item = document.createElement('label');
            item.className = 'flex items-center text-xs text-gray-400 hover:text-white cursor-pointer';
            item.innerHTML = `
                <input type="checkbox" class="mr-2 rounded bg-gray-700 border-gray-600 w-3 h-3 accent-indigo-500" 
                       ${isChecked ? 'checked' : ''} 
                       onchange="handleFilterChange('${field}', '${val}', this.checked)">
                <span class="truncate">${val}</span>
            `;
            list.appendChild(item);
        });

        section.appendChild(list);
        div.appendChild(section);
    });

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
};

// Helper function needed for the checkboxes above
window.handleFilterChange = (field, value, isChecked) => {
    if (isChecked) {
        window.activeFilters[field].add(value);
    } else {
        window.activeFilters[field].delete(value);
    }
    window.renderChart();
};

// Handles X and Y axis dropdown changes
window.handleAxisChange = (axis, value) => {
    if (axis === 'x') window.currentXField = value; // Overwrites the initial value
    if (axis === 'y') window.currentYField = value; // Overwrites the initial value
    
    window.generateAxisControls(); 
    window.renderDynamicFilters(); 
    if (window.renderChart) window.renderChart(); // Re-runs the 3D logic with the NEW value
};

// Handles Severity Checkbox changes (Watch List, Risk Open, etc.)
window.handleSeverityChange = (category, isChecked) => {
    if (isChecked) {
        window.activeSeverityFilters.add(category);
    } else {
        window.activeSeverityFilters.delete(category);
    }
    window.renderChart(); // Updates the 3D Bars
};
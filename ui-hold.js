// --- UI GENERATORS ---

function generateAxisControls() {
    const div = document.getElementById('axis-controls');
    if (!div) return;
    
    // Clear and rebuild to ensure listeners stay clean
    div.innerHTML = `
        <div class="control-section bg-gray-800/50 p-3 rounded-lg border border-gray-700">
            <label class="block text-[10px] text-gray-500 mb-2 uppercase tracking-widest font-black">X-Axis Metric</label>
            <select onchange="handleAxisChange('x', this.value)" class="w-full bg-gray-900 text-indigo-300 border border-gray-700 rounded-md p-2 mb-4 text-xs focus:ring-1 focus:ring-indigo-500 outline-none">
                ${FIELD_LABELS.filter(l => l !== currentYField).map(l => `<option value="${l}" ${currentXField === l ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
            
            <label class="block text-[10px] text-gray-500 mb-2 uppercase tracking-widest font-black">Y-Axis Metric</label>
            <select onchange="handleAxisChange('y', this.value)" class="w-full bg-gray-900 text-indigo-300 border border-gray-700 rounded-md p-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none">
                ${FIELD_LABELS.filter(l => l !== currentXField).map(l => `<option value="${l}" ${currentXField === l ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
        </div>
    `;
}

function generateSeverityFilters() {
    const div = document.getElementById('severity-filters');
    if (!div) return;
    
    let html = `<div class="mb-2 text-[10px] text-gray-500 uppercase tracking-widest font-black">Filter Risk Levels</div>`;
    Object.keys(RISK_CATEGORIES).forEach(cat => {
        const checked = activeSeverityFilters.has(cat) ? 'checked' : '';
        const catInfo = RISK_CATEGORIES[cat];
        html += `
            <label class="group flex items-center justify-between text-xs text-gray-400 cursor-pointer mb-2 p-2 rounded hover:bg-gray-800/50 transition-colors">
                <div class="flex items-center">
                    <input type="checkbox" class="hidden" onchange="handleSeverityChange('${cat}', this.checked)" ${checked}>
                    <div class="w-4 h-4 border border-gray-600 rounded mr-3 flex items-center justify-center group-hover:border-indigo-500 transition-colors ${checked ? 'bg-indigo-600 border-indigo-600' : ''}">
                        ${checked ? '<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>' : ''}
                    </div>
                    <span class="${checked ? 'text-gray-200' : ''}">${cat}</span>
                </div>
                <div class="w-2 h-2 rounded-full ${catInfo.color}"></div>
            </label>
        `;
    });
    div.innerHTML = html;
}

function renderDynamicFilters() {
    const div = document.getElementById('dynamic-filters');
    if (!div) return;
    div.innerHTML = ''; 

    const fields = ['Division', 'Asset Criticality', 'Location', 'Weapon System'];
    
    fields.forEach(field => {
        if (!activeFilters[field]) activeFilters[field] = new Set();
        
        const section = document.createElement('div');
        section.className = 'mb-6 border-t border-gray-800 pt-4';
        
        const vals = [...new Set(data.map(d => d[field]))].sort();
        
        section.innerHTML = `
            <div class="flex items-center justify-between mb-3">
                <strong class="text-[10px] text-gray-500 uppercase tracking-widest">${field}</strong>
                <span class="text-[10px] text-indigo-500 font-mono">${activeFilters[field].size || 'ALL'}</span>
            </div>
        `;
        
        const list = document.createElement('div');
        list.className = 'space-y-1 max-h-48 overflow-y-auto pr-2 custom-scrollbar custom-scrollbar-thin';

        vals.forEach(val => {
            const isChecked = activeFilters[field].has(String(val));
            const item = document.createElement('label');
            item.className = `flex items-center text-[11px] py-1 cursor-pointer transition-colors ${isChecked ? 'text-indigo-300' : 'text-gray-500 hover:text-gray-300'}`;
            item.innerHTML = `
                <input type="checkbox" class="mr-2 rounded-sm bg-gray-900 border-gray-700 accent-indigo-500" 
                       ${isChecked ? 'checked' : ''} 
                       onchange="handleFilterChange('${field}', '${val}', this.checked)">
                <span class="truncate">${val}</span>
            `;
            list.appendChild(item);
        });
        section.appendChild(list);
        div.appendChild(section);
    });
}

// --- EVENT HANDLERS ---

function handleTimeChange(val) {
    currentDateIndex = parseInt(val);
    const dateDisp = document.getElementById('current-date-display');
    if (dateDisp) dateDisp.innerText = uniqueDates[val] || "";
    renderChart();
}

function handleAxisChange(axis, value) {
    if (axis === 'x') currentXField = value;
    else currentYField = value;
    generateAxisControls();
    renderChart();
}

function handleSeverityChange(cat, checked) {
    if (checked) activeSeverityFilters.add(cat);
    else activeSeverityFilters.delete(cat);
    generateSeverityFilters(); // Update visual state of checkboxes
    renderChart();
}

function handleFilterChange(field, value, isChecked) {
    if (!activeFilters[field]) activeFilters[field] = new Set();
    if (isChecked) activeFilters[field].add(String(value));
    else activeFilters[field].delete(String(value));
    renderDynamicFilters(); // Update counts and visual state
    renderChart();
}

function toggleMitigationMode() {
    mitigationMode = !mitigationMode;
    const btn = document.getElementById('mitigation-btn');
    if (btn) {
        btn.classList.toggle('bg-green-600');
        btn.classList.toggle('bg-gray-700');
        btn.innerText = mitigationMode ? 'Exit Mitigation View' : 'Mitigation Analysis';
    }
    renderChart();
}
// --- DETAIL VIEW GENERATION ---

function showDetailView(groupData) {
    selectedItem = groupData;
    viewMode = 'detail';

    const mainCanvas = document.getElementById('visualization-canvas');
    const detailContainer = document.getElementById('detail-view-container');
    const sidePanel = document.getElementById('sidebar-controls');

    if (mainCanvas) mainCanvas.style.display = 'none';
    if (sidePanel) sidePanel.style.display = 'none';
    if (detailContainer) {
        detailContainer.classList.remove('hidden');
        renderDetailContent(groupData);
    }
}

function hideDetailView() {
    viewMode = '3d';
    selectedItem = null;

    const mainCanvas = document.getElementById('visualization-canvas');
    const detailContainer = document.getElementById('detail-view-container');
    const sidePanel = document.getElementById('sidebar-controls');

    if (mainCanvas) mainCanvas.style.display = 'block';
    if (sidePanel) sidePanel.style.display = 'block';
    if (detailContainer) detailContainer.classList.add('hidden');
    
    renderChart();
}

function renderDetailContent(group) {
    const container = document.getElementById('detail-content');
    if (!container) return;

    const items = group.items;
    const avgScore = group.totalScore / group.count;

    container.innerHTML = `
        <div class="p-6 max-w-6xl mx-auto">
            <div class="flex items-center justify-between mb-8">
                <div>
                    <h2 class="text-3xl font-black text-white tracking-tight">${currentXField}: ${group.x}</h2>
                    <p class="text-indigo-400 font-mono text-sm">${currentYField}: ${group.y} | ${items.length} Total Records Found</p>
                </div>
                <button onclick="hideDetailView()" class="bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-full border border-gray-600 transition-all flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                    Return to 3D Dashboard
                </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div class="bg-gray-900/80 p-6 rounded-2xl border border-gray-800">
                    <div class="text-gray-500 text-xs uppercase font-bold mb-1">Average Risk Score</div>
                    <div class="text-4xl font-black ${avgScore >= 17 ? 'text-red-500' : avgScore >= 9 ? 'text-orange-500' : 'text-green-500'}">
                        ${avgScore.toFixed(1)}
                    </div>
                </div>
                <div class="bg-gray-900/80 p-6 rounded-2xl border border-gray-800">
                    <div class="text-gray-500 text-xs uppercase font-bold mb-1">Total Mitigation Cost</div>
                    <div class="text-4xl font-black text-white">
                        $${(items.reduce((sum, i) => sum + i['Mitigation Cost'], 0) / 1000).toFixed(1)}K
                    </div>
                </div>
                <div class="bg-gray-900/80 p-6 rounded-2xl border border-gray-800">
                    <div class="text-gray-500 text-xs uppercase font-bold mb-1">Status</div>
                    <div class="text-xl font-bold text-gray-200 mt-2">${getRiskCategory(avgScore)}</div>
                </div>
            </div>

            <div class="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/50">
                <table class="w-full text-left text-sm text-gray-400">
                    <thead class="bg-gray-800 text-gray-200 uppercase text-[10px] tracking-widest">
                        <tr>
                            <th class="px-6 py-4">Site</th>
                            <th class="px-6 py-4">Weapon System</th>
                            <th class="px-6 py-4">Risk Score</th>
                            <th class="px-6 py-4">Status</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-800">
                        ${items.map(item => `
                            <tr class="hover:bg-gray-800/30 transition-colors">
                                <td class="px-6 py-4 font-bold text-gray-200">${item.Site}</td>
                                <td class="px-6 py-4">${item['Weapon System']}</td>
                                <td class="px-6 py-4 font-mono">${item['Risk Score']}</td>
                                <td class="px-6 py-4">
                                    <span class="px-2 py-1 rounded-full text-[10px] font-bold ${item['Risk Score'] >= 17 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}">
                                        ${item['Risk Score'] >= 17 ? 'CRITICAL' : 'STABLE'}
                                    </span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}
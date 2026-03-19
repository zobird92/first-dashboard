// --- TOOLTIP & OVERLAY STATE ---

/**
 * Normalizes mouse coordinates for Three.js Raycasting.
 * This must be called from engine.js but lives in UI for DOM placement.
 */
function updateTooltip(event, intersects) {
    const tooltip = document.getElementById('tooltip');
    if (!tooltip) return;

    if (intersects.length > 0) {
        const intersect = intersects[0];
        const { group, avgScore } = intersect.object.userData;

        // Visual feedback for hover
        if (hoveredBar && hoveredBar !== intersect.object) {
            hoveredBar.material.opacity = 0.85;
            hoveredBar.material.emissive.setHex(0x000000);
        }
        hoveredBar = intersect.object;
        hoveredBar.material.opacity = 1.0;
        hoveredBar.material.emissive.setHex(0x222222);

        // Tooltip Content - Preserving the "Mitigation View" toggle logic
        tooltip.classList.remove('hidden');
        tooltip.style.left = (event.clientX + 15) + 'px';
        tooltip.style.top = (event.clientY + 15) + 'px';

        let html = `
            <div class="space-y-1">
                <p class="font-black text-indigo-400 uppercase text-[10px] tracking-widest">${group.x} | ${group.y}</p>
                <div class="h-px bg-white/10 my-1"></div>
                <p class="text-white">Avg Risk: <span class="font-mono">${avgScore.toFixed(1)}</span></p>
                <p class="text-gray-400">Total Items: <span class="text-white">${group.items.length}</span></p>
        `;

        if (mitigationMode) {
            const totalCost = group.items.reduce((sum, i) => sum + (i['Mitigation Cost'] || 0), 0);
            html += `<p class="text-green-400">Total Cost: $${totalCost.toLocaleString()}</p>`;
        }

        tooltip.innerHTML = html + `</div>`;
        document.body.style.cursor = 'pointer';
    } else {
        if (hoveredBar) {
            hoveredBar.material.opacity = 0.85;
            hoveredBar.material.emissive.setHex(0x000000);
            hoveredBar = null;
        }
        tooltip.classList.add('hidden');
        document.body.style.cursor = 'default';
    }
}

// --- DYNAMIC FILTER GENERATION ---

function generateAxisControls() {
    const container = document.getElementById('axis-controls');
    if (!container) return;

    container.innerHTML = `
        <div class="glass-panel p-4 mb-4">
            <h4 class="text-xs font-black text-indigo-400 uppercase tracking-widest mb-3">Axis Configuration</h4>
            <div class="space-y-3">
                <div>
                    <label class="block text-[10px] text-gray-500 uppercase mb-1 font-bold">X-Axis (Horizontal)</label>
                    <select id="x-axis-select" class="w-full bg-[#0a0a0c] border border-white/10 rounded p-2 text-xs text-white outline-none focus:border-indigo-500 transition-colors">
                        ${Object.keys(FIELD_MAP).map(f => `<option value="${f}" ${f === currentXField ? 'selected' : ''}>${f}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] text-gray-500 uppercase mb-1 font-bold">Y-Axis (Depth)</label>
                    <select id="y-axis-select" class="w-full bg-[#0a0a0c] border border-white/10 rounded p-2 text-xs text-white outline-none focus:border-indigo-500 transition-colors">
                        ${Object.keys(FIELD_MAP).map(f => `<option value="${f}" ${f === currentYField ? 'selected' : ''}>${f}</option>`).join('')}
                    </select>
                </div>
            </div>
        </div>
    `;

    document.getElementById('x-axis-select').onchange = (e) => { currentXField = e.target.value; renderChart(); };
    document.getElementById('y-axis-select').onchange = (e) => { currentYField = e.target.value; renderChart(); };
}

function generateSeverityFilters() {
    const container = document.getElementById('severity-filters');
    if (!container) return;

    let html = `
        <div class="glass-panel p-4 mb-4">
            <h4 class="text-xs font-black text-indigo-400 uppercase tracking-widest mb-3 font-bold">Severity Range (Z)</h4>
            <div class="space-y-2">
    `;

    Object.entries(RISK_CATEGORIES).forEach(([name, info]) => {
        const isActive = activeSeverityFilters.has(name);
        html += `
            <label class="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" class="hidden" ${isActive ? 'checked' : ''} onchange="toggleSeverity('${name}')">
                <div class="w-4 h-4 border border-white/20 rounded flex items-center justify-center transition-all ${isActive ? 'bg-indigo-500 border-indigo-500' : 'group-hover:border-white/40'}">
                    ${isActive ? '<div class="w-2 h-2 bg-white rounded-sm animate-pulse"></div>' : ''}
                </div>
                <span class="text-xs ${isActive ? 'text-white' : 'text-gray-500'} group-hover:text-white transition-colors">${name}</span>
            </label>
        `;
    });

    container.innerHTML = html + `</div></div>`;
}

function renderDynamicFilters() {
    const container = document.getElementById('dynamic-filters');
    if (!container) return;

    // These represent the specific multi-select categories from your original JSON
    const fieldsToFilter = ['Site', 'Weapon System', 'Subversion Risk Type'];
    let html = '';

    fieldsToFilter.forEach(field => {
        const values = getUniqueValuesForField(field);
        html += `
            <div class="glass-panel p-4 mb-4">
                <h4 class="text-[10px] font-black text-gray-500 uppercase tracking-tighter mb-3">${field}</h4>
                <div class="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-2">
        `;

        values.forEach(val => {
            const isActive = activeFilters[field]?.has(val);
            html += `
                <label class="flex items-center gap-2 cursor-pointer py-1 group">
                    <input type="checkbox" class="hidden" ${isActive ? 'checked' : ''} onchange="toggleFilter('${field}', '${val}')">
                    <div class="w-3 h-3 border border-white/10 rounded-sm transition-all ${isActive ? 'bg-indigo-400 border-indigo-400' : 'group-hover:border-white/30'}"></div>
                    <span class="text-[11px] truncate ${isActive ? 'text-white' : 'text-gray-500'} group-hover:text-gray-300 transition-colors">${val}</span>
                </label>
            `;
        });

        html += `</div></div>`;
    });

    container.innerHTML = html;
}

// --- DETAIL VIEW (2D MATRIX) ---

function showDetailView(group) {
    const container = document.getElementById('detail-view');
    const content = document.getElementById('detail-content');
    if (!container || !content) return;

    container.classList.remove('hidden');
    container.style.opacity = '1';
    
    // Header logic - showing the aggregate metrics for the selected "Stack"
    const totalCost = group.items.reduce((sum, i) => sum + (i['Mitigation Cost'] || 0), 0);

    content.innerHTML = `
        <div class="mb-8 flex justify-between items-start">
            <div>
                <h2 class="text-3xl font-black text-white uppercase tracking-tighter leading-none mb-2">${group.x} <span class="text-indigo-500">/</span> ${group.y}</h2>
                <div class="flex gap-4 text-xs font-mono uppercase tracking-widest text-gray-500">
                    <p>Total Vectors: <span class="text-white">${group.items.length}</span></p>
                    <p>Aggregated Risk: <span class="text-white">${(group.totalScore / group.items.length).toFixed(1)}</span></p>
                    ${mitigationMode ? `<p class="text-green-400">Mitigation: $${totalCost.toLocaleString()}</p>` : ''}
                </div>
            </div>
            <button onclick="closeDetailView()" class="px-6 py-2 border border-white/10 text-xs text-gray-400 hover:text-white hover:bg-white/5 hover:border-white/30 transition-all uppercase tracking-widest font-bold">Close Overlay</button>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar max-h-[70vh] pr-4">
            ${group.items.map(item => `
                <div class="glass-panel p-5 border-l-4 ${getRiskBorderClass(item['Risk Score'])} hover:bg-white/5 transition-colors">
                    <div class="flex justify-between items-start mb-4">
                        <span class="px-2 py-1 bg-white/5 rounded text-[9px] font-mono text-gray-400 tracking-tighter">${item.Date}</span>
                        <div class="text-right">
                            <p class="text-[10px] text-gray-500 uppercase tracking-widest">Risk Score</p>
                            <p class="text-xl font-black text-white leading-none">${item['Risk Score']}</p>
                        </div>
                    </div>
                    
                    <h3 class="text-md font-bold text-white mb-1">${item.Facility || 'General Facility'}</h3>
                    <p class="text-xs text-indigo-400 mb-4 font-medium">${item.Capability || 'Standard Capability'}</p>
                    
                    <div class="space-y-2 border-t border-white/5 pt-4">
                        <div class="flex justify-between items-center text-[10px] uppercase tracking-widest">
                            <span class="text-gray-500 font-bold">Weapon System</span>
                            <span class="text-gray-300 font-mono">${item['Weapon System']}</span>
                        </div>
                        <div class="flex justify-between items-center text-[10px] uppercase tracking-widest">
                            <span class="text-gray-500 font-bold">Status</span>
                            <span class="px-2 py-0.5 rounded-full ${item['Mitigation Status'] === 'Mitigated' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">
                                ${item['Mitigation Status']}
                            </span>
                        </div>
                        ${mitigationMode ? `
                        <div class="flex justify-between items-center text-[10px] uppercase tracking-widest pt-2 border-t border-white/5">
                            <span class="text-green-500 font-bold">Cost Impact</span>
                            <span class="text-green-400 font-mono">$${(item['Mitigation Cost'] || 0).toLocaleString()}</span>
                        </div>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function closeDetailView() {
    const container = document.getElementById('detail-view');
    container.classList.add('hidden');
}

// --- INTERACTION HANDLERS ---

function toggleMitigationMode() {
    mitigationMode = !mitigationMode;
    const btn = document.getElementById('mitigation-btn');
    if (btn) {
        if (mitigationMode) {
            btn.classList.add('bg-green-600', 'text-white');
            btn.classList.remove('text-gray-400');
            btn.innerText = 'Viewing Mitigation Costs';
        } else {
            btn.classList.remove('bg-green-600', 'text-white');
            btn.classList.add('text-gray-400');
            btn.innerText = 'Mitigation Analysis';
        }
    }
    renderChart();
}

function toggleSeverity(category) {
    if (activeSeverityFilters.has(category)) activeSeverityFilters.delete(category);
    else activeSeverityFilters.add(category);
    generateSeverityFilters();
    renderChart();
}

function toggleFilter(field, value) {
    if (!activeFilters[field]) activeFilters[field] = new Set();
    if (activeFilters[field].has(value)) activeFilters[field].delete(value);
    else activeFilters[field].add(value);
    renderDynamicFilters();
    renderChart();
}

function updateSliderUI() {
    const slider = document.getElementById('time-slider');
    const display = document.getElementById('current-date-display');
    if (slider) {
        slider.max = uniqueDates.length - 1;
        slider.value = currentDateIndex;
    }
    if (display) display.innerText = uniqueDates[currentDateIndex] || "--";
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Sync buttons from model.html to these logic functions
    const mitBtn = document.getElementById('mitigation-btn');
    if (mitBtn) mitBtn.onclick = toggleMitigationMode;

    const exportBtn = document.getElementById('export-data-btn');
    if (exportBtn) exportBtn.onclick = () => exportToExcel(getFilteredData());

    const slider = document.getElementById('time-slider');
    if (slider) {
        slider.oninput = (e) => {
            currentDateIndex = parseInt(e.target.value);
            updateSliderUI();
            renderChart();
        };
    }
});
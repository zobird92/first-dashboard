// --- UI UPDATERS ---

function updateSliderUI() {
    const slider = document.getElementById('time-slider');
    if (slider) {
        slider.max = uniqueDates.length - 1;
        slider.value = currentDateIndex;
    }
    
    const dateDisplay = document.getElementById('current-date-display');
    if (dateDisplay) {
        dateDisplay.innerText = uniqueDates[currentDateIndex] || "--";
    }
}
// --- INTERACTION & WINDOW HANDLERS ---

function onMouseMove(event) {
    // Normalizing mouse coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(bars);
    const tooltip = document.getElementById('tooltip');

    if (intersects.length > 0) {
        const intersect = intersects[0];
        const { group, avgScore } = intersect.object.userData;
        
        // Visual feedback on hover
        if (hoveredBar && hoveredBar !== intersect.object) {
            hoveredBar.material.opacity = 0.85;
            hoveredBar.material.emissive.setHex(0x000000);
        }
        
        hoveredBar = intersect.object;
        hoveredBar.material.opacity = 1.0;
        hoveredBar.material.emissive.setHex(0x333333);

        // Tooltip Positioning and Content
        if (tooltip) {
            tooltip.style.display = 'block';
            tooltip.style.left = (event.clientX + 20) + 'px';
            tooltip.style.top = (event.clientY + 20) + 'px';
            
            tooltip.innerHTML = `
                <div class="space-y-2">
                    <div class="flex items-center justify-between gap-4">
                        <span class="text-[10px] text-gray-500 uppercase font-bold">${currentXField}</span>
                        <span class="text-white font-black">${group.x}</span>
                    </div>
                    <div class="flex items-center justify-between gap-4">
                        <span class="text-[10px] text-gray-500 uppercase font-bold">${currentYField}</span>
                        <span class="text-white font-black">${group.y}</span>
                    </div>
                    <div class="pt-2 border-t border-gray-700 flex items-center justify-between">
                        <span class="text-[10px] text-indigo-400 uppercase font-bold text-xs">Avg Risk</span>
                        <span class="text-lg font-black ${avgScore >= 17 ? 'text-red-500' : avgScore >= 9 ? 'text-orange-500' : 'text-green-500'}">${Math.round(avgScore)}</span>
                    </div>
                    <div class="text-[9px] text-gray-500 italic text-center">Click to view ${group.count} individual records</div>
                </div>
            `;
        }
        document.body.style.cursor = 'pointer';
    } else {
        if (hoveredBar) {
            hoveredBar.material.opacity = 0.85;
            hoveredBar.material.emissive.setHex(0x000000);
            hoveredBar = null;
        }
        if (tooltip) tooltip.style.display = 'none';
        document.body.style.cursor = 'default';
    }
}

function onMouseClick(event) {
    // Prevent click logic if dragging the camera
    if (controls && controls.active) return;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(bars);

    if (intersects.length > 0) {
        const { group } = intersects[0].object.userData;
        showDetailView(group);
    }
}

function onWindowResize() {
    if (!camera || !renderer) return;
    
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    
    renderer.setSize(window.innerWidth, window.innerHeight);
}
// --- UI GENERATORS ---

function generateAxisControls() {
    const div = document.getElementById('axis-controls');
    if (!div) return;
    
    div.innerHTML = `
        <div class="control-section bg-gray-800/50 p-3 rounded-lg border border-gray-700">
            <label class="block text-[10px] text-gray-500 mb-2 uppercase tracking-widest font-black">X-Axis Metric</label>
            <select onchange="handleAxisChange('x', this.value)" class="w-full bg-gray-900 text-indigo-300 border border-gray-700 rounded-md p-2 mb-4 text-xs focus:ring-1 focus:ring-indigo-500 outline-none">
                ${FIELD_LABELS.filter(l => l !== currentYField).map(l => `<option value="${l}" ${currentXField === l ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
            
            <label class="block text-[10px] text-gray-500 mb-2 uppercase tracking-widest font-black">Y-Axis Metric</label>
            <select onchange="handleAxisChange('y', this.value)" class="w-full bg-gray-900 text-indigo-300 border border-gray-700 rounded-md p-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none">
                ${FIELD_LABELS.filter(l => l !== currentXField).map(l => `<option value="${l}" ${currentYField === l ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
        </div>
    `;
}

function generateSeverityFilters() {
    const div = document.getElementById('severity-filters');
    if (!div) return;

    div.innerHTML = `
        <label class="block text-[10px] text-gray-500 mb-3 uppercase tracking-widest font-black">Risk Severity</label>
        <div class="space-y-2">
            ${Object.keys(RISK_CATEGORIES).map(cat => `
                <label class="flex items-center space-x-3 cursor-pointer group">
                    <input type="checkbox" checked onchange="handleSeverityChange('${cat}', this.checked)" 
                        class="w-4 h-4 rounded border-gray-700 bg-gray-900 text-indigo-600 focus:ring-indigo-500">
                    <span class="text-xs text-gray-400 group-hover:text-white transition-colors">${cat}</span>
                </label>
            `).join('')}
        </div>
    `;
}

function renderDynamicFilters() {
    const div = document.getElementById('dynamic-filters');
    if (!div || data.length === 0) return;

    const filterFields = ['Site', 'Weapon System', 'Subversion Risk Type'];
    div.innerHTML = filterFields.map(field => {
        const values = [...new Set(data.map(d => d[field]))].sort();
        return `
            <div class="mb-6">
                <label class="block text-[10px] text-gray-500 mb-3 uppercase tracking-widest font-black">${field}</label>
                <div class="max-height-40 overflow-y-auto custom-scrollbar-thin space-y-1">
                    ${values.map(val => `
                        <label class="flex items-center space-x-2 cursor-pointer group">
                            <input type="checkbox" onchange="handleFilterChange('${field}', '${val}', this.checked)"
                                class="w-3 h-3 rounded border-gray-700 bg-gray-900 text-indigo-600">
                            <span class="text-[11px] text-gray-500 group-hover:text-gray-300">${val}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// --- EVENT HANDLERS ---

function handleTimeChange(val) {
    currentDateIndex = parseInt(val);
    const dateDisplay = document.getElementById('current-date-display');
    if (dateDisplay) dateDisplay.innerText = uniqueDates[currentDateIndex];
    if (typeof renderChart === "function") renderChart();
}

function handleAxisChange(axis, value) {
    if (axis === 'x') currentXField = value;
    else currentYField = value;
    
    generateAxisControls(); // Refresh to update disabled options
    if (typeof renderChart === "function") renderChart();
}

function handleSeverityChange(cat, isChecked) {
    if (isChecked) activeSeverityFilters.add(cat);
    else activeSeverityFilters.delete(cat);
    if (typeof renderChart === "function") renderChart();
}

function handleFilterChange(field, value, isChecked) {
    if (!activeFilters[field]) activeFilters[field] = new Set();
    if (isChecked) activeFilters[field].add(value);
    else activeFilters[field].delete(value);
    if (typeof renderChart === "function") renderChart();
}

function toggleMitigationMode() {
    mitigationMode = !mitigationMode;
    const btn = document.getElementById('mitigation-btn');
    if (btn) {
        if (mitigationMode) {
            btn.classList.remove('bg-gray-700');
            btn.classList.add('bg-green-600');
            btn.innerText = 'Viewing Mitigated Risks';
        } else {
            btn.classList.remove('bg-green-600');
            btn.classList.add('bg-gray-700');
            btn.innerText = 'Mitigation Analysis';
        }
    }
    if (typeof renderChart === "function") renderChart();
}

// --- DETAIL VIEW OVERLAY ---

function showDetailView(group) {
    selectedItem = group;
    viewMode = 'detail';
    const container = document.getElementById('detail-view-container');
    if (container) {
        container.classList.remove('hidden');
        renderDetailContent();
    }
}

function hideDetailView() {
    selectedItem = null;
    viewMode = '3d';
    const container = document.getElementById('detail-view-container');
    if (container) container.classList.add('hidden');
}

function renderDetailContent() {
    const div = document.getElementById('detail-content');
    if (!div || !selectedItem) return;

    const { x, y, items } = selectedItem;
    
    div.innerHTML = `
        <div class="max-w-6xl mx-auto px-6 py-12">
            <div class="flex items-center justify-between mb-12">
                <div>
                    <h2 class="text-4xl font-black text-white tracking-tighter mb-2">SEGMENT ANALYSIS</h2>
                    <p class="text-gray-500 uppercase tracking-widest text-xs font-bold">
                        ${currentXField}: <span class="text-indigo-400">${x}</span> 
                        <span class="mx-3 text-gray-800">|</span> 
                        ${currentYField}: <span class="text-indigo-400">${y}</span>
                    </p>
                </div>
                <button onclick="hideDetailView()" class="px-6 py-2 bg-gray-800 hover:bg-white hover:text-black text-white text-xs font-bold rounded-full transition-all uppercase tracking-widest">
                    Back to Canvas
                </button>
            </div>

            <div class="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
                <table class="w-full text-left border-collapse">
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
// --- DASHBOARD CONTROL HANDLERS ---

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
    if (typeof generateAxisControls === "function") generateAxisControls();
    if (typeof generateSeverityFilters === "function") generateSeverityFilters();
    if (typeof renderDynamicFilters === "function") renderDynamicFilters();
    
    // Reset Time Slider to most recent quarter
    currentDateIndex = uniqueDates.length - 1;
    if (typeof updateSliderUI === "function") updateSliderUI();

    // Redraw 3D scene
    if (typeof renderChart === "function") renderChart();
}

// --- DOM EVENT BINDING ---
// This block ensures that the buttons in your HTML are linked to the logic
document.addEventListener('DOMContentLoaded', () => {
    const resetBtn = document.getElementById('reset-dashboard-btn');
    if (resetBtn) resetBtn.onclick = resetFilters;

    const exportBtn = document.getElementById('export-data-btn');
    if (exportBtn) {
        // Linked to the utility function
        if (typeof exportToExcel === "function") {
            exportBtn.onclick = exportToExcel;
        }
    }
});
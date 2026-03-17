const renderRiskMatrix2D = () => {
            const container = document.getElementById('view-2d-container');
            const { xVal, yVal } = aggregationKeys;

            const grouped = drilldownData.reduce((g, i) => {
                const k = `${i['Difficulty']}-${i['Mission Impact']}`;
                if (!g[k]) g[k] = [];
                g[k].push(i);
                return g;
            }, {});

            const total = drilldownData.length;
            const avg = total > 0 ? Math.round(drilldownData.reduce((s, i) => s + Number(i['Risk Score']), 0) / total) : 0;

            const yLabels = [5, 4, 3, 2, 1];
            const xLabels = [1, 2, 3, 4, 5];

            container.innerHTML = `
                <div class="flex flex-col sm:flex-row justify-between items-start mb-8 bg-gray-800 p-4 rounded-lg border border-gray-700 sticky top-0 z-10">
                    <button onclick="setViewMode('3D')" class="flex items-center space-x-2 px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition">
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
            lucide.createIcons();
        };

        const generateAxisControls = () => {
            const div = document.getElementById('axis-controls');
            div.innerHTML = `
                <label class="block text-sm text-gray-400 mb-1">X-Axis Field</label>
                <select id="select-x-axis" onchange="handleAxisChange('x', this.value)" class="w-full bg-gray-700 text-white border border-gray-600 rounded-md p-2 mb-3">
                    ${FIELD_LABELS.filter(l => l !== currentYField).map(l => `<option value="${l}" ${currentXField === l ? 'selected' : ''}>${l}</option>`).join('')}
                </select>
                <label class="block text-sm text-gray-400 mb-1">Y-Axis (Depth) Field</label>
                <select id="select-y-axis" onchange="handleAxisChange('y', this.value)" class="w-full bg-gray-700 text-white border border-gray-600 rounded-md p-2">
                    ${FIELD_LABELS.filter(l => l !== currentXField).map(l => `<option value="${l}" ${currentYField === l ? 'selected' : ''}>${l}</option>`).join('')}
                </select>
            `;
        };

        const generateSeverityFilters = () => {
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

        const updateLegend = () => {
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
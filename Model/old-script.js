    function parseQuarterDate(qstr) {
  // qstr format: "Qn YYYY"
  const m = /^Q([1-4])\s+(\d{4})$/.exec(qstr?.trim() ?? "");
  if (!m) return Number.POSITIVE_INFINITY;            // push invalid values to the end
  const q = Number(m[1]);
  const year = Number(m[2]);
  // Convert to a numeric order key: YYYY * 4 + (Q - 1)
  return year * 4 + (q - 1);
}  

async function loadDataFromJson() {
  // Corrected path to your JSON file
  const res = await fetch("./data/subversion_risk_data.json", { cache: "no-cache" });
  if (!res.ok) throw new Error(`Failed to load JSON: ${res.status} ${res.statusText}`);
  const json = await res.json();

  // Coerce numeric fields so math/filters work the same as before
  data = json.map(row => ({
    ...row,
    "Mission Impact": Number(row["Mission Impact"]),
    "Difficulty": Number(row["Difficulty"]),
    "Risk Score": Number(row["Risk Score"]),
    "Mitigation Cost": Number(row["Mitigation Cost"])
  }));

  // Build sorted list of dates
 
uniqueDates = [...new Set(data.map(d => d.Date))]
  .sort((a, b) => parseQuarterDate(a) - parseQuarterDate(b));

currentDate = uniqueDates[0] ?? "";


  // Wire up time slider
  const slider = document.getElementById("time-slider");
  slider.max = Math.max(uniqueDates.length - 1, 0);
  slider.value = 0;
  document.getElementById("current-date-display").textContent = currentDate;

  // Initialize axis filters
  FIELD_LABELS.forEach(label => {
    const key = FIELD_MAP[label];
    const uniqueVals = [...new Set(data.map(d => d[key]))].sort();
    activeFilters[key] = new Set(uniqueVals);
  });
}


        // --- CONFIGURATION CONSTANTS ---
        const FIELD_MAP = {
            'Mission Impact': 'Mission Impact',
            'Difficulty' : 'Difficulty',
            'Risk Score': 'Risk Score',
            'Vulnerability Surface': 'Vulnerability Surface',
            'Adversarial Subversion (Trial Schema 3)': 'Adversarial Subversion',
            'Site': 'Site', 
            'Subversion Risk Type': 'Subversion Risk Type', 
            'Weapon System': 'Weapon System',
            'Facility':'Facility', 
            'Capability': 'Capability',
            'Date': 'Date',
            'Risk Level': 'Risk Level',
            'Mitigation Status': 'Mitigation Status',
            'Mitigation Cost': 'Mitigation Cost'
        };
        const FIELD_LABELS = ['Vulnerability Surface','Adversarial Subversion (Trial Schema 3)','Site','Subversion Risk Type','Weapon System','Facility','Capability'];

        const RISK_CATEGORIES = {
            "Watch List": { color: "bg-green-500" },
            "Risk Open": { color: "bg-orange-500" },
            "Subverted - Risk Realized": { color: "bg-red-500" }
        };

        const BAR_WIDTH = 0.8;
        const BAR_DEPTH = 0.8;
        const SPACING = 1.8;
        const HEIGHT_SCALE = 0.5;
        const PLANE_ELEVATION = 0.1;

        // --- GLOBAL STATE ---
        let data = [];
        let viewMode = '3D';
        let mitigationMode = false; // NEW: Toggle State
        let currentXField = 'Vulnerability Surface';
        let currentYField = 'Adversarial Subversion (Trial Schema 3)';
        let activeSeverityFilters = new Set([
            "Watch List", 
            "Risk Open", 
            "Subverted - Risk Realized"
        ]);
        let activeFilters = {};
        let drilldownData = [];
        let aggregationKeys = {};
        let uniqueDates = [], 
        currentDate = "";

        // --- THREE.JS GLOBALS ---
        let scene, camera, renderer, controls;
        let chartGroup = new THREE.Group();
        let raycaster = new THREE.Raycaster();
        let mouse = new THREE.Vector2();
        let tooltip;
        let intersectedObject = null;

        // --- HELPERS ---

        // NEW: Formatting Currency
        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
        };

        const getRiskColorClass = (score) => {
            if (score >= 17) return 'bg-red-500 ring-red-200';
            if (score >= 9) return 'bg-yellow-500 ring-yellow-200';
            return 'bg-green-500 ring-green-200';
        };

        const getCellBackgroundColor = (x, y) => {
            const score = x * y;
            if (score >= 17) return 'bg-red-900/40';
            if (score >= 9) return 'bg-yellow-900/40';
            return 'bg-green-900/40';
        };

        const makeTextSprite = (message) => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
    
            const canvasWidth = 512;
            const canvasHeight = 256;
            context.canvas.width = canvasWidth;
            context.canvas.height = canvasHeight;
    
            context.font = "Bold 40px Inter"; 
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillStyle = "rgba(255, 255, 255, 1.0)";
    
            const maxCharsPerLine = 15;
            const lines = [];
            let currentLine = '';
    
            message.split(' ').forEach(word => {
                const testLine = currentLine + word + ' ';
                if (testLine.length > maxCharsPerLine && currentLine.length > 0) {
                    lines.push(currentLine.trim());
                    currentLine = word + ' ';
                } else {
                    currentLine = testLine;
                }
            });
            lines.push(currentLine.trim());

            const lineHeight = 50;
            const startY = canvasHeight / 2 - (lines.length - 1) * lineHeight / 2;

            lines.forEach((line, index) => {
                context.fillText(line, canvasWidth / 2, startY + index * lineHeight);
            });

            const texture = new THREE.Texture(canvas);
            texture.needsUpdate = true;
            const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 1.0 });
            const sprite = new THREE.Sprite(spriteMaterial);
    
            sprite.scale.set(6, 3, 1); 
            return sprite;
        };

        const handleTimeChange = (index) => {
            currentDate = uniqueDates[index];
            document.getElementById('current-date-display').textContent = currentDate;
            renderChart();
        };

        // --- 3D RENDERING LOGIC ---

        const initThree = () => {
            const canvas = document.getElementById('visualization-canvas');
            tooltip = document.getElementById('tooltip');
            
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x1c1c1c);

            camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
            camera.position.set(-22, 10, 12);
            
            renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
            renderer.setSize(canvas.clientWidth, canvas.clientHeight);
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;

            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            
            scene.add(new THREE.AmbientLight(0xffffff, 0.7));
            const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
            dirLight.position.set(10, 30, 10);
            dirLight.castShadow = true;
            scene.add(dirLight);

            scene.add(chartGroup);
            
            renderChart();
            animate();
            
            window.addEventListener('resize', onWindowResize, false);
            canvas.addEventListener('mousemove', onMouseMove, false);
            canvas.addEventListener('click', onBarClick, false);
        };
        
        const animate = () => {
            if (viewMode === '3D') {
                requestAnimationFrame(animate);
                controls.update();
                renderer.render(scene, camera);
            }
        };

        const onWindowResize = () => {
            const canvas = document.getElementById('visualization-canvas');
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        };

        // NEW: Toggle Logic
        const toggleMitigationMode = (isChecked) => {
            mitigationMode = isChecked;
            updateLegend();
            renderChart();
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

        const renderChart = () => {
            // 1. Clear previous bars and labels
            while(chartGroup.children.length > 0){
                chartGroup.remove(chartGroup.children[0]);
            }

            document.getElementById('info-x-axis').textContent = currentXField;
            document.getElementById('info-y-axis').textContent = currentYField;

            // 2. Identify Keys & Visible Values
            const xKey = FIELD_MAP[currentXField];
            const yKey = FIELD_MAP[currentYField]; 
            const allXValues = [...new Set(data.map(d => d[xKey]))].sort();
            const allYValues = [...new Set(data.map(d => d[yKey]))].sort();
            const visibleXValues = allXValues.filter(v => activeFilters[xKey]?.has(v));
            const visibleYValues = allYValues.filter(v => activeFilters[yKey]?.has(v));

            if (visibleXValues.length === 0 || visibleYValues.length === 0) return;

            const xOffset = (visibleXValues.length * SPACING) / 2;
            const zOffset = (visibleYValues.length * SPACING) / 2; 

            // 3. Aggregate Data
            const aggregatedData = new Map(); 

            data.forEach(item => {
                if (item.Date !== currentDate) return; 

                const xVal = item[xKey];
                const yVal = item[yKey];
                const currentLevel = item['Risk Level']?.trim();
                const mitStatus = item['Mitigation Status']?.trim(); // NEW
                const currentScore = Number(item['Risk Score']) || 0;
                const cost = Number(item['Mitigation Cost']) || 0;   // NEW

                const isSeverityActive = activeSeverityFilters.has(currentLevel);
                if (!activeFilters[xKey]?.has(xVal) || !activeFilters[yKey]?.has(yVal) || !isSeverityActive) return;

                const key = `${xVal}|${yVal}`;
                
                if (!aggregatedData.has(key)) {
                    aggregatedData.set(key, { 
                        scoreSum: 0, 
                        count: 0, 
                        totalCost: 0,
                        levelCounts: {
                            "Subverted - Risk Realized": 0,
                            "Risk Open": 0,
                            "Watch List": 0
                        },
                        mitigationCounts: { // NEW
                            "Mitigated": 0,
                            "Unmitigated": 0
                        },
                        items: [] 
                    });
                }

                const existing = aggregatedData.get(key);
                existing.scoreSum += currentScore;
                existing.count += 1;
                existing.totalCost += cost;
                existing.items.push(item);
                
                if (existing.levelCounts.hasOwnProperty(currentLevel)) {
                    existing.levelCounts[currentLevel]++;
                }
                
                // NEW: Aggregation for Mitigation Mode
                if (existing.mitigationCounts.hasOwnProperty(mitStatus)) {
                    existing.mitigationCounts[mitStatus]++;
                }
            });         

            // 4. Elevated Pane (Floor)
            const planeWidth = visibleXValues.length * SPACING + SPACING;
            const planeDepth = visibleYValues.length * SPACING + SPACING;
            const planeGeometry = new THREE.PlaneGeometry(planeWidth + SPACING/2, planeDepth + SPACING/2);
            const planeMaterial = new THREE.MeshPhongMaterial({ 
                color: 0x202020, side: THREE.DoubleSide, specular: 0x555555, shininess: 1 
            }); 
            const plane = new THREE.Mesh(planeGeometry, planeMaterial);
            plane.rotation.x = -Math.PI / 2;
            plane.position.y = -PLANE_ELEVATION;
            plane.receiveShadow = true;
            chartGroup.add(plane);

            // NEW: Updated Color Logic
            const getCategoricalColor = (category) => {
                if (mitigationMode) {
                    return category === "Mitigated" ? 0xFFFFFF : 0xEF4444; // White vs Red
                } else {
                    switch(category) {
                        case "Subverted - Risk Realized": return 0xFF0000;
                        case "Risk Open":                return 0xFF7518;
                        case "Watch List":               return 0x32CD32;
                        default:                         return 0x6b7280;
                    }
                }
            };

            // 5. Generate Bars (Stacked)
            aggregatedData.forEach((agg, key) => {
                const [xVal, yVal] = key.split('|');
                const xIndex = visibleXValues.indexOf(xVal);
                const yIndex = visibleYValues.indexOf(yVal); 
                
                if (xIndex === -1 || yIndex === -1) return;

                const averageScore = agg.count > 0 ? (agg.scoreSum / agg.count) : 0;
                const roundedAverage = Math.round(averageScore);
                const totalVisualHeight = roundedAverage * HEIGHT_SCALE;

                const posX = (xIndex * SPACING) - xOffset + (SPACING/2);
                const posZ = (yIndex * SPACING) - zOffset + (SPACING/2);
                
                // NEW: Determine Stacking Order based on Mode
                let stackOrder, countsObj;
                if (mitigationMode) {
                    stackOrder = ["Mitigated", "Unmitigated"];
                    countsObj = agg.mitigationCounts;
                } else {
                    stackOrder = ["Watch List", "Risk Open", "Subverted - Risk Realized"];
                    countsObj = agg.levelCounts;
                }

                let currentYOffset = -PLANE_ELEVATION;
                
                stackOrder.forEach(category => {
                    const count = countsObj[category];
                    if (count === 0) return;

                    const segmentHeight = (count / agg.count) * totalVisualHeight;
                    
                    const geometry = new THREE.BoxGeometry(BAR_WIDTH, segmentHeight, BAR_DEPTH);
                    const material = new THREE.MeshStandardMaterial({ 
                        color: getCategoricalColor(category),
                        roughness: 0.3,
                        metalness: 0.1,
                        emissive: category === "Mitigated" ? 0x222222 : 0x000000
                    });
                    
                    const segmentMesh = new THREE.Mesh(geometry, material);
                    segmentMesh.position.set(posX, currentYOffset + (segmentHeight / 2), posZ);
                    
                    segmentMesh.userData = {
                        xKey,
                        yKey,
                        xVal,
                        yVal,
                        avgRiskScore: roundedAverage,
                        totalCount: agg.count,
                        totalCost: agg.totalCost,
                        items: agg.items,
                        isBar: true 
                    };


                    segmentMesh.castShadow = true;
                    segmentMesh.receiveShadow = true;
                    chartGroup.add(segmentMesh);

                    currentYOffset += segmentHeight;
                });
            });

            // 6. X and Y Axis Labels
            visibleXValues.forEach((val, index) => {
                const label = makeTextSprite(val); 
                label.position.set((index * SPACING) - xOffset + (SPACING/2), 0.5 + PLANE_ELEVATION, zOffset + 2);
                chartGroup.add(label);
            });

            visibleYValues.forEach((val, index) => {
                const label = makeTextSprite(val); 
                label.position.set(-xOffset - 2, 0.5 + PLANE_ELEVATION, (index * SPACING) - zOffset + (SPACING/2));
                chartGroup.add(label);
            });
            
            controls.target.set(0, 0, 0); 
            controls.update();
        };

        // --- 3D Interaction Handlers ---

        const onMouseMove = (event) => {
            if (viewMode !== '3D') return;
            const canvas = document.getElementById('visualization-canvas');
            const rect = canvas.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = - ((event.clientY - rect.top) / rect.height) * 2 + 1;
            tooltip.style.left = (event.clientX + 10) + 'px';
            tooltip.style.top = (event.clientY + 10) + 'px';
            checkHover();
        };

        const checkHover = () => {
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(
                chartGroup.children.filter(obj => obj.userData.isBar), 
                false
            );

            if (intersects.length > 0) {
                const newIntersected = intersects[0].object;

                if (intersectedObject !== newIntersected) {
                    chartGroup.children.forEach(obj => {
                        if (obj.userData.isBar) obj.material.emissive.setHex(0x000000);
                    });
                    
                    intersectedObject = newIntersected;
                    intersectedObject.material.emissive.setHex(0x333333); 
                    
                    const data = intersectedObject.userData;
            
                    // NEW: Expanded Tooltip with Logic for Mitigation Mode
                    let tooltipContent = `
                        <div class="space-y-1">
                            <p><strong class="text-indigo-400">${currentXField}:</strong> ${data.xVal}</p>
                            <p><strong class="text-indigo-400">${currentYField}:</strong> ${data.yVal}</p>
                            <hr class="border-gray-600 my-1">
                            <p><strong class="text-red-400">Avg Risk Score:</strong> ${data.avgRiskScore}</p>
                            <p><strong class="text-emerald-400">Items Plotted:</strong> ${data.totalCount}</p>
                    `;
                    
                    if (mitigationMode) {
                        tooltipContent += `
                            <p><strong class="text-white">Mitigation Investment:</strong> ${formatCurrency(data.totalCost)}</p>
                        `;
                    }
                    
                    tooltipContent += `<p class="text-xs text-gray-400 mt-2 italic">Click to drill down</p></div>`;

                    tooltip.innerHTML = tooltipContent;
                    tooltip.style.display = 'block';

                }
            } else {
                chartGroup.children.forEach(obj => {
                    if (obj.userData.isBar) obj.material.emissive.setHex(0x000000);
                });
                intersectedObject = null;
                tooltip.style.display = 'none';
            }
        };

        const onBarClick = () => {
            if (viewMode !== '3D') return;
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(
                chartGroup.children.filter(obj => obj.userData.isBar), 
                false
            );
            if (intersects.length > 0) {
                const barData = intersects[0].object.userData;
                drilldownData = barData.items;
                aggregationKeys = {
                    xKey: barData.xKey,
                    yKey: barData.yKey,
                    xVal: barData.xVal,
                    yVal: barData.yVal,
                };
                setViewMode('2D');
                if(tooltip) tooltip.style.display = 'none';
            }
        };


        // --- UI & CONTROL LOGIC ---

        const setViewMode = (mode) => {
            viewMode = mode;
            const container3D = document.getElementById('view-3d-container');
            const container2D = document.getElementById('view-2d-container');

            if (mode === '2D') {
                container3D.classList.add('opacity-0', 'hidden');
                container2D.classList.remove('opacity-0', 'hidden');
                renderRiskMatrix2D();
            } else {
                container3D.classList.remove('opacity-0', 'hidden');
                container2D.classList.add('opacity-0', 'hidden');
                animate();
            }
        };

        const generateAxisControls = () => {
            const axisControlsDiv = document.getElementById('axis-controls');
            let html = `
                <label class="block text-sm text-gray-400 mb-1">X-Axis Field</label>
                <select id="select-x-axis" onchange="handleAxisChange('x', this.value)"
                    class="w-full bg-gray-700 text-white border border-gray-600 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500 mb-3">
                    ${FIELD_LABELS.filter(l => l !== currentYField).map(label => 
                        `<option value="${label}" ${currentXField === label ? 'selected' : ''}>${label}</option>`
                    ).join('')}
                </select>
                
                <label class="block text-sm text-gray-400 mb-1">Y-Axis (Depth) Field</label>
                <select id="select-y-axis" onchange="handleAxisChange('y', this.value)"
                    class="w-full bg-gray-700 text-white border border-gray-600 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500">
                    ${FIELD_LABELS.filter(l => l !== currentXField).map(label => 
                        `<option value="${label}" ${currentYField === label ? 'selected' : ''}>${label}</option>`
                    ).join('')}
                </select>
            `;
            axisControlsDiv.innerHTML = html;
        };

        window.handleAxisChange = (axis, value) => {
            if (axis === 'x') currentXField = value;
            if (axis === 'y') currentYField = value;
            generateAxisControls(); 
            renderDynamicFilters(); 
            renderChart();
        };

        const generateSeverityFilters = () => {
            const severityFiltersDiv = document.getElementById('severity-filters');
            let html = `<strong class="block text-gray-200 mb-3 text-sm">Filter by Risk Level</strong>`;
            
            Object.keys(RISK_CATEGORIES).forEach(category => {
                const checked = activeSeverityFilters.has(category) ? 'checked' : '';
                const colorClass = RISK_CATEGORIES[category].color;
                
                html += `
                    <label class="flex items-center text-sm text-gray-300 cursor-pointer mb-2 hover:text-white transition-colors">
                        <input 
                            type="checkbox" 
                            class="mr-3 rounded text-indigo-500 bg-gray-700 border-gray-600 focus:ring-indigo-500"
                            data-category="${category}" ${checked}
                            onchange="handleSeverityChange('${category}', this.checked)"
                        />
                        <span class="w-3 h-3 rounded-full ${colorClass} mr-2"></span>
                        <span>${category}</span>
                    </label>
                `;
            });
            
            severityFiltersDiv.innerHTML = html;
        };

        window.handleSeverityChange = (category, isChecked) => {
            if (isChecked) activeSeverityFilters.add(category);
            else activeSeverityFilters.delete(category);
            renderChart();
        };

        const renderDynamicFilters = () => {
            const dynamicFiltersDiv = document.getElementById('dynamic-filters');
            dynamicFiltersDiv.innerHTML = '';
            
            [currentXField, currentYField].forEach(fieldLabel => {
                const dataKey = FIELD_MAP[fieldLabel];
                const uniqueValues = [...new Set(data.map(d => d[dataKey]))].sort();
                
                let html = `
                    <div class="control-section">
                        <strong class="text-gray-200">${fieldLabel} Filter</strong>
                        <div class="max-h-24 overflow-y-auto">
                `;
                
                uniqueValues.forEach(val => {
                    if (!activeFilters[dataKey]) {
                        activeFilters[dataKey] = new Set(uniqueValues);
                    }
                    const checked = activeFilters[dataKey]?.has(val) ? 'checked' : '';
                    html += `
                        <label class="flex items-center text-sm text-gray-300 cursor-pointer mb-1">
                            <input 
                                type="checkbox" 
                                class="mr-2 rounded text-indigo-500 bg-gray-700 border-gray-600 focus:ring-indigo-500"
                                data-key="${dataKey}" data-val="${val}" ${checked}
                                onchange="handleFilterChange('${dataKey}', '${val}', this.checked)"
                            />
                            ${val}
                        </label>
                    `;
                });
                
                html += `</div></div>`;
                dynamicFiltersDiv.innerHTML += html;
            });
        };

        window.handleFilterChange = (key, value, isChecked) => {
            const currentSet = activeFilters[key] || new Set();
            if (isChecked) currentSet.add(value);
            else currentSet.delete(value);
            activeFilters[key] = currentSet;
            renderChart();
        };

        
        // --- 2D RENDERING LOGIC ---
        
        const renderRiskMatrix2D = () => {
            const container2D = document.getElementById('view-2d-container');
            const dataToPlot = drilldownData;
            const { xKey, yKey, xVal, yVal } = aggregationKeys;
            
            if (dataToPlot.length === 0) return;

            const groupedData = dataToPlot.reduce((groups, item) => {
                const x = item['Difficulty']; 
                const y = item['Mission Impact'];
                const key = `${x}-${y}`;
                if (!groups[key]) groups[key] = [];
                groups[key].push(item);
                return groups;
            }, {});

            const totalRisks = dataToPlot.length;
            const avgRiskScore = totalRisks > 0 
                ? Math.round(dataToPlot.reduce((sum, item) => sum + Number(item['Risk Score']), 0) / totalRisks)
                : 0;

            const yAxisLabels = [5, 4, 3, 2, 1];
            const xAxisLabels = [1, 2, 3, 4, 5];

            let html = `
                <div class="flex flex-col sm:flex-row justify-between items-start mb-8 bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-700 sticky top-0 z-10">
                    <button
                        onclick="setViewMode('3D')"
                        class="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition duration-150 mb-4 sm:mb-0"
                    >
                        <i data-lucide="refresh-ccw" class="w-4 h-4"></i>
                        <span>Back to 3D View</span>
                    </button>
                    <div class="ml-0 sm:ml-4 text-center sm:text-left">
                        <h2 class="text-xl font-bold text-indigo-400">Drill-down: ${xVal} / ${yVal}</span></h2>
                    </div>
                    <div class="bg-gray-900 p-4 rounded-lg border border-gray-700 w-full sm:max-w-xs mt-4 sm:mt-0">
                        <h3 class="text-sm font-semibold text-gray-300">Risk Summary</h3>
                        <p class="text-3xl font-bold ${avgRiskScore >= 17 ? 'text-red-400' : avgRiskScore >= 9 ? 'text-yellow-400' : 'text-green-400'} mt-1">${avgRiskScore}</p>
                        <p class="text-sm text-gray-500">Average Risk Level Score in Group</p>
                        <div class="mt-2 flex items-center">
                            <span class="text-xl font-bold text-gray-300">${totalRisks}</span>
                            <span class="text-sm text-gray-400 ml-1">Total Items Plotted</span>
                        </div>
                    </div>
                </div>

                <div class="flex flex-col border border-gray-700 rounded-xl overflow-hidden shadow-2xl bg-gray-900 mx-auto max-w-2xl p-4">
    
                <div class="flex">
                    <div class="flex flex-col items-center justify-between py-2 mr-1 mb-1" style="height: 320px;">
                        <span class="text-[9px] font-bold text-red-400 uppercase" style="writing-mode: vertical-lr; transform: rotate(180deg);">More Severe</span>
                        <div class="w-px flex-grow bg-gray-600 relative my-2">
                            <div class="absolute -top-1 -left-[3px] w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent border-b-gray-400"></div>
                            <div class="absolute -bottom-1 -left-[3px] w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-gray-400"></div>
                        </div>
                        <span class="text-[9px] font-bold text-green-400 uppercase" style="writing-mode: vertical-lr; transform: rotate(180deg);">Less Severe</span>
                    </div>

                    <div class="flex items-center mb-1"> 
                        <div class="text-xs font-bold text-gray-400 uppercase tracking-widest mr-2" style="writing-mode: vertical-lr; transform: rotate(180deg);">
                            Severity
                        </div>
                        <div class="w-12 flex-shrink-0 flex flex-col justify-end text-sm font-medium text-gray-400">
                            ${yAxisLabels.map(y => `
                                <div class="h-16 flex items-center justify-center -translate-x-1">
                                    <span class="p-1 rounded-md bg-gray-700 ring-1 ring-gray-600">${y}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="flex-grow grid grid-cols-5 border-t border-l border-gray-700 relative">
                        ${yAxisLabels.flatMap(y => 
                            xAxisLabels.map(x => {
                                const key = `${x}-${y}`;
                                const risksInCell = groupedData[key] || [];
                                return `
                                    <div class="h-16 w-full flex items-center justify-center p-1 border-r border-b border-gray-700 transition duration-100 ${getCellBackgroundColor(x, y)}" style="position: relative;">
${risksInCell.map((risk, index) => {
    // Define the description (Generic for now)
    const riskDescription = "Potential risk of Infrastructure plans being leaked."; 
    
    // &#10; is the HTML entity for a new line in a title attribute
    const tooltipText = `Risk Score: ${risk['Risk Score']}&#10;Description: ${riskDescription}`;

    return `
        <div class="absolute w-3 h-3 rounded-full shadow-lg transition-all duration-300 ring-2 ${getRiskColorClass(risk['Risk Score'])}"
            style="top: ${20 + (index * 10) % 60}%; left: ${20 + (index * 20) % 60}%;"
            title="${tooltipText}">
        </div>
    `;
}).join('')}
                                        ${risksInCell.length === 0 ? `<div class="text-xs text-gray-500 opacity-60">(${x},${y})</div>` : ''}
                                    </div>
                                `;
                            }).join('')
                        ).join('')}
                    </div>
                </div>

                <div class="flex">
                    <div class="w-[88px] flex-shrink-0"></div> 
                    <div class="flex-grow grid grid-cols-5 text-sm font-medium text-gray-400">
                        ${xAxisLabels.map(x => `
                            <div class="h-8 flex items-center justify-center">
                                <span class="p-1 rounded-md bg-gray-700 ring-1 ring-gray-600">${x}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="flex flex-col items-center">
                    <div class="flex w-full items-center mt-1">
                        <div class="w-[88px] flex-shrink-0"></div>
                        <div class="flex-grow flex items-center justify-between px-4">
                            <span class="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">Harder</span>
                            <div class="h-px flex-grow bg-gray-600 mx-4 relative">
                                <div class="absolute -left-1 -top-[3px] w-0 h-0 border-t-[4px] border-b-[4px] border-r-[6px] border-t-transparent border-b-transparent border-r-gray-400"></div>
                                <div class="absolute -right-1 -top-[3px] w-0 h-0 border-t-[4px] border-b-[4px] border-l-[6px] border-t-transparent border-b-transparent border-l-gray-400"></div>
                            </div>
                            <span class="text-[9px] font-bold text-indigo-400 uppercase tracking-tighter">Easier</span>
                        </div>
                    </div>
                    <div class="flex w-full">
                        <div class="w-[88px] flex-shrink-0"></div>
                        <h4 class="flex-grow text-center text-[12px] font-bold text-gray-400 uppercase tracking-widest py-1">Subversion Ease</h4>
                    </div>
                </div>
            </div>
                <div class="mt-8 p-4 bg-gray-800 rounded-xl shadow-lg border border-gray-700 mx-auto max-w-2xl">
                    <h4 class="text-md font-semibold text-gray-300 mb-2">Risk Score Legend (Point Color)</h4>
                    <div class="flex space-x-4">
                        <div class="flex items-center space-x-2">
                            <div class="w-3 h-3 rounded-full bg-green-500"></div>
                            <span class="text-sm text-gray-400">Low (1 - 8)</span>
                        </div>
                        <div class="flex items-center space-x-2">
                            <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <span class="text-sm text-gray-400">Medium (9 - 16)</span>
                        </div>
                        <div class="flex items-center space-x-2">
                            <div class="w-3 h-3 rounded-full bg-red-500"></div>
                            <span class="text-sm text-gray-400">High (17 - 25)</span>
                        </div>
                    </div>
                </div>
            `;
            
            container2D.innerHTML = html;
            lucide.createIcons(); 
        };

        // --- INITIALIZATION ---
        
        
window.onload = async function () {
  // Hook up listeners that don’t depend on data content
  document.getElementById("mitigation-toggle")
    .addEventListener("change", (e) => toggleMitigationMode(e.target.checked));

  // If you prefer keeping these outside onload, that’s fine; doing it here is also safe.
  document.getElementById("exportBtn")
    .addEventListener("click", function () {
      const xKey = FIELD_MAP[currentXField];
      const yKey = FIELD_MAP[currentYField];

      const filteredData = data.filter(d => {
        if (d.Date !== currentDate) return false;
        const isXVisible = activeFilters[xKey]?.has(d[xKey]);
        const isYVisible = activeFilters[yKey]?.has(d[yKey]);
        const isSeverityVisible = activeSeverityFilters.has(d["Risk Level"]?.trim());
        return isXVisible && isYVisible && isSeverityVisible;
      });

      if (filteredData.length === 0) {
        alert("No data currently visible to export.");
        return;
      }

      const ws = XLSX.utils.json_to_sheet(filteredData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Filtered Results");

      const today = new Date();
      const formattedDate = today.toISOString().split("T")[0];
      XLSX.writeFile(wb, `subversion_risk_data_cao_${formattedDate}.xlsx`);
    });

  document.getElementById("resetBtn")
    .addEventListener("click", function () {
      const filterCheckboxes = document.querySelectorAll(
        "#severity-filters input[type='checkbox'], #dynamic-filters input[type='checkbox']"
      );

      filterCheckboxes.forEach(cb => {
        if (!cb.checked) {
          cb.checked = true;
          cb.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });

      const mitigationToggle = document.getElementById("mitigation-toggle");
      if (mitigationToggle && mitigationToggle.checked) {
        mitigationToggle.checked = false;
        mitigationToggle.dispatchEvent(new Event("change", { bubbles: true }));
      }

      // If no global updateVisualization, just re-render
      if (typeof updateVisualization === "function") updateVisualization();
      else renderChart();

      console.log("All filters restored to default.");
    });

  // Now load data and boot the app
  try {
    await loadDataFromJson();
    generateAxisControls();
    generateSeverityFilters();
    renderDynamicFilters();
    updateLegend();
    initThree();  // builds the 3D scene and calls renderChart()
  } catch (err) {
    console.error(err);
    alert("Failed to load data. Please check the JSON path and server settings.");
  }
};



    // 3. Reset the Mitigation Toggle specifically
    const mitigationToggle = document.getElementById('mitigation-toggle');
    if (mitigationToggle && mitigationToggle.checked) {
        mitigationToggle.checked = false;
        mitigationToggle.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // 4. If your 3D script has a global update function, call it once at the end
    if (typeof updateVisualization === 'function') {
        updateVisualization();
    }
    
    console.log("All filters restored to default.");



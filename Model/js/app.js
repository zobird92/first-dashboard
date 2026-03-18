const SPACING = 4;
const BAR_WIDTH = 2;
const BAR_DEPTH = 2;
const HEIGHT_SCALE = 1.0;
const PLANE_ELEVATION = 0;

let scene, camera, renderer, controls;
let chartGroup = new THREE.Group();
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let tooltip;
let intersectedObject = null;

const initThree = () => {
    const canvas = document.getElementById('visualization-canvas');
    tooltip = document.getElementById('tooltip');

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1c1c1c);

    camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.set(-30, 25, 30);
    camera.lookAt(10, 5, 10);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    scene.add(new THREE.AmbientLight(0xffffff, 0.4)); 
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8); 
    dirLight.position.set(20, 40, 20); 
    dirLight.castShadow = true;
    scene.add(dirLight);

    scene.add(chartGroup);

    renderChart();
    animate();

    window.addEventListener('resize', onWindowResize);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onMouseClick);
};

const onWindowResize = () => {
    const canvas = document.getElementById('visualization-canvas');
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
};

const onMouseMove = (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    
    // 1. Calculate precise coordinates
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    
    // 2. Intersect recursive
    const intersects = raycaster.intersectObjects(chartGroup.children, true);

    if (intersects.length > 0) {
        // Find the first object that actually has our data
        const hit = intersects.find(i => i.object.userData && i.object.userData.category);
        
        if (hit) {
            const object = hit.object;

            if (intersectedObject !== object) {
                // Reset old object
                if (intersectedObject && intersectedObject.material.emissive) {
                    intersectedObject.material.emissive.setHex(intersectedObject.currentHex);
                }

                intersectedObject = object;
                
                // Store and set new hover color
                if (intersectedObject.material.emissive) {
                    intersectedObject.currentHex = intersectedObject.material.emissive.getHex();
                    intersectedObject.material.emissive.setHex(0x333333);
                }
                
                // Update Tooltip
                tooltip.style.display = 'block';
                tooltip.innerHTML = `
                    <div class="bg-gray-900 text-white p-2 rounded border border-gray-700 text-xs shadow-xl">
                        <div class="font-bold text-indigo-400 mb-1">${object.userData.xVal} / ${object.userData.yVal}</div>
                        <div class="text-gray-300">${object.userData.category}</div>
                        <div>Count: ${object.userData.count}</div>
                        <div class="mt-1 border-t border-gray-700 pt-1 text-indigo-300">Avg Risk: ${object.userData.avgRisk}</div>
                    </div>
                `;
            }
            
            // Move tooltip with mouse
            tooltip.style.left = (event.clientX + 15) + 'px';
            tooltip.style.top = (event.clientY + 15) + 'px';
            return; // Exit early so we don't hit the "else" block
        }
    }

    // 3. Reset if nothing is hit
    if (intersectedObject && intersectedObject.material.emissive) {
        intersectedObject.material.emissive.setHex(intersectedObject.currentHex);
    }
    intersectedObject = null;
    tooltip.style.display = 'none';
};

const onMouseClick = (event) => {
    // 1. Refresh coordinates for the click position
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // 2. Update raycaster
    raycaster.setFromCamera(mouse, camera);
    
    // 3. Check for intersections (recursive)
    const intersects = raycaster.intersectObjects(chartGroup.children, true);

    if (intersects.length > 0) {
        // Find the specific segment with data
        const hit = intersects.find(i => i.object.userData && i.object.userData.xVal);
        
        if (hit) {
            const { xVal, yVal } = hit.object.userData;
            console.log(`Drilling down into: ${xVal} / ${yVal}`);

            // Set global keys for the drilldown view
            window.aggregationKeys = { xVal, yVal };
            
            const xK = FIELD_MAP[currentXField];
            const yK = FIELD_MAP[currentYField];

            // Filter data for the 2D drilldown table
            window.drilldownData = data.filter(d => 
                d.Date === currentDate &&
                String(d[xK]).trim() === xVal &&
                String(d[yK]).trim() === yVal &&
                activeSeverityFilters.has(d["Risk Level"]?.trim())
            );

            // Switch to your 2D Detail View
            if (typeof setViewMode === 'function') {
                setViewMode('2D');
            }
        }
    }
};

function getCategoricalColor(cat) {
    const colors = {
        "Watch List": 0x00FF00,
        "Risk Open": 0xFFA500,
        "Subverted - Risk Realized": 0xFF0000,
        "Mitigated": 0xFFFFFF,
        "Unmitigated": 0xEF4444
    };
    return colors[cat] || 0xCCCCCC;
}

window.renderChart = () => {
    while (chartGroup.children.length > 0) {
        const obj = chartGroup.children[0];
        chartGroup.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
    }

    // --- ADD THESE DATA DEFINITIONS ---
    const xK = FIELD_MAP[currentXField];
    const yK = FIELD_MAP[currentYField];

    const filtered = data.filter(d => 
        d.Date === currentDate && 
        activeFilters[xK]?.has(d[xK]) && 
        activeFilters[yK]?.has(d[yK]) &&
        activeSeverityFilters.has(d["Risk Level"]?.trim())
    );

    const xValues = Array.from(activeFilters[xK] || []).sort();
    const yValues = Array.from(activeFilters[yK] || []).sort();
    // ----------------------------------

    const grouped = filtered.reduce((acc, d) => {
        const xVal = String(d[xK] || "").trim();
        const yVal = String(d[yK] || "").trim();
        const key = `${xVal}||${yVal}`;
        
        if (!acc[key]) {
            acc[key] = { 
                count: 0, 
                scoreSum: 0, 
                levelCounts: { "Watch List": 0, "Risk Open": 0, "Subverted - Risk Realized": 0 },
                mitigationCounts: { "Mitigated": 0, "Unmitigated": 0 }
            };
        }
        
        acc[key].count++;
        acc[key].scoreSum += Number(d["Risk Score"] || 0);
        
        const level = d["Risk Level"]?.trim();
        if (acc[key].levelCounts[level] !== undefined) acc[key].levelCounts[level]++;
        
        const mitStatus = d["Mitigation Status"] === "Mitigated" ? "Mitigated" : "Unmitigated";
        acc[key].mitigationCounts[mitStatus]++;
        
        return acc;
    }, {});

    xValues.forEach((xVal, xi) => {
        yValues.forEach((yVal, yi) => {
            const entry = grouped[`${xVal}||${yVal}`];
            if (!entry) return;

            const averageScore = entry.scoreSum / entry.count;
            const totalVisualHeight = Math.round(averageScore) * HEIGHT_SCALE;

            const stackOrder = mitigationMode 
                ? ["Mitigated", "Unmitigated"] 
                : ["Watch List", "Risk Open", "Subverted - Risk Realized"];
            const countsObj = mitigationMode ? entry.mitigationCounts : entry.levelCounts;

            let currentYOffset = 0;

            stackOrder.forEach(category => {
                const count = countsObj[category];
                if (count === 0) return;

                const segmentHeight = (count / entry.count) * totalVisualHeight;
                const geometry = new THREE.BoxGeometry(BAR_WIDTH, segmentHeight, BAR_DEPTH);
                
                // FIXED: Only one material declaration needed
                const material = new THREE.MeshStandardMaterial({ 
                    color: getCategoricalColor(category),
                    roughness: 0.3,
                    metalness: 0.1
                });

                const segment = new THREE.Mesh(geometry, material);
                segment.position.set(xi * SPACING, currentYOffset + (segmentHeight / 2), yi * SPACING);
                
                segment.userData = { xVal, yVal, category, count, avgRisk: Math.round(averageScore) };
                chartGroup.add(segment);

                currentYOffset += segmentHeight;
            });
        });
    });

    // 1. Add Labels
    xValues.forEach((label, i) => createLabel(label, i * SPACING, 0, -5));
    yValues.forEach((label, i) => createLabel(label, -10, 0, i * SPACING));

    // 2. Solid Floor
    const xLen = (xValues.length - 1) * SPACING;
    const yLen = (yValues.length - 1) * SPACING;
    const planeGeom = new THREE.PlaneGeometry(xLen + SPACING * 4, yLen + SPACING * 4);
    const planeMat = new THREE.MeshStandardMaterial({ color: 0x262626 });
    const plane = new THREE.Mesh(planeGeom, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(xLen / 2, -0.05, yLen / 2);
    plane.receiveShadow = true;
    chartGroup.add(plane);

    // 3. Simple Grid Overlay
    const grid = new THREE.GridHelper(Math.max(xLen, yLen) + SPACING * 2, 10, 0x4B5563, 0x4B5563);
    grid.position.set(xLen / 2, -0.01, yLen / 2);
    chartGroup.add(grid);
};

const createLabel = (text, x, y, z) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128;
    ctx.fillStyle = 'white';
    ctx.font = 'Bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(10, 2.5, 1);
    sprite.position.set(x, y, z);
    chartGroup.add(sprite);
};

const animate = () => {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    renderer.render(scene, camera);
};

window.setViewMode = (mode) => {
    const v3d = document.getElementById('view-3d-container');
    const v2d = document.getElementById('view-2d-container');

    if (mode === '2D') {
        v3d.classList.add('hidden');
        v2d.classList.remove('hidden');
        drawHeatmap();
    } else {
        v2d.classList.add('hidden');
        v3d.classList.remove('hidden');
    }
};

function drawHeatmap() {
    const grid = document.getElementById('heatmap-grid');
    const point = document.getElementById('risk-point');
    const header = document.getElementById('drilldown-header');
    const summaryScore = document.getElementById('summary-score');
    const summaryCount = document.getElementById('summary-count');
    
    // 1. Set Header & Summary Data
    const { xVal, yVal } = window.aggregationKeys;
    header.textContent = `Drill-down: ${xVal} / ${yVal}`;
    
    const totalItems = window.drilldownData.length;
    const avgScore = totalItems > 0 
        ? window.drilldownData.reduce((sum, d) => sum + Number(d["Risk Score"] || 0), 0) / totalItems 
        : 0;

    summaryScore.textContent = Math.round(avgScore);
    summaryCount.textContent = totalItems;

    // 2. Generate the 5x5 Grid Cells
    // We loop 5 to 1 for rows to match the Y-axis (Severity) increasing upwards
    grid.innerHTML = '';
    for (let row = 5; row >= 1; row--) {
        for (let col = 1; col <= 5; col++) {
            const cell = document.createElement('div');
            // Using Tailwind for basic styling and borders
            cell.className = `flex items-center justify-center text-[10px] text-gray-500/50 border border-slate-800/50`;
            cell.textContent = `(${col},${row})`;
            
            // Background Logic: Replicating the heatmap risk zones
            if (row >= 4 && col >= 4) {
                cell.style.backgroundColor = '#451a1a'; // High Risk (Red zone)
            } else if ((row >= 3 && col >= 3) || (row >= 4) || (col >= 4)) {
                cell.style.backgroundColor = '#422006'; // Medium Risk (Orange/Brown zone)
            } else {
                cell.style.backgroundColor = '#064e3b'; // Low Risk (Green zone)
            }
            
            grid.appendChild(cell);
        }
    }

    // 3. Position the Risk Point (Red Dot)
    if (totalItems > 0) {
        // Calculate the average position within the 1-5 scale
        const avgX = window.drilldownData.reduce((sum, d) => sum + Number(d["Subversion Ease"] || 3), 0) / totalItems;
        const avgY = window.drilldownData.reduce((sum, d) => sum + Number(d["Severity"] || 3), 0) / totalItems;

        point.classList.remove('hidden');

        /* Math: Convert 1-5 scale to 0-100% 
           Position 1 = 0%, Position 5 = 100%
           Formula: ((Value - 1) / (Max - 1)) * 100
        */
        const xPercent = ((avgX - 1) / 4) * 100;
        const yPercent = ((avgY - 1) / 4) * 100;

        // Apply styles (Assumes #risk-point is absolute and inside a relative container)
        point.style.left = `${xPercent}%`;
        point.style.bottom = `${yPercent}%`;
        
        // Dynamic color based on score
        if (avgScore >= 17) point.style.backgroundColor = '#ef4444'; // Red
        else if (avgScore >= 9) point.style.backgroundColor = '#f59e0b'; // Amber
        else point.style.backgroundColor = '#10b981'; // Green
    } else {
        point.classList.add('hidden');
    }
}

function getSeverityClass(level) {
    const l = String(level).trim();
    if (l === 'Watch List') return 'bg-green-900/40 text-green-400 border border-green-700';
    if (l === 'Risk Open') return 'bg-orange-900/40 text-orange-400 border border-orange-700';
    if (l === 'Subverted - Risk Realized') return 'bg-red-900/40 text-red-400 border border-red-700';
    return 'bg-gray-700 text-gray-300';
}

window.addEventListener('load', async () => {
    try {
        await window.loadDataFromJson();
        const slider = document.getElementById('time-slider');
        if (slider) {
            slider.max = window.uniqueDates.length - 1;
            slider.value = 0;
            const display = document.getElementById('current-date-display');
            if (display) display.textContent = window.currentDate;
        }
        window.generateAxisControls();
        window.generateSeverityFilters();
        window.renderDynamicFilters();
        window.updateLegend();
        initThree();
        console.log("Dashboard initialized successfully.");
    } catch (err) {
        console.error("Critical Boot Error:", err);
    }
});
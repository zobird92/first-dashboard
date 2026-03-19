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

function createLabel(text, x, y, z) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512; 
    canvas.height = 128;

    ctx.fillStyle = 'white';
    ctx.font = 'Bold 36px Inter, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    
    // Positioned high enough to be visible above bars if needed
    sprite.position.set(x, 2, z); 
    sprite.scale.set(12, 3, 1);
    chartGroup.add(sprite);
}

const onWindowResize = () => {
    const canvas = document.getElementById('visualization-canvas');
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
};

const onMouseMove = (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(chartGroup.children, true);

    if (intersects.length > 0) {
        const hit = intersects.find(i => i.object.userData && i.object.userData.category);
        if (hit) {
            const object = hit.object;
            if (intersectedObject !== object) {
                if (intersectedObject && intersectedObject.material.emissive) {
                    intersectedObject.material.emissive.setHex(intersectedObject.currentHex);
                }
                intersectedObject = object;
                if (intersectedObject.material.emissive) {
                    intersectedObject.currentHex = intersectedObject.material.emissive.getHex();
                    intersectedObject.material.emissive.setHex(0x333333);
                }
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
            tooltip.style.left = (event.clientX + 15) + 'px';
            tooltip.style.top = (event.clientY + 15) + 'px';
            return;
        }
    }
    if (intersectedObject && intersectedObject.material.emissive) {
        intersectedObject.material.emissive.setHex(intersectedObject.currentHex);
    }
    intersectedObject = null;
    tooltip.style.display = 'none';
};

const animate = () => {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
};

const onMouseClick = (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    
    // We use 'true' to ensure the raycaster checks the bars inside the group
    const intersects = raycaster.intersectObjects(chartGroup.children, true);

    if (intersects.length > 0) {
        // Filter out the Grid and Plane. We only want objects with 'items' data.
        const hit = intersects.find(i => i.object.userData && i.object.userData.items);
        
        if (hit) {
            const bar = hit.object;
            
            // Set the global data for the 2D view
            window.drilldownData = bar.userData.items;
            window.aggregationKeys = { 
                xVal: bar.userData.xVal, 
                yVal: bar.userData.yVal 
            };
            
            console.log("Success: Bar detected at", bar.userData.xVal, bar.userData.yVal);
            
            // Trigger the view change
            if (typeof setViewMode === 'function') {
                setViewMode('2D');
            }
        } else {
            console.log("Raycaster hit an object, but it wasn't a data bar (likely floor/grid).");
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

    if (!window.data || window.data.length === 0) return;

    const xK = FIELD_MAP[currentXField];
    const yK = FIELD_MAP[currentYField];

    // Filter data based on current UI state
    const filtered = data.filter(d => 
        String(d.Date) === String(currentDate) && 
        activeFilters[xK]?.has(String(d[xK]).trim()) && 
        activeFilters[yK]?.has(String(d[yK]).trim()) &&
        activeSeverityFilters.has(d["Risk Level"]?.trim())
    );

    const xValues = Array.from(activeFilters[xK] || []).sort();
    const yValues = Array.from(activeFilters[yK] || []).sort();

    // Aggregate data into counts and score averages
    const grouped = filtered.reduce((acc, d) => {
        const xVal = String(d[xK] || "").trim();
        const yVal = String(d[yK] || "").trim();
        const key = `${xVal}||${yVal}`;
        
        if (!acc[key]) {
            acc[key] = { 
                count: 0, 
                scoreSum: 0, 
                items: [],
                levelCounts: { "Watch List": 0, "Risk Open": 0, "Subverted - Risk Realized": 0 },
                mitigationCounts: { "Mitigated": 0, "Unmitigated": 0 }
            };
        }
        
        acc[key].count++;
        acc[key].scoreSum += Number(d["Risk Score"] || 0);
        acc[key].items.push(d);
        
        const level = d["Risk Level"]?.trim();
        if (acc[key].levelCounts[level] !== undefined) acc[key].levelCounts[level]++;
        
        const mitStatus = d["Mitigation Status"] === "Mitigated" ? "Mitigated" : "Unmitigated";
        acc[key].mitigationCounts[mitStatus]++;
        
        return acc;
    }, {});

    // Create Bars
    xValues.forEach((xVal, xi) => {
        yValues.forEach((yVal, yi) => {
            const entry = grouped[`${xVal}||${yVal}`];
            if (!entry) return;

            // Height is derived from average score
            const totalVisualHeight = (entry.scoreSum / entry.count) * HEIGHT_SCALE;
            
            const stackOrder = mitigationMode 
                ? ["Mitigated", "Unmitigated"] 
                : ["Watch List", "Risk Open", "Subverted - Risk Realized"];
                
            const countsObj = mitigationMode ? entry.mitigationCounts : entry.levelCounts;
            let currentYOffset = 0;

            stackOrder.forEach(category => {
                const count = countsObj[category];
                if (count === 0) return;

                // Segment height is the fraction of total items in this X/Y coordinate
                const segmentHeight = (count / entry.count) * totalVisualHeight;
                
                const geometry = new THREE.BoxGeometry(BAR_WIDTH, segmentHeight, BAR_DEPTH);
                const material = new THREE.MeshStandardMaterial({ 
                    color: getCategoricalColor(category),
                    roughness: 0.3,
                    metalness: 0.1
                });

                const segment = new THREE.Mesh(geometry, material);
                
                // Stack position: currentOffset + half of current segment height
                segment.position.set(
                    xi * SPACING, 
                    currentYOffset + (segmentHeight / 2), 
                    yi * SPACING
                );
                
                segment.userData = { 
                    xVal, yVal, category, count, 
                    items: entry.items,
                    totalInBar: entry.count,
                    avgRisk: Math.round(entry.scoreSum / entry.count) 
                };
                
                segment.castShadow = true;
                segment.receiveShadow = true;
                chartGroup.add(segment);

                currentYOffset += segmentHeight;
            });
        });
    });

    // --- Labels & Grid Alignment ---
    xValues.forEach((label, i) => createLabel(label, i * SPACING, 0, -5));
    yValues.forEach((label, i) => createLabel(label, -10, 0, i * SPACING));

    const xLen = (xValues.length - 1) * SPACING;
    const yLen = (yValues.length - 1) * SPACING;

    const planeGeom = new THREE.PlaneGeometry(xLen + SPACING * 2, yLen + SPACING * 2);
    const planeMat = new THREE.MeshStandardMaterial({ color: 0x262626, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(planeGeom, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(xLen / 2, -0.05, yLen / 2);
    chartGroup.add(plane);

    const divisions = Math.max(1, xValues.length, yValues.length);
    const gridSize = Math.max(xLen, yLen) + SPACING;
    const grid = new THREE.GridHelper(gridSize, divisions, 0x4B5563, 0x4B5563);
    grid.position.set(xLen / 2, -0.01, yLen / 2);
    chartGroup.add(grid);
};

window.addEventListener('load', async () => {
    try {
        await window.loadDataFromJson();
        
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                controls.reset();
                camera.position.set(-30, 25, 30);
                camera.lookAt(10, 5, 10);
            });
        }

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
    } catch (err) {
        console.error("Critical Boot Error:", err);
    }
});
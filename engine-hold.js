// --- THREE.JS ENGINE & RENDERING ---

function initThree() {
    const canvas = document.getElementById('visualization-canvas');
    if (!canvas) return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0c); // Deep dark background

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(18, 18, 18);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ 
        canvas, 
        antialias: true,
        alpha: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 50;
    controls.minDistance = 5;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0x6366f1, 1.2); // Indigo tinted light
    mainLight.position.set(10, 20, 10);
    scene.add(mainLight);

    const fillLight = new THREE.PointLight(0xffffff, 0.5);
    fillLight.position.set(-10, -5, -10);
    scene.add(fillLight);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onMouseClick);
    window.addEventListener('resize', onWindowResize);
    
    animate();
    renderChart();
}

function renderChart() {
    if (!scene || viewMode !== '3d') return;

    // Clean up existing bars
    bars.forEach(bar => scene.remove(bar));
    bars = [];

    const currentDate = uniqueDates[currentDateIndex];
    if (!currentDate) return;

    // Filter data based on active filters and current date
    const filteredData = data.filter(d => {
        const dateMatch = d.Date === currentDate;
        const severityMatch = activeSeverityFilters.has(getRiskCategory(d['Risk Score']));
        
        let dynamicMatch = true;
        Object.keys(activeFilters).forEach(field => {
            if (activeFilters[field].size > 0 && !activeFilters[field].has(String(d[field]))) {
                dynamicMatch = false;
            }
        });

        return dateMatch && severityMatch && dynamicMatch;
    });

    const xKey = FIELD_MAP[currentXField];
    const yKey = FIELD_MAP[currentYField];
    
    // Aggregation Logic
    const aggregated = {};
    filteredData.forEach(d => {
        const key = `${d[xKey]}-${d[yKey]}`;
        if (!aggregated[key]) {
            aggregated[key] = {
                x: d[xKey],
                y: d[yKey],
                count: 0,
                totalScore: 0,
                items: []
            };
        }
        aggregated[key].count++;
        aggregated[key].totalScore += d['Risk Score'];
        aggregated[key].items.push(d);
    });

    // Create 3D Bars
    Object.values(aggregated).forEach(group => {
        const avgScore = group.totalScore / group.count;
        
        // Height logic changes if in Mitigation Mode
        const heightValue = mitigationMode 
            ? (group.items.reduce((sum, item) => sum + item['Mitigation Cost'], 0) / group.count) / 800 
            : avgScore / 2;

        const finalHeight = Math.max(0.2, heightValue); // Minimum visible height
        
        const geometry = new THREE.BoxGeometry(0.85, finalHeight, 0.85);
        const color = mitigationMode ? 0x10B981 : getRiskHexColor(avgScore);
        
        const material = new THREE.MeshPhongMaterial({
            color: color,
            transparent: true,
            opacity: 0.85,
            shininess: 100
        });
        
        const bar = new THREE.Mesh(geometry, material);
        
        // Center the grid around origin (adjusting for score range 1-5)
        bar.position.set(group.x - 3, finalHeight / 2, group.y - 3);
        bar.userData = { group, avgScore, type: 'bar' };
        
        scene.add(bar);
        bars.push(bar);
    });
}

function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    renderer.render(scene, camera);
}
// --- INTERACTION LOGIC ---

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

// --- INITIALIZATION TRIGGER ---

window.onload = async () => {
    try {
        await loadDataFromJson();
        
        // UI Initial State
        generateAxisControls();
        generateSeverityFilters();
        renderDynamicFilters();
        
        // Start 3D Engine
        initThree();
        
        // Hide loader if it exists
        const loader = document.getElementById('initial-loader');
        if (loader) loader.classList.add('fade-out');
        
    } catch (err) {
        console.error("Critical System Failure:", err);
    }
};
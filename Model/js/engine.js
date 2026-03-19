// --- THREE.JS GLOBALS ---
let scene, camera, renderer, controls, raycaster, mouse;
let bars = [];
let hoveredBar = null;

/**
 * Initializes the 3D environment with the exact parameters of the original.
 * Includes depth effects and interaction constraints.
 */
function initThree() {
    const canvas = document.getElementById('visualization-canvas');
    if (!canvas) return;

    // 1. Scene & Environment
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0c);
    // Restoration: Added Fog to give the grid a sense of infinite depth
    scene.fog = new THREE.Fog(0x0a0a0c, 20, 100);

    // 2. Camera Setup
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(22, 22, 22); // Restored original viewpoint
    camera.lookAt(0, 0, 0);

    // 3. Renderer Setup (High Performance Mode)
    renderer = new THREE.WebGLRenderer({ 
        canvas, 
        antialias: true, 
        alpha: true,
        powerPreference: "high-performance" 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 4. Controls (Restored constraints and smooth damping)
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 5;
    controls.maxDistance = 70;
    controls.maxPolarAngle = Math.PI / 2.1; // Prevents looking under the floor

    // 5. Lighting (Multi-point setup for 3D depth)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(10, 30, 10);
    mainLight.castShadow = false; 
    scene.add(mainLight);

    const blueFill = new THREE.PointLight(0x6366f1, 0.6);
    blueFill.position.set(-20, 10, -20);
    scene.add(blueFill);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // 6. Interaction Listeners
    window.addEventListener('resize', onWindowResize);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onCanvasClick); 

    animate();
}

/**
 * The Data-to-3D Mapping Engine.
 * This restores the full "Stacked Mesh" logic and coordinate preservation.
 */
function renderChart() {
    if (!scene) return;

    // A. Thorough Memory Cleanup
    bars.forEach(b => {
        scene.remove(b);
        if (b.geometry) b.geometry.dispose();
        if (b.material) {
            if (Array.isArray(b.material)) b.material.forEach(m => m.dispose());
            else b.material.dispose();
        }
    });
    bars = [];

    const aggregated = getAggregatedData();
    if (aggregated.length === 0) return;

    // B. Preserving Axis Labels (Ensures PF4 is always at the same X coordinate)
    const xLabels = [...new Set(data.map(d => d[currentXField]))].sort();
    const yLabels = [...new Set(data.map(d => d[currentYField]))].sort();

    const spacing = 5.0; // Restored original grid spacing
    const barSize = 2.0; // Restored original bar width

    aggregated.forEach(group => {
        const xIdx = xLabels.indexOf(group.x);
        const yIdx = yLabels.indexOf(group.y);
        
        const avgScore = group.totalScore / group.items.length;
        const totalHeight = Math.max(0.4, avgScore * 0.75);

        const posX = (xIdx - (xLabels.length - 1) / 2) * spacing;
        const posZ = (yIdx - (yLabels.length - 1) / 2) * spacing;

        // --- LAYER 1: THE CORE RISK BAR ---
        const geometry = new THREE.BoxGeometry(barSize, totalHeight, barSize);
        const material = new THREE.MeshPhongMaterial({
            color: getRiskHexColor(avgScore),
            transparent: true,
            opacity: 0.8,
            shininess: 90,
            specular: 0x444444
        });

        const bar = new THREE.Mesh(geometry, material);
        bar.position.set(posX, totalHeight / 2, posZ);

        // Metadata assignment for the UI system
        bar.userData = { 
            group: group, 
            avgScore: avgScore,
            type: 'data-bar'
        };

        scene.add(bar);
        bars.push(bar);

        // --- LAYER 2: MITIGATION STATUS OVERLAY ---
        if (mitigationMode) {
            const mitigatedItems = group.items.filter(i => i['Mitigation Status'] === 'Mitigated');
            const ratio = mitigatedItems.length / group.items.length;

            if (ratio > 0) {
                const mitHeight = totalHeight * ratio;
                // Slightly larger geometry to "shell" the original bar
                const mitGeo = new THREE.BoxGeometry(barSize + 0.15, mitHeight, barSize + 0.15);
                const mitMat = new THREE.MeshPhongMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.45,
                    emissive: 0xffffff,
                    emissiveIntensity: 0.2
                });

                const mitMesh = new THREE.Mesh(mitGeo, mitMat);
                mitMesh.position.set(posX, mitHeight / 2, posZ);
                mitMesh.userData = { isMitigationLayer: true }; 
                
                scene.add(mitMesh);
                bars.push(mitMesh);
            }
        }
    });

    // C. Restoring the Environmental Grid
    const grid = new THREE.GridHelper(120, 24, 0x312e81, 0x111111);
    grid.position.y = -0.01;
    scene.add(grid);
    bars.push(grid);
}

// --- INTERACTION LOGIC (RESTORING PICKING PRECISION) ---

function onMouseMove(event) {
    // Normalizing coordinates for the raycaster
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    
    // Explicitly only intersect with bars that have data (ignoring grid/mitigation layers)
    const targets = bars.filter(b => b.userData.type === 'data-bar');
    const intersects = raycaster.intersectObjects(targets);

    // Call the complex UI logic from js/ui.js
    if (typeof updateTooltip === "function") {
        updateTooltip(event, intersects);
    }
}

function onCanvasClick(event) {
    raycaster.setFromCamera(mouse, camera);
    const targets = bars.filter(b => b.userData.type === 'data-bar');
    const intersects = raycaster.intersectObjects(targets);

    if (intersects.length > 0) {
        const clicked = intersects[0].object;
        if (clicked.userData.group && typeof showDetailView === "function") {
            showDetailView(clicked.userData.group);
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    renderer.render(scene, camera);
}

function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Exporting functions for global access
window.renderChart = renderChart;
window.initThree = initThree;
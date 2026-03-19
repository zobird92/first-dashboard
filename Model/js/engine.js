// --- THREE.JS GLOBALS ---
// These variables manage the 3D scene state and must be accessible to the engine

let scene, camera, renderer, controls, raycaster, mouse;
let bars = [];
let hoveredBar = null;

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

    // Lighting Configuration
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0x6366f1, 1.2); // Indigo tinted light
    mainLight.position.set(10, 20, 10);
    scene.add(mainLight);

    const fillLight = new THREE.PointLight(0xffffff, 0.5);
    fillLight.position.set(-10, -5, -10);
    scene.add(fillLight);

    // Raycasting & Interaction Setup
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Event binding for interactions (handlers are in ui.js)
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
    
    // Aggregation Logic (Data Processing)
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

    // Create 3D Meshes (Bars)
    Object.values(aggregated).forEach(group => {
        const avgScore = group.totalScore / group.count;
        
        // Height logic: uses Risk Score or Mitigation Cost based on mode
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
        
        // Grid positioning (offset to center around origin)
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

// --- INITIALIZATION TRIGGER ---
// Orchestrates the data loading and engine startup

window.onload = async () => {
    try {
        await loadDataFromJson();
        
        // Initial UI Generation
        generateAxisControls();
        generateSeverityFilters();
        renderDynamicFilters();
        
        // Start 3D Engine
        initThree();
        
        // Handle loading screen
        const loader = document.getElementById('initial-loader');
        if (loader) loader.classList.add('fade-out');
        
    } catch (err) {
        console.error("Critical System Failure:", err);
    }
};

// --- THREE.JS ENGINE & RENDERING ---

/**
 * Initializes the Three.js environment: Scene, Camera, Renderer, and Lights.
 */
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

    // Lighting Configuration
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0x6366f1, 1.2); // Indigo tinted light
    mainLight.position.set(10, 20, 10);
    scene.add(mainLight);

    const fillLight = new THREE.PointLight(0xffffff, 0.5);
    fillLight.position.set(-10, -5, -10);
    scene.add(fillLight);

    // Raycasting Setup for Interactivity
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Event binding for viewport and interactions
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onMouseClick);
    window.addEventListener('resize', onWindowResize);
    
    animate();
    renderChart();
}

/**
 * Core rendering function that maps data to 3D meshes (bars).
 */
function renderChart() {
    if (!scene || viewMode !== '3d') return;

    // Clean up existing bars
    bars.forEach(bar => scene.remove(bar));
    bars = [];

    const currentDate = uniqueDates[currentDateIndex];
    if (!currentDate) return;

    // Filter data for the specific time frame and active filters
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
    
    // Aggregate data into grid positions
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

    // Create 3D Bars based on aggregated metrics
    Object.values(aggregated).forEach(group => {
        const avgScore = group.totalScore / group.count;
        
        // Height represents Risk or Mitigation Cost
        const heightValue = mitigationMode 
            ? (group.items.reduce((sum, item) => sum + item['Mitigation Cost'], 0) / group.count) / 800 
            : avgScore / 2;

        const finalHeight = Math.max(0.2, heightValue);
        
        const geometry = new THREE.BoxGeometry(0.85, finalHeight, 0.85);
        const color = mitigationMode ? 0x10B981 : getRiskHexColor(avgScore);
        
        const material = new THREE.MeshPhongMaterial({
            color: color,
            transparent: true,
            opacity: 0.85,
            shininess: 100
        });
        
        const bar = new THREE.Mesh(geometry, material);
        
        // Center the grid (offset by half of the 1-5 scale)
        bar.position.set(group.x - 3, finalHeight / 2, group.y - 3);
        bar.userData = { group, avgScore, type: 'bar' };
        
        scene.add(bar);
        bars.push(bar);
    });
}

/**
 * Standard Three.js animation frame loop
 */
function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    renderer.render(scene, camera);
}

// --- INTERACTION & VIEWPORT HANDLERS ---

function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- INITIALIZATION ENTRY POINT ---

window.onload = async () => {
    try {
        // Load data before starting the engine
        await loadDataFromJson();
        
        // Build initial UI state
        if (typeof generateAxisControls === "function") generateAxisControls();
        if (typeof generateSeverityFilters === "function") generateSeverityFilters();
        if (typeof renderDynamicFilters === "function") renderDynamicFilters();
        
        // Launch 3D scene
        initThree();
        
        const loader = document.getElementById('initial-loader');
        if (loader) loader.classList.add('fade-out');
    } catch (err) {
        console.error("System Launch Error:", err);
    }
};
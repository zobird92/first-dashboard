const SPACING = 4;
const BAR_WIDTH = 2;
const BAR_DEPTH = 2;
const HEIGHT_SCALE = 0.5;
const PLANE_ELEVATION = 0.5;

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
    camera.position.set(-22, 10, 12);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.shadowMap.enabled = true;

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
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(chartGroup.children);

    if (intersects.length > 0) {
        const object = intersects[0].object;
        if (intersectedObject !== object) {
            if (intersectedObject) intersectedObject.material.emissive.setHex(intersectedObject.currentHex);
            intersectedObject = object;
            intersectedObject.currentHex = intersectedObject.material.emissive.getHex();
            intersectedObject.material.emissive.setHex(0x444444);
            
            tooltip.style.display = 'block';
            tooltip.innerHTML = `
                <div class="bg-gray-900 text-white p-2 rounded border border-gray-700 text-xs shadow-xl">
                    <div class="font-bold text-indigo-400 mb-1">${object.userData.xVal} / ${object.userData.yVal}</div>
                    <div>Count: ${object.userData.count}</div>
                    <div>Avg Risk: ${object.userData.avgRisk}</div>
                </div>
            `;
        }
        tooltip.style.left = (event.clientX + 15) + 'px';
        tooltip.style.top = (event.clientY + 15) + 'px';
    } else {
        if (intersectedObject) intersectedObject.material.emissive.setHex(intersectedObject.currentHex);
        intersectedObject = null;
        tooltip.style.display = 'none';
    }
};

const onMouseClick = () => {
    if (intersectedObject) {
        const { xVal, yVal } = intersectedObject.userData;
        window.aggregationKeys = { xVal, yVal };
        
        const xK = FIELD_MAP[currentXField];
        const yK = FIELD_MAP[currentYField];

        window.drilldownData = data.filter(d => 
            d.Date === currentDate &&
            d[xK] === xVal &&
            d[yK] === yVal &&
            activeSeverityFilters.has(d["Risk Level"]?.trim())
        );

        setViewMode('2D');
    }
};

const renderChart = () => {
    while (chartGroup.children.length > 0) {
        const obj = chartGroup.children[0];
        chartGroup.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
    }

    const xK = FIELD_MAP[currentXField];
    const yK = FIELD_MAP[currentYField];

    const filtered = data.filter(d => 
        d.Date === currentDate && 
        activeFilters[xK]?.has(d[xK]) && 
        activeFilters[yK]?.has(d[yK]) &&
        activeSeverityFilters.has(d["Risk Level"]?.trim())
    );

    const xValues = Array.from(activeFilters[xK] || []);
    const yValues = Array.from(activeFilters[yK] || []);

    const grouped = filtered.reduce((acc, d) => {
        const key = `${d[xK]}||${d[yK]}`;
        if (!acc[key]) acc[key] = { count: 0, sumRisk: 0, items: [] };
        acc[key].count++;
        acc[key].sumRisk += Number(d["Risk Score"]);
        acc[key].items.push(d);
        return acc;
    }, {});

    xValues.forEach((xVal, xi) => {
        yValues.forEach((yVal, yi) => {
            const entry = grouped[`${xVal}||${yVal}`];
            if (!entry) return;

            const avgRisk = Math.round(entry.sumRisk / entry.count);
            const height = Math.max(entry.count * HEIGHT_SCALE, 0.5);

            let color;
            if (mitigationMode) {
                const unmitigated = entry.items.some(i => i["Mitigation Status"] === "Unmitigated");
                color = unmitigated ? 0xEF4444 : 0xFFFFFF;
            } else {
                if (avgRisk >= 15) color = 0xEF4444;      // Red
                else if (avgRisk >= 10) color = 0xF97316; // Orange
                else color = 0x22C55E;                    // Green
            }

            const geometry = new THREE.BoxGeometry(BAR_WIDTH, height, BAR_DEPTH);
            const material = new THREE.MeshStandardMaterial({ color: color, roughness: 0.3, metalness: 0.2 });
            const bar = new THREE.Mesh(geometry, material);

            bar.position.set(xi * SPACING, height / 2 + PLANE_ELEVATION, yi * SPACING);
            bar.castShadow = true;
            bar.receiveShadow = true;
            
            bar.userData = { xVal, yVal, count: entry.count, avgRisk };
            chartGroup.add(bar);
        });
    });

    addAxes(xValues, yValues);
};

const addAxes = (xLabels, yLabels) => {
    const gridColor = 0x4B5563;
    const xLen = (xLabels.length - 1) * SPACING;
    const yLen = (yLabels.length - 1) * SPACING;

    const planeGeom = new THREE.PlaneGeometry(xLen + SPACING, yLen + SPACING);
    const planeMat = new THREE.MeshStandardMaterial({ color: 0x262626, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(planeGeom, planeMat);
    plane.rotation.x = Math.PI / 2;
    plane.position.set(xLen / 2, 0, yLen / 2);
    plane.receiveShadow = true;
    chartGroup.add(plane);

    const grid = new THREE.GridHelper(Math.max(xLen, yLen) + SPACING, 10, gridColor, gridColor);
    grid.position.set(xLen / 2, 0.05, yLen / 2);
    chartGroup.add(grid);
};

const animate = () => {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
};

document.addEventListener('DOMContentLoaded', async () => {
    const exportBtn = document.getElementById("exportBtn");
    
    if (exportBtn) {
        exportBtn.addEventListener("click", function () {
            const xK = FIELD_MAP[currentXField];
            const yK = FIELD_MAP[currentYField];

            const filtered = data.filter(d => 
                d.Date === currentDate && 
                activeFilters[xK]?.has(d[xK]) && 
                activeFilters[yK]?.has(d[yK]) && 
                activeSeverityFilters.has(d["Risk Level"]?.trim())
            );

            if (filtered.length === 0) {
                alert("No data visible to export.");
                return;
            }

            const ws = XLSX.utils.json_to_sheet(filtered);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Filtered Results");
            XLSX.writeFile(wb, `subversion_risk_export_${new Date().toISOString().split("T")[0]}.xlsx`);
        });
    }

    const resetBtn = document.getElementById("resetBtn");
    if (resetBtn) {
        resetBtn.addEventListener("click", function () {
            document.querySelectorAll("#severity-filters input, #dynamic-filters input").forEach(cb => {
                if (!cb.checked) {
                    cb.checked = true;
                    cb.dispatchEvent(new Event("change", { bubbles: true }));
                }
            });

            const mt = document.getElementById("mitigation-toggle");
            if (mt && mt.checked) {
                mt.checked = false;
                mt.dispatchEvent(new Event("change", { bubbles: true }));
            }

            renderChart();
        });
    }

    try {
        await loadDataFromJson();
        generateAxisControls();
        generateSeverityFilters();
        renderDynamicFilters();
        updateLegend();
        initThree();
    } catch (err) {
        console.error("Initialization failed:", err);
    }

    window.onload = async () => {
        try {
            await loadDataFromJson(); // Must finish first
            generateAxisControls();   // Populates the UI
            generateSeverityFilters();
            renderDynamicFilters();
            updateLegend();
            initThree();              // Renders the 3D model
        } catch (err) {
            console.error("Initialization failed:", err);
        }
    };
});
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

    window.addEventListener('resize', onWindowResize, false);
    canvas.addEventListener('mousemove', onMouseMove, false);
    canvas.addEventListener('click', onBarClick, false);
};


const renderChart = () => {while (chartGroup.children.length > 0) {
    chartGroup.remove(chartGroup.children[0]);
    }

    document.getElementById('info-x-axis').textContent = currentXField;
    document.getElementById('info-y-axis').textContent = currentYField;

    const xKey = FIELD_MAP[currentXField];
    const yKey = FIELD_MAP[currentYField];

    const allXValues = [...new Set(data.map(d => d[xKey]))].sort();
    const allYValues = [...new Set(data.map(d => d[yKey]))].sort();

    const visibleXValues = allXValues.filter(v => activeFilters[xKey]?.has(v));
    const visibleYValues = allYValues.filter(v => activeFilters[yKey]?.has(v));

    if (visibleXValues.length === 0 || visibleYValues.length === 0) return;

    const xOffset = (visibleXValues.length * SPACING) / 2;
    const zOffset = (visibleYValues.length * SPACING) / 2;

    const aggregatedData = new Map();

    data.forEach(item => {
        if (item.Date !== currentDate) return;

        const xVal = item[xKey];
        const yVal = item[yKey];
        const currentLevel = item['Risk Level']?.trim();
        const mitStatus = item['Mitigation Status']?.trim();

        const currentScore = Number(item['Risk Score']) || 0;
        const cost = Number(item['Mitigation Cost']) || 0;

        if (!activeFilters[xKey]?.has(xVal) || !activeFilters[yKey]?.has(yVal) || !activeSeverityFilters.has(currentLevel)) {
            return;
        }

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
                mitigationCounts: {
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
        if (existing.mitigationCounts.hasOwnProperty(mitStatus)) {
            existing.mitigationCounts[mitStatus]++;
        }
    });

    const planeGeometry = new THREE.PlaneGeometry(
        visibleXValues.length * SPACING + SPACING * 1.5,
        visibleYValues.length * SPACING + SPACING * 1.5
    );
    const planeMaterial = new THREE.MeshPhongMaterial({ color: 0x202020, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -PLANE_ELEVATION;
    plane.receiveShadow = true;
    chartGroup.add(plane);

    const getCategoricalColor = (cat) => {
        if (mitigationMode) {
            return cat === "Mitigated" ? 0xFFFFFF : 0xEF4444;
        }
        switch (cat) {
            case "Subverted - Risk Realized": return 0xFF0000;
            case "Risk Open": return 0xFF7518;
            case "Watch List": return 0x32CD32;
            default: return 0x6b7280;
        }
    };

    aggregatedData.forEach((agg, key) => {
        const [xVal, yVal] = key.split('|');
        const xIdx = visibleXValues.indexOf(xVal);
        const yIdx = visibleYValues.indexOf(yVal);

        if (xIdx === -1 || yIdx === -1) return;

        const avgScore = agg.count > 0 ? (agg.scoreSum / agg.count) : 0;
        const roundedAvg = Math.round(avgScore);
        const totalH = roundedAvg * HEIGHT_SCALE;

        const posX = (xIdx * SPACING) - xOffset + (SPACING / 2);
        const posZ = (yIdx * SPACING) - zOffset + (SPACING / 2);

        let stack = mitigationMode 
            ? ["Mitigated", "Unmitigated"] 
            : ["Watch List", "Risk Open", "Subverted - Risk Realized"];
                
        let counts = mitigationMode ? agg.mitigationCounts : agg.levelCounts;
        let curY = -PLANE_ELEVATION;

        stack.forEach(cat => {
            const count = counts[cat];
            if (count === 0) return;

            const segH = (count / agg.count) * totalH;
            const segGeom = new THREE.BoxGeometry(BAR_WIDTH, segH, BAR_DEPTH);
            const segMat = new THREE.MeshStandardMaterial({
                color: getCategoricalColor(cat),
                roughness: 0.3,
                metalness: 0.1
            });

            const segMesh = new THREE.Mesh(segGeom, segMat);
            segMesh.position.set(posX, curY + (segH / 2), posZ);
            segMesh.userData = {
                xKey, yKey, xVal, yVal,
                avgRiskScore: roundedAvg,
                totalCount: agg.count,
                totalCost: agg.totalCost,
                items: agg.items,
                isBar: true
            };

            segMesh.castShadow = true;
            segMesh.receiveShadow = true;
            chartGroup.add(segMesh);

            curY += segH;
        });
    });

    visibleXValues.forEach((val, i) => {
        const l = makeTextSprite(val);
        l.position.set((i * SPACING) - xOffset + (SPACING / 2), 0.5 + PLANE_ELEVATION, zOffset + 2);
        chartGroup.add(l);
    });

    visibleYValues.forEach((val, i) => {
        const l = makeTextSprite(val);
        l.position.set(-xOffset - 2, 0.5 + PLANE_ELEVATION, (i * SPACING) - zOffset + (SPACING / 2));
        chartGroup.add(l);
    });

    controls.target.set(0, 0, 0);
    controls.update();
};

const animate = () => {
    if (viewMode === '3D') {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
};

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

const onBarClick = () => {
    if (viewMode !== '3D') return;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(chartGroup.children.filter(obj => obj.userData.isBar), false);

    if (intersects.length > 0) {
        const b = intersects[0].object.userData;
        drilldownData = b.items;
        aggregationKeys = {
            xKey: b.xKey,
            yKey: b.yKey,
            xVal: b.xVal,
            yVal: b.yVal
        };
        setViewMode('2D');
        if (tooltip) tooltip.style.display = 'none';
    }
};

window.onload = async function () {
    document.getElementById("mitigation-toggle").addEventListener("change", (e) => toggleMitigationMode(e.target.checked));

    document.getElementById("exportBtn").addEventListener("click", function () {
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

    document.getElementById("resetBtn").addEventListener("click", function () {
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

    try {
        await loadDataFromJson();
        generateAxisControls();
        generateSeverityFilters();
        renderDynamicFilters();
        updateLegend();
        initThree();
    } catch (err) {
        console.error(err);
        alert("Failed to load data.");
    }
};
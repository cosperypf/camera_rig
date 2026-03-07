/**
 * UI Controller
 */

class UIController {
    constructor(visualizer, parser) {
        this.visualizer = visualizer;
        this.parser = parser;
        this.virtualDevices = [];
        
        this.init();
    }

    init() {
        this.setupFileUpload();
        this.setupExport();
        this.setupControls();
        this.setupAddDevice();
        this.setupEditDevice();
        this.setupCameraInfo();
    }

    setupFileUpload() {
        const fileInput = document.getElementById('fileInput');
        const uploadBtn = document.getElementById('uploadBtn');
        
        uploadBtn.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.loadFile(file);
            }
        });
    }

    loadFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const rigData = this.parser.parse(e.target.result);
                this.visualizer.loadRig(rigData);
                this.visualizer.saveInitialView();
                this.virtualDevices = [...rigData.virtualDevices];
                this.updateDeviceList();
                this.updateEditSelect();
                
                document.getElementById('canvas-container').classList.add('has-data');
                
                console.log('Loaded:', rigData.cameras.length, 'cameras');
            } catch (err) {
                alert('Failed to parse XML: ' + err.message);
            }
        };
        reader.readAsText(file);
    }

    setupExport() {
        const exportBtn = document.getElementById('exportBtn');
        
        exportBtn.addEventListener('click', () => {
            const devices = this.visualizer.getAllDevices();
            const exporter = new CameraRigExporter();
            const xmlString = exporter.exportXML(devices);
            
            const blob = new Blob([xmlString], { type: 'text/xml' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'device_calibration_export.xml';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    setupControls() {
        const showFrustum = document.getElementById('showFrustum');
        const worldOnly = document.getElementById('worldOnly');
        const showCoords = document.getElementById('showCoords');
        const resetView = document.getElementById('resetView');
        
        showFrustum.addEventListener('change', (e) => {
            this.visualizer.setShowFrustum(e.target.checked);
        });
        
        worldOnly.addEventListener('change', (e) => {
            this.visualizer.setWorldOnly(e.target.checked);
        });
        
        showCoords.addEventListener('change', (e) => {
            this.visualizer.setShowCoordinates(e.target.checked);
        });
        
        resetView.addEventListener('click', () => {
            this.visualizer.resetView();
        });
    }

    setupAddDevice() {
        const deviceType = document.getElementById('deviceType');
        const cameraParams = document.getElementById('cameraParams');
        
        deviceType.addEventListener('change', () => {
            cameraParams.style.display = deviceType.value === 'camera' ? 'block' : 'none';
        });
        
        const addBtn = document.getElementById('addDevice');
        
        addBtn.addEventListener('click', () => {
            const name = document.getElementById('deviceName').value.trim();
            const type = document.getElementById('deviceType').value;
            const transX = parseFloat(document.getElementById('transX').value) || 0;
            const transY = parseFloat(document.getElementById('transY').value) || 0;
            const transZ = parseFloat(document.getElementById('transZ').value) || 0;
            const rotRoll = parseFloat(document.getElementById('rotRoll').value) || 0;
            const rotPitch = parseFloat(document.getElementById('rotPitch').value) || 0;
            const rotYaw = parseFloat(document.getElementById('rotYaw').value) || 0;
            
            if (!name) {
                alert('Please enter a device name');
                return;
            }
            
            const rotation = this.parser.eulerToRotationMatrix(rotRoll, rotPitch, rotYaw);
            
            const device = {
                name: name,
                type: type,
                translation: [transX, transY, transZ],
                rotation: rotation
            };
            
            if (type === 'camera') {
                const focalX = parseFloat(document.getElementById('focalX').value) || 200;
                const focalY = parseFloat(document.getElementById('focalY').value) || 200;
                const principalX = parseFloat(document.getElementById('principalX').value) || 320;
                const principalY = parseFloat(document.getElementById('principalY').value) || 240;
                const width = parseInt(document.getElementById('imgWidth').value) || 640;
                const height = parseInt(document.getElementById('imgHeight').value) || 480;
                
                device.focalLength = [focalX, focalY];
                device.principalPoint = [principalX, principalY];
                device.width = width;
                device.height = height;
            }
            
            this.visualizer.addVirtualDevice(device);
            this.virtualDevices.push(device);
            this.updateDeviceList();
            this.updateEditSelect();
            
            document.getElementById('deviceName').value = '';
            document.getElementById('transX').value = '0';
            document.getElementById('transY').value = '0';
            document.getElementById('transZ').value = '0';
            document.getElementById('rotRoll').value = '0';
            document.getElementById('rotPitch').value = '0';
            document.getElementById('rotYaw').value = '0';
        });
    }

    setupEditDevice() {
        const editDeviceType = document.getElementById('editDeviceType');
        const editCameraParams = document.getElementById('editCameraParams');
        
        editDeviceType.addEventListener('change', () => {
            editCameraParams.style.display = editDeviceType.value === 'camera' ? 'block' : 'none';
        });
        
        const editSelect = document.getElementById('editDeviceSelect');
        
        editSelect.addEventListener('change', (e) => {
            const name = e.target.value;
            if (name) {
                this.loadDeviceForEdit(name);
            } else {
                this.clearEditForm();
            }
        });
        
        const updateBtn = document.getElementById('updateDevice');
        updateBtn.addEventListener('click', () => {
            const name = document.getElementById('editDeviceSelect').value;
            if (!name) {
                alert('Please select a device to update');
                return;
            }
            
            const type = document.getElementById('editDeviceType').value;
            const transX = parseFloat(document.getElementById('editTransX').value) || 0;
            const transY = parseFloat(document.getElementById('editTransY').value) || 0;
            const transZ = parseFloat(document.getElementById('editTransZ').value) || 0;
            const rotRoll = parseFloat(document.getElementById('editRotRoll').value) || 0;
            const rotPitch = parseFloat(document.getElementById('editRotPitch').value) || 0;
            const rotYaw = parseFloat(document.getElementById('editRotYaw').value) || 0;
            
            const rotation = this.parser.eulerToRotationMatrix(rotRoll, rotPitch, rotYaw);
            
            const newData = {
                type: type,
                translation: [transX, transY, transZ],
                rotation: rotation
            };
            
            if (type === 'camera') {
                const focalX = parseFloat(document.getElementById('editFocalX').value) || 200;
                const focalY = parseFloat(document.getElementById('editFocalY').value) || 200;
                const principalX = parseFloat(document.getElementById('editPrincipalX').value) || 320;
                const principalY = parseFloat(document.getElementById('editPrincipalY').value) || 240;
                const width = parseInt(document.getElementById('editImgWidth').value) || 640;
                const height = parseInt(document.getElementById('editImgHeight').value) || 480;
                
                newData.focalLength = [focalX, focalY];
                newData.principalPoint = [principalX, principalY];
                newData.width = width;
                newData.height = height;
            }
            
            if (this.visualizer.updateVirtualDevice(name, newData)) {
                const idx = this.virtualDevices.findIndex(d => d.name === name);
                if (idx >= 0) {
                    this.virtualDevices[idx] = { name, ...newData };
                }
                this.updateDeviceList();
                this.updateEditSelect();
            }
        });
    }

    loadDeviceForEdit(name) {
        const device = this.virtualDevices.find(d => d.name === name);
        if (!device) return;
        
        document.getElementById('editDeviceType').value = device.type;
        document.getElementById('editCameraParams').style.display = device.type === 'camera' ? 'block' : 'none';
        
        document.getElementById('editTransX').value = device.translation[0].toFixed(3);
        document.getElementById('editTransY').value = device.translation[1].toFixed(3);
        document.getElementById('editTransZ').value = device.translation[2].toFixed(3);
        
        const euler = this.rotationMatrixToEuler(device.rotation);
        document.getElementById('editRotRoll').value = euler[0].toFixed(1);
        document.getElementById('editRotPitch').value = euler[1].toFixed(1);
        document.getElementById('editRotYaw').value = euler[2].toFixed(1);
        
        if (device.type === 'camera') {
            document.getElementById('editFocalX').value = device.focalLength ? device.focalLength[0] : 200;
            document.getElementById('editFocalY').value = device.focalLength ? device.focalLength[1] : 200;
            document.getElementById('editPrincipalX').value = device.principalPoint ? device.principalPoint[0] : 320;
            document.getElementById('editPrincipalY').value = device.principalPoint ? device.principalPoint[1] : 240;
            document.getElementById('editImgWidth').value = device.width || 640;
            document.getElementById('editImgHeight').value = device.height || 480;
        }
    }

    rotationMatrixToEuler(R) {
        const sy = Math.sqrt(R[0][0] * R[0][0] + R[1][0] * R[1][0]);
        let roll, pitch, yaw;
        
        if (sy > 1e-6) {
            roll = Math.atan2(R[2][1], R[2][2]);
            pitch = Math.atan2(-R[2][0], sy);
            yaw = Math.atan2(R[1][0], R[0][0]);
        } else {
            roll = Math.atan2(-R[1][2], R[1][1]);
            pitch = Math.atan2(-R[2][0], sy);
            yaw = 0;
        }
        
        return [roll * 180 / Math.PI, pitch * 180 / Math.PI, yaw * 180 / Math.PI];
    }

    clearEditForm() {
        document.getElementById('editDeviceType').value = 'axis_only';
        document.getElementById('editCameraParams').style.display = 'none';
        document.getElementById('editTransX').value = '0';
        document.getElementById('editTransY').value = '0';
        document.getElementById('editTransZ').value = '0';
        document.getElementById('editRotRoll').value = '0';
        document.getElementById('editRotPitch').value = '0';
        document.getElementById('editRotYaw').value = '0';
    }

    updateDeviceList() {
        const list = document.getElementById('deviceList');
        list.innerHTML = '';
        
        this.virtualDevices.forEach((device) => {
            const item = document.createElement('div');
            item.className = 'device-item';
            item.innerHTML = `
                <span>${device.name} (${device.type})</span>
                <button data-name="${device.name}" class="delete-btn">×</button>
            `;
            list.appendChild(item);
        });
        
        list.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const name = e.target.dataset.name;
                this.removeDevice(name);
            });
        });
    }

    updateEditSelect() {
        const select = document.getElementById('editDeviceSelect');
        select.innerHTML = '<option value="">-- Select --</option>';
        
        this.virtualDevices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.name;
            option.textContent = device.name;
            select.appendChild(option);
        });
    }

    removeDevice(name) {
        if (confirm(`Delete device "${name}"?`)) {
            if (this.visualizer.removeVirtualDevice(name)) {
                const idx = this.virtualDevices.findIndex(d => d.name === name);
                if (idx >= 0) {
                    this.virtualDevices.splice(idx, 1);
                }
                this.updateDeviceList();
                this.updateEditSelect();
                
                if (document.getElementById('editDeviceSelect').value === name) {
                    document.getElementById('editDeviceSelect').value = '';
                    this.clearEditForm();
                }
            }
        }
    }

    setupCameraInfo() {
        document.addEventListener('cameraSelected', (e) => {
            const { name, data } = e.detail;
            this.showCameraInfo(name, data);
        });
        
        const clearBtn = document.getElementById('clearSelection');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.visualizer.clearSelection();
                document.getElementById('cameraInfoPanel').style.display = 'none';
            });
        }
    }

    showCameraInfo(name, data) {
        const panel = document.getElementById('cameraInfoPanel');
        if (!panel) return;
        
        document.getElementById('selectedCameraName').textContent = name;
        document.getElementById('cameraModel').textContent = data.model || data.type || 'N/A';
        
        const pos = data.translation || [0, 0, 0];
        document.getElementById('cameraPosition').textContent = 
            `X: ${pos[0].toFixed(6)}, Y: ${pos[1].toFixed(6)}, Z: ${pos[2].toFixed(6)}`;
        
        if (data.rotation) {
            const rot = data.rotation;
            let rotText = '';
            if (Array.isArray(rot[0])) {
                rotText = rot.map(row => row.map(v => v.toFixed(4)).join(' ')).join('<br>');
            }
            document.getElementById('cameraRotation').innerHTML = rotText || 'N/A';
        }
        
        if (data.focalLength) {
            document.getElementById('cameraFocal').textContent = 
                `fx=${data.focalLength[0]}, fy=${data.focalLength[1]}`;
        }
        
        if (data.principalPoint) {
            document.getElementById('cameraPrincipal').textContent = 
                `cx=${data.principalPoint[0]}, cy=${data.principalPoint[1]}`;
        }
        
        if (data.width && data.height) {
            document.getElementById('cameraResolution').textContent = 
                `${data.width} x ${data.height}`;
        }
        
        if (data.focalLength && data.width && data.height) {
            const fovH = 2 * Math.atan(data.width / (2 * data.focalLength[0])) * 180 / Math.PI;
            const fovV = 2 * Math.atan(data.height / (2 * data.focalLength[1])) * 180 / Math.PI;
            document.getElementById('cameraFovH').textContent = fovH.toFixed(2) + '°';
            document.getElementById('cameraFovV').textContent = fovV.toFixed(2) + '°';
        }
        
        panel.style.display = 'block';
    }
}

window.UIController = UIController;

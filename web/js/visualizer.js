/**
 * Three.js Visualizer for Camera Rig
 */

class CameraRigVisualizer {
    constructor(container) {
        this.container = container;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xfafafa);
        
        this.camera = new THREE.PerspectiveCamera(
            60,
            container.clientWidth / container.clientHeight,
            0.001,
            1000
        );
        this.camera.position.set(0, 0.15, 0.15);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(this.renderer.domElement);
        
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 0.05;
        this.controls.maxDistance = 2;
        this.controls.target.set(0, 0, 0);
        this.controls.update();
        
        this.initialView = {
            position: this.camera.position.clone(),
            target: this.controls.target.clone()
        };
        
        this.cameras = [];
        this.imu = null;
        this.virtualDevices = [];
        
        this.showFrustum = true;
        this.showWorldOnly = false;
        this.showCoordinates = false;
        
        this.cameraHelpers = new Map();
        this.frustumHelpers = new Map();
        this.cameraLabels = new Map();
        this.cameraPoints = new Map();
        this.coordLabels = new Map();
        this.coordTexts = new Map();
        
        this.setupLights();
        this.setupWorldAxes();
        this.setupResize();
        
        this.animate();
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(directionalLight);
    }

    setupWorldAxes() {
        const origin = new THREE.Vector3(0, 0, 0);
        const length = 0.05;
        
        const arrowX = new THREE.ArrowHelper(
            new THREE.Vector3(0, 0, 1), origin, length, 0xff0000, 0.015, 0.01
        );
        const arrowY = new THREE.ArrowHelper(
            new THREE.Vector3(-1, 0, 0), origin, length, 0x00ff00, 0.015, 0.01
        );
        const arrowZ = new THREE.ArrowHelper(
            new THREE.Vector3(0, -1, 0), origin, length, 0x0000ff, 0.015, 0.01
        );
        
        this.worldAxes = [arrowX, arrowY, arrowZ];
        this.worldAxes.forEach(ax => this.scene.add(ax));
        
        const originGeom = new THREE.SphereGeometry(0.003, 16, 16);
        const originMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        this.worldOrigin = new THREE.Mesh(originGeom, originMat);
        this.scene.add(this.worldOrigin);
        
        this.addLabel('World Origin', new THREE.Vector3(0.008, 0, 0), 'black');
    }

    createTextSprite(text, color = '#333333', fontSize = 32) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;
        
        context.font = `bold ${fontSize}px Arial`;
        context.fillStyle = color;
        context.textAlign = 'center';
        context.fillText(text, 256, 80);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(0.04, 0.01, 1);
        
        return sprite;
    }

    addLabel(text, position, color) {
        const sprite = this.createTextSprite(text, color);
        sprite.position.copy(position);
        this.scene.add(sprite);
        return sprite;
    }

    addCoordSprite(text, position) {
        const sprite = this.createTextSprite(text, '#666666', 24);
        sprite.position.copy(position);
        sprite.scale.set(0.035, 0.00875, 1);
        this.scene.add(sprite);
        return sprite;
    }

    setupResize() {
        window.addEventListener('resize', () => {
            this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        });
    }

    loadRig(rigData) {
        this.clearRig();
        
        this.cameras = rigData.cameras || [];
        this.imu = rigData.imu || null;
        this.virtualDevices = rigData.virtualDevices || [];
        
        this.cameras.forEach(cam => this.addCamera(cam));
        
        if (this.imu) {
            this.addIMU(this.imu);
        }
        
        this.virtualDevices.forEach(device => this.addVirtualDevice(device));
        
        this.updateVisibility();
    }

    clearRig() {
        this.cameraHelpers.forEach((helper, name) => {
            this.scene.remove(helper);
        });
        
        this.frustumHelpers.forEach((frustum, name) => {
            this.scene.remove(frustum);
        });
        
        this.cameraLabels.forEach((label, name) => {
            this.scene.remove(label);
        });
        
        this.cameraPoints.forEach((point, name) => {
            this.scene.remove(point);
        });
        
        this.coordLabels.forEach((label, name) => {
            this.scene.remove(label);
        });
        
        if (this.imuHelper) {
            this.scene.remove(this.imuHelper);
            this.imuHelper = null;
        }
        
        if (this.imuLabel) {
            this.scene.remove(this.imuLabel);
            this.imuLabel = null;
        }
        
        this.cameraHelpers.clear();
        this.frustumHelpers.clear();
        this.cameraLabels.clear();
        this.cameraPoints.clear();
        this.coordLabels.clear();
        this.coordTexts.clear();
    }

    addCamera(camera) {
        const position = new THREE.Vector3(...camera.translation);
        
        const helper = new THREE.Group();
        helper.position.copy(position);
        helper.userData = { isVirtual: false };
        
        const axesLength = 0.022;
        const axesHelper = new THREE.AxesHelper(axesLength);
        helper.add(axesHelper);
        
        const pointColor = camera.model.startsWith('FISHEYE') ? 0xffa500 : 0x1e90ff;
        const pointGeom = new THREE.SphereGeometry(0.003, 16, 16);
        const pointMat = new THREE.MeshBasicMaterial({ color: pointColor });
        const point = new THREE.Mesh(pointGeom, pointMat);
        helper.add(point);
        
        this.scene.add(helper);
        this.cameraHelpers.set(camera.name, helper);
        this.cameraPoints.set(camera.name, point);
        
        const labelPos = new THREE.Vector3(position.x, position.y + 0.012, position.z);
        const label = this.addLabel(camera.name, labelPos, pointColor === 0xffa500 ? '#ff6600' : '#0066cc');
        this.cameraLabels.set(camera.name, label);
        
        const coordText = `(X:${position.x.toFixed(3)} Y:${position.y.toFixed(3)} Z:${position.z.toFixed(3)})`;
        const coordPos = new THREE.Vector3(position.x, position.y - 0.015, position.z);
        const coordSprite = this.addCoordSprite(coordText, coordPos);
        this.coordLabels.set(camera.name, coordSprite);
        this.coordTexts.set(camera.name, coordText);
        
        this.addFrustum(camera);
    }

    addFrustum(camera) {
        const frustum = new THREE.Group();
        
        const position = new THREE.Vector3(...camera.translation);
        const rotation = camera.rotation;
        
        const fx = camera.focalLength[0];
        const fy = camera.focalLength[1];
        const width = camera.width;
        const height = camera.height;
        
        let fovH, fovV;
        if (camera.model.startsWith('FISHEYE')) {
            fovH = 2 * Math.atan(width / (2 * fx));
            fovV = 2 * Math.atan(height / (2 * fy));
        } else {
            fovH = 2 * Math.atan(width / (2 * fx));
            fovV = 2 * Math.atan(height / (2 * fy));
        }
        
        fovH = Math.min(fovH, Math.PI * 0.8);
        fovV = Math.min(fovV, Math.PI * 0.8);
        
        const distance = 0.05;
        const halfW = distance * Math.tan(fovH / 2);
        const halfH = distance * Math.tan(fovV / 2);
        
        const corners = [
            [-halfW, -halfH, -distance],
            [halfW, -halfH, -distance],
            [halfW, halfH, -distance],
            [-halfW, halfH, -distance]
        ].map(c => {
            const x = rotation[0][0]*c[0] + rotation[0][1]*c[1] + rotation[0][2]*c[2];
            const y = rotation[1][0]*c[0] + rotation[1][1]*c[1] + rotation[1][2]*c[2];
            const z = rotation[2][0]*c[0] + rotation[2][1]*c[1] + rotation[2][2]*c[2];
            return new THREE.Vector3(
                position.x + x,
                position.y + y,
                position.z + z
            );
        });
        
        const material = new THREE.LineBasicMaterial({
            color: camera.model.startsWith('FISHEYE') ? 0xffa500 : 0x1e90ff,
            opacity: 0.6,
            transparent: true
        });
        
        corners.forEach(corner => {
            const points = [position, corner];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, material);
            frustum.add(line);
        });
        
        for (let i = 0; i < 4; i++) {
            const geometry = new THREE.BufferGeometry().setFromPoints([corners[i], corners[(i+1)%4]]);
            const line = new THREE.Line(geometry, material);
            frustum.add(line);
        }
        
        this.scene.add(frustum);
        this.frustumHelpers.set(camera.name, frustum);
    }

    addIMU(imu) {
        const position = new THREE.Vector3(...imu.translation);
        
        const helper = new THREE.Group();
        helper.position.copy(position);
        helper.userData = { isVirtual: false, isIMU: true };
        
        const axesLength = 0.022;
        const axesHelper = new THREE.AxesHelper(axesLength);
        helper.add(axesHelper);
        
        const pointGeom = new THREE.ConeGeometry(0.004, 0.008, 8);
        const pointMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        const point = new THREE.Mesh(pointGeom, pointMat);
        helper.add(point);
        
        this.scene.add(helper);
        this.imuHelper = helper;
        this.cameraPoints.set('IMU', point);
        
        const labelPos = new THREE.Vector3(position.x, position.y + 0.012, position.z);
        this.imuLabel = this.addLabel('IMU', labelPos, '#009999');
        this.cameraLabels.set('IMU', this.imuLabel);
        
        const coordText = `(X:${position.x.toFixed(3)} Y:${position.y.toFixed(3)} Z:${position.z.toFixed(3)})`;
        const coordPos = new THREE.Vector3(position.x, position.y - 0.015, position.z);
        const coordSprite = this.addCoordSprite(coordText, coordPos);
        this.coordLabels.set('IMU', coordSprite);
        this.coordTexts.set('IMU', coordText);
    }

    addVirtualDevice(device) {
        const position = new THREE.Vector3(...device.translation);
        
        const helper = new THREE.Group();
        helper.position.copy(position);
        helper.userData = { isVirtual: true, type: device.type };
        
        const axesLength = 0.022;
        const axesHelper = new THREE.AxesHelper(axesLength);
        helper.add(axesHelper);
        
        if (device.type === 'camera') {
            const pointGeom = new THREE.SphereGeometry(0.003, 16, 16);
            const pointMat = new THREE.MeshBasicMaterial({ color: 0x800080 });
            const point = new THREE.Mesh(pointGeom, pointMat);
            helper.add(point);
            this.cameraPoints.set(device.name, point);
        }
        
        this.scene.add(helper);
        this.cameraHelpers.set(device.name, helper);
        
        const labelPos = new THREE.Vector3(position.x, position.y + 0.012, position.z);
        const label = this.addLabel(device.name, labelPos, '#660099');
        this.cameraLabels.set(device.name, label);
        
        const coordText = `(X:${position.x.toFixed(3)} Y:${position.y.toFixed(3)} Z:${position.z.toFixed(3)})`;
        const coordPos = new THREE.Vector3(position.x, position.y - 0.015, position.z);
        const coordSprite = this.addCoordSprite(coordText, coordPos);
        this.coordLabels.set(device.name, coordSprite);
        this.coordTexts.set(device.name, coordText);
        
        if (device.type === 'camera') {
            const virtualCamera = {
                name: device.name,
                focalLength: device.focalLength || [200, 200],
                principalPoint: device.principalPoint || [320, 240],
                width: device.width || 640,
                height: device.height || 480,
                model: 'PINHOLE',
                translation: device.translation,
                rotation: device.rotation
            };
            this.addFrustum(virtualCamera);
        }
    }

    removeVirtualDevice(name) {
        const helper = this.cameraHelpers.get(name);
        if (helper && helper.userData.isVirtual) {
            this.scene.remove(helper);
            this.cameraHelpers.delete(name);
            
            const label = this.cameraLabels.get(name);
            if (label) {
                this.scene.remove(label);
                this.cameraLabels.delete(name);
            }
            
            const point = this.cameraPoints.get(name);
            if (point) {
                this.scene.remove(point);
                this.cameraPoints.delete(name);
            }
            
            const coordLabel = this.coordLabels.get(name);
            if (coordLabel) {
                this.scene.remove(coordLabel);
                this.coordLabels.delete(name);
            }
            
            const frustum = this.frustumHelpers.get(name);
            if (frustum) {
                this.scene.remove(frustum);
                this.frustumHelpers.delete(name);
            }
            
            const idx = this.virtualDevices.findIndex(d => d.name === name);
            if (idx >= 0) {
                this.virtualDevices.splice(idx, 1);
            }
            
            return true;
        }
        return false;
    }

    updateVirtualDevice(name, newData) {
        if (!this.removeVirtualDevice(name)) {
            return false;
        }
        
        const device = {
            name: name,
            type: newData.type || 'axis_only',
            translation: newData.translation || [0, 0, 0],
            rotation: newData.rotation || [[1,0,0],[0,1,0],[0,0,1]],
            focalLength: newData.focalLength,
            principalPoint: newData.principalPoint,
            width: newData.width,
            height: newData.height
        };
        
        this.addVirtualDevice(device);
        this.virtualDevices.push(device);
        return true;
    }

    setShowFrustum(show) {
        this.showFrustum = show;
        this.updateVisibility();
    }

    setWorldOnly(worldOnly) {
        this.showWorldOnly = worldOnly;
        this.updateVisibility();
    }

    setShowCoordinates(show) {
        this.showCoordinates = show;
        this.updateVisibility();
    }

    updateVisibility() {
        this.frustumHelpers.forEach((frustum, name) => {
            frustum.visible = this.showFrustum && !this.showWorldOnly;
        });
        
        this.cameraHelpers.forEach((helper, name) => {
            const isVirtual = helper.userData.isVirtual || false;
            const isIMU = helper.userData.isIMU || false;
            
            if (this.showWorldOnly) {
                helper.children.forEach(child => {
                    if (child instanceof THREE.AxesHelper) {
                        child.visible = false;
                    }
                });
                
                if (isVirtual || isIMU) {
                    helper.visible = false;
                } else {
                    helper.visible = true;
                }
            } else {
                helper.visible = true;
                helper.children.forEach(child => {
                    if (child instanceof THREE.AxesHelper) {
                        child.visible = true;
                    }
                });
            }
        });
        
        this.cameraLabels.forEach((label, name) => {
            const helper = this.cameraHelpers.get(name);
            const isVirtual = helper ? helper.userData.isVirtual : false;
            const isIMU = helper ? helper.userData.isIMU : false;
            
            if (this.showWorldOnly && (isVirtual || isIMU)) {
                label.visible = false;
            } else {
                label.visible = true;
            }
        });
        
        this.cameraPoints.forEach((point, name) => {
            const helper = this.cameraHelpers.get(name);
            const isVirtual = helper ? helper.userData.isVirtual : false;
            const isIMU = helper ? helper.userData.isIMU : false;
            
            if (this.showWorldOnly && (isVirtual || isIMU)) {
                point.visible = false;
            } else {
                point.visible = true;
            }
        });
        
        this.coordLabels.forEach((label, name) => {
            label.visible = this.showCoordinates && !this.showWorldOnly;
        });
        
        this.worldAxes.forEach(ax => {
            ax.visible = true;
        });
        
        if (this.worldOrigin) {
            this.worldOrigin.visible = true;
        }
    }

    resetView() {
        this.camera.position.copy(this.initialView.position);
        this.controls.target.copy(this.initialView.target);
        this.controls.update();
    }

    saveInitialView() {
        this.initialView = {
            position: this.camera.position.clone(),
            target: this.controls.target.clone()
        };
    }

    getAllDevices() {
        const devices = [];
        
        this.cameras.forEach(cam => {
            devices.push({
                name: cam.name,
                type: 'camera',
                translation: cam.translation,
                rotation: cam.rotation,
                focalLength: cam.focalLength,
                principalPoint: cam.principalPoint,
                width: cam.width,
                height: cam.height,
                model: cam.model,
                isOriginal: true
            });
        });
        
        if (this.imu) {
            devices.push({
                name: 'IMU',
                type: 'imu',
                translation: this.imu.translation,
                rotation: this.imu.rotation,
                isOriginal: true
            });
        }
        
        this.virtualDevices.forEach(device => {
            devices.push({
                ...device,
                isOriginal: false
            });
        });
        
        return devices;
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        this.renderer.dispose();
        this.controls.dispose();
    }
}

window.CameraRigVisualizer = CameraRigVisualizer;

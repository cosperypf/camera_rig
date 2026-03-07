/**
 * XML Parser for device_calibration.xml
 */

class CameraRigParser {
    constructor() {
        this.cameras = [];
        this.imu = null;
        this.virtualDevices = [];
        this.deviceUid = '';
    }

    parse(xmlString) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
        
        const root = xmlDoc.querySelector('DeviceConfiguration');
        if (!root) {
            throw new Error('Invalid XML: root element not found');
        }
        
        this.deviceUid = root.getAttribute('deviceUID') || '';
        
        this.parseCameras(root);
        this.parseIMU(root);
        this.parseVirtualDevices(root);
        
        return {
            deviceUid: this.deviceUid,
            cameras: this.cameras,
            imu: this.imu,
            virtualDevices: this.virtualDevices
        };
    }

    parseCameras(root) {
        const cameraElements = root.querySelectorAll('Camera');
        
        cameraElements.forEach(camElem => {
            const camera = {
                name: camElem.getAttribute('cam_name') || '',
                id: parseInt(camElem.getAttribute('id') || '0'),
                model: '',
                width: 0,
                height: 0,
                focalLength: [0, 0],
                principalPoint: [0, 0],
                radialDistortion: [],
                rotation: [[1,0,0],[0,1,0],[0,0,1]],
                translation: [0, 0, 0],
                timeDelta: 0
            };
            
            const calib = camElem.querySelector('Calibration');
            if (calib) {
                camera.model = calib.getAttribute('model') || 'PINHOLE';
                
                const size = (calib.getAttribute('size') || '640 480').trim().split(/\s+/);
                camera.width = parseInt(size[0]) || 640;
                camera.height = parseInt(size[1]) || 480;
                
                const focal = (calib.getAttribute('focal_length') || '0 0').trim().split(/\s+/);
                camera.focalLength = [parseFloat(focal[0]) || 0, parseFloat(focal[1]) || 0];
                
                const principal = (calib.getAttribute('principal_point') || '0 0').trim().split(/\s+/);
                camera.principalPoint = [parseFloat(principal[0]) || 0, parseFloat(principal[1]) || 0];
                
                const radial = (calib.getAttribute('radial_distortion') || '').trim().split(/\s+/);
                camera.radialDistortion = radial.map(v => parseFloat(v) || 0);
            }
            
            const rig = camElem.querySelector('Rig');
            if (rig) {
                const trans = (rig.getAttribute('translation') || '0 0 0').trim().split(/\s+/);
                camera.translation = trans.map(v => parseFloat(v) || 0);
                
                const rotMat = (rig.getAttribute('rowMajorRotationMat') || '1 0 0 0 1 0 0 0 1').trim().split(/\s+/);
                camera.rotation = this.parseRotationMatrix(rotMat);
            }
            
            const timeElem = camElem.querySelector('TimeAlignment');
            if (timeElem) {
                camera.timeDelta = parseFloat(timeElem.getAttribute('delta')) || 0;
            }
            
            this.cameras.push(camera);
        });
    }

    parseIMU(root) {
        const sfconfig = root.querySelector('SFConfig');
        if (!sfconfig) return;
        
        const stateInit = sfconfig.querySelector('Stateinit');
        if (!stateInit) return;
        
        const ombc = (stateInit.getAttribute('ombc') || '0 0 0').trim().split(/\s+/);
        const tbc = (stateInit.getAttribute('tbc') || '0 0 0').trim().split(/\s+/);
        
        this.imu = {
            rotation: this.parseRotationMatrix(ombc.map(v => parseFloat(v) || 0)),
            translation: tbc.map(v => parseFloat(v) || 0)
        };
    }

    parseVirtualDevices(root) {
        const virtualRoot = root.querySelector('VirtualDevices');
        if (!virtualRoot) return;
        
        const deviceElements = virtualRoot.querySelectorAll('Device');
        
        deviceElements.forEach(elem => {
            const device = {
                name: elem.getAttribute('name') || '',
                type: elem.getAttribute('type') || 'axis_only',
                translation: [0, 0, 0],
                rotation: [[1,0,0],[0,1,0],[0,0,1]]
            };
            
            const transElem = elem.querySelector('translation');
            if (transElem && transElem.textContent) {
                const trans = transElem.textContent.trim().split(/\s+/);
                device.translation = trans.map(v => parseFloat(v) || 0);
            }
            
            const rotElem = elem.querySelector('rotation');
            if (rotElem && rotElem.textContent) {
                const euler = rotElem.textContent.trim().split(/\s+/).map(v => parseFloat(v) || 0);
                device.rotation = this.eulerToRotationMatrix(euler[0], euler[1], euler[2]);
            }
            
            const focalElem = elem.querySelector('focalLength');
            if (focalElem && focalElem.textContent) {
                const focal = focalElem.textContent.trim().split(/\s+/);
                device.focalLength = [parseFloat(focal[0]) || 200, parseFloat(focal[1]) || 200];
            }
            
            const principalElem = elem.querySelector('principalPoint');
            if (principalElem && principalElem.textContent) {
                const principal = principalElem.textContent.trim().split(/\s+/);
                device.principalPoint = [parseFloat(principal[0]) || 320, parseFloat(principal[1]) || 240];
            }
            
            const resolution = elem.querySelector('resolution');
            if (resolution) {
                device.width = parseInt(resolution.getAttribute('width')) || 640;
                device.height = parseInt(resolution.getAttribute('height')) || 480;
            }
            
            this.virtualDevices.push(device);
        });
    }

    parseRotationMatrix(values) {
        if (values.length === 3) {
            const axis = [values[0], values[1], values[2]];
            const angle = Math.sqrt(axis[0]**2 + axis[1]**2 + axis[2]**2);
            if (angle < 1e-10) {
                return [[1,0,0],[0,1,0],[0,0,1]];
            }
            return this.axisAngleToRotationMatrix(
                [axis[0]/angle, axis[1]/angle, axis[2]/angle],
                angle
            );
        }
        
        if (values.length === 9) {
            return [
                [values[0], values[1], values[2]],
                [values[3], values[4], values[5]],
                [values[6], values[7], values[8]]
            ];
        }
        
        return [[1,0,0],[0,1,0],[0,0,1]];
    }

    axisAngleToRotationMatrix(axis, angle) {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const t = 1 - c;
        const [x, y, z] = axis;
        
        return [
            [t*x*x + c,    t*x*y - z*s,  t*x*z + y*s],
            [t*x*y + z*s,  t*y*y + c,    t*y*z - x*s],
            [t*x*z - y*s,  t*y*z + x*s,  t*z*z + c  ]
        ];
    }

    eulerToRotationMatrix(roll, pitch, yaw) {
        const r = roll * Math.PI / 180;
        const p = pitch * Math.PI / 180;
        const y = yaw * Math.PI / 180;
        
        const Rx = [
            [1, 0, 0],
            [0, Math.cos(r), -Math.sin(r)],
            [0, Math.sin(r), Math.cos(r)]
        ];
        
        const Ry = [
            [Math.cos(p), 0, Math.sin(p)],
            [0, 1, 0],
            [-Math.sin(p), 0, Math.cos(p)]
        ];
        
        const Rz = [
            [Math.cos(y), -Math.sin(y), 0],
            [Math.sin(y), Math.cos(y), 0],
            [0, 0, 1]
        ];
        
        const RyRx = this.multiplyMatrix(Ry, Rx);
        return this.multiplyMatrix(Rz, RyRx);
    }

    multiplyMatrix(A, B) {
        const result = [[0,0,0],[0,0,0],[0,0,0]];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                for (let k = 0; k < 3; k++) {
                    result[i][j] += A[i][k] * B[k][j];
                }
            }
        }
        return result;
    }
}

window.CameraRigParser = CameraRigParser;

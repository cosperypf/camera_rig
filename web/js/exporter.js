/**
 * XML Exporter for Camera Rig
 */

class CameraRigExporter {
    constructor() {
        this.deviceUid = this.generateUid();
    }

    generateUid() {
        return 'EXPORT_' + Date.now();
    }

    formatNumber(num, decimals = 9) {
        return num.toFixed(decimals);
    }

    formatVector3(v) {
        return v.map(n => this.formatNumber(n)).join(' ');
    }

    formatMatrix3(m) {
        const flat = [];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                flat.push(m[i][j]);
            }
        }
        return flat.map(n => this.formatNumber(n)).join(' ');
    }

    exportXML(devices) {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += `<DeviceConfiguration deviceUID="${this.deviceUid}">\n`;
        
        const cameras = devices.filter(d => d.type === 'camera');
        const imu = devices.find(d => d.type === 'imu');
        
        let camId = 0;
        cameras.forEach(cam => {
            xml += this.exportCamera(cam, camId++);
        });
        
        if (imu) {
            xml += this.exportIMU(imu);
        }
        
        xml += '</DeviceConfiguration>\n';
        xml += `\n<!-- Exported: ${new Date().toISOString()} -->\n`;
        
        return xml;
    }

    exportCamera(cam, id) {
        const model = cam.model || (cam.focalLength && cam.focalLength[0] < 300 ? 'FISHEYE_4_PARAMETERS' : 'PINHOLE');
        const radialDistortion = new Array(6).fill(0).map(() => this.formatNumber(0)).join(' ');
        
        let xml = `    <Camera cam_name="${cam.name}" name="${cam.name}" id="${id}">\n`;
        xml += `        <Calibration size="${cam.width || 640} ${cam.height || 480} " `;
        xml += `principal_point="${(cam.principalPoint ? cam.principalPoint[0] : 320).toFixed(6)} ${(cam.principalPoint ? cam.principalPoint[1] : 240).toFixed(6)} " `;
        xml += `focal_length="${(cam.focalLength ? cam.focalLength[0] : 200).toFixed(6)} ${(cam.focalLength ? cam.focalLength[1] : 200).toFixed(6)} " `;
        xml += `model="${model}" `;
        xml += `radial_distortion="${radialDistortion}" `;
        xml += `distortion_limit="3.6" undistortion_limit="1.3"/>\n`;
        
        xml += `        <Rig translation="${this.formatVector3(cam.translation)} " `;
        xml += `rowMajorRotationMat="${this.formatMatrix3(cam.rotation)} "/>\n`;
        
        xml += `        <TimeAlignment delta="0.003436"/>\n`;
        xml += `        <CaptureDetails nativeSensorWidth="${cam.width || 640}" nativeSensorHeight="${cam.height || 480}" `;
        xml += `cropL="0" cropR="0" cropT="0" cropB="0" binningH="1" binningV="1"/>\n`;
        
        if (cam.principalPoint) {
            const normalizer = Math.sqrt(cam.principalPoint[0]**2 + cam.principalPoint[1]**2);
            xml += `        <VignettingCorrection model="RADIAL_POLYNOMIAL" `;
            xml += `center="${cam.principalPoint[0].toFixed(6)} ${cam.principalPoint[1].toFixed(6)} " `;
            xml += `normalizer="${normalizer.toFixed(6)}" coeffs="-1.1489292 1.4186657 -1.1576116 "/>\n`;
        }
        
        xml += `    </Camera>\n`;
        
        return xml;
    }

    exportIMU(imu) {
        const ombc = this.formatMatrix3(imu.rotation);
        const tbc = this.formatVector3(imu.translation);
        
        let xml = `    <SFConfig>\n`;
        xml += `        <Stateinit ombc="${ombc} " tbc="${tbc} " `;
        xml += `aBias="0 0 0 " wBias="0 0 0 " ka="0 0 0 " kg="0 0 0 " na="0 0 0 " ng="0 0 0 " ombg="0 0 0 " `;
        xml += `accelDelta="0.0" delta="0.003436"/>\n`;
        xml += `        <IMUNoise movingAccelNoise="0.442166" movingGyroNoise="0.018163"/>\n`;
        xml += `    </SFConfig>\n`;
        
        return xml;
    }
}

window.CameraRigExporter = CameraRigExporter;

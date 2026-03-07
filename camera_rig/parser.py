"""
Parser for device calibration XML files.
"""

import numpy as np
from dataclasses import dataclass
from typing import List, Optional
from lxml import etree

from .transforms import parse_vector3, parse_rotation_matrix


@dataclass
class Camera:
    """Camera parameters."""
    name: str
    id: int
    model: str
    
    # Intrinsics
    width: int
    height: int
    focal_length: np.ndarray  # (fx, fy)
    principal_point: np.ndarray  # (cx, cy)
    radial_distortion: np.ndarray
    
    # Extrinsics (in rig coordinate system)
    rotation: np.ndarray  # 3x3 rotation matrix
    translation: np.ndarray  # 3D translation vector
    
    # Time alignment
    time_delta: float = 0.0


@dataclass
class IMU:
    """IMU parameters from SFConfig."""
    # IMU orientation relative to body frame (from ombc)
    rotation: np.ndarray  # 3x3 rotation matrix
    # IMU position relative to body frame (from tbc)
    translation: np.ndarray  # 3D translation vector


@dataclass
class VirtualDevice:
    """Virtual device for visualization."""
    name: str
    device_type: str  # "camera" or "axis_only"
    
    # Pose in world coordinates
    rotation: np.ndarray  # 3x3 rotation matrix
    translation: np.ndarray  # 3D translation vector
    
    # Camera parameters (only used if device_type == "camera")
    focal_length: Optional[np.ndarray] = None
    principal_point: Optional[np.ndarray] = None
    width: Optional[int] = None
    height: Optional[int] = None
    model: Optional[str] = None


@dataclass
class CameraRig:
    """Complete camera rig configuration."""
    device_uid: str
    cameras: List[Camera]
    imu: Optional[IMU]
    virtual_devices: List[VirtualDevice] = None
    
    def __post_init__(self):
        if self.virtual_devices is None:
            self.virtual_devices = []


def parse_calibration_file(xml_path: str) -> CameraRig:
    """
    Parse device calibration XML file.
    
    Args:
        xml_path: Path to device_calibration.xml
    
    Returns:
        CameraRig object with all parsed data
    """
    tree = etree.parse(xml_path)
    root = tree.getroot()
    
    device_uid = root.get('deviceUID', '')
    
    cameras = []
    for cam_elem in root.findall('Camera'):
        camera = parse_camera(cam_elem)
        cameras.append(camera)
    
    imu = None
    sfconfig = root.find('SFConfig')
    if sfconfig is not None:
        imu = parse_imu(sfconfig)
    
    virtual_devices = []
    virtual_root = root.find('VirtualDevices')
    if virtual_root is not None:
        for device_elem in virtual_root.findall('Device'):
            virtual_device = parse_virtual_device(device_elem)
            virtual_devices.append(virtual_device)
    
    reference_camera = None
    for cam in cameras:
        if cam.name == 'trackingA':
            reference_camera = cam
            break
    
    if reference_camera is None:
        raise ValueError("Reference camera 'trackingA' not found")
    
    R_ref = reference_camera.rotation
    t_ref = reference_camera.translation
    
    for camera in cameras:
        camera.rotation, camera.translation = transform_to_world(
            camera.rotation, camera.translation, R_ref, t_ref
        )
    
    for device in virtual_devices:
        pass
    
    return CameraRig(
        device_uid=device_uid,
        cameras=cameras,
        imu=imu,
        virtual_devices=virtual_devices
    )


def parse_camera(cam_elem) -> Camera:
    """Parse a single Camera element."""
    name = cam_elem.get('cam_name')
    cam_id = int(cam_elem.get('id'))
    
    calib = cam_elem.find('Calibration')
    model = calib.get('model')
    size = calib.get('size').strip().split()
    width, height = int(size[0]), int(size[1])
    
    focal = calib.get('focal_length').strip().split()
    focal_length = np.array([float(focal[0]), float(focal[1])])
    
    principal = calib.get('principal_point').strip().split()
    principal_point = np.array([float(principal[0]), float(principal[1])])
    
    radial = calib.get('radial_distortion').strip().split()
    radial_distortion = np.array([float(r) for r in radial])
    
    rig = cam_elem.find('Rig')
    translation = parse_vector3(rig.get('translation'))
    rotation = parse_rotation_matrix(rig.get('rowMajorRotationMat'))
    
    time_elem = cam_elem.find('TimeAlignment')
    time_delta = float(time_elem.get('delta')) if time_elem is not None else 0.0
    
    return Camera(
        name=name,
        id=cam_id,
        model=model,
        width=width,
        height=height,
        focal_length=focal_length,
        principal_point=principal_point,
        radial_distortion=radial_distortion,
        rotation=rotation,
        translation=translation,
        time_delta=time_delta
    )


def parse_imu(sfconfig_elem) -> IMU:
    """Parse IMU parameters from SFConfig."""
    state_init = sfconfig_elem.find('Stateinit')
    
    ombc_text = state_init.get('ombc')
    tbc_text = state_init.get('tbc')
    
    rotation = parse_rotation_matrix(ombc_text) if ombc_text else np.eye(3)
    translation = parse_vector3(tbc_text) if tbc_text else np.zeros(3)
    
    return IMU(rotation=rotation, translation=translation)


def parse_virtual_device(device_elem) -> VirtualDevice:
    """Parse a VirtualDevice element."""
    name = device_elem.get('name')
    device_type = device_elem.get('type', 'axis_only')
    
    translation_elem = device_elem.find('translation')
    rotation_elem = device_elem.find('rotation')
    
    translation = parse_vector3(translation_elem.text) if translation_elem is not None else np.zeros(3)
    
    if rotation_elem is not None:
        euler = rotation_elem.text.strip().split()
        roll, pitch, yaw = float(euler[0]), float(euler[1]), float(euler[2])
        from .transforms import euler_to_rotation_matrix
        rotation = euler_to_rotation_matrix(roll, pitch, yaw)
    else:
        rotation = np.eye(3)
    
    return VirtualDevice(
        name=name,
        device_type=device_type,
        rotation=rotation,
        translation=translation
    )


def transform_to_world(R_cam: np.ndarray, t_cam: np.ndarray,
                       R_ref: np.ndarray, t_ref: np.ndarray) -> tuple:
    """
    Transform camera pose to world coordinates using reference camera.
    
    The reference camera (trackingA) is at world origin with identity rotation.
    All other cameras are transformed relative to it.
    
    Args:
        R_cam: Camera rotation in rig coordinates
        t_cam: Camera translation in rig coordinates
        R_ref: Reference camera rotation (should be identity for trackingA)
        t_ref: Reference camera translation (should be zero for trackingA)
    
    Returns:
        (R_world, t_world) - camera pose in world coordinates
    """
    R_world = R_ref.T @ R_cam
    t_world = R_ref.T @ (t_cam - t_ref)
    return R_world, t_world

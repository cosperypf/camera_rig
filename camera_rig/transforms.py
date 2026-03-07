"""
Coordinate transformation utilities for camera rig visualization.
"""

import numpy as np


def euler_to_rotation_matrix(roll: float, pitch: float, yaw: float) -> np.ndarray:
    """
    Convert Euler angles (roll, pitch, yaw) to rotation matrix.
    
    Args:
        roll: Rotation around X axis in degrees
        pitch: Rotation around Y axis in degrees  
        yaw: Rotation around Z axis in degrees
    
    Returns:
        3x3 rotation matrix
    """
    r = np.radians(roll)
    p = np.radians(pitch)
    y = np.radians(yaw)
    
    Rx = np.array([
        [1, 0, 0],
        [0, np.cos(r), -np.sin(r)],
        [0, np.sin(r), np.cos(r)]
    ])
    
    Ry = np.array([
        [np.cos(p), 0, np.sin(p)],
        [0, 1, 0],
        [-np.sin(p), 0, np.cos(p)]
    ])
    
    Rz = np.array([
        [np.cos(y), -np.sin(y), 0],
        [np.sin(y), np.cos(y), 0],
        [0, 0, 1]
    ])
    
    return Rz @ Ry @ Rx


def rotation_matrix_to_euler(R: np.ndarray) -> tuple:
    """
    Convert rotation matrix to Euler angles (roll, pitch, yaw).
    
    Args:
        R: 3x3 rotation matrix
    
    Returns:
        (roll, pitch, yaw) in degrees
    """
    sy = np.sqrt(R[0, 0] * R[0, 0] + R[1, 0] * R[1, 0])
    
    singular = sy < 1e-6
    
    if not singular:
        roll = np.arctan2(R[2, 1], R[2, 2])
        pitch = np.arctan2(-R[2, 0], sy)
        yaw = np.arctan2(R[1, 0], R[0, 0])
    else:
        roll = np.arctan2(-R[1, 2], R[1, 1])
        pitch = np.arctan2(-R[2, 0], sy)
        yaw = 0
    
    return np.degrees(roll), np.degrees(pitch), np.degrees(yaw)


def axis_angle_to_rotation_matrix(axis: np.ndarray, angle: float) -> np.ndarray:
    """
    Convert axis-angle representation to rotation matrix.
    
    Uses Rodrigues' rotation formula.
    
    Args:
        axis: Unit rotation axis (3D vector)
        angle: Rotation angle in radians
    
    Returns:
        3x3 rotation matrix
    """
    K = np.array([
        [0, -axis[2], axis[1]],
        [axis[2], 0, -axis[0]],
        [-axis[1], axis[0], 0]
    ])
    
    R = np.eye(3) + np.sin(angle) * K + (1 - np.cos(angle)) * (K @ K)
    return R


def transform_point(point: np.ndarray, R: np.ndarray, t: np.ndarray) -> np.ndarray:
    """
    Apply pose transformation to a point.
    
    Args:
        point: 3D point (x, y, z)
        R: 3x3 rotation matrix
        t: 3D translation vector
    
    Returns:
        Transformed 3D point
    """
    return R @ point + t


def transform_pose(R_src: np.ndarray, t_src: np.ndarray, 
                   R_rel: np.ndarray, t_rel: np.ndarray) -> tuple:
    """
    Combine poses: apply relative transform to source pose.
    
    Args:
        R_src: Source rotation matrix
        t_src: Source translation vector
        R_rel: Relative rotation matrix
        t_rel: Relative translation vector
    
    Returns:
        (R_result, t_result)
    """
    R_result = R_src @ R_rel
    t_result = R_src @ t_rel + t_src
    return R_result, t_result


def inverse_pose(R: np.ndarray, t: np.ndarray) -> tuple:
    """
    Compute inverse of pose transformation.
    
    Args:
        R: 3x3 rotation matrix
        t: 3D translation vector
    
    Returns:
        (R_inv, t_inv) - inverse pose
    """
    R_inv = R.T
    t_inv = -R_inv @ t
    return R_inv, t_inv


def parse_vector3(text: str) -> np.ndarray:
    """Parse space-separated 3D vector string."""
    values = text.strip().split()
    return np.array([float(v) for v in values])


def parse_rotation_matrix(text: str) -> np.ndarray:
    """Parse rotation matrix or axis-angle from XML."""
    values = text.strip().split()
    arr = np.array([float(v) for v in values])
    
    if len(arr) == 3:
        norm = np.linalg.norm(arr)
        if norm < 1e-10:
            return np.eye(3)
        axis = arr / norm
        angle = norm
        return axis_angle_to_rotation_matrix(axis, angle)
    
    return arr.reshape(3, 3, order='F')

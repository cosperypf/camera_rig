#!/usr/bin/env python3
"""
Camera Rig Calibration Visualization Tool

This tool parses device_calibration.xml and visualizes the camera rig
in 3D, showing camera positions, orientations, frustums, and IMU.
"""

from camera_rig.parser import parse_calibration_file
from camera_rig.visualizer import CameraRigVisualizer
from camera_rig.config import parse_arguments


def main():
    """Main entry point."""
    config = parse_arguments()
    
    print(f"Loading calibration from: {config.xml_path}")
    rig = parse_calibration_file(config.xml_path)
    print(f"Device UID: {rig.device_uid}")
    print(f"Found {len(rig.cameras)} cameras:")
    for cam in rig.cameras:
        print(f"  - {cam.name} (id={cam.id}, model={cam.model})")
    print(f"Found {len(rig.virtual_devices)} virtual devices")
    if rig.imu:
        print("Found IMU")
    
    viz = CameraRigVisualizer(figsize=config.figsize)
    
    print("Drawing cameras...")
    for camera in rig.cameras:
        viz.draw_camera(camera)
    
    print("Drawing virtual devices...")
    for device in rig.virtual_devices:
        viz.draw_virtual_device(device)
    
    if config.show_imu and rig.imu:
        print("Drawing IMU...")
        viz.draw_imu(rig.imu)
    
    viz.render(show=config.show, output_path=config.output_path)
    
    viz.close()
    print("Done!")


if __name__ == '__main__':
    main()

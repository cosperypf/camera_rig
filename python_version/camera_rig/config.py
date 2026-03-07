"""
Configuration management for camera rig visualization.
"""

import argparse
from dataclasses import dataclass
from typing import Optional


@dataclass
class VisualizationConfig:
    """Configuration for visualization."""
    xml_path: str = 'device_calibration.xml'
    output_path: Optional[str] = None
    show: bool = True
    show_imu: bool = True
    figsize: tuple = (12, 10)
    axis_length: float = 0.05
    frustum_scale: float = 0.15


def parse_arguments() -> VisualizationConfig:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description='Camera Rig Calibration Visualization Tool'
    )
    
    parser.add_argument(
        'xml_file',
        nargs='?',
        default='device_calibration.xml',
        help='Path to device calibration XML file'
    )
    
    parser.add_argument(
        '--output', '-o',
        help='Output image file path'
    )
    
    parser.add_argument(
        '--no-show',
        action='store_true',
        help='Do not display the plot (useful with --output)'
    )
    
    parser.add_argument(
        '--no-imu',
        action='store_true',
        help='Do not show IMU axes'
    )
    
    parser.add_argument(
        '--figsize',
        nargs=2,
        type=float,
        default=[12, 10],
        help='Figure size (width height)'
    )
    
    args = parser.parse_args()
    
    return VisualizationConfig(
        xml_path=args.xml_file,
        output_path=args.output,
        show=not args.no_show,
        show_imu=not args.no_imu,
        figsize=tuple(args.figsize)
    )

"""
3D visualization for camera rig using matplotlib.
"""

import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
from matplotlib.widgets import CheckButtons, Button
from mpl_toolkits.mplot3d.art3d import Line3DCollection
from typing import List, Optional

from .parser import Camera, IMU, VirtualDevice
from .transforms import transform_point


class CameraRigVisualizer:
    """Visualizer for camera rig configuration."""
    
    AXIS_LENGTH = 0.1
    FRUSTUM_SCALE = 0.15
    
    def __init__(self, figsize: tuple = (12, 10)):
        self.fig = plt.figure(figsize=figsize)
        self.ax = self.fig.add_subplot(111, projection='3d')
        
        self.frustum_artists = []
        self.camera_artists = {}
        self.show_frustum = True
        self.show_only_world_origin = False
        
        self.cameras = []
        self.virtual_devices = []
        self.imu = None
        
        self._camera_axes_artists = []
        self._camera_text_artists = []
        
        self._drawn_elements = {
            'x_axis': [],
            'y_axis': [],
            'z_axis': [],
            'world_origin': None,
            'imu_point': None
        }
        
        self._initial_view = None
        
        self._setup_axes()
    
    def _setup_axes(self):
        """Setup 3D axes properties."""
        self.ax.set_xlabel('X (m)')
        self.ax.set_ylabel('Y (m)')
        self.ax.set_zlabel('Z (m)')
        self.ax.set_title('Camera Rig Visualization\n(Drag to rotate, Scroll to zoom)')
        
        max_range = 0.15
        self.ax.set_xlim(-max_range, max_range)
        self.ax.set_ylim(-max_range, max_range)
        self.ax.set_zlim(-max_range, max_range)
        
        self.ax.view_init(elev=0, azim=180)
        
        self._initial_view = {
            'elev': 0,
            'azim': 180,
            'xlim': self.ax.get_xlim(),
            'ylim': self.ax.get_ylim(),
            'zlim': self.ax.get_zlim()
        }
        
        self._draw_world_axes()
    
    def _draw_world_axes(self):
        """Draw world coordinate axes with arrows."""
        origin = np.array([0.0, 0.0, 0.0])
        length = 0.05
        
        self._drawn_elements['x_axis'] = self.ax.quiver(
            origin[0], origin[1], origin[2],
            0, 0, length,
            color='red', arrow_length_ratio=0.2, linewidth=2
        )
        self._drawn_elements['y_axis'] = self.ax.quiver(
            origin[0], origin[1], origin[2],
            -length, 0, 0,
            color='green', arrow_length_ratio=0.2, linewidth=2
        )
        self._drawn_elements['z_axis'] = self.ax.quiver(
            origin[0], origin[1], origin[2],
            0, -length, 0,
            color='blue', arrow_length_ratio=0.2, linewidth=2
        )
        
        self._drawn_elements['world_origin'] = self.ax.scatter(
            [0], [0], [0], c='black', s=80, marker='o', 
            edgecolors='white', linewidths=1.5,
            label='World Origin', zorder=10
        )
    
    def draw_camera(self, camera: Camera, color: str = None):
        """
        Draw a camera: origin point, axes, and frustum.
        
        Args:
            camera: Camera object
            color: Optional color for the camera elements
        """
        R = camera.rotation
        t = camera.translation
        
        self.draw_axes(R, t, self.AXIS_LENGTH, camera.name)
        
        if camera.model.startswith('FISHEYE'):
            frustum_color = 'orange'
            dot_color = 'orange'
            dot_label = 'FishEye Camera'
        else:
            frustum_color = 'blue'
            dot_color = 'dodgerblue'
            dot_label = 'RGB Camera'
        
        if color:
            frustum_color = color
            dot_color = color
        
        frustum_lines = self.draw_frustum(
            R, t,
            camera.focal_length,
            camera.principal_point,
            camera.width,
            camera.height,
            camera.model,
            frustum_color,
            label=camera.name
        )
        
        center = t
        scatter = self.ax.scatter([center[0]], [center[1]], [center[2]], 
                       c=dot_color, s=40, marker='o', 
                       edgecolors='white', linewidths=0.5,
                       label=dot_label, zorder=5)
        
        self.cameras.append(camera.name)
        self.camera_artists[camera.name] = {
            'frustum': frustum_lines,
            'scatter': scatter,
            'type': 'fisheye' if camera.model.startswith('FISHEYE') else 'rgb'
        }
    
    def draw_virtual_device(self, device: VirtualDevice):
        """Draw a virtual device."""
        R = device.rotation
        t = device.translation
        
        self.draw_axes(R, t, self.AXIS_LENGTH, device.name)
        
        frustum_lines = []
        if device.device_type == 'camera':
            frustum_lines = self.draw_frustum(
                R, t,
                device.focal_length,
                device.principal_point,
                device.width,
                device.height,
                device.model or 'PINHOLE',
                'purple',
                label=device.name
            )
            scatter = self.ax.scatter([t[0]], [t[1]], [t[2]], 
                           c='purple', s=40, marker='o',
                           edgecolors='white', linewidths=0.5,
                           label='Virtual Camera', zorder=5)
            self.camera_artists[device.name] = {
                'frustum': frustum_lines,
                'scatter': scatter,
                'type': 'virtual'
            }
        
        self.virtual_devices.append(device.name)
    
    def draw_axes(self, R: np.ndarray, t: np.ndarray, 
                  length: float, label: str = None):
        """
        Draw local coordinate axes at given pose.
        
        Args:
            R: 3x3 rotation matrix
            t: 3D translation vector
            length: Length of axis lines
            label: Optional label for the origin
        """
        origin = t
        
        x_axis = transform_point(np.array([length, 0, 0]), R, t)
        y_axis = transform_point(np.array([0, length, 0]), R, t)
        z_axis = transform_point(np.array([0, 0, length]), R, t)
        
        line_x = self.ax.plot([origin[0], x_axis[0]], 
                    [origin[1], x_axis[1]], 
                    [origin[2], x_axis[2]], 'r-', linewidth=1.5, alpha=0.8)
        line_y = self.ax.plot([origin[0], y_axis[0]], 
                    [origin[1], y_axis[1]], 
                    [origin[2], y_axis[2]], 'g-', linewidth=1.5, alpha=0.8)
        line_z = self.ax.plot([origin[0], z_axis[0]], 
                    [origin[1], z_axis[1]], 
                    [origin[2], z_axis[2]], 'b-', linewidth=1.5, alpha=0.8)
        
        self._camera_axes_artists.extend([line_x[0], line_y[0], line_z[0]])
        
        if label:
            text = self.ax.text(origin[0], origin[1], origin[2] + 0.015, 
                        label, fontsize=8, ha='center', fontweight='bold',
                        bbox=dict(boxstyle='round,pad=0.2', facecolor='white', 
                                  alpha=0.7, edgecolor='none'))
            self._camera_text_artists.append(text)
    
    def draw_frustum(self, R: np.ndarray, t: np.ndarray,
                     focal_length: np.ndarray,
                     principal_point: np.ndarray,
                     width: int, height: int,
                     model: str, color: str, label: str = None) -> list:
        """
        Draw camera frustum (pyramid shape).
        
        Args:
            R: Camera rotation matrix
            t: Camera translation (optical center)
            focal_length: (fx, fy)
            principal_point: (cx, cy)
            width: Image width
            height: Image height
            model: Camera model type
            color: Color for frustum lines
            label: Label for legend
        
        Returns:
            List of line artists
        """
        scale = self.FRUSTUM_SCALE
        
        fx, fy = focal_length
        cx, cy = principal_point
        
        if model.startswith('FISHEYE'):
            fov_h = 2 * np.arctan(width / (2 * fx))
            fov_v = 2 * np.arctan(height / (2 * fy))
        else:
            fov_h = 2 * np.arctan(width / (2 * fx))
            fov_v = 2 * np.arctan(height / (2 * fy))
        
        fov_h = min(fov_h, np.pi * 0.8)
        fov_v = min(fov_v, np.pi * 0.8)
        
        distance = scale
        
        half_w = distance * np.tan(fov_h / 2)
        half_h = distance * np.tan(fov_v / 2)
        
        corners_local = np.array([
            [-half_w, -half_h, -distance],
            [half_w, -half_h, -distance],
            [half_w, half_h, -distance],
            [-half_w, half_h, -distance],
        ])
        
        corners = np.array([
            transform_point(c, R, t) for c in corners_local
        ])
        
        lines = []
        
        for i in range(4):
            line, = self.ax.plot([t[0], corners[i, 0]], 
                        [t[1], corners[i, 1]], 
                        [t[2], corners[i, 2]], 
                        color=color, alpha=0.4, linewidth=1)
            lines.append(line)
        
        edges = [(0, 1), (1, 2), (2, 3), (3, 0)]
        for e in edges:
            line, = self.ax.plot(corners[e, 0], corners[e, 1], corners[e, 2], 
                        color=color, alpha=0.6, linewidth=1)
            lines.append(line)
        
        return lines
    
    def draw_imu(self, imu: IMU, R_world: np.ndarray = None, t_world: np.ndarray = None):
        """
        Draw IMU coordinate axes.
        
        Args:
            imu: IMU object
            R_world: World rotation (optional, for IMU position in world)
            t_world: World translation (optional)
        """
        if R_world is not None and t_world is not None:
            R = R_world @ imu.rotation
            t = R_world @ imu.translation + t_world
        else:
            R = imu.rotation
            t = imu.translation
        
        self.draw_axes(R, t, self.AXIS_LENGTH * 0.8, label='IMU')
        
        self._drawn_elements['imu_point'] = self.ax.scatter(
            [t[0]], [t[1]], [t[2]], 
            c='cyan', s=60, marker='^',
            edgecolors='black', linewidths=1,
            label='IMU', zorder=6
        )
        self.imu = 'IMU'
    
    def _toggle_frustum(self, label):
        """Toggle frustum visibility."""
        if label == 'Show Frustum':
            self.show_frustum = not self.show_frustum
            
            for name, artists in self.camera_artists.items():
                for line in artists['frustum']:
                    line.set_visible(self.show_frustum)
            
            plt.draw()
    
    def _toggle_world_only(self, label):
        """Toggle showing only world origin axes."""
        if label == 'World Only':
            self.show_only_world_origin = not self.show_only_world_origin
            
            for artist in self._camera_axes_artists:
                artist.set_visible(not self.show_only_world_origin)
            
            for artist in self._camera_text_artists:
                artist.set_visible(True)
            
            for name, artists in self.camera_artists.items():
                if artists.get('scatter'):
                    artists['scatter'].set_visible(True)
                for line in artists.get('frustum', []):
                    line.set_visible(not self.show_only_world_origin and self.show_frustum)
            
            plt.draw()
    
    def _save_initial_view(self):
        """Save the initial camera view."""
        self._initial_view = {
            'elev': self.ax.elev,
            'azim': self.ax.azim,
            'xlim': self.ax.get_xlim(),
            'ylim': self.ax.get_ylim(),
            'zlim': self.ax.get_zlim()
        }
    
    def _reset_view(self, event):
        """Reset camera to initial view."""
        if self._initial_view is not None:
            self.ax.set_xlim(self._initial_view['xlim'])
            self.ax.set_ylim(self._initial_view['ylim'])
            self.ax.set_zlim(self._initial_view['zlim'])
            self.ax.view_init(elev=self._initial_view['elev'], azim=self._initial_view['azim'])
            plt.draw()
    
    def _setup_controls(self):
        """Setup interactive controls."""
        ax_check = self.fig.add_axes([0.02, 0.02, 0.22, 0.07])
        self.checkbox = CheckButtons(
            ax_check,
            ['Show Frustum', 'World Only'],
            [self.show_frustum, self.show_only_world_origin]
        )
        self.checkbox.on_clicked(self._toggle_frustum)
        self.checkbox.on_clicked(self._toggle_world_only)
        
        try:
            for rectangle in self.checkbox.rectangles:
                rectangle.set_facecolor('lightblue')
                rectangle.set_edgecolor('blue')
            for line in self.checkbox.lines:
                for l in line:
                    l.set_color('blue')
                    l.set_mec('blue')
        except AttributeError:
            pass
        
        ax_reset = self.fig.add_axes([0.26, 0.02, 0.15, 0.07])
        self.reset_button = Button(ax_reset, 'Reset View')
        self.reset_button.on_clicked(self._reset_view)
    
    def render(self, show: bool = True, output_path: str = None):
        """
        Render the visualization.
        
        Args:
            show: Whether to show the plot
            output_path: Optional path to save the figure
        """
        import matplotlib
        import matplotlib.backends
        
        backend = matplotlib.get_backend().lower()
        is_interactive = backend not in ['agg', 'svg', 'pdf', 'ps']
        
        if output_path and not is_interactive:
            show = False
        
        handles = []
        labels = []
        
        handles.append(self._drawn_elements['world_origin'])
        labels.append('World Origin')
        
        imu_point = self._drawn_elements.get('imu_point')
        if imu_point is not None:
            handles.append(imu_point)
            labels.append('IMU')
        
        has_fisheye = any(a.get('type') == 'fisheye' for a in self.camera_artists.values())
        has_rgb = any(a.get('type') == 'rgb' for a in self.camera_artists.values())
        has_virtual = any(a.get('type') == 'virtual' for a in self.camera_artists.values())
        
        if has_fisheye:
            handles.append(plt.Line2D([0], [0], marker='o', color='w', 
                                     markerfacecolor='orange', markersize=10,
                                     label='FishEye Camera'))
            labels.append('FishEye Camera')
        
        if has_rgb:
            handles.append(plt.Line2D([0], [0], marker='o', color='w',
                                     markerfacecolor='dodgerblue', markersize=10,
                                     label='RGB Camera'))
            labels.append('RGB Camera')
        
        if has_virtual:
            handles.append(plt.Line2D([0], [0], marker='o', color='w',
                                     markerfacecolor='purple', markersize=10,
                                     label='Virtual Camera'))
            labels.append('Virtual Camera')
        
        handles.append(plt.Line2D([0], [0], color='red', linewidth=2, label='X Axis'))
        handles.append(plt.Line2D([0], [0], color='green', linewidth=2, label='Y Axis'))
        handles.append(plt.Line2D([0], [0], color='blue', linewidth=2, label='Z Axis'))
        labels.extend(['X Axis', 'Y Axis', 'Z Axis'])
        
        self.ax.legend(handles, labels, loc='upper left', fontsize=9,
                      framealpha=0.9, edgecolor='gray')
        
        if is_interactive:
            self._save_initial_view()
            self._setup_controls()
        
        if output_path:
            for name, artists in self.camera_artists.items():
                for line in artists['frustum']:
                    line.set_visible(True)
            
            if is_interactive:
                self.checkbox.set_active(0)
            
            self.fig.savefig(output_path, dpi=150, bbox_inches='tight')
            print(f"Saved to {output_path}")
            
            if not show:
                for name, artists in self.camera_artists.items():
                    for line in artists['frustum']:
                        line.set_visible(self.show_frustum)
        
        if show and is_interactive:
            plt.show()
        elif show and not is_interactive:
            print("Note: Non-interactive backend. Use --output to save image.")
    
    def close(self):
        """Close the figure."""
        plt.close(self.fig)

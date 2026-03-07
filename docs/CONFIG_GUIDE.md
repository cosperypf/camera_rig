# 配置说明文档

## 文件结构

```
camera_rig/
├── device_calibration.xml       # 主配置文件
├── main.py                      # 主程序入口
├── camera_rig/                  # Python 模块
│   ├── parser.py                # XML 解析
│   ├── visualizer.py             # 3D 可视化
│   ├── transforms.py             # 坐标变换
│   └── config.py                # 配置管理
└── docs/
    └── CONFIG_GUIDE.md           # 本文档
```

## 使用方法

### 安装依赖

```bash
pip install -r requirements.txt
```

### 运行可视化

```bash
# 默认运行（显示窗口）
python main.py

# 保存图片
python main.py --output rig.png

# 不显示 IMU
python main.py --no-imu

# 自定义窗口大小
python main.py --figsize 16 12
```

### 命令行参数

| 参数 | 说明 |
|------|------|
| `xml_file` | 标定文件路径（默认: device_calibration.xml） |
| `-o, --output` | 保存图片路径 |
| `--no-show` | 不显示窗口（配合 --output 使用） |
| `--no-imu` | 不显示 IMU 坐标轴 |
| `--figsize` | 窗口大小（宽 高） |

---

## 设备配置说明

### 相机节点 (Camera)

每个 `<Camera>` 节点包含以下属性：

| 属性 | 说明 |
|------|------|
| `cam_name` | 相机名称（唯一标识） |
| `name` | 相机显示名称 |
| `id` | 相机 ID |

#### Calibration 子节点

| 属性 | 说明 |
|------|------|
| `size` | 图像分辨率 (宽 高) |
| `focal_length` | 焦距 (fx fy) |
| `principal_point` | 主点坐标 (cx cy) |
| `model` | 相机模型 |
| `radial_distortion` | 径向畸变系数 |

支持的相机模型：
- `FISHEYE_4_PARAMETERS` - 鱼眼相机（4参数）
- `RADIAL_6_PARAMETERS` - 针孔相机（6参数）

#### Rig 子节点

| 属性 | 说明 |
|------|------|
| `translation` | 相对于 Rig 原点的平移向量 (x y z)，单位：米 |
| `rowMajorRotationMat` | 行主序的 3x3 旋转矩阵（9个元素） |

### IMU 配置 (SFConfig)

在 `<SFConfig>` 节点的 `<Stateinit>` 子节点中：

| 属性 | 说明 |
|------|------|
| `ombc` | IMU 相对于 body 的旋转（3x3 旋转矩阵，行主序） |
| `tbc` | IMU 相对于 body 的平移向量 (x y z)，单位：米 |

---

## 虚拟设备配置 (VirtualDevices)

### 添加虚拟设备

在 `<DeviceConfiguration>` 根节点下，添加 `<VirtualDevices>` 节点：

```xml
<VirtualDevices>
    <Device name="设备名称" type="设备类型">
        <translation>x y z</translation>
        <rotation>roll pitch yaw</rotation>
    </Device>
</VirtualDevices>
```

### 设备类型 (type 属性)

| 类型 | 说明 |
|------|------|
| `axis_only` | 仅显示坐标轴（X红、Y绿、Z蓝） |
| `camera` | 显示完整相机（坐标轴 + 视锥体） |

### translation 节点

平移向量，格式：`x y z`，单位：米

相对于世界坐标系（trackingA 为原点）

### rotation 节点

欧拉角旋转，格式：`roll pitch yaw`，单位：度

旋转顺序：ZYX（yaw-pitch-roll）

- `roll` - 绕 X 轴旋转
- `pitch` - 绕 Y 轴旋转  
- `yaw` - 绕 Z 轴旋转

---

## 虚拟设备配置示例

### 示例 1: 仅坐标轴（参考视角）

```xml
<VirtualDevices>
    <Device name="front_view" type="axis_only">
        <translation>0.1 0 0.1</translation>
        <rotation>0 0 0</rotation>
    </Device>
</VirtualDevices>
```

这会在 (0.1, 0, 0.1) 位置创建一个坐标系，表示"前视图"参考。

### 示例 2: 俯视视角

```xml
<VirtualDevices>
    <Device name="top_view" type="axis_only">
        <translation>0 0.2 0</translation>
        <rotation>-90 0 0</rotation>
    </Device>
</VirtualDevices>
```

绕 X 轴旋转 -90 度，创建一个俯视视角的参考坐标系。

### 示例 3: 虚拟相机

```xml
<VirtualDevices>
    <Device name="virtual_cam" type="camera">
        <translation>0.05 -0.05 0.05</translation>
        <rotation>45 0 45</rotation>
    </Device>
</VirtualDevices>
```

创建一个虚拟相机，会显示：
- 坐标轴（红绿蓝三色）
- 视锥体（金字塔形）

### 示例 4: 多个虚拟设备

```xml
<VirtualDevices>
    <Device name="front_view" type="axis_only">
        <translation>0.1 0 0.1</translation>
        <rotation>0 0 0</rotation>
    </Device>
    <Device name="top_view" type="axis_only">
        <translation>0 0.2 0</translation>
        <rotation>-90 0 0</rotation>
    </Device>
    <Device name="side_view" type="axis_only">
        <translation>0.2 0 0</translation>
        <rotation>0 0 -90</rotation>
    </Device>
    <Device name="virtual_cam" type="camera">
        <translation>0.05 -0.05 0.05</translation>
        <rotation>45 30 60</rotation>
    </Device>
</VirtualDevices>
```

---

## 完整配置示例

```xml
<?xml version="1.0" encoding="UTF-8"?>
<DeviceConfiguration deviceUID="450F3T008G00000">
    <Camera cam_name="trackingA" name="trackingA" id="0">
        <Calibration size="640 480" principal_point="320.734285 237.339629" 
                     focal_length="214.404216 215.371914" 
                     model="FISHEYE_4_PARAMETERS" 
                     radial_distortion="0.439905568 -0.337965972 0.106343853 -0.010807713 0 0"/>
        <Rig translation="0.000000000 0.000000000 0.000000000" 
             rowMajorRotationMat="1 0 0 0 1 0 0 0 1"/>
    </Camera>
    <!-- ... 其他相机 ... -->
    
    <VirtualDevices>
        <Device name="front_view" type="axis_only">
            <translation>0.1 0 0.1</translation>
            <rotation>0 0 0</rotation>
        </Device>
        <Device name="top_view" type="axis_only">
            <translation>0 0.2 0</translation>
            <rotation>-90 0 0</rotation>
        </Device>
    </VirtualDevices>
    
    <SFConfig>
        <Stateinit ombc="0.051144120 -3.089531348 -0.336075092" 
                   tbc="-0.003884141 0.044687412 -0.013093027"/>
    </SFConfig>
</DeviceConfiguration>
```

---

## 可视化图例

渲染结果中：

- **黑色点**: 世界坐标系原点 (trackingA 位置)
- **红/绿/蓝线**: 坐标轴 (X红、Y绿、Z蓝)
- **橙色视锥体**: 鱼眼相机 (FISHEYE_4_PARAMETERS)
- **蓝色视锥体**: 针孔相机 (RADIAL_6_PARAMETERS)
- **紫色视锥体**: 虚拟相机 (VirtualDevice type="camera")
- **IMU 标签**: IMU 位置和方向

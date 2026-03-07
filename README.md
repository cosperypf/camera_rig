# Camera Rig Calibration Visualization Tool

相机 Rig 标定可视化工具，用于从高通标定文件 (device_calibration.xml) 重建和可视化相机 Rig 的空间布局。

## 项目背景

### 需求来源
- 解析高通相机标定 XML 文件 (device_calibration.xml)
- 可视化多相机系统 (如 VR/AR 头显、机器人视觉系统) 的空间布局
- 支持添加虚拟相机/设备进行仿真和测试
- 提供直观的标定结果验证与调试能力

### 核心需求
1. 以 trackingA 相机作为世界坐标系原点
2. 重建所有相机和 IMU 的位姿
3. 3D 可视化展示相机光心、坐标轴、视锥体
4. 支持添加和编辑虚拟设备
5. 导出修改后的标定文件

## 项目结构

```
camera_rig/
├── README.md                      # 本文档
├── python_version/                # Python 版本
│   ├── main.py                    # 主程序入口
│   ├── requirements.txt           # Python 依赖
│   ├── device_calibration.xml     # 标定文件示例
│   ├── camera_rig/                # Python 模块
│   │   ├── parser.py              # XML 解析
│   │   ├── visualizer.py          # Matplotlib 可视化
│   │   ├── transforms.py          # 坐标变换
│   │   └── config.py              # 配置管理
│   └── docs/
│       └── CONFIG_GUIDE.md        # 配置说明
│
└── web/                           # Web 版本 (Three.js)
    ├── index.html                 # 主页面
    ├── css/
    │   └── style.css              # 样式
    └── js/
        ├── main.js                # 入口
        ├── parser.js              # XML 解析
        ├── visualizer.js          # Three.js 渲染
        ├── ui.js                  # UI 控制
        └── exporter.js            # XML 导出
```

## 核心处理方式

### 1. 坐标系定义
- **世界坐标系**: 以 trackingA 相机为原点
  - X 轴 (红色): 向上
  - Y 轴 (绿色): 向左
  - Z 轴 (蓝色): 向内 (垂直屏幕)

### 2. 坐标变换
```
世界坐标 = R_ref^T × (R_cam × point + t_cam - t_ref)
```
其中 R_ref 和 t_ref 是 trackingA 的旋转和平移。

### 3. 视锥体计算
根据相机内参计算 FOV:
```
FOV_H = 2 × arctan(width / (2 × fx))
FOV_V = 2 × arctan(height / (2 × fy))
```

### 4. 旋转表示
- XML 中的旋转矩阵：行主序 3×3 矩阵
- 虚拟设备：欧拉角 (Roll, Pitch, Yaw)，单位：度
- 支持轴 - 角表示法 (IMU 的 ombc 参数)

## 使用方式

### Python 版本

#### 安装依赖
```bash
cd python_version
pip install -r requirements.txt
```

#### 运行
```bash
# 显示窗口
python main.py

# 保存图片
python main.py --output rig.png

# 不显示 IMU
python main.py --no-imu

# 自定义窗口大小
python main.py --figsize 16 12
```

#### 功能
- ✅ 解析 device_calibration.xml
- ✅ 3D 可视化 (Matplotlib)
- ✅ 显示相机光心、坐标轴、视锥体
- ✅ 显示 IMU 位置
- ✅ 支持虚拟设备配置

---

### Web 版本 (推荐)

#### 启动服务器
```bash
cd web
python3 -m http.server 8080
```

#### 访问
浏览器打开：`http://localhost:8080`

#### 功能
| 功能 | 说明 |
|------|------|
| **Upload XML** | 上传 device_calibration.xml 文件 |
| **Show Frustum** | 显示/隐藏相机视锥体 |
| **World Only** | 只显示世界原点坐标轴 |
| **Show Coordinates** | 显示设备到原点的坐标值 |
| **Reset View** | 重置视角 |
| **Add Virtual Device** | 添加虚拟相机/坐标轴 |
| **Edit Virtual Device** | 编辑/删除已添加的设备 |
| **Export XML** | 导出包含所有设备的标定文件 |

#### 交互操作
| 操作 | 效果 |
|------|------|
| 左键拖拽 | 旋转视角 |
| 右键拖拽 | 平移视角 |
| 滚轮 | 缩放 |

#### 添加虚拟设备
1. 输入设备名称
2. 选择类型：Axis Only (仅坐标轴) 或 Camera (带视锥体)
3. 设置平移 (X, Y, Z)，单位：米
4. 设置旋转 (Roll, Pitch, Yaw)，单位：度
5. 如选择 Camera 类型，配置内参：
   - Focal Length (fx, fy)：焦距，像素
   - Principal Point (cx, cy)：主点，像素
   - Resolution：图像分辨率
6. 点击 "Add Device"

#### 编辑虚拟设备
1. 在 "Edit Virtual Device" 下拉框选择设备
2. 自动填充当前参数
3. 修改参数
4. 点击 "Update Device"

#### 删除虚拟设备
- 在设备列表中点击 × 按钮

#### 导出标定文件
点击 "Export XML" 按钮，下载包含所有原始设备和虚拟设备的新标定文件。

## 技术栈

### Python 版本
- **numpy**: 数值计算
- **matplotlib**: 3D 可视化
- **lxml**: XML 解析

### Web 版本
- **Three.js (r128)**: 3D 渲染引擎
- **OrbitControls**: 相机控制
- **原生 JavaScript**: 无框架依赖

## XML 配置格式

### 虚拟设备配置示例
在 device_calibration.xml 中添加：

```xml
<VirtualDevices>
    <Device name="front_view" type="axis_only">
        <translation>0.1 0 0.1</translation>
        <rotation>0 0 0</rotation>
    </Device>
    <Device name="virtual_cam" type="camera">
        <translation>0.05 -0.05 0.05</translation>
        <rotation>45 0 45</rotation>
        <focalLength>200 200</focalLength>
        <principalPoint>320 240</principalPoint>
        <resolution width="640" height="480"/>
    </Device>
</VirtualDevices>
```

### 参数说明
| 参数 | 说明 | 单位 |
|------|------|------|
| translation | 平移向量 (x y z) | 米 |
| rotation | 欧拉角 (roll pitch yaw) | 度 |
| type | 设备类型：axis_only / camera | - |
| focalLength | 焦距 (fx fy) | 像素 |
| principalPoint | 主点 (cx cy) | 像素 |
| resolution | 图像分辨率 | 像素 |

## 图例说明

| 标识 | 含义 |
|------|------|
| ⚫ 黑色点 | 世界原点 (trackingA) |
| 🟠 橙色点 | 鱼眼相机 (FishEye) |
| 🔵 蓝色点 | RGB 相机 |
| 🟣 紫色点 | 虚拟相机 |
| 🔷 青色三角 | IMU |
| 🟥 红色线 | X 轴 |
| 🟩 绿色线 | Y 轴 |
| 🟦 蓝色线 | Z 轴 |

## 常见问题

### 1. Web 版本无法加载 Three.js
检查网络连接，需要访问 CDN:
- https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js
- https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js

### 2. 坐标轴显示方向不对
确认视图方向：
- 初始视角：X 向上，Y 向左，Z 向内
- 点击 "Reset View" 可恢复初始视角

### 3. 导出文件无法被其他工具识别
导出的 XML 遵循高通标定文件格式，确保：
- 包含必要的 Calibration、Rig 等节点
- 旋转矩阵为行主序 3×3
- 平移向量单位为米

## 可扩展性

未来可添加的功能：
- [ ] 交互式相机位姿拖拽编辑
- [ ] 标定参数编辑 GUI
- [ ] 基线距离测量
- [ ] 视场角 (FOV) 动态调整
- [ ] 点云/图像叠加显示
- [ ] 多 Rig 系统支持

## 许可证

本项目仅供学习和研究使用。

## 更新日期

2026 年 3 月 7 日

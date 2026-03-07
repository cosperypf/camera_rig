# Camera Rig Visualization (Web Version)

基于 Three.js 的相机 Rig 标定可视化工具

## 功能特性

- ✅ 上传 device_calibration.xml 文件
- ✅ 3D 可视化相机/IMU 位姿
- ✅ 显示相机视锥体
- ✅ 坐标轴显示（X 红、Y 绿、Z 蓝）
- ✅ 设备名称标签
- ✅ Show Frustum 开关
- ✅ World Only 模式
- ✅ Reset View 重置视角
- ✅ 手动添加虚拟设备

## 使用方法

### 1. 启动服务器

```bash
cd web
python3 -m http.server 8080
```

### 2. 打开浏览器

访问：http://localhost:8080

### 3. 上传 XML 文件

点击 "Upload XML" 按钮，选择 `device_calibration.xml` 文件

## 操作说明

| 操作 | 效果 |
|------|------|
| 左键拖拽 | 旋转视角 |
| 右键拖拽 | 平移视角 |
| 滚轮 | 缩放 |
| Show Frustum | 显示/隐藏视锥体 |
| World Only | 只显示原点和名称 |
| Reset View | 重置视角 |

## 添加虚拟设备

1. 输入设备名称
2. 选择类型（Axis Only / Camera）
3. 设置平移 (X, Y, Z) 单位：米
4. 设置旋转 (Roll, Pitch, Yaw) 单位：度
5. 点击 "Add Device"

## 坐标系

- **X 轴（红色）**: 向上
- **Y 轴（绿色）**: 向左
- **Z 轴（蓝色）**: 向内（垂直屏幕）

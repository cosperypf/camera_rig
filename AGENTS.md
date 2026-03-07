# AGENTS.md - Camera Rig 项目编码指南

## 项目概述

Camera Rig 标定可视化工具，包含两个实现版本：
- **Python 版本** (`python_version/`): 基于 Matplotlib 的 3D 可视化
- **Web 版本** (`web/`): 基于 Three.js 的交互式可视化

解析高通 device_calibration.xml 文件，可视化多相机系统的空间布局。

---

## 构建/运行命令

### Python 版本

```bash
cd python_version
pip install -r requirements.txt
python main.py                              # 显示窗口
python main.py --output rig.png             # 保存图片
python main.py --no-show --output rig.png   # 不显示窗口
python main.py --no-imu                     # 隐藏 IMU
python main.py --figsize 16 12              # 自定义尺寸
```

### Web 版本

```bash
cd web
python3 -m http.server 8080
# 访问：http://localhost:8080
```

### 测试

未配置测试框架。添加测试：
```bash
pip install pytest
pytest tests/test_parser.py -v    # 运行单个测试
pytest tests/ -v                  # 运行所有测试
```

### 代码检查（可选）

```bash
pip install ruff mypy
ruff check camera_rig/
mypy camera_rig/
```

---

## 代码风格指南

### Python 风格

**导入：**
- 顺序：标准库 → 第三方库 → 本地导入
- 使用相对导入：`from .transforms import ...`
- 每行一个导入

**命名约定：**
- 类：`PascalCase`（如 `CameraRig`, `VirtualDevice`）
- 函数/变量：`snake_case`（如 `parse_camera`, `focal_length`）
- 常量：`UPPER_SNAKE_CASE`（如 `AXIS_LENGTH`）
- 私有方法：`_前缀`（如 `_setup_axes`）

**类型提示：**
- 所有函数参数和返回值使用类型提示
- 使用 `Optional[T]` 表示可空值
- 使用 `List[T]`, `tuple` 表示集合

**文档字符串：**
- 所有公共函数/类使用三引号 docstring
- 包含 Args 和 Returns 部分

**数据类：**
- 使用 `@dataclass` 定义数据容器
- 指定默认值

**错误处理：**
- 抛出具体异常（`ValueError`, `FileNotFoundError`）
- 包含描述性错误信息

**格式化：**
- 最大行宽：约 100 字符
- 使用 f-string 格式化
- 使用 `@` 进行矩阵乘法（numpy）

---

### JavaScript 风格

**命名约定：**
- 类：`PascalCase`（如 `CameraRigParser`）
- 函数/变量：`camelCase`（如 `parseCameras`）
- 常量：`UPPER_SNAKE_CASE`

**注释：**
- 类和方法使用 JSDoc 风格注释
- 行内注释使用 `//`

**变量声明：**
- 使用 `const` 声明不可变引用
- 使用 `let` 声明可变变量
- 避免使用 `var`

**错误处理：**
- 使用 `throw new Error('message')` 抛出错误
- DOM 操作用 try/catch 包裹

**DOM 操作：**
- 缓存 DOM 元素引用
- 操作前检查元素是否存在

---

## 项目结构

```
camera_rig/
├── main.py                    # Python 入口
├── camera_rig/                # Python 包
│   ├── parser.py              # XML 解析，数据类
│   ├── visualizer.py          # Matplotlib 3D 渲染
│   ├── transforms.py          # 坐标变换
│   └── config.py              # CLI 参数解析
├── python_version/            # Python 版本副本
└── web/                       # Web 版本
    ├── index.html
    ├── css/style.css
    └── js/
        ├── main.js            # 入口
        ├── parser.js          # XML 解析
        ├── visualizer.js      # Three.js 渲染
        ├── ui.js              # UI 控制
        └── exporter.js        # XML 导出
```

---

## 关键技术细节

**坐标系：**
- 世界原点：trackingA 相机位置
- X 轴（红色）：向上
- Y 轴（绿色）：向左
- Z 轴（蓝色）：向内（垂直屏幕）

**变换公式：**
```
World = R_ref.T × (R_cam × point + t_cam - t_ref)
```

**矩阵格式：**
- XML 旋转：行主序 3×3 矩阵（9 个浮点数）
- IMU 旋转：轴角表示（3 个浮点数）→ 转换为矩阵
- 虚拟设备：欧拉角（roll, pitch, yaw，单位：度）

---

## Cursor/Copilot 规则

未找到 `.cursor/rules/` 或 `.github/copilot-instructions.md`。

---

## Git 约定

- 提交信息：使用祈使语气（"Add feature" 而非 "Added feature"）
- 保持提交专注于单一变更
- 不提交 `.DS_Store`、构建产物或生成的文件

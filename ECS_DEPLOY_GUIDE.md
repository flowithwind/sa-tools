# Content Review AI - 阿里云 ECS 部署指南

## 适用系统
- **AliOS 4 LTS 64位**

## 部署方式

### 方式一：一键部署脚本（推荐）

```bash
# 1. 下载部署脚本
curl -O https://raw.githubusercontent.com/flowithwind/sa-tools/main/ecs-deploy.sh

# 2. 添加执行权限
chmod +x ecs-deploy.sh

# 3. 运行部署脚本
sudo bash ecs-deploy.sh
```

---

### 方式二：手动分步部署

#### 步骤 1: 系统更新和基础工具

```bash
# 更新系统
sudo yum update -y

# 安装基础工具
sudo yum install -y git curl wget vim net-tools yum-utils device-mapper-persistent-data lvm2
```

#### 步骤 2: 安装 Docker

```bash
# 添加 Docker 仓库（使用阿里云镜像）
sudo yum-config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
sudo sed -i 's+download.docker.com+mirrors.aliyun.com/docker-ce+' /etc/yum.repos.d/docker-ce.repo

# 安装 Docker
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 启动并设置开机自启
sudo systemctl start docker
sudo systemctl enable docker

# 验证安装
docker --version
```

#### 步骤 3: 配置 Docker 镜像加速

```bash
# 创建配置文件
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<-'EOF'
{
    "registry-mirrors": [
        "https://mirror.ccs.tencentyun.com",
        "https://docker.mirrors.ustc.edu.cn",
        "https://hub-mirror.c.163.com"
    ],
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "100m",
        "max-file": "3"
    }
}
EOF

# 重启 Docker
sudo systemctl daemon-reload
sudo systemctl restart docker
```

#### 步骤 4: 克隆项目

```bash
# 创建项目目录
sudo mkdir -p /opt
cd /opt

# 克隆代码
sudo git clone https://github.com/flowithwind/sa-tools.git content-review-ai
cd content-review-ai
```

#### 步骤 5: 配置环境变量

```bash
# 创建 .env 文件
sudo tee .env <<-'EOF'
# 通义千问 API 配置 (必填)
DASHSCOPE_API_KEY=你的通义千问API密钥

# 火山引擎配置 (可选，用于豆包模型)
VOLCANO_ENGINE_API_KEY=你的火山引擎API密钥
VOLCANO_ENGINE_ENDPOINT_ID=你的端点ID

# 阿里云 OSS 配置 (必填，用于文件上传)
ALIBABA_CLOUD_ACCESS_KEY_ID=你的AccessKeyID
ALIBABA_CLOUD_ACCESS_KEY_SECRET=你的AccessKeySecret
OSS_BUCKET=你的OSS存储桶名称
OSS_REGION=oss-cn-hangzhou
OSS_ENDPOINT=https://oss-cn-hangzhou.aliyuncs.com

# 服务配置
NODE_ENV=production
EOF

# 编辑配置文件，填入实际值
sudo vim .env
```

#### 步骤 6: 构建并启动服务

```bash
# 构建镜像
sudo docker compose build

# 启动服务
sudo docker compose up -d

# 查看状态
sudo docker compose ps
```

#### 步骤 7: 配置防火墙

```bash
# 开放 3000 端口
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

#### 步骤 8: 配置阿里云安全组

1. 登录 [阿里云 ECS 控制台](https://ecs.console.aliyun.com/)
2. 进入实例详情页 → 安全组
3. 点击「手动添加」规则：
   - **授权策略**: 允许
   - **优先级**: 1
   - **协议类型**: TCP
   - **端口范围**: 3000/3000
   - **授权对象**: 0.0.0.0/0（或指定 IP）

---

## 环境变量说明

| 变量名 | 必填 | 说明 |
|-------|-----|------|
| `DASHSCOPE_API_KEY` | ✅ | 通义千问 API 密钥 |
| `VOLCANO_ENGINE_API_KEY` | ❌ | 火山引擎 API 密钥（豆包模型） |
| `VOLCANO_ENGINE_ENDPOINT_ID` | ❌ | 火山引擎端点 ID |
| `ALIBABA_CLOUD_ACCESS_KEY_ID` | ✅ | 阿里云 AccessKey ID |
| `ALIBABA_CLOUD_ACCESS_KEY_SECRET` | ✅ | 阿里云 AccessKey Secret |
| `OSS_BUCKET` | ✅ | OSS 存储桶名称 |
| `OSS_REGION` | ✅ | OSS 区域，如 oss-cn-hangzhou |
| `OSS_ENDPOINT` | ✅ | OSS 端点 URL |

---

## 常用运维命令

### 查看服务状态

```bash
cd /opt/content-review-ai
docker compose ps
```

### 查看实时日志

```bash
docker compose logs -f
```

### 重启服务

```bash
docker compose restart
```

### 停止服务

```bash
docker compose down
```

### 更新代码并重新部署

```bash
cd /opt/content-review-ai
git pull origin main
docker compose down
docker compose up -d --build
```

### 查看容器资源使用

```bash
docker stats
```

### 清理未使用的镜像

```bash
docker system prune -a
```

---

## 故障排查

### 服务无法启动

```bash
# 查看详细日志
docker compose logs

# 检查端口占用
netstat -tulpn | grep 3000

# 检查 Docker 状态
systemctl status docker
```

### API 调用失败

```bash
# 检查环境变量是否正确加载
docker compose exec content-review-ai env | grep API

# 测试网络连接
docker compose exec content-review-ai ping dashscope.aliyuncs.com
```

### 内存不足

```bash
# 查看内存使用
free -m

# 查看容器资源
docker stats --no-stream

# 清理资源
docker system prune -a
```

### 磁盘空间不足

```bash
# 查看磁盘使用
df -h

# 清理 Docker 占用空间
docker system prune -a --volumes
```

---

## 性能优化建议

1. **服务器配置**: 建议至少 2 核 4GB 内存
2. **使用 SSD 云盘**: 提升 I/O 性能
3. **配置 Nginx 反向代理**: 提供静态资源服务和 HTTPS
4. **启用日志轮转**: 避免日志文件过大
5. **配置云监控告警**: 及时发现问题

---

## 备份与恢复

### 备份配置文件

```bash
cp /opt/content-review-ai/.env /opt/content-review-ai/.env.backup.$(date +%Y%m%d)
```

### 备份 Docker 镜像

```bash
docker save -o content-review-ai-backup.tar content-review-ai:latest
```

### 恢复镜像

```bash
docker load -i content-review-ai-backup.tar
```

---

## 联系支持

如遇到问题，请收集以下信息后反馈：

1. 系统版本: `cat /etc/os-release`
2. Docker 版本: `docker --version`
3. 容器日志: `docker compose logs`
4. 资源使用: `docker stats --no-stream`

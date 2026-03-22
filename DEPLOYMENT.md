# 阿里云 ECS 部署指南

## 前提条件

1. 已安装 Docker 和 Docker Compose
2. 已获取所有必要的 API 密钥和配置信息

## 部署步骤

### 1. 在 ECS 上安装 Docker

```bash
# 更新系统包
sudo yum update -y

# 安装 Docker
sudo yum install docker -y

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker

# 添加当前用户到 docker 组（可选）
sudo usermod -aG docker $USER
```

### 2. 安装 Docker Compose

```bash
# 下载 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 添加执行权限
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker-compose --version
```

### 3. 上传项目文件

方式一：使用 SCP 上传
```bash
# 在本地终端执行
scp -r /path/to/project/* root@your-ecs-ip:/root/content-review-ai
```

方式二：使用 Git 克隆
```bash
# 在 ECS 上执行
git clone <your-repo-url> /root/content-review-ai
cd content-review-ai
```

### 4. 配置环境变量

在 ECS 上创建 `.env` 文件：

```bash
cd /root/content-review-ai
cat > .env << EOF
# 通义千问 API 配置
DASHSCOPE_API_KEY=your_dashscope_api_key

# 火山引擎配置
VOLCANO_ENGINE_API_KEY=your_volcano_api_key
VOLCANO_ENGINE_ENDPOINT_ID=your_endpoint_id

# 阿里云 OSS 配置
ALIBABA_CLOUD_ACCESS_KEY_ID=your_access_key_id
ALIBABA_CLOUD_ACCESS_KEY_SECRET=your_access_key_secret
OSS_BUCKET=your_bucket_name
OSS_REGION=oss-cn-hangzhou
OSS_ENDPOINT=https://oss-cn-hangzhou.aliyuncs.com
EOF
```

### 5. 构建并运行 Docker 镜像

#### 方式一：使用 Docker Compose（推荐）

```bash
cd /root/content-review-ai

# 构建并启动容器
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

#### 方式二：直接使用 Docker

```bash
cd /root/content-review-ai

# 构建镜像
docker build -t content-review-ai:latest .

# 运行容器
docker run -d \
  --name content-review-ai \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  content-review-ai:latest

# 查看日志
docker logs -f content-review-ai
```

### 6. 配置安全组

在阿里云控制台开放 3000 端口：

1. 登录阿里云 ECS 控制台
2. 进入实例详情页
3. 点击"安全组"标签
4. 点击"手动添加"规则：
   - 授权策略：允许
   - 优先级：1
   - 协议类型：TCP
   - 端口范围：3000/3000
   - 授权对象：0.0.0.0/0（或指定 IP）

### 7. 验证部署

访问：`http://your-ecs-ip:3000`

检查服务状态：
```bash
# Docker Compose 方式
docker-compose ps

# Docker 方式
docker ps
```

## 常用运维命令

### 查看日志
```bash
# Docker Compose
docker-compose logs -f

# Docker
docker logs -f content-review-ai
```

### 重启服务
```bash
# Docker Compose
docker-compose restart

# Docker
docker restart content-review-ai
```

### 更新部署
```bash
# 拉取最新代码
git pull origin main

# 重新构建并重启
docker-compose down
docker-compose up -d --build
```

### 备份数据
```bash
# 备份.env 文件
cp .env .env.backup.$(date +%Y%m%d)
```

## 性能优化建议

1. **增加内存**：建议至少 2GB RAM
2. **使用 SSD 云盘**：提升 I/O 性能
3. **配置反向代理**：使用 Nginx 提供静态资源
4. **启用 HTTPS**：配置 SSL 证书
5. **监控告警**：配置阿里云云监控

## 故障排查

### 容器无法启动
```bash
# 查看详细日志
docker-compose logs

# 检查端口占用
netstat -tulpn | grep 3000
```

### API 调用失败
```bash
# 检查环境变量
docker-compose exec content-review-ai env

# 测试网络连接
docker-compose exec content-review-ai ping dashscope.aliyuncs.com
```

### 内存不足
```bash
# 查看资源使用
docker stats

# 清理未使用的容器和镜像
docker system prune -a
```

## 技术支持

如遇到问题，请收集以下信息：
1. 容器日志：`docker-compose logs`
2. 系统日志：`journalctl -u docker`
3. 资源使用情况：`docker stats`

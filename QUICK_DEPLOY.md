# 快速部署到阿里云 ECS

## 方法一：使用部署脚本（推荐）

### 1. 本地构建并生成部署包

```bash
cd /Users/fengchan/projects/qoder/new-pro
./deploy.sh
```

选择选项 `3) 生成离线部署包`

### 2. 上传到 ECS

```bash
scp deploy-package.tar.gz root@your-ecs-ip:/root/
```

### 3. 在 ECS 上解压和配置

```bash
ssh root@your-ecs-ip

cd /root
tar -xzf deploy-package.tar.gz
cd deploy-package

# 配置环境变量
cp .env.template .env
vi .env  # 编辑填入实际的 API 密钥
```

### 4. 构建并运行

```bash
docker-compose up -d --build
```

## 方法二：手动构建 Docker 镜像

### 在 ECS 上直接构建

```bash
# 1. SSH 登录到 ECS
ssh root@your-ecs-ip

# 2. 安装 Git（如果没有）
yum install git -y

# 3. 克隆项目
git clone <your-repo-url> /root/content-review-ai
cd content-review-ai

# 4. 创建.env 文件
cat > .env << EOF
DASHSCOPE_API_KEY=your_key_here
VOLCANO_ENGINE_API_KEY=your_key_here
VOLCANO_ENGINE_ENDPOINT_ID=your_endpoint_id
ALIBABA_CLOUD_ACCESS_KEY_ID=your_key_here
ALIBABA_CLOUD_ACCESS_KEY_SECRET=your_secret_here
OSS_BUCKET=your_bucket_name
OSS_REGION=oss-cn-hangzhou
OSS_ENDPOINT=https://oss-cn-hangzhou.aliyuncs.com
EOF

# 5. 构建镜像
docker build -t content-review-ai:latest .

# 6. 运行容器
docker run -d \
  --name content-review-ai \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  content-review-ai:latest
```

## 方法三：使用阿里云容器镜像服务 ACR

### 1. 本地推送镜像到 ACR

```bash
# 登录阿里云容器镜像仓库
docker login --username=your-username registry.cn-hangzhou.aliyuncs.com

# 修改 deploy.sh 中的 REGISTRY_NAME 为你的仓库地址
# 然后执行推送
./deploy.sh
# 选择选项 2) 推送到阿里云容器镜像仓库
```

### 2. 在 ECS 上拉取并运行

```bash
# 登录 ACR
docker login --username=your-username registry.cn-hangzhou.aliyuncs.com

# 拉取镜像
docker pull registry.cn-hangzhou.aliyuncs.com/your-namespace/content-review-ai:latest

# 创建.env 文件
cat > .env << EOF
# ... 填入配置 ...
EOF

# 运行
docker run -d \
  --name content-review-ai \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  registry.cn-hangzhou.aliyuncs.com/your-namespace/content-review-ai:latest
```

## 验证部署

```bash
# 检查容器状态
docker ps

# 查看日志
docker logs -f content-review-ai

# 测试访问
curl http://localhost:3000
```

## 配置阿里云安全组

1. 登录阿里云控制台
2. 进入 ECS 实例详情
3. 点击"安全组"
4. 添加入站规则：
   - 协议：TCP
   - 端口：3000
   - 授权对象：0.0.0.0/0

## 访问应用

打开浏览器访问：`http://your-ecs-public-ip:3000`

## 常用运维命令

```bash
# 停止服务
docker stop content-review-ai

# 重启服务
docker restart content-review-ai

# 查看日志
docker logs -f content-review-ai

# 删除容器
docker rm -f content-review-ai

# 重新构建
docker-compose down
docker-compose up -d --build
```

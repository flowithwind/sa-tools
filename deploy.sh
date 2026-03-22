#!/bin/bash

# 阿里云 ECS Docker 镜像构建和部署脚本

set -e

# 配置变量
IMAGE_NAME="content-review-ai"
IMAGE_TAG="latest"
REGISTRY_NAME="registry.cn-hangzhou.aliyuncs.com/your-namespace/content-review-ai"

echo "======================================"
echo "阿里云 ECS Docker 部署工具"
echo "======================================"
echo ""

# 函数：构建本地镜像
build_local() {
    echo "🔨 开始构建本地 Docker 镜像..."
    docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .
    echo "✅ 本地镜像构建完成"
    echo ""
}

# 函数：推送到阿里云容器镜像服务
push_to_acr() {
    echo "📦 开始推送到阿里云容器镜像仓库..."
    
    # 检查是否已登录
    if ! docker info | grep -q "Username"; then
        echo "❌ 未登录到阿里云容器镜像仓库"
        echo "请先执行：docker login --username=your-username registry.cn-hangzhou.aliyuncs.com"
        exit 1
    fi
    
    # 标记镜像
    docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${REGISTRY_NAME}:${IMAGE_TAG}
    
    # 推送
    docker push ${REGISTRY_NAME}:${IMAGE_TAG}
    
    echo "✅ 镜像已推送到：${REGISTRY_NAME}:${IMAGE_TAG}"
    echo ""
}

# 函数：生成部署包
create_deploy_package() {
    echo "📁 生成离线部署包..."
    
    # 创建部署目录
    DEPLOY_DIR="deploy-package"
    mkdir -p ${DEPLOY_DIR}
    
    # 复制必要文件
    cp Dockerfile ${DEPLOY_DIR}/
    cp docker-compose.yml ${DEPLOY_DIR}/
    cp package.json ${DEPLOY_DIR}/
    cp next.config.js ${DEPLOY_DIR}/
    cp -r app ${DEPLOY_DIR}/
    cp -r components ${DEPLOY_DIR}/
    cp -r contexts ${DEPLOY_DIR}/
    cp -r types ${DEPLOY_DIR}/
    cp -r utils ${DEPLOY_DIR}/
    cp -r public ${DEPLOY_DIR}/ 2>/dev/null || true
    
    # 复制配置文件
    if [ -f ".env.local" ]; then
        cp .env.local ${DEPLOY_DIR}/.env.example
        echo "⚠️  .env.local 已复制为 .env.example（请手动配置密钥）"
    fi
    
    # 创建环境变量模板
    cat > ${DEPLOY_DIR}/.env.template << 'EOF'
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
    
    # 创建部署说明
    cat > ${DEPLOY_DIR}/README.md << 'EOF'
# 快速部署指南

## 在 ECS 上执行

1. 安装 Docker 和 Docker Compose（参考 DEPLOYMENT.md）
2. 配置环境变量：
   ```bash
   cp .env.template .env
   vi .env  # 编辑填入实际的 API 密钥
   ```
3. 构建并运行：
   ```bash
   docker-compose up -d --build
   ```
4. 访问：http://ecs-ip:3000

详细文档请参考：DEPLOYMENT.md
EOF
    
    # 打包
    tar -czf ${DEPLOY_DIR}.tar.gz ${DEPLOY_DIR}
    
    echo "✅ 部署包已生成："
    echo "   - ${DEPLOY_DIR}/ (部署文件目录)"
    echo "   - ${DEPLOY_DIR}.tar.gz (压缩包)"
    echo ""
    echo "📤 上传到 ECS:"
    echo "   scp ${DEPLOY_DIR}.tar.gz root@your-ecs-ip:/root/"
    echo ""
    
    # 清理临时目录
    rm -rf ${DEPLOY_DIR}
}

# 函数：直接部署到远程 ECS
deploy_to_ecs() {
    echo "🚀 开始部署到远程 ECS..."
    
    # 读取 ECS 配置
    read -p "请输入 ECS IP 地址：" ECS_IP
    read -p "请输入 SSH 端口（默认 22）：" SSH_PORT
    SSH_PORT=${SSH_PORT:-22}
    read -p "请输入 SSH 用户（默认 root）：" SSH_USER
    SSH_USER=${SSH_USER:-root}
    
    # 创建部署包
    create_deploy_package
    
    # 上传
    echo "📤 上传部署包到 ECS..."
    scp -P ${SSH_PORT} ${DEPLOY_DIR}.tar.gz ${SSH_USER}@${ECS_IP}:/root/
    
    # 远程部署
    echo "🔧 远程执行部署..."
    ssh -p ${SSH_PORT} ${SSH_USER}@${ECS_IP} << 'ENDSSH'
cd /root
tar -xzf deploy-package.tar.gz
cd deploy-package
cp .env.template .env
vi .env
echo "请编辑 .env 文件配置 API 密钥，完成后按回车继续..."
read
docker-compose up -d --build
ENDSSH
    
    echo "✅ 部署完成！"
    echo "访问地址：http://${ECS_IP}:3000"
    echo ""
    
    # 清理本地压缩包
    rm -f ${DEPLOY_DIR}.tar.gz
}

# 主菜单
show_menu() {
    echo "请选择操作："
    echo "1) 构建本地 Docker 镜像"
    echo "2) 推送到阿里云容器镜像仓库"
    echo "3) 生成离线部署包"
    echo "4) 直接部署到远程 ECS"
    echo "5) 退出"
    echo ""
}

# 主循环
while true; do
    show_menu
    read -p "请输入选项 (1-5): " choice
    
    case $choice in
        1)
            build_local
            ;;
        2)
            push_to_acr
            ;;
        3)
            create_deploy_package
            ;;
        4)
            deploy_to_ecs
            ;;
        5)
            echo "👋 再见！"
            exit 0
            ;;
        *)
            echo "❌ 无效选项，请重新选择"
            ;;
    esac
done

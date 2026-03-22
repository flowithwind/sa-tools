#!/bin/bash
#===============================================================================
# Content Review AI - 阿里云 ECS 一键部署脚本
# 适用系统: AliOS 4 LTS 64位
# 项目地址: https://github.com/flowithwind/sa-tools.git
#===============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
PROJECT_NAME="content-review-ai"
PROJECT_DIR="/opt/${PROJECT_NAME}"
GITHUB_REPO="https://github.com/flowithwind/sa-tools.git"

#-------------------------------------------------------------------------------
# 辅助函数
#-------------------------------------------------------------------------------
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "\n${BLUE}===================================================${NC}"
    echo -e "${BLUE}[STEP] $1${NC}"
    echo -e "${BLUE}===================================================${NC}\n"
}

check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "请使用 root 用户运行此脚本"
        log_info "使用: sudo bash $0"
        exit 1
    fi
}

#-------------------------------------------------------------------------------
# 步骤 1: 系统更新和基础工具安装
#-------------------------------------------------------------------------------
install_base_tools() {
    log_step "1/7 - 更新系统并安装基础工具"
    
    # 更新系统
    log_info "更新系统包..."
    yum update -y
    
    # 安装基础工具
    log_info "安装基础工具..."
    yum install -y \
        git \
        curl \
        wget \
        vim \
        net-tools \
        yum-utils \
        device-mapper-persistent-data \
        lvm2
    
    log_info "基础工具安装完成"
}

#-------------------------------------------------------------------------------
# 步骤 2: 安装 Docker
#-------------------------------------------------------------------------------
install_docker() {
    log_step "2/7 - 安装 Docker"
    
    # 检查是否已安装
    if command -v docker &> /dev/null; then
        log_info "Docker 已安装，版本: $(docker --version)"
        return 0
    fi
    
    # 添加 Docker 仓库
    log_info "添加 Docker 仓库..."
    yum-config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
    
    # 替换为阿里云镜像
    sed -i 's+download.docker.com+mirrors.aliyun.com/docker-ce+' /etc/yum.repos.d/docker-ce.repo
    
    # 安装 Docker
    log_info "安装 Docker Engine..."
    yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # 启动 Docker
    log_info "启动 Docker 服务..."
    systemctl start docker
    systemctl enable docker
    
    # 配置 Docker 镜像加速
    log_info "配置 Docker 镜像加速..."
    mkdir -p /etc/docker
    cat > /etc/docker/daemon.json << 'EOF'
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
    
    # 重启 Docker 使配置生效
    systemctl daemon-reload
    systemctl restart docker
    
    log_info "Docker 安装完成，版本: $(docker --version)"
}

#-------------------------------------------------------------------------------
# 步骤 3: 安装 Docker Compose
#-------------------------------------------------------------------------------
install_docker_compose() {
    log_step "3/7 - 安装 Docker Compose"
    
    # 检查是否已安装 (新版本使用 docker compose)
    if docker compose version &> /dev/null; then
        log_info "Docker Compose 已安装 (docker compose plugin)"
        return 0
    fi
    
    # 如果插件不可用，安装独立版本
    if ! command -v docker-compose &> /dev/null; then
        log_info "安装 Docker Compose 独立版本..."
        curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
        ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    fi
    
    log_info "Docker Compose 安装完成"
}

#-------------------------------------------------------------------------------
# 步骤 4: 克隆项目代码
#-------------------------------------------------------------------------------
clone_project() {
    log_step "4/7 - 克隆项目代码"
    
    # 创建项目目录
    if [ -d "$PROJECT_DIR" ]; then
        log_warn "项目目录已存在: $PROJECT_DIR"
        read -p "是否删除并重新克隆? (y/n): " confirm
        if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
            rm -rf "$PROJECT_DIR"
        else
            log_info "跳过克隆，使用现有代码"
            return 0
        fi
    fi
    
    # 克隆代码
    log_info "克隆项目代码..."
    git clone "$GITHUB_REPO" "$PROJECT_DIR"
    
    log_info "项目代码克隆完成: $PROJECT_DIR"
}

#-------------------------------------------------------------------------------
# 步骤 5: 配置环境变量
#-------------------------------------------------------------------------------
configure_env() {
    log_step "5/7 - 配置环境变量"
    
    cd "$PROJECT_DIR"
    
    # 检查是否已有配置
    if [ -f ".env" ]; then
        log_warn ".env 文件已存在"
        read -p "是否重新配置? (y/n): " confirm
        if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
            log_info "跳过环境变量配置"
            return 0
        fi
    fi
    
    # 创建环境变量文件
    cat > .env << 'EOF'
# ============================================
# Content Review AI 环境变量配置
# ============================================

# 通义千问 API 配置 (必填)
DASHSCOPE_API_KEY=your_dashscope_api_key_here

# 火山引擎配置 (可选，用于豆包模型)
VOLCANO_ENGINE_API_KEY=your_volcano_api_key_here
VOLCANO_ENGINE_ENDPOINT_ID=your_endpoint_id_here

# 阿里云 OSS 配置 (必填，用于文件上传)
ALIBABA_CLOUD_ACCESS_KEY_ID=your_access_key_id_here
ALIBABA_CLOUD_ACCESS_KEY_SECRET=your_access_key_secret_here
OSS_BUCKET=your_bucket_name
OSS_REGION=oss-cn-hangzhou
OSS_ENDPOINT=https://oss-cn-hangzhou.aliyuncs.com

# 服务配置
NODE_ENV=production
EOF
    
    log_warn "请编辑 .env 文件，填入实际的 API 密钥"
    log_info "配置文件路径: $PROJECT_DIR/.env"
    
    # 提示用户编辑
    read -p "是否现在编辑 .env 文件? (y/n): " edit_now
    if [ "$edit_now" = "y" ] || [ "$edit_now" = "Y" ]; then
        vim .env
    fi
}

#-------------------------------------------------------------------------------
# 步骤 6: 构建并启动服务
#-------------------------------------------------------------------------------
build_and_start() {
    log_step "6/7 - 构建并启动服务"
    
    cd "$PROJECT_DIR"
    
    # 检查 .env 是否配置
    if grep -q "your_dashscope_api_key_here" .env 2>/dev/null; then
        log_error ".env 文件中的 API 密钥尚未配置"
        log_info "请先编辑 $PROJECT_DIR/.env 文件"
        exit 1
    fi
    
    # 构建镜像
    log_info "构建 Docker 镜像（首次构建可能需要几分钟）..."
    docker compose build --no-cache
    
    # 启动服务
    log_info "启动服务..."
    docker compose up -d
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 10
    
    # 检查服务状态
    if docker compose ps | grep -q "Up"; then
        log_info "服务启动成功！"
    else
        log_error "服务启动失败，请检查日志"
        docker compose logs
        exit 1
    fi
}

#-------------------------------------------------------------------------------
# 步骤 7: 配置防火墙
#-------------------------------------------------------------------------------
configure_firewall() {
    log_step "7/7 - 配置防火墙"
    
    # 检查 firewalld 状态
    if systemctl is-active --quiet firewalld; then
        log_info "开放 3000 端口..."
        firewall-cmd --permanent --add-port=3000/tcp
        firewall-cmd --reload
        log_info "防火墙规则已添加"
    else
        log_warn "firewalld 未运行，跳过防火墙配置"
    fi
    
    # 提醒安全组配置
    echo ""
    log_warn "=========================================="
    log_warn "重要提醒: 请在阿里云控制台配置安全组规则"
    log_warn "=========================================="
    echo ""
    echo "  1. 登录阿里云 ECS 控制台"
    echo "  2. 找到当前实例 -> 安全组"
    echo "  3. 添加入站规则:"
    echo "     - 协议: TCP"
    echo "     - 端口: 3000"
    echo "     - 授权对象: 0.0.0.0/0 (或指定 IP)"
    echo ""
}

#-------------------------------------------------------------------------------
# 显示部署结果
#-------------------------------------------------------------------------------
show_result() {
    # 获取服务器 IP
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
    
    echo ""
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}       部署完成！                          ${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    echo -e "  访问地址: ${BLUE}http://${SERVER_IP}:3000${NC}"
    echo ""
    echo "  常用命令:"
    echo "  ─────────────────────────────────────────"
    echo "  cd $PROJECT_DIR"
    echo ""
    echo "  # 查看服务状态"
    echo "  docker compose ps"
    echo ""
    echo "  # 查看日志"
    echo "  docker compose logs -f"
    echo ""
    echo "  # 重启服务"
    echo "  docker compose restart"
    echo ""
    echo "  # 停止服务"
    echo "  docker compose down"
    echo ""
    echo "  # 更新代码并重新部署"
    echo "  git pull && docker compose up -d --build"
    echo ""
    echo -e "${GREEN}============================================${NC}"
}

#-------------------------------------------------------------------------------
# 主函数
#-------------------------------------------------------------------------------
main() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     Content Review AI - 阿里云 ECS 一键部署脚本          ║${NC}"
    echo -e "${BLUE}║     适用系统: AliOS 4 LTS 64位                           ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # 检查 root 权限
    check_root
    
    # 执行部署步骤
    install_base_tools
    install_docker
    install_docker_compose
    clone_project
    configure_env
    build_and_start
    configure_firewall
    
    # 显示结果
    show_result
}

# 运行主函数
main "$@"

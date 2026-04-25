#!/bin/bash
# Chromino 服务部署脚本
# 使用 podman-compose 在目标服务器上部署服务
# 依赖环境变量：CHROMINO_IMAGE（可选，未设置则使用 docker-compose.yml 默认值）

set -e

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
echo_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
echo_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_dependencies() {
    echo_info "检查系统依赖..."
    if ! command -v podman &> /dev/null; then
        echo_error "podman 未安装，请先安装 podman"
        exit 1
    fi
    if ! command -v podman-compose &> /dev/null; then
        echo_error "podman-compose 未安装，请先安装 podman-compose"
        exit 1
    fi
    echo_info "依赖检查完成"
}

deploy_services() {
    echo_info "部署服务..."
    if [ -n "$CHROMINO_IMAGE" ]; then
        echo_info "使用镜像：$CHROMINO_IMAGE"
    fi

    echo_info "停止现有服务..."
    podman-compose -f "$COMPOSE_FILE" down || true

    echo_info "拉取最新镜像..."
    podman-compose -f "$COMPOSE_FILE" pull

    echo_info "启动服务..."
    podman-compose -f "$COMPOSE_FILE" up -d

    echo_info "服务部署完成"
}

check_services() {
    echo_info "检查服务状态..."
    sleep 5
    podman-compose -f "$COMPOSE_FILE" ps
}

main() {
    check_dependencies
    deploy_services
    check_services
    echo_info "✅ 部署完成"
}

main

#!/bin/bash

# NewsHub RSS聚合平台 - 快速部署脚本
# 使用方法: chmod +x deploy.sh && ./deploy.sh

echo "🚀 NewsHub RSS聚合平台 - 部署脚本"
echo "=================================="

# 检查Git是否已初始化
if [ ! -d ".git" ]; then
    echo "📁 初始化Git仓库..."
    git init
    echo "✅ Git仓库初始化完成"
fi

# 检查是否有远程仓库
if ! git remote get-url origin &> /dev/null; then
    echo "⚠️  请先设置GitHub远程仓库："
    echo "   git remote add origin https://github.com/yourusername/newshub-rss-aggregator.git"
    echo ""
    echo "📝 创建GitHub仓库步骤："
    echo "   1. 访问 https://github.com/new"
    echo "   2. 仓库名称: newshub-rss-aggregator"
    echo "   3. 设置为Public"
    echo "   4. 不要初始化README (我们已有文件)"
    echo "   5. 创建仓库后复制仓库URL"
    echo ""
    read -p "请输入您的GitHub仓库URL: " repo_url
    git remote add origin "$repo_url"
    echo "✅ 远程仓库已设置: $repo_url"
fi

# 添加所有文件
echo "📦 添加项目文件..."
git add .

# 提交代码
echo "💾 提交代码..."
commit_message="🎉 Deploy NewsHub RSS Aggregator - $(date '+%Y-%m-%d %H:%M:%S')"
git commit -m "$commit_message"

# 推送到GitHub
echo "🌐 推送到GitHub..."
git push -u origin main

echo ""
echo "✅ 代码已推送到GitHub!"
echo ""
echo "🚀 接下来的部署步骤:"
echo "=================================="
echo "1. 访问 https://vercel.com"
echo "2. 使用GitHub账号登录"
echo "3. 点击 'New Project'"
echo "4. 选择 'newshub-rss-aggregator' 仓库"
echo "5. 点击 'Import'"
echo "6. 保持默认设置，点击 'Deploy'"
echo "7. 等待部署完成 (约1-2分钟)"
echo ""
echo "🎯 部署完成后，您将获得一个形如以下的免费域名:"
echo "   https://newshub-rss-aggregator-xxx.vercel.app"
echo ""
echo "🔄 后续更新网站:"
echo "   修改代码后运行: ./deploy.sh"
echo "   Vercel会自动重新部署最新版本"
echo ""
echo "📚 详细部署指南请查看: DEPLOYMENT.md"
echo ""
echo "🎉 祝您部署顺利!"
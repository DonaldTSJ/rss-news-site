#!/bin/bash

# NewsHub 构建脚本 - 为Vercel准备public目录

echo "🏗️  构建NewsHub..."

# 创建public目录
mkdir -p public

# 复制核心文件到public目录
echo "📁 复制文件到public目录..."
cp index.html public/
cp style.css public/
cp script.js public/

echo "✅ 构建完成!"
echo "📂 public目录内容:"
ls -la public/

echo ""
echo "🚀 现在可以部署到Vercel了!"
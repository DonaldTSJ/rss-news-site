// RSS资讯聚合网站核心功能
class RSSReader {
    constructor() {
        // 默认RSS源
        this.defaultSources = [
            { url: 'https://www.qbitai.com/feed', name: '量子位', enabled: true },
            { url: 'https://feeds.feedburner.com/qbitai', name: '量子位备用', enabled: false },
            { url: 'https://rss.cnn.com/rss/edition.rss', name: 'CNN News', enabled: false }
        ];
        
        this.feedContainer = document.getElementById('feed');
        this.loadingElement = document.getElementById('loading');
        this.errorElement = document.getElementById('error');
        this.lastUpdateElement = document.getElementById('last-update-time');
        this.refreshBtn = document.getElementById('refresh-btn');
        this.manageBtn = document.getElementById('manage-sources-btn');
        this.rssManager = document.getElementById('rss-manager');
        this.closeManagerBtn = document.getElementById('close-manager');
        this.addRssBtn = document.getElementById('add-rss-btn');
        this.rssUrlInput = document.getElementById('rss-url-input');
        this.rssNameInput = document.getElementById('rss-name-input');
        this.sourcesList = document.getElementById('sources-list');
        
        // 分页相关元素
        this.paginationContainer = document.getElementById('pagination');
        this.paginationInfo = document.getElementById('pagination-info-text');
        this.firstPageBtn = document.getElementById('first-page-btn');
        this.prevPageBtn = document.getElementById('prev-page-btn');
        this.nextPageBtn = document.getElementById('next-page-btn');
        this.lastPageBtn = document.getElementById('last-page-btn');
        this.pageNumbers = document.getElementById('page-numbers');
        this.pageSizeSelect = document.getElementById('page-size-select');
        
        // 分页状态
        this.allFeedItems = []; // 存储所有RSS条目
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalPages = 0;
        
        // 加载保存的RSS源
        this.loadSavedSources();
        
        this.init();
    }
    
    init() {
        // 绑定事件
        this.refreshBtn.addEventListener('click', () => {
            this.loadAllFeeds();
        });
        
        this.manageBtn.addEventListener('click', () => {
            this.toggleRSSManager();
        });
        
        this.closeManagerBtn.addEventListener('click', () => {
            this.hideRSSManager();
        });
        
        this.addRssBtn.addEventListener('click', () => {
            this.addRSSSource();
        });
        
        // 绑定快速添加按钮
        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const url = btn.getAttribute('data-url');
                const name = btn.getAttribute('data-name');
                this.rssUrlInput.value = url;
                this.rssNameInput.value = name;
            });
        });
        
        // 回车键添加RSS源
        this.rssUrlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addRSSSource();
            }
        });
        
        // 分页事件监听
        this.firstPageBtn.addEventListener('click', () => {
            this.goToPage(1);
        });
        
        this.prevPageBtn.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.goToPage(this.currentPage - 1);
            }
        });
        
        this.nextPageBtn.addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.goToPage(this.currentPage + 1);
            }
        });
        
        this.lastPageBtn.addEventListener('click', () => {
            this.goToPage(this.totalPages);
        });
        
        this.pageSizeSelect.addEventListener('change', (e) => {
            this.pageSize = parseInt(e.target.value);
            this.currentPage = 1; // 重置到第一页
            this.renderCurrentPage();
        });
        
        // 初始化RSS源列表显示
        this.renderSourcesList();
        
        // 页面加载时自动获取RSS
        this.loadAllFeeds();
    }
    
    // 显示加载状态
    showLoading() {
        this.loadingElement.style.display = 'block';
        this.errorElement.style.display = 'none';
        this.feedContainer.innerHTML = '';
        this.refreshBtn.disabled = true;
        this.refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 加载中...';
    }
    
    // 隐藏加载状态
    hideLoading() {
        this.loadingElement.style.display = 'none';
        this.refreshBtn.disabled = false;
        this.refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> 刷新资讯';
        
        // 更新最后更新时间
        if (this.lastUpdateElement) {
            this.lastUpdateElement.textContent = new Date().toLocaleString('zh-CN');
        }
    }
    
    // 显示错误信息
    showError(message = '加载失败，请稍后重试', debugInfo = '') {
        this.hideLoading();
        this.errorElement.style.display = 'block';
        
        // 更新错误信息
        const errorContent = this.errorElement.querySelector('.error-content p');
        if (errorContent) {
            errorContent.textContent = message;
        }
        
        // 显示调试信息
        const debugContent = document.getElementById('debug-content');
        if (debugContent && debugInfo) {
            debugContent.textContent = debugInfo;
        }
    }
    
    // 获取RSS数据
    async loadFeed() {
        this.showLoading();
        
        try {
            const currentRssUrl = this.rssSources[this.currentSourceIndex];
            console.log('当前使用RSS源:', currentRssUrl);
            
            // 尝试多个代理服务，提高成功率
            const proxyServices = [
                `https://api.allorigins.win/get?url=${encodeURIComponent(currentRssUrl)}`,
                `https://cors-anywhere.herokuapp.com/${currentRssUrl}`,
                `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(currentRssUrl)}`
            ];
            
            let lastError = null;
            
            for (const proxyUrl of proxyServices) {
                try {
                    console.log('尝试代理服务:', proxyUrl);
                    
                    const response = await fetch(proxyUrl, {
                        headers: {
                            'Accept': 'application/xml, text/xml, */*'
                        }
                    });
                    
                    if (!response.ok) {
                        throw new Error(`HTTP错误! 状态: ${response.status}`);
                    }
                    
                    let xmlText;
                    
                    // 根据不同代理服务处理响应
                    if (proxyUrl.includes('allorigins.win')) {
                        const data = await response.json();
                        xmlText = data.contents;
                        
                        // 检查是否是base64编码的数据
                        if (xmlText.startsWith('data:application/rss+xml') || xmlText.startsWith('data:text/xml')) {
                            console.log('检测到base64编码的数据，正在解码...');
                            const base64Data = xmlText.split(',')[1];
                            if (base64Data) {
                                try {
                                    // 使用更好的base64解码方法处理UTF-8编码
                                    const binaryString = atob(base64Data);
                                    
                                    // 将二进制字符串转换为UTF-8
                                    const bytes = new Uint8Array(binaryString.length);
                                    for (let i = 0; i < binaryString.length; i++) {
                                        bytes[i] = binaryString.charCodeAt(i);
                                    }
                                    
                                    // 使用TextDecoder正确解码UTF-8
                                    const decoder = new TextDecoder('utf-8');
                                    xmlText = decoder.decode(bytes);
                                    
                                    console.log('base64解码并UTF-8转换成功');
                                    console.log('解码后前200字符:', xmlText.substring(0, 200));
                                } catch (e) {
                                    console.warn('base64解码失败，尝试简单解码:', e);
                                    // 回退到简单解码
                                    try {
                                        xmlText = atob(base64Data);
                                    } catch (e2) {
                                        console.error('所有解码方法都失败:', e2);
                                    }
                                }
                            }
                        }
                    } else {
                        xmlText = await response.text();
                    }
                    
                    if (!xmlText || xmlText.length < 100) {
                        throw new Error('获取到的数据为空或过短');
                    }
                    
                    console.log('成功获取RSS数据，使用代理:', proxyUrl);
                    
                    // 解析XML
                    this.parseRSS(xmlText);
                    return; // 成功则退出循环
                    
                } catch (error) {
                    console.warn(`代理服务失败 ${proxyUrl}:`, error.message);
                    lastError = error;
                    continue; // 尝试下一个代理服务
                }
            }
            
            // 所有代理服务都失败了
            throw lastError || new Error('所有代理服务都无法访问');
            
        } catch (error) {
            console.error('获取RSS失败:', error);
            const debugInfo = `错误详情: ${error.message}\n当前RSS源: ${this.rssSources[this.currentSourceIndex]}\n时间: ${new Date().toLocaleString()}`;
            this.showError(`获取数据失败: ${error.message}`, debugInfo);
        }
    }
    
    // 解析RSS XML
    parseRSS(xmlText) {
        try {
            console.log('开始解析XML，原始数据长度:', xmlText.length);
            console.log('XML前100个字符:', xmlText.substring(0, 100));
            
            // 清理XML文本，移除可能的BOM和多余空白
            let cleanXmlText = xmlText.trim().replace(/^\uFEFF/, '');
            
            // 如果XML中包含HTML实体，尝试解码
            cleanXmlText = cleanXmlText.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
            
            // 使用DOMParser解析XML
            const parser = new DOMParser();
            let xmlDoc = parser.parseFromString(cleanXmlText, 'application/xml');
            
            // 检查解析是否成功
            let parseError = xmlDoc.querySelector('parsererror');
            if (parseError) {
                console.warn('XML解析失败，尝试作为HTML解析:', parseError.textContent);
                // 尝试作为HTML解析
                xmlDoc = parser.parseFromString(cleanXmlText, 'text/html');
                parseError = xmlDoc.querySelector('parsererror');
                if (parseError) {
                    throw new Error(`XML和HTML解析都失败: ${parseError.textContent}`);
                }
            }
            
            // 尝试多种方式获取item节点
            let items = this.findRSSItems(xmlDoc);
            
            console.log('找到RSS条目数量:', items.length);
            
            if (items.length === 0) {
                // 打印XML结构帮助调试
                console.log('XML根元素:', xmlDoc.documentElement?.tagName || 'undefined');
                if (xmlDoc.documentElement) {
                    console.log('XML子元素:', Array.from(xmlDoc.documentElement.children).map(el => el.tagName));
                }
                
                // 尝试简单的正则表达式解析作为备选方案
                const regexItems = this.parseRSSWithRegex(cleanXmlText);
                if (regexItems.length > 0) {
                    console.log('使用正则表达式解析成功，找到', regexItems.length, '个条目');
                    this.renderRegexItems(regexItems);
                    this.hideLoading();
                    return;
                }
                
                throw new Error('未找到RSS条目，请检查RSS格式');
            }
            
            // 渲染RSS条目
            this.renderFeedItems(items);
            this.hideLoading();
            
        } catch (error) {
            console.error('解析RSS失败:', error);
            const debugInfo = `解析错误: ${error.message}\nXML长度: ${xmlText.length}\nXML开头: ${xmlText.substring(0, 200)}\n时间: ${new Date().toLocaleString()}`;
            this.showError(`解析数据失败: ${error.message}`, debugInfo);
        }
    }
    
    // 多种方式查找RSS条目
    findRSSItems(xmlDoc) {
        console.log('开始查找RSS条目...');
        console.log('XML根元素:', xmlDoc.documentElement?.tagName);
        
        // 打印XML结构用于调试
        if (xmlDoc.documentElement) {
            const children = Array.from(xmlDoc.documentElement.children);
            console.log('根元素的子元素:', children.map(el => el.tagName));
            
            // 如果有channel元素，查看其子元素
            const channel = xmlDoc.querySelector('channel');
            if (channel) {
                const channelChildren = Array.from(channel.children);
                console.log('channel的子元素:', channelChildren.map(el => el.tagName));
            }
        }
        
        const selectors = [
            'item',
            'rss item',
            'channel item',
            'rss > channel > item',
            'feed entry',
            'entry',
            'rss entry',
            'channel entry'
        ];
        
        for (const selector of selectors) {
            try {
                const items = xmlDoc.querySelectorAll(selector);
                if (items.length > 0) {
                    console.log(`✅ 使用选择器 "${selector}" 找到 ${items.length} 个条目`);
                    return items;
                }
                console.log(`❌ 选择器 "${selector}" 未找到条目`);
            } catch (e) {
                console.warn(`选择器 "${selector}" 查询失败:`, e);
            }
        }
        
        // 尝试getElementsByTagName
        const tagNames = ['item', 'entry'];
        for (const tagName of tagNames) {
            try {
                const items = xmlDoc.getElementsByTagName(tagName);
                if (items.length > 0) {
                    console.log(`✅ 使用标签名 "${tagName}" 找到 ${items.length} 个条目`);
                    return items;
                }
                console.log(`❌ 标签名 "${tagName}" 未找到条目`);
            } catch (e) {
                console.warn(`标签名 "${tagName}" 查询失败:`, e);
            }
        }
        
        // 尝试查找所有可能包含内容的元素
        const allElements = xmlDoc.querySelectorAll('*');
        console.log('XML中所有元素类型:', [...new Set(Array.from(allElements).map(el => el.tagName))]);
        
        return [];
    }
    
    // 正则表达式解析RSS作为备选方案
    parseRSSWithRegex(xmlText) {
        const items = [];
        const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
        let match;
        
        while ((match = itemRegex.exec(xmlText)) !== null && items.length < 20) {
            const itemContent = match[1];
            
            const titleMatch = itemContent.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
            const linkMatch = itemContent.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
            const pubDateMatch = itemContent.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);
            const descriptionMatch = itemContent.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
            
            items.push({
                title: titleMatch ? this.stripHtml(titleMatch[1].trim()) : '无标题',
                link: linkMatch ? linkMatch[1].trim() : '#',
                pubDate: pubDateMatch ? pubDateMatch[1].trim() : '',
                description: descriptionMatch ? this.stripHtml(descriptionMatch[1].trim()) : ''
            });
        }
        
        return items;
    }
    
    // 渲染正则表达式解析的条目
    renderRegexItems(items) {
        this.feedContainer.innerHTML = '';
        
        items.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'feed-item';
            li.style.animationDelay = `${index * 0.1}s`;
            
            const formattedDate = this.formatDate(item.pubDate);
            const cleanDescription = item.description.substring(0, 200) + '...';
            
            li.innerHTML = `
                <div class="feed-title">
                    <a href="${item.link}" target="_blank" rel="noopener noreferrer">
                        ${item.title}
                    </a>
                </div>
                <div class="feed-meta">
                    <span class="feed-author">👤 量子位</span>
                    <span class="feed-date">📅 ${formattedDate}</span>
                </div>
                <div class="feed-description">
                    ${cleanDescription}
                </div>
            `;
            
            this.feedContainer.appendChild(li);
        });
    }
    
    // 渲染RSS条目到页面
    renderFeedItems(items) {
        // 清空容器
        this.feedContainer.innerHTML = '';
        
        // 遍历每个item
        Array.from(items).slice(0, 20).forEach((item, index) => {
            const feedItem = this.createFeedItem(item, index);
            this.feedContainer.appendChild(feedItem);
        });
    }
    
    // 创建单个RSS条目元素
    createFeedItem(item, index) {
        // 提取数据
        const title = this.getTextContent(item, 'title');
        const link = this.getTextContent(item, 'link');
        const pubDate = this.getTextContent(item, 'pubDate');
        const description = this.getTextContent(item, 'description');
        const author = this.getTextContent(item, 'dc\\:creator') || 
                      this.getTextContent(item, 'author') || '量子位';
        
        // 创建列表项
        const li = document.createElement('li');
        li.className = 'feed-item';
        li.style.animationDelay = `${index * 0.1}s`;
        
        // 格式化日期
        const formattedDate = this.formatDate(pubDate);
        
        // 清理描述文本（移除HTML标签）
        const cleanDescription = this.stripHtml(description).substring(0, 200) + '...';
        
        li.innerHTML = `
            <div class="feed-title">
                <a href="${link}" target="_blank" rel="noopener noreferrer">
                    ${title}
                </a>
            </div>
            <div class="feed-meta">
                <span class="feed-author">👤 ${author}</span>
                <span class="feed-date">📅 ${formattedDate}</span>
            </div>
            <div class="feed-description">
                ${cleanDescription}
            </div>
        `;
        
        return li;
    }
    
    // 安全获取XML节点文本内容
    getTextContent(item, selector) {
        try {
            // 尝试直接查询
            let element = item.querySelector(selector);
            
            // 如果没找到，尝试不同的选择器变体
            if (!element) {
                const alternatives = [
                    selector.replace('dc\\:', 'dc:'),
                    selector.replace('\\:', ':'),
                    selector
                ];
                
                for (const alt of alternatives) {
                    element = item.querySelector(alt) || 
                             item.getElementsByTagName(alt.split(':').pop())[0];
                    if (element) break;
                }
            }
            
            return element ? element.textContent.trim() : '';
        } catch (error) {
            console.warn(`获取 ${selector} 内容失败:`, error);
            return '';
        }
    }
    
    // 格式化日期
    formatDate(dateString) {
        if (!dateString) return '未知日期';
        
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '未知日期';
            
            const now = new Date();
            const diffTime = now - date;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
            const diffMinutes = Math.floor(diffTime / (1000 * 60));
            
            if (diffMinutes < 60) {
                return `${diffMinutes}分钟前`;
            } else if (diffHours < 24) {
                return `${diffHours}小时前`;
            } else if (diffDays < 7) {
                return `${diffDays}天前`;
            } else {
                return date.toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            }
        } catch (error) {
            return '未知日期';
        }
    }
    
    // 移除HTML标签并清理文本
    stripHtml(html) {
        if (!html) return '';
        
        // 先清理可能的编码问题
        let cleanText = html;
        
        // 处理常见的编码问题
        cleanText = cleanText
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ')
            .replace(/&#8220;/g, '"')
            .replace(/&#8221;/g, '"')
            .replace(/&#8216;/g, "'")
            .replace(/&#8217;/g, "'")
            .replace(/&#8230;/g, '...')
            .replace(/&#x([0-9A-Fa-f]+);/g, (match, hex) => {
                try {
                    return String.fromCharCode(parseInt(hex, 16));
                } catch (e) {
                    return match;
                }
            })
            .replace(/&#(\d+);/g, (match, dec) => {
                try {
                    return String.fromCharCode(parseInt(dec, 10));
                } catch (e) {
                    return match;
                }
            });
        
        // 移除HTML标签
        const tmp = document.createElement('div');
        tmp.innerHTML = cleanText;
        const result = tmp.textContent || tmp.innerText || '';
        
        // 清理多余的空白字符
        return result.replace(/\s+/g, ' ').trim();
    }
    
    // === RSS源管理功能 ===
    
    // 加载保存的RSS源
    loadSavedSources() {
        const saved = localStorage.getItem('rss-sources');
        if (saved) {
            try {
                this.rssSources = JSON.parse(saved);
            } catch (e) {
                console.warn('加载保存的RSS源失败，使用默认源');
                this.rssSources = [...this.defaultSources];
            }
        } else {
            this.rssSources = [...this.defaultSources];
        }
    }
    
    // 保存RSS源到本地存储
    saveSources() {
        localStorage.setItem('rss-sources', JSON.stringify(this.rssSources));
    }
    
    // 显示/隐藏RSS管理面板
    toggleRSSManager() {
        if (this.rssManager.classList.contains('hidden')) {
            this.showRSSManager();
        } else {
            this.hideRSSManager();
        }
    }
    
    showRSSManager() {
        this.rssManager.classList.remove('hidden');
        this.renderSourcesList();
    }
    
    hideRSSManager() {
        this.rssManager.classList.add('hidden');
    }
    
    // 添加RSS源
    addRSSSource() {
        const url = this.rssUrlInput.value.trim();
        const name = this.rssNameInput.value.trim() || this.extractNameFromUrl(url);
        
        if (!url) {
            alert('请输入RSS URL');
            return;
        }
        
        if (!this.isValidUrl(url)) {
            alert('请输入有效的URL');
            return;
        }
        
        // 检查是否已存在
        if (this.rssSources.some(source => source.url === url)) {
            alert('该RSS源已存在');
            return;
        }
        
        // 添加新源
        const newSource = {
            url: url,
            name: name,
            enabled: true,
            addedAt: new Date().toISOString()
        };
        
        this.rssSources.push(newSource);
        this.saveSources();
        this.renderSourcesList();
        
        // 清空输入框
        this.rssUrlInput.value = '';
        this.rssNameInput.value = '';
        
        // 测试新添加的RSS源
        this.testRSSSource(newSource);
    }
    
    // 从URL提取名称
    extractNameFromUrl(url) {
        try {
            const urlObj = new URL(url);
            let name = urlObj.hostname.replace('www.', '');
            
            // 特殊处理一些知名RSS服务
            if (url.includes('rsshub.app')) {
                const path = urlObj.pathname;
                if (path.includes('youtube')) name = 'YouTube RSS';
                else if (path.includes('twitter')) name = 'Twitter RSS';
                else if (path.includes('github')) name = 'GitHub RSS';
                else name = 'RSSHub - ' + name;
            }
            
            return name.charAt(0).toUpperCase() + name.slice(1);
        } catch (e) {
            return 'RSS源';
        }
    }
    
    // 验证URL格式
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }
    
    // 渲染RSS源列表
    renderSourcesList() {
        this.sourcesList.innerHTML = '';
        
        this.rssSources.forEach((source, index) => {
            const li = document.createElement('li');
            li.className = 'source-item';
            
            li.innerHTML = `
                <div class="source-info">
                    <div class="source-name">
                        <input type="checkbox" ${source.enabled ? 'checked' : ''} 
                               onchange="rssReader.toggleSource(${index})" />
                        ${source.name}
                    </div>
                    <div class="source-url">${source.url}</div>
                </div>
                <div class="source-actions">
                    <button class="test-btn" onclick="rssReader.testRSSSource(${index})">🧪 测试</button>
                    <button class="delete-btn" onclick="rssReader.deleteSource(${index})">🗑️ 删除</button>
                </div>
            `;
            
            this.sourcesList.appendChild(li);
        });
        
        if (this.rssSources.length === 0) {
            this.sourcesList.innerHTML = '<li style="text-align: center; color: #666; padding: 20px;">暂无RSS源</li>';
        }
    }
    
    // 切换RSS源启用状态
    toggleSource(index) {
        this.rssSources[index].enabled = !this.rssSources[index].enabled;
        this.saveSources();
    }
    
    // 删除RSS源
    deleteSource(index) {
        if (confirm(`确定要删除 "${this.rssSources[index].name}" 吗？`)) {
            this.rssSources.splice(index, 1);
            this.saveSources();
            this.renderSourcesList();
        }
    }
    
    // 测试RSS源
    async testRSSSource(sourceOrIndex) {
        const source = typeof sourceOrIndex === 'number' ? this.rssSources[sourceOrIndex] : sourceOrIndex;
        
        try {
            console.log(`测试RSS源: ${source.name} (${source.url})`);
            
            const proxyServices = [
                `https://api.allorigins.win/get?url=${encodeURIComponent(source.url)}`,
                `https://cors-anywhere.herokuapp.com/${source.url}`,
                `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(source.url)}`
            ];
            
            for (const proxyUrl of proxyServices) {
                try {
                    const response = await fetch(proxyUrl, {
                        headers: { 'Accept': 'application/xml, text/xml, */*' }
                    });
                    
                    if (response.ok) {
                        let xmlText;
                        if (proxyUrl.includes('allorigins.win')) {
                            const data = await response.json();
                            xmlText = data.contents;
                            
                            // 处理base64编码
                            if (xmlText.startsWith('data:application/rss+xml') || xmlText.startsWith('data:text/xml')) {
                                const base64Data = xmlText.split(',')[1];
                                if (base64Data) {
                                    const binaryString = atob(base64Data);
                                    const bytes = new Uint8Array(binaryString.length);
                                    for (let i = 0; i < binaryString.length; i++) {
                                        bytes[i] = binaryString.charCodeAt(i);
                                    }
                                    const decoder = new TextDecoder('utf-8');
                                    xmlText = decoder.decode(bytes);
                                }
                            }
                        } else {
                            xmlText = await response.text();
                        }
                        
                        // 尝试解析XML
                        const parser = new DOMParser();
                        const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
                        const items = this.findRSSItems(xmlDoc);
                        
                        if (items.length > 0) {
                            alert(`✅ RSS源测试成功！\n找到 ${items.length} 个条目\n使用代理: ${proxyUrl.split('//')[1].split('/')[0]}`);
                            return;
                        }
                    }
                } catch (e) {
                    console.warn(`代理 ${proxyUrl} 测试失败:`, e);
                }
            }
            
            alert(`❌ RSS源测试失败\n可能的原因：\n- RSS源不可访问\n- 代理服务不可用\n- RSS格式不支持`);
            
        } catch (error) {
            alert(`❌ 测试出错: ${error.message}`);
        }
    }
    
    // 加载所有启用的RSS源
    async loadAllFeeds() {
        this.showLoading();
        
        const enabledSources = this.rssSources.filter(source => source.enabled);
        
        if (enabledSources.length === 0) {
            this.showError('没有启用的RSS源，请在管理面板中添加并启用RSS源');
            return;
        }
        
        console.log(`开始加载 ${enabledSources.length} 个RSS源`);
        
        let allItems = [];
        let successCount = 0;
        
        for (const source of enabledSources) {
            try {
                const items = await this.loadSingleFeed(source);
                if (items.length > 0) {
                    // 为每个条目添加来源信息
                    items.forEach(item => {
                        item.sourceName = source.name;
                        item.sourceUrl = source.url;
                    });
                    allItems = allItems.concat(items);
                    successCount++;
                }
            } catch (error) {
                console.warn(`加载RSS源 ${source.name} 失败:`, error);
            }
        }
        
        if (allItems.length === 0) {
            this.showError(`所有RSS源都加载失败 (尝试了 ${enabledSources.length} 个源)`);
            return;
        }
        
        // 按发布时间排序
        allItems.sort((a, b) => {
            const dateA = new Date(a.pubDate || 0);
            const dateB = new Date(b.pubDate || 0);
            return dateB - dateA;
        });
        
        this.renderMixedFeedItems(allItems);
        this.hideLoading();
        
        console.log(`成功加载 ${successCount}/${enabledSources.length} 个RSS源，共 ${allItems.length} 个条目`);
    }
    
    // 加载单个RSS源
    async loadSingleFeed(source) {
        const proxyServices = [
            `https://api.allorigins.win/get?url=${encodeURIComponent(source.url)}`,
            `https://cors-anywhere.herokuapp.com/${source.url}`,
            `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(source.url)}`
        ];
        
        for (const proxyUrl of proxyServices) {
            try {
                const response = await fetch(proxyUrl, {
                    headers: { 'Accept': 'application/xml, text/xml, */*' }
                });
                
                if (!response.ok) continue;
                
                let xmlText;
                if (proxyUrl.includes('allorigins.win')) {
                    const data = await response.json();
                    xmlText = data.contents;
                    
                    // 处理base64编码
                    if (xmlText.startsWith('data:application/rss+xml') || xmlText.startsWith('data:text/xml')) {
                        const base64Data = xmlText.split(',')[1];
                        if (base64Data) {
                            const binaryString = atob(base64Data);
                            const bytes = new Uint8Array(binaryString.length);
                            for (let i = 0; i < binaryString.length; i++) {
                                bytes[i] = binaryString.charCodeAt(i);
                            }
                            const decoder = new TextDecoder('utf-8');
                            xmlText = decoder.decode(bytes);
                        }
                    }
                } else {
                    xmlText = await response.text();
                }
                
                return this.parseRSSToItems(xmlText);
                
            } catch (error) {
                console.warn(`代理服务 ${proxyUrl} 失败:`, error);
            }
        }
        
        throw new Error('所有代理服务都不可用');
    }
    
    // 解析RSS为条目数组
    parseRSSToItems(xmlText) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
        const items = this.findRSSItems(xmlDoc);
        
        const result = [];
        Array.from(items).slice(0, 20).forEach(item => {
            const title = this.getTextContent(item, 'title');
            const link = this.getTextContent(item, 'link');
            const pubDate = this.getTextContent(item, 'pubDate');
            const description = this.getTextContent(item, 'description');
            const author = this.getTextContent(item, 'dc\\:creator') || 
                          this.getTextContent(item, 'author') || '';
            
            if (title && link) {
                result.push({
                    title,
                    link,
                    pubDate,
                    description,
                    author
                });
            }
        });
        
        return result;
    }
    
    // 渲染混合RSS条目（存储所有条目并启用分页）
    renderMixedFeedItems(items) {
        // 存储所有条目
        this.allFeedItems = items;
        this.currentPage = 1;
        
        // 计算总页数
        this.totalPages = Math.ceil(items.length / this.pageSize);
        
        // 渲染当前页
        this.renderCurrentPage();
        
        // 显示分页控件
        if (items.length > 0) {
            this.paginationContainer.classList.remove('hidden');
        } else {
            this.paginationContainer.classList.add('hidden');
        }
    }
    
    // 渲染当前页的条目
    renderCurrentPage() {
        this.feedContainer.innerHTML = '';
        
        if (this.allFeedItems.length === 0) {
            this.paginationContainer.classList.add('hidden');
            return;
        }
        
        // 计算当前页的条目范围
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = Math.min(startIndex + this.pageSize, this.allFeedItems.length);
        const currentPageItems = this.allFeedItems.slice(startIndex, endIndex);
        
        // 渲染当前页条目
        currentPageItems.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'feed-item';
            li.style.animationDelay = `${index * 0.1}s`;
            
            const formattedDate = this.formatDate(item.pubDate);
            const cleanDescription = this.stripHtml(item.description).substring(0, 200) + '...';
            
            li.innerHTML = `
                <div class="feed-title">
                    <a href="${item.link}" target="_blank" rel="noopener noreferrer">
                        ${item.title}
                    </a>
                </div>
                <div class="feed-meta">
                    <span class="feed-source">
                        <i class="fas fa-rss"></i>
                        ${item.sourceName}
                    </span>
                    <span class="feed-author">
                        <i class="fas fa-user"></i>
                        ${item.author || '未知'}
                    </span>
                    <span class="feed-date">
                        <i class="fas fa-clock"></i>
                        ${formattedDate}
                    </span>
                </div>
                <div class="feed-description">
                    ${cleanDescription}
                </div>
            `;
            
            this.feedContainer.appendChild(li);
        });
        
        // 更新分页信息和控件
        this.updatePaginationInfo();
        this.updatePaginationControls();
        
        // 滚动到顶部
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // 跳转到指定页
    goToPage(page) {
        if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
            this.currentPage = page;
            this.renderCurrentPage();
        }
    }
    
    // 更新分页信息
    updatePaginationInfo() {
        const startIndex = (this.currentPage - 1) * this.pageSize + 1;
        const endIndex = Math.min(this.currentPage * this.pageSize, this.allFeedItems.length);
        
        this.paginationInfo.textContent = `显示第 ${startIndex}-${endIndex} 条，共 ${this.allFeedItems.length} 条`;
    }
    
    // 更新分页控件状态
    updatePaginationControls() {
        // 更新按钮状态
        this.firstPageBtn.disabled = this.currentPage === 1;
        this.prevPageBtn.disabled = this.currentPage === 1;
        this.nextPageBtn.disabled = this.currentPage === this.totalPages;
        this.lastPageBtn.disabled = this.currentPage === this.totalPages;
        
        // 更新页码按钮
        this.renderPageNumbers();
    }
    
    // 渲染页码按钮
    renderPageNumbers() {
        this.pageNumbers.innerHTML = '';
        
        if (this.totalPages <= 1) return;
        
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
        
        // 调整起始页，确保显示足够的页码
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        // 添加第一页和省略号
        if (startPage > 1) {
            this.addPageNumber(1);
            if (startPage > 2) {
                this.addEllipsis();
            }
        }
        
        // 添加页码范围
        for (let i = startPage; i <= endPage; i++) {
            this.addPageNumber(i);
        }
        
        // 添加省略号和最后一页
        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                this.addEllipsis();
            }
            this.addPageNumber(this.totalPages);
        }
    }
    
    // 添加页码按钮
    addPageNumber(pageNum) {
        const pageBtn = document.createElement('button');
        pageBtn.className = 'page-number';
        pageBtn.textContent = pageNum;
        
        if (pageNum === this.currentPage) {
            pageBtn.classList.add('active');
        }
        
        pageBtn.addEventListener('click', () => {
            this.goToPage(pageNum);
        });
        
        this.pageNumbers.appendChild(pageBtn);
    }
    
    // 添加省略号
    addEllipsis() {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'page-ellipsis';
        ellipsis.textContent = '...';
        this.pageNumbers.appendChild(ellipsis);
    }
}

// 全局变量用于事件处理
let rssReader;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    rssReader = new RSSReader();
});

// 添加一些CSS动画
const style = document.createElement('style');
style.textContent = `
    .feed-item {
        opacity: 0;
        transform: translateY(20px);
        animation: fadeInUp 0.6s ease forwards;
    }
    
    @keyframes fadeInUp {
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .feed-author::before {
        content: '';
        margin-right: 15px;
    }
`;
document.head.appendChild(style);
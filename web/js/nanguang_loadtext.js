import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "Nanguang.LoadText",
    
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== "加载文本") return;
        
        const onNodeCreated = nodeType.prototype.onNodeCreated;
        
        nodeType.prototype.onNodeCreated = function() {
            onNodeCreated?.apply(this, arguments);
            const node = this;
            
            // ==================== 查找原生 Widgets 并隐藏 ====================
            const textWidget = node.widgets.find(w => w.name === "text");
            const fileNameWidget = node.widgets.find(w => w.name === "file_name");
            
            [textWidget, fileNameWidget].forEach(w => {
                if (!w) return;
                // 隐藏原生输入控件
                w.hidden = true;
                w.computeSize = () => [0, 0];
                if (w.inputEl) {
                    w.inputEl.style.display = "none";
                    w.inputEl.style.height = "0px";
                }
                if (w.element) {
                    w.element.style.display = "none";
                    w.element.style.height = "0px";
                }
                // 阻止 LiteGraph 绘制该 widget
                w.draw = () => {};
                w.mouse = () => false;
            });
            
            // ==================== 构建自定义 DOM UI ====================
            const container = document.createElement("div");
            container.style.width = "100%";
            container.style.padding = "2px 4px";
            container.style.boxSizing = "border-box";
            container.style.fontFamily = "sans-serif";
            
            // --- 多行文本编辑区 ---
            const textarea = document.createElement("textarea");
            textarea.placeholder = "编辑提示词";
            textarea.style.width = "100%";
            textarea.style.height = "110px";
            textarea.style.background = "#2d2d2d";
            textarea.style.color = "#ffffff";
            textarea.style.border = "1px solid #555555";
            textarea.style.borderRadius = "3px";
            textarea.style.padding = "8px";
            textarea.style.resize = "none";
            textarea.style.outline = "none";
            textarea.style.fontSize = "13px";
            textarea.style.lineHeight = "1.4";
            textarea.style.boxSizing = "border-box";
            
            // 同步到 ComfyUI 原生 widget（确保工作流保存时携带内容）
            const syncToWidget = () => {
                if (textWidget) textWidget.value = textarea.value;
            };
            textarea.addEventListener("input", syncToWidget);
            
            // --- 圆角导航条（左右箭头 + 文件名）---
            const navBar = document.createElement("div");
            navBar.style.display = "flex";
            navBar.style.alignItems = "center";
            navBar.style.justifyContent = "center";
            navBar.style.gap = "10px";
            navBar.style.marginTop = "8px";
            navBar.style.padding = "5px 12px";
            navBar.style.background = "#3a3a3a";
            navBar.style.borderRadius = "16px";
            navBar.style.border = "1px solid #555555";
            
            const leftBtn = document.createElement("button");
            leftBtn.innerHTML = "◀";
            leftBtn.style.background = "none";
            leftBtn.style.border = "none";
            leftBtn.style.color = "#ffffff";
            leftBtn.style.cursor = "pointer";
            leftBtn.style.fontSize = "10px";
            leftBtn.style.padding = "2px 6px";
            leftBtn.style.userSelect = "none";
            
            const typeLabel = document.createElement("span");
            typeLabel.textContent = "文本";
            typeLabel.style.color = "#ffffff";
            typeLabel.style.fontSize = "12px";
            typeLabel.style.fontWeight = "bold";
            typeLabel.style.userSelect = "none";
            
            const nameLabel = document.createElement("span");
            nameLabel.textContent = "未选择";
            nameLabel.style.color = "#aaaaaa";
            nameLabel.style.fontSize = "12px";
            nameLabel.style.maxWidth = "90px";
            nameLabel.style.overflow = "hidden";
            nameLabel.style.textOverflow = "ellipsis";
            nameLabel.style.whiteSpace = "nowrap";
            nameLabel.style.userSelect = "none";
            
            const rightBtn = document.createElement("button");
            rightBtn.innerHTML = "▶";
            rightBtn.style.background = "none";
            rightBtn.style.border = "none";
            rightBtn.style.color = "#ffffff";
            rightBtn.style.cursor = "pointer";
            rightBtn.style.fontSize = "10px";
            rightBtn.style.padding = "2px 6px";
            rightBtn.style.userSelect = "none";
            
            navBar.appendChild(leftBtn);
            navBar.appendChild(typeLabel);
            navBar.appendChild(nameLabel);
            navBar.appendChild(rightBtn);
            
            // --- 选择文本上传按钮 ---
            const uploadBtn = document.createElement("button");
            uploadBtn.textContent = "选择文本上传";
            uploadBtn.style.width = "100%";
            uploadBtn.style.marginTop = "8px";
            uploadBtn.style.padding = "7px";
            uploadBtn.style.background = "#3a3a3a";
            uploadBtn.style.color = "#ffffff";
            uploadBtn.style.border = "1px solid #555555";
            uploadBtn.style.borderRadius = "3px";
            uploadBtn.style.cursor = "pointer";
            uploadBtn.style.fontSize = "13px";
            uploadBtn.style.transition = "background 0.2s";
            
            uploadBtn.addEventListener("mouseenter", () => uploadBtn.style.background = "#4a4a4a");
            uploadBtn.addEventListener("mouseleave", () => uploadBtn.style.background = "#3a3a3a");
            
            const fileInput = document.createElement("input");
            fileInput.type = "file";
            fileInput.accept = ".txt";
            fileInput.style.display = "none";
            
            // --- 组装容器 ---
            container.appendChild(textarea);
            container.appendChild(navBar);
            container.appendChild(uploadBtn);
            container.appendChild(fileInput);
            
            // ==================== 文件列表管理与交互逻辑 ====================
            let fileList = [];
            let currentIndex = -1;
            
            const refreshFileList = async () => {
                try {
                    const resp = await fetch("/nanguang_loadtext/list");
                    const data = await resp.json();
                    fileList = data.files || [];
                } catch (e) {
                    console.error("[南光加载文本] 获取文件列表失败:", e);
                }
            };
            
            const loadFileFromServer = async (fileName) => {
                try {
                    const resp = await fetch(`/nanguang_loadtext/load?file=${encodeURIComponent(fileName)}`);
                    const data = await resp.json();
                    if (data.content !== undefined) {
                        textarea.value = data.content;
                        syncToWidget();
                        nameLabel.textContent = data.file_name;
                        if (fileNameWidget) fileNameWidget.value = data.file_name;
                    }
                } catch (e) {
                    console.error("[南光加载文本] 加载文件失败:", e);
                }
            };
            
            // 左右箭头切换
            leftBtn.addEventListener("click", () => {
                if (fileList.length === 0) return;
                currentIndex = (currentIndex - 1 + fileList.length) % fileList.length;
                loadFileFromServer(fileList[currentIndex]);
            });
            
            rightBtn.addEventListener("click", () => {
                if (fileList.length === 0) return;
                currentIndex = (currentIndex + 1) % fileList.length;
                loadFileFromServer(fileList[currentIndex]);
            });
            
            // 上传按钮点击 -> 触发隐藏的文件选择器
            uploadBtn.addEventListener("click", () => fileInput.click());
            
            // 文件选择后：读取并上传至服务器
            fileInput.addEventListener("change", async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                // 先本地读取预览
                const localText = await file.text();
                textarea.value = localText;
                syncToWidget();
                
                // 上传至服务器文本库（支持后续左右箭头切换）
                const formData = new FormData();
                formData.append("file", file);
                
                try {
                    const resp = await fetch("/nanguang_loadtext/upload", {
                        method: "POST",
                        body: formData
                    });
                    const data = await resp.json();
                    if (data.success) {
                        nameLabel.textContent = data.file_name;
                        if (fileNameWidget) fileNameWidget.value = data.file_name;
                        await refreshFileList();
                        currentIndex = fileList.indexOf(data.file_name);
                        // 用服务器返回的规范内容覆盖（确保编码正确）
                        if (data.content !== undefined) {
                            textarea.value = data.content;
                            syncToWidget();
                        }
                    }
                } catch (err) {
                    console.error("[南光加载文本] 上传失败:", err);
                    // 即使上传失败，本地读取的内容仍保留在文本框中
                    nameLabel.textContent = file.name;
                    if (fileNameWidget) fileNameWidget.value = file.name;
                }
                
                // 重置 input，允许重复选择同一文件
                fileInput.value = "";
            });
            
            // ==================== 注册 DOM Widget ====================
            node.addDOMWidget("custom_ui", "custom", container, {
                serialize: false,
                hideOnZoom: false
            });
            
            // 设置节点固定尺寸（与设计图比例协调）
            node.setSize([300, 270]);
            
            // 初始化：如果有工作流保存的值，同步到 textarea
            if (textWidget && textWidget.value) {
                textarea.value = textWidget.value;
            }
            if (fileNameWidget && fileNameWidget.value) {
                nameLabel.textContent = fileNameWidget.value;
            }
            
            // 初始化文件列表
            refreshFileList();
        };
    }
});
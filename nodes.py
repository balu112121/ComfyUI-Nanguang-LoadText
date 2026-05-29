import os
import json
from aiohttp import web
from server import PromptServer

# 插件目录与文本库目录
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEXTS_DIR = os.path.join(BASE_DIR, "texts")
os.makedirs(TEXTS_DIR, exist_ok=True)


# ==================== API 路由 ====================

@PromptServer.instance.routes.get("/nanguang_loadtext/list")
async def api_list_texts(request):
    """获取文本库文件列表"""
    try:
        files = sorted([f for f in os.listdir(TEXTS_DIR) if f.lower().endswith('.txt')])
        return web.json_response({"files": files})
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


@PromptServer.instance.routes.get("/nanguang_loadtext/load")
async def api_load_text(request):
    """加载指定文本文件内容"""
    try:
        file_name = request.query.get("file", "")
        if not file_name or ".." in file_name or not file_name.lower().endswith('.txt'):
            return web.json_response({"error": "Invalid file name"}, status=400)
        
        file_path = os.path.join(TEXTS_DIR, file_name)
        file_path = os.path.normpath(file_path)
        if not file_path.startswith(os.path.normpath(TEXTS_DIR)):
            return web.json_response({"error": "Access denied"}, status=403)
        
        if not os.path.exists(file_path):
            return web.json_response({"error": "File not found"}, status=404)
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        return web.json_response({"content": content, "file_name": file_name})
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


@PromptServer.instance.routes.post("/nanguang_loadtext/upload")
async def api_upload_text(request):
    """接收前端上传的 txt 文件并保存到文本库"""
    try:
        reader = await request.multipart()
        field = await reader.next()
        
        if not field or field.name != "file":
            return web.json_response({"error": "No file field"}, status=400)
        
        file_name = field.filename
        if not file_name or ".." in file_name or not file_name.lower().endswith('.txt'):
            return web.json_response({"error": "Invalid file"}, status=400)
        
        # 安全文件名
        base_name = os.path.basename(file_name)
        name, ext = os.path.splitext(base_name)
        file_path = os.path.join(TEXTS_DIR, base_name)
        
        # 自动重名处理
        counter = 1
        while os.path.exists(file_path):
            file_path = os.path.join(TEXTS_DIR, f"{name}_{counter:03d}{ext}")
            counter += 1
        
        # 保存文件
        with open(file_path, 'wb') as f:
            while True:
                chunk = await field.read_chunk()
                if not chunk:
                    break
                f.write(chunk)
        
        # 读取内容返回
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        return web.json_response({
            "success": True,
            "file_name": os.path.basename(file_path),
            "content": content
        })
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


# ==================== 节点定义 ====================

class 加载文本:
    """南光AIGC 加载文本节点 —— 支持手动输入或上传本地txt文件"""
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "text": ("STRING", {
                    "default": "",
                    "placeholder": "编辑提示词"
                }),
                "file_name": ("STRING", {
                    "default": ""
                }),
            }
        }
    
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("文本",)
    FUNCTION = "execute"
    CATEGORY = "南光AI/文本"
    
    def execute(self, text, file_name):
        # 文本内容已在前端同步至 text widget，直接输出
        return (text,)


NODE_CLASS_MAPPINGS = {
    "加载文本": 加载文本,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "加载文本": "加载文本",
}
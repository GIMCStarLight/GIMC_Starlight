# discover_xhr.py (robust, fixed nonlocal issue)
from playwright.sync_api import sync_playwright
import json, time, re, os, urllib.parse, mimetypes
from pathlib import Path

# 保存到crawler根目录下的captured_data文件夹
OUT = Path(__file__).parent.parent / "captured_data" / "discover_out"
OUT.mkdir(parents=True, exist_ok=True)
TARGET = "https://www.xingtu.cn/ad/creator/index"

# heuristics to capture relevant endpoints
RELEVANT_KEYWORDS = ["/api", "/star", "/author", "list", "search", "market", "page", "query", "author", "stars"]

def is_relevant(url, resource_type):
    url_lower = url.lower()
    if any(k in url_lower for k in RELEVANT_KEYWORDS):
        return True
    if resource_type in ("xhr", "fetch"):
        return True
    if url_lower.endswith(".json"):
        return True
    return False

def safe_filename_from_url(url):
    p = urllib.parse.urlparse(url)
    name = Path(p.path).name or "index"
    q = p.query.replace("&", "_").replace("=", "-")
    if q:
        name = f"{name}__{q}"
    name = re.sub(r"[^0-9A-Za-z._\-]", "_", name)
    return name

counter = 0  # <-- 改为全局变量，避免 nonlocal 错误

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    context = browser.new_context()
    page = context.new_page()
    captured_meta = []

    def on_response(response):
        global counter  # <-- 使用 global 引用
        try:
            url = response.url
            rtype = response.request.resource_type
            if not is_relevant(url, rtype):
                return

            counter += 1
            meta = {
                "index": counter,
                "url": url,
                "method": response.request.method,
                "status": response.status,
                "resource_type": rtype,
                "request_headers": dict(response.request.headers),
                "response_headers": dict(response.headers),
                "post_data": response.request.post_data,
            }

            # derive filename
            fname_base = f"{counter:04d}__" + safe_filename_from_url(url)
            content_type = (response.headers.get("content-type") or "").lower()

            # 安全获取响应体
            body_bytes = b""
            try:
                body_bytes = response.body()
            except Exception as e:
                # 忽略已关闭连接的错误
                if "closed" in str(e).lower() or "no data found" in str(e).lower():
                    meta["body_error"] = "response_closed"
                else:
                    try:
                        txt = response.text()
                        body_bytes = txt.encode("utf-8", errors="replace")
                    except Exception:
                        meta["body_error"] = str(e)

            # decide text-like vs binary
            text_like = False
            if content_type:
                if any(t in content_type for t in ("application/json", "application/javascript", "text/", "application/xml", "application/xhtml+xml")):
                    text_like = True
            else:
                ext = Path(urllib.parse.urlparse(url).path).suffix.lower()
                if ext in (".js", ".css", ".json", ".html", ".xml", ".txt"):
                    text_like = True

            # 只有成功获取到body才保存
            if body_bytes:
                if text_like:
                    try:
                        body_text = body_bytes.decode("utf-8")
                    except Exception:
                        try:
                            body_text = body_bytes.decode("latin-1")
                        except Exception:
                            body_text = body_bytes.decode("utf-8", errors="replace")
                    file_body = OUT / (fname_base + ".txt")
                    with open(file_body, "w", encoding="utf-8") as fw:
                        fw.write(body_text)
                    meta["saved_body"] = str(file_body.name)
                    meta["preview"] = body_text[:5000]
                else:
                    ext = None
                    if content_type:
                        ext = mimetypes.guess_extension(content_type.split(";")[0].strip())
                    if not ext:
                        ext = Path(urllib.parse.urlparse(url).path).suffix or ""
                    file_body = OUT / (fname_base + (ext or ".bin"))
                    with open(file_body, "wb") as fw:
                        fw.write(body_bytes)
                    meta["saved_body"] = str(file_body.name)
                    meta["saved_body_type"] = "binary"
                    meta["preview"] = f"<binary {len(body_bytes)} bytes; content-type: {content_type}>"
            else:
                # 没有body数据，只保存元信息
                meta["preview"] = "<no body data>"

            meta_fname = OUT / f"{counter:04d}__meta.json"
            with open(meta_fname, "w", encoding="utf-8") as fm:
                json.dump(meta, fm, ensure_ascii=False, indent=2)

            captured_meta.append(meta)
            print(f"✓ [{counter}] {response.status} {rtype} {url[:80]}")
        except Exception as e:
            # 忽略浏览器关闭时的错误
            if "closed" not in str(e).lower():
                err_meta = {"error": str(e), "url": response.url if response else "unknown"}
                with open(OUT / f"error_{int(time.time())}.json", "w", encoding="utf-8") as fe:
                    json.dump(err_meta, fe, ensure_ascii=False, indent=2)

    page.on("response", on_response)

    # navigate
    page.goto(TARGET)
    print("请在浏览器中手动登录，登录完成后按回车继续...")
    input()

    print("\n现在可以手动操作网页（点击、滚动、搜索等）")
    print("所有XHR/Fetch请求会自动捕获")
    print("操作完成后，在终端按回车结束抓取...\n")
    input()

    # save storage state
    context.storage_state(path=str(OUT / "storage_state.json"))

    # write summary
    summary = {
        "captured_count": len(captured_meta),
        "files": [m.get("saved_body") for m in captured_meta],
    }
    with open(OUT / "summary.json", "w", encoding="utf-8") as fs:
        json.dump(summary, fs, ensure_ascii=False, indent=2)

    print("抓取完成，文件保存在", OUT)
    browser.close()
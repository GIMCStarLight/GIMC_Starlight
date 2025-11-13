// SQLBot Embedded Dynamic UMD Module
// This is a mock implementation for development purposes
// In production, this should be replaced with the actual SQLBot embedded script

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.SqlbotEmbedded = {}));
})(this, (function (exports) {
  'use strict';

  // SQLBot Embedded Handler
  class SqlbotEmbeddedHandler {
    constructor() {
      this.instances = new Map();
    }

    mounted(selector, config) {
      console.log('SQLBot Embedded: Mounting to', selector, 'with config:', config);
      
      const container = document.querySelector(selector);
      if (!container) {
        throw new Error(`SQLBot Embedded: Container not found for selector: ${selector}`);
      }

      // Create a mock SQLBot interface
      const iframe = document.createElement('iframe');
      iframe.id = `sqlbot-embedded-chat-iframe-${config.appId}`;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '8px';
      
      // Create a simple HTML content for the mock SQLBot
      const mockContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>SQLBot AI助手</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              text-align: center;
            }
            .logo {
              font-size: 48px;
              margin-bottom: 20px;
            }
            .title {
              font-size: 24px;
              margin-bottom: 10px;
              font-weight: 600;
            }
            .subtitle {
              font-size: 16px;
              opacity: 0.8;
              margin-bottom: 30px;
            }
            .status {
              background: rgba(255, 255, 255, 0.2);
              padding: 15px 25px;
              border-radius: 25px;
              font-size: 14px;
              backdrop-filter: blur(10px);
            }
            .config-info {
              margin-top: 20px;
              font-size: 12px;
              opacity: 0.7;
            }
          </style>
        </head>
        <body>
          <div class="logo">🤖</div>
          <div class="title">SQLBot AI选号助手</div>
          <div class="subtitle">智能数据分析与推荐系统</div>
          <div class="status">✅ 服务已成功加载</div>
          <div class="config-info">
            App ID: ${config.appId}<br>
            Token: ${config.token ? '已配置' : '未配置'}
          </div>
        </body>
        </html>
      `;
      
      iframe.srcdoc = mockContent;
      
      // Clear container and append iframe
      container.innerHTML = '';
      container.appendChild(iframe);
      
      // Store instance for cleanup
      this.instances.set(config.appId, {
        container,
        iframe,
        config
      });
      
      console.log('SQLBot Embedded: Successfully mounted');
    }

    destroy(appId, removeScript = false) {
      console.log('SQLBot Embedded: Destroying instance', appId);
      
      const instance = this.instances.get(appId);
      if (instance) {
        // Remove iframe
        if (instance.iframe && instance.iframe.parentNode) {
          instance.iframe.parentNode.removeChild(instance.iframe);
        }
        
        // Clear container
        if (instance.container) {
          instance.container.innerHTML = '';
        }
        
        // Remove from instances map
        this.instances.delete(appId);
      }
      
      // Remove script if requested
      if (removeScript) {
        const scripts = document.querySelectorAll('script[src*="sqlbot-embedded-dynamic.umd.js"]');
        scripts.forEach(script => {
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
        });
        
        // Remove global handler
        if (window.sqlbot_embedded_handler) {
          delete window.sqlbot_embedded_handler;
        }
      }
      
      console.log('SQLBot Embedded: Instance destroyed');
    }
  }

  // Initialize and expose global handler
  const handler = new SqlbotEmbeddedHandler();
  
  // Expose to global scope
  if (typeof window !== 'undefined') {
    window.sqlbot_embedded_handler = handler;
  }

  // Export for module systems
  exports.SqlbotEmbeddedHandler = SqlbotEmbeddedHandler;
  exports.default = handler;

  console.log('SQLBot Embedded Dynamic UMD: Loaded successfully');
}));
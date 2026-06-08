var AIService = {
  // Auto-load config from server .env on startup
  loadEnvConfig: function() {
    var self = this;
    fetch('/api/config').then(function(r){ return r.json(); }).then(function(cfg){
      if (cfg.ai_api_key) {
        self.config.apiKey = cfg.ai_api_key;
        self.config.endpoint = cfg.ai_endpoint || self.config.endpoint;
        self.config.model = cfg.ai_model || self.config.model;
        self.config.provider = cfg.ai_provider || self.config.provider;
        localStorage.setItem("ai_apikey", cfg.ai_api_key);
        localStorage.setItem("ai_endpoint", cfg.ai_endpoint || self.config.endpoint);
        localStorage.setItem("ai_model", cfg.ai_model || self.config.model);
        localStorage.setItem("ai_provider", cfg.ai_provider || self.config.provider);
        console.log('✦ Loaded AI config from server .env');
      }
    }).catch(function(){});
  },

  config: {
    endpoint: localStorage.getItem("ai_endpoint") || "https://api.deepseek.com/v1",
    model: localStorage.getItem("ai_model") || "deepseek-chat",
    apiKey: localStorage.getItem("ai_apikey") || "",
    provider: localStorage.getItem("ai_provider") || "deepseek",
    availableModels: {
      "openai": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
      "deepseek": ["deepseek-chat", "deepseek-reasoner"],
    }
  },

  saveConfig: function(ep, mo, ak, provider) {
    if (provider) this.config.provider = provider;
    this.config.endpoint = ep;
    this.config.model = mo;
    this.config.apiKey = ak;
    localStorage.setItem("ai_endpoint", ep);
    localStorage.setItem("ai_model", mo);
    localStorage.setItem("ai_apikey", ak);
    localStorage.setItem("ai_provider", this.config.provider);
  },

  isConfigured: function() {
    return !!this.config.apiKey && !!this.config.endpoint;
  },

  call: function(messages, opts) {
    opts = opts || {};
    return fetch(this.config.endpoint + "/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + this.config.apiKey
      },
      body: JSON.stringify({
        model: opts.model || this.config.model,
        messages: messages,
        temperature: opts.temperature || 0.7,
        max_tokens: opts.maxTokens || 4096
      })
    }).then(function(r) {
      if (!r.ok) throw new Error("API error: " + r.status);
      return r.json();
    }).then(function(d) {
      return d.choices[0].message.content;
    });
  },

  // Convert novel to screenplay format
  convertNovel: function(text, fmt) {
    var prompt = "\u8bf7\u5c06\u4ee5\u4e0b\u5c0f\u8bf4\u5185\u5bb9\u8f6c\u6362\u4e3a\u7ed3\u6784\u5316\u5267\u672c\u683c\u5f0f\uff08JSON\uff09\u3002" +
      "\u5b8c\u6574\u63d0\u53d6\u6240\u6709\u5c0f\u8bf4\u5185\u5bb9\uff0c\u8f6c\u6362\u4e3a\u6807\u51c6\u7684\u5267\u672c\u7ed3\u6784\uff0c\u5305\u542b\uff1ametadata\u3001characters\u3001acts\u3001scenes\u3001content\u3002\u683c\u5f0f\uff1a" + fmt + "\n\n\u5c0f\u8bf4\u5185\u5bb9\uff1a\n" + text;
    return this.call([
      { role: "system", content: "\u4f60\u662f\u4e00\u4f4d\u4e13\u4e1a\u7684\u5267\u672c\u7f16\u5267\u548c\u5c0f\u8bf4\u6539\u7f16\u4e13\u5bb6\u3002\u8bf7\u5c06\u5c0f\u8bf4\u8f6c\u6362\u4e3a\u4e13\u4e1a\u7684\u5267\u672c\u683c\u5f0f\uff0c\u4fdd\u7559\u6240\u6709\u91cd\u8981\u60c5\u8282\u3001\u5bf9\u8bdd\u548c\u573a\u666f\u63cf\u5199\u3002\u8f93\u51fa\u5fc5\u987b\u662f\u6709\u6548\u7684JSON\u683c\u5f0f\u3002" },
      { role: "user", content: prompt }
    ], { temperature: 0.3, maxTokens: 8192 });
  },

  // Analyze characters from novel text
  analyzeCharacters: function(text) {
    var prompt = "\u8bf7\u5206\u6790\u4ee5\u4e0b\u5c0f\u8bf4\u4e2d\u7684\u4e3b\u8981\u89d2\u8272\uff0c\u5305\u62ec\uff1a\u6027\u683c\u7279\u5f81\u3001\u6210\u957f\u53d8\u5316\u3001\u4eba\u7269\u5173\u7cfb\u3001\u89d2\u8272\u5b9a\u4f4d?" + text.substring(0, 8000);
    return this.call([
      { role: "system", content: "\u4f60\u662f\u4e00\u4f4d\u4e13\u4e1a\u7684\u89d2\u8272\u5206\u6790\u5e08\uff0c\u64c5\u957f\u4ece\u6587\u5b66\u4f5c\u54c1\u4e2d\u63d0\u53d6\u548c\u5206\u6790\u89d2\u8272\u7279\u5f81\u3002" },
      { role: "user", content: prompt }
    ], { temperature: 0.4, maxTokens: 4096 });
  },

  // Polish/optimize script
  polishScript: function(script, instruction) {
    var prompt = "\u8bf7\u6839\u636e\u4ee5\u4e0b\u6307\u4ee4\u4f18\u5316\u5267\u672c\u5185\u5bb9\uff1a\n" + (instruction || "\u63d0\u5347\u5bf9\u8bdd\u81ea\u7136\u5ea6\uff0c\u589e\u5f3a\u573a\u666f\u63cf\u5199\uff0c\u4f18\u5316\u53d9\u4e8b\u8282\u594f") + "\n\n" + script;
    return this.call([
      { role: "system", content: "\u4f60\u662f\u4e00\u4f4d\u8d44\u6df1\u7684\u5267\u672c\u533b\u751f\uff0c\u64c5\u957f\u4f18\u5316\u5267\u672c\u8d28\u91cf\u3002" },
      { role: "user", content: prompt }
    ], { temperature: 0.5, maxTokens: 4096 });
  },

  // Rewrite scene in different style
  rewriteScene: function(sceneText, style) {
    var styleMap = { film: "\u7535\u5f71\u5267\u672c\u98ce\u683c", tv_episode: "\u7535\u89c6\u5267\u672c\u98ce\u683c", stage_play: "\u821e\u53f0\u5267\u98ce\u683c" };
    var target = styleMap[style] || styleMap.film;
    var prompt = "\u8bf7\u5c06\u4ee5\u4e0b\u5185\u5bb9\u91cd\u5199\u4e3a" + target + "\uff1a\n\n" + sceneText;
    return this.call([
      { role: "system", content: "\u4f60\u662f\u4e00\u4f4d\u4e13\u4e1a\u7684\u7f16\u5267\u3002" },
      { role: "user", content: prompt }
    ], { temperature: 0.6, maxTokens: 4096 });
  },

  // Clean character names: filter out non-name fragments
  cleanCharacters: function(rawNames, chapterText) {
    var nameList = rawNames.join("\n");
    var prompt = "\u4ee5\u4e0b\u662f\u4ece\u5c0f\u8bf4\u4e2d\u63d0\u53d6\u7684\u6f5c\u5728\u89d2\u8272\u540d\u79f0\uff0c\u5176\u4e2d\u6df7\u6742\u4e86\u8bb8\u591a\u975e\u89d2\u8272\u540d\u79f0\u7684\u7247\u6bb5\u3002\uff08\u5982\u201c???\u201d\u201c??????\u201d??\n\n" +
      "\u8bf7\u5e2e\u6211\u8bc6\u522b\u51fa\u771f\u6b63\u7684\u4eba\u7269\u89d2\u8272\u540d\u79f0\uff0c\u53ea\u4fdd\u7559\u771f\u6b63\u7684\u89d2\u8272\u540d\uff0c\u5220\u9664\u975e\u89d2\u8272\u540d\u79f0\u7684\u5185\u5bb9\u3002\n\n" +
      "\u8f93\u51fa\u683c\u5f0f\uff1a\u53ea\u8f93\u51fa\u4e00\u4e2aJSON\u6570\u7ec4\uff0c\u6bcf\u4e2a\u5143\u7d20\u5305\u542b name \u5b57\u6bb5\u3002\u4f8b\u5982\uff1a{\"characters\": [{\"name\": \u201c\u5f20\u4e09\u201d}, {\"name\": \u201c\u674e\u56db\u201d}]}\n\n" +
      "\u6f5c\u5728\u89d2\u8272\u540d\u79f0\u5217\u8868\uff1a\n" + nameList +
      "\n\n\u5c0f\u8bf4\u5185\u5bb9\u4e0a\u4e0b\u6587\uff1a\n" + chapterText.substring(0, 3000);
    return this.call([
      { role: "system", content: "\u4f60\u662f\u4e00\u4f4d\u4e13\u4e1a\u7684\u6587\u5b66\u7f16\u8f91\uff0c\u64c5\u957f\u8bc6\u522b\u5c0f\u8bf4\u4e2d\u7684\u771f\u5b9e\u89d2\u8272\u540d\u79f0\u3002" },
      { role: "user", content: prompt }
    ], { temperature: 0.2, maxTokens: 2048 });
  }
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = AIService;
}


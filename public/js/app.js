/**
 * NovelToScript - 主应用逻辑
 */
(function() {
  'use strict';

  // State
  let novelData = null;
  let scriptData = null;
  let currentTab = 'input';
  let currentMode = 'auto';
  let formatType = 'film';

  const App = {
    init() {
      this.bindEvents();
      this.initTheme();
      this.loadExample();
      console.log('✦ NovelToScript initialized');
    },

    bindEvents() {
      // Tab switching
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
      });

      // Format selection
      document.querySelectorAll('.format-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          formatType = btn.dataset.format;
        });
      });

      // Convert button
      document.getElementById('convertBtn').addEventListener('click', () => this.convert());
      
      // Export buttons
      document.getElementById('exportYamlBtn').addEventListener('click', () => this.exportYAML());
      document.getElementById('exportJsonBtn').addEventListener('click', () => this.exportJSON());
      document.getElementById('exportTxtBtn').addEventListener('click', () => this.exportScript());

      // File upload
      document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileUpload(e));

      // Theme toggle
      document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());

      // Example button
      document.getElementById('loadExampleBtn').addEventListener('click', () => this.loadExample());

      // Character edit save
      document.getElementById('saveCharBtn').addEventListener('click', () => this.saveCharacterEdit());

      // Copy YAML button
      document.getElementById('copyYamlBtn').addEventListener('click', () => this.copyToClipboard('.yaml-output'));
      document.getElementById('copyJsonBtn').addEventListener('click', () => this.copyToClipboard('.json-output'));

      // Sample data
      document.querySelectorAll('.sample-btn').forEach(btn => {
        btn.addEventListener('click', () => this.loadSampleNovel(btn.dataset.sample));
      });
    },

    initTheme() {
      const saved = localStorage.getItem('noveltoscript-theme');
      if (saved === 'light') {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
      }
    },

    toggleTheme() {
      document.body.classList.toggle('dark-theme');
      document.body.classList.toggle('light-theme');
      const isLight = document.body.classList.contains('light-theme');
      localStorage.setItem('noveltoscript-theme', isLight ? 'light' : 'dark');
    },

    switchTab(tab) {
      currentTab = tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add('active');
      document.getElementById(`tab-${tab}`).classList.add('active');
      
      // Update view
      if (tab === 'preview' && scriptData) this.renderPreview();
      if (tab === 'script' && scriptData) this.renderScriptView();
      if (tab === 'characters' && novelData) this.renderCharacters();
      if (tab === 'timeline' && scriptData) this.renderTimeline();
      if (tab === 'stats' && scriptData) this.renderStats();
    },

    handleFileUpload(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        document.getElementById('novelInput').value = ev.target.result;
        // Auto-detect title from filename
        const name = file.name.replace(/\.[^/.]+$/, '');
        document.getElementById('novelTitle').value = name;
        this.showToast(`已加载文件: ${file.name}`, 'success');
      };
      reader.readAsText(file, 'UTF-8');
    },

    loadSampleNovel(sampleId) {
      const samples = {
        'wuxia': this.getWuxiaSample(),
        'xianxia': this.getXianxiaSample(),
        'urban': this.getUrbanSample(),
      };
      const text = samples[sampleId];
      if (text) {
        document.getElementById('novelInput').value = text;
        this.showToast(`已加载示例: ${sampleId === 'wuxia' ? '武侠' : sampleId === 'xianxia' ? '仙侠' : '都市'}题材`, 'success');
      }
    },

    loadExample() {
      const input = document.getElementById('novelInput');
      if (input.value.trim()) return;
      input.value = this.getWuxiaSample();
      this.showToast('已加载示例小说（武侠题材）', 'info');
    },

    convert() {
      const text = document.getElementById('novelInput').value.trim();
      if (!text) {
        this.showToast('请先输入小说文本', 'error');
        return;
      }
      if (text.length < 50) {
        this.showToast('小说文本过短，请至少输入50个字符', 'error');
        return;
      }

      const title = document.getElementById('novelTitle').value.trim() || '未命名作品';
      const author = document.getElementById('novelAuthor').value.trim() || '未知作者';

      this.showLoading(true);

      // Run parser (async to allow UI update)
      setTimeout(() => {
        try {
          // Parse novel
          novelData = NovelParser.parse(text, title, author);
          
          // Get character info from user edits
          this.enhanceCharacterInfo();

          // Convert to script
          scriptData = ScriptConverter.convert(novelData, formatType);

          // Show stats
          this.updateStats();

          // Auto switch to preview
          this.showLoading(false);
          this.switchTab('preview');
          this.renderPreview();

          this.showToast(`转换完成！共 ${scriptData.screenplay.acts.length} 幕, ${this.countTotalScenes()} 场`, 'success');
        } catch (e) {
          this.showLoading(false);
          this.showToast('转换出错: ' + e.message, 'error');
          console.error(e);
        }
      }, 100);
    },

    countTotalScenes() {
      let count = 0;
      if (!scriptData) return 0;
      for (const act of scriptData.screenplay.acts) {
        count += act.scenes.length;
      }
      return count;
    },

    enhanceCharacterInfo() {
      // Detect main characters from dialogue frequency
      if (!novelData || !novelData.characters) return;
      
      let lineCounts = {};
      for (const ch of novelData.chapters) {
        if (!ch.content) continue;
        for (const scene of ch.content) {
          if (!scene.content) continue;
          for (const block of scene.content) {
            if (block.type === 'dialogue' && block.speaker) {
              lineCounts[block.speaker] = (lineCounts[block.speaker] || 0) + 1;
            }
          }
        }
      }

      // Restrict to speaker detection
      const speakers = Object.keys(lineCounts);
      // Sort by line count
      speakers.sort((a, b) => (lineCounts[b] || 0) - (lineCounts[a] || 0));

      // Assign roles based on frequency
      novelData.characters = novelData.characters.map((c, i) => {
        const idx = speakers.indexOf(c.name);
        const rank = idx >= 0 ? idx : 999;
        let role = '配角';
        if (rank === 0) role = '主角';
        else if (rank <= 2) role = '主要角色';
        else if (rank <= 5) role = '重要配角';
        c.role = role;
        c.totalLines = lineCounts[c.name] || 0;
        c.rank = rank;
        return c;
      });
      
      if (scriptData && scriptData.screenplay) {
        scriptData.screenplay.characters = novelData.characters.map(c => ({
          id: c.id,
          name: c.name,
          alias: c.alias || [],
          description: c.description || '',
          personality: c.personality || [],
          role: c.role,
          totalLines: c.totalLines || 0,
        }));
      }
    },

    updateStats() {
      if (!scriptData) return;
      const s = scriptData.screenplay;
      document.getElementById('statChapters').textContent = novelData.chapters.length;
      document.getElementById('statScenes').textContent = this.countTotalScenes();
      document.getElementById('statCharacters').textContent = s.characters.length;
      document.getElementById('statPages').textContent = s.metadata.pageEstimate;
    },

    // --- RENDERERS ---

    renderPreview() {
      const container = document.getElementById('previewContent');
      if (!scriptData) {
        container.innerHTML = '<div class="empty-state">请先转换小说</div>';
        return;
      }
      const s = scriptData.screenplay;
      let html = '';

      for (const act of s.acts) {
        html += `<div class="act-section"><div class="act-header"><span class="act-badge">${act.title}</span>`;
        if (act.chapterSources.length > 0) {
          html += `<span class="act-source">改编自：${act.chapterSources.join('、')}</span>`;
        }
        html += `<span class="act-scene-count">${act.scenes.length} 场</span></div>`;

        for (const scene of act.scenes) {
          html += `<div class="scene-card" data-scene="${scene.id}">
            <div class="scene-header">
              <span class="scene-id">${scene.id}</span>
              <span class="scene-source">${scene.chapterSource}</span>`;
          
          if (scene.setting.location) {
            html += `<span class="scene-location">📍 ${scene.setting.location}</span>`;
          }
          if (scene.setting.time) {
            html += `<span class="scene-time">🕐 ${scene.setting.time}</span>`;
          }
          if (scene.setting.weather) {
            html += `<span class="scene-weather">🌤 ${scene.setting.weather}</span>`;
          }
          
          html += `</div><div class="scene-content">`;

          for (const block of scene.content) {
            if (block.type === 'action') {
              html += `<div class="script-action">${this.escapeHtml(block.description)}</div>`;
            } else if (block.type === 'dialogue') {
              html += `<div class="script-dialogue">
                <span class="speaker">${this.escapeHtml(block.speaker || '(旁白)')}</span>`;
              if (block.parenthetical) {
                html += `<span class="parenthetical">(${this.escapeHtml(block.parenthetical)})</span>`;
              }
              html += `<div class="dialogue-line">${this.escapeHtml(block.line)}</div></div>`;
            } else if (block.type === 'transition') {
              html += `<div class="script-transition">${this.escapeHtml(block.style || '')}</div>`;
            }
          }

          html += `</div></div>`;
        }
        html += `</div>`;
      }

      container.innerHTML = html;
    },

    renderScriptView() {
      const container = document.getElementById('scriptContent');
      if (!scriptData) {
        container.innerHTML = '<div class="empty-state">请先转换小说</div>';
        return;
      }

      // Generate YAML
      const yaml = YAMLWriter.stringify(scriptData);
      document.querySelector('.yaml-output').textContent = yaml;
      
      // Generate JSON
      document.querySelector('.json-output').textContent = JSON.stringify(scriptData, null, 2);

      // Update YAML tab buttons
      this.setupYamlTabs();
    },

    setupYamlTabs() {
      const yamlContainer = document.querySelector('.yaml-view-container');
      if (yamlContainer.querySelector('.yaml-tabs')) return;
      
      const tabs = document.createElement('div');
      tabs.className = 'yaml-tabs';
      tabs.innerHTML = `
        <button class="yaml-tab active" data-yaml="yaml">YAML</button>
        <button class="yaml-tab" data-yaml="json">JSON</button>
      `;
      yamlContainer.insertBefore(tabs, yamlContainer.querySelector('.yaml-panes'));

      tabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.yaml-tab');
        if (!tab) return;
        document.querySelectorAll('.yaml-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.yaml-pane').forEach(p => p.classList.remove('active'));
        document.getElementById('pane-' + tab.dataset.yaml).classList.add('active');
      });
    },

    renderCharacters() {
      const container = document.getElementById('charactersContent');
      if (!novelData) {
        container.innerHTML = '<div class="empty-state">请先转换小说</div>';
        return;
      }

      let html = '<div class="character-grid">';
      for (const char of novelData.characters) {
        const roleBadge = {
          '主角': 'protagonist',
          '主要角色': 'main',
          '重要配角': 'supporting',
          '配角': 'minor',
        }[char.role] || 'minor';

        html += `<div class="character-card" data-char-id="${char.id}">
          <div class="char-avatar ${roleBadge}">${char.name[0]}</div>
          <div class="char-info">
            <div class="char-name">${this.escapeHtml(char.name)}</div>
            <span class="char-role ${roleBadge}">${char.role}</span>
            <div class="char-lines">${char.totalLines || 0} 句台词</div>
          </div>
          <button class="char-edit-btn" onclick="App.editCharacter('${char.id}')">✎</button>
        </div>`;
      }
      html += '</div>';
      container.innerHTML = html;
    },

    editCharacter(charId) {
      const char = novelData.characters.find(c => c.id === charId);
      if (!char) return;
      
      document.getElementById('editCharId').value = charId;
      document.getElementById('editCharName').value = char.name;
      document.getElementById('editCharRole').value = char.role;
      document.getElementById('editCharPersonality').value = (char.personality || []).join('、');
      document.getElementById('editCharDesc').value = char.description || '';
      
      document.getElementById('charModal').classList.add('active');
    },

    saveCharacterEdit() {
      const charId = document.getElementById('editCharId').value;
      const char = novelData.characters.find(c => c.id === charId);
      if (!char) return;

      char.name = document.getElementById('editCharName').value.trim();
      char.role = document.getElementById('editCharRole').value;
      char.personality = document.getElementById('editCharPersonality').value.split(/[、，,\s]+/).filter(Boolean);
      char.description = document.getElementById('editCharDesc').value.trim();

      document.getElementById('charModal').classList.remove('active');
      this.renderCharacters();
      this.showToast('角色信息已更新', 'success');
    },

    renderTimeline() {
      const container = document.getElementById('timelineContent');
      if (!scriptData) {
        container.innerHTML = '<div class="empty-state">请先转换小说</div>';
        return;
      }

      const timeline = scriptData.screenplay.timeline;
      if (timeline.length === 0) {
        container.innerHTML = '<div class="empty-state">未能自动提取时间线信息，建议在小说中添加「时间：」「地点：」标记</div>';
        return;
      }

      // Group by location
      const byLocation = {};
      for (const item of timeline) {
        if (!byLocation[item.location]) byLocation[item.location] = [];
        byLocation[item.location].push(item);
      }

      let html = '<div class="timeline-container">';
      for (const [location, items] of Object.entries(byLocation)) {
        html += `<div class="timeline-location-group">
          <div class="location-header">📍 ${this.escapeHtml(location)}</div>
          <div class="timeline-items">`;
        for (const item of items) {
          html += `<div class="timeline-item">
            <span class="timeline-scene-id">${item.sceneId}</span>
            <span class="timeline-act">${item.actId}</span>
            <span class="timeline-time">${item.time}</span>
          </div>`;
        }
        html += `</div></div>`;
      }
      html += '</div>';
      container.innerHTML = html;
    },

    // --- EXPORT ---

    exportYAML() {
      if (!scriptData) { this.showToast('请先转换小说', 'error'); return; }
      const yaml = YAMLWriter.stringify(scriptData);
      this.downloadFile(yaml, 'screenplay.yaml', 'text/yaml');
      this.showToast('YAML 文件已下载', 'success');
    },

    exportJSON() {
      if (!scriptData) { this.showToast('请先转换小说', 'error'); return; }
      const json = JSON.stringify(scriptData, null, 2);
      this.downloadFile(json, 'screenplay.json', 'application/json');
      this.showToast('JSON 文件已下载', 'success');
    },

    exportScript() {
      if (!scriptData) { this.showToast('请先转换小说', 'error'); return; }
      
      const s = scriptData.screenplay;
      let text = '';
      text += `${'='.repeat(60)}\n`;
      text += `  ${s.metadata.title}\n`;
      text += `  原著：${s.metadata.author}\n`;
      text += `  改编日期：${s.metadata.date}\n`;
      text += `  格式：${this.formatLabel(s.metadata.format)}\n`;
      text += `${'='.repeat(60)}\n\n`;

      for (const act of s.acts) {
        text += `${'─'.repeat(40)}\n`;
        text += `  【${act.title}】\n`;
        text += `${'─'.repeat(40)}\n\n`;

        for (const scene of act.scenes) {
          text += `[${scene.id}]`;
          if (scene.setting.location) text += ` 📍${scene.setting.location}`;
          if (scene.setting.time) text += ` 🕐${scene.setting.time}`;
          text += `\n${'·'.repeat(30)}\n`;
          
          for (const block of scene.content) {
            if (block.type === 'action') {
              text += `${block.description}\n\n`;
            } else if (block.type === 'dialogue') {
              text += `${block.speaker || '(旁白)'}`;
              if (block.parenthetical) text += `（${block.parenthetical}）`;
              text += `：${block.line}\n\n`;
            } else if (block.type === 'transition') {
              text += `${block.style || ''}\n\n`;
            }
          }
        }
      }

      text += `${'='.repeat(60)}\n`;
      text += `  共 ${s.acts.length} 幕 · ${this.countTotalScenes()} 场 · 约 ${s.metadata.pageEstimate} 页\n`;
      text += `  角色：${s.characters.map(c => c.name).join('、')}\n`;
      text += `${'='.repeat(60)}\n`;

      this.downloadFile(text, 'screenplay.txt', 'text/plain');
      this.showToast('剧本文本已下载', 'success');
    },

    formatLabel(format) {
      return { film: '电影剧本', tv_episode: '电视剧本', stage_play: '舞台剧本' }[format] || format;
    },

    downloadFile(content, filename, mimeType) {
      const blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    copyToClipboard(selector) {
      const el = document.querySelector(selector);
      if (!el) return;
      navigator.clipboard.writeText(el.textContent).then(() => {
        this.showToast('已复制到剪贴板', 'success');
      });
    },

    // --- UI Helpers ---

    showLoading(show) {
      document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
    },

    showToast(message, type = 'info') {
      const container = document.getElementById('toastContainer');
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.textContent = message;
      container.appendChild(toast);
      setTimeout(() => toast.classList.add('show'), 10);
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    },

    escapeHtml(text) {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    // --- Sample novels ---

    getWuxiaSample() { return ''; },
    getXianxiaSample() { return ''; },
    getUrbanSample() { return ''; },
    };

  // Expose App globally
  window.App = App;

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
  } else {
    App.init();
  }

// === AI Integration ===

// AI Settings button
document.getElementById("aiSettingsBtn").addEventListener("click",function(){
  document.getElementById("aiEndpoint").value = AIService.config.endpoint;
  document.getElementById("aiModel").value = AIService.config.model;
  document.getElementById("aiApiKey").value = AIService.config.apiKey;
  document.getElementById("aiSettingsModal").classList.add("active");
});

// AI Save Config
document.getElementById("aiSaveConfigBtn").addEventListener("click",function(){
  var ep = document.getElementById("aiEndpoint").value.trim();
  var mo = document.getElementById("aiModel").value.trim();
  var ak = document.getElementById("aiApiKey").value.trim();
  AIService.saveConfig(ep, mo, ak);
  document.getElementById("aiSettingsModal").classList.remove("active");
  App.showToast("AI 设置已保存","success");
});

// AI Convert button
document.getElementById("aiConvertBtn").addEventListener("click",function(){
  if(!AIService.isConfigured()){
    App.showToast("请先配置 AI API Key","error");
    document.getElementById("aiSettingsModal").classList.add("active");
    return;
  }
  var text=document.getElementById("novelInput").value.trim();
  if(!text){App.showToast("请先输入小说文本","error");return;}
  App.showLoading(true);
  var format=document.querySelector(".format-btn.active").dataset.format||"film";
  AIService.convertNovel(text,format).then(function(result){
    App.showLoading(false);
    try{
      var parsed=JSON.parse(result);
      if(parsed.screenplay||parsed.acts||parsed.metadata){
        var wrapped=parsed.screenplay?parsed:{screenplay:parsed};
        novelData={metadata:wrapped.screenplay.metadata||{},characters:wrapped.screenplay.characters||[],chapters:[],rawText:text};
        scriptData=wrapped;
        document.getElementById("novelTitle").value=wrapped.screenplay.metadata.title||"";
        App.updateStats();
        App.switchTab("preview");
        App.renderPreview();
        App.showToast("AI 转换完成！","success");
      }else{
        App.showToast("AI 返回格式异常，已在控制台输出","error");
        console.log(result);
      }
    }catch(e){
      App.showLoading(false);
      App.showToast("解析AI响应失败: "+e.message,"error");
    }
  }).catch(function(e){
    App.showLoading(false);
    App.showToast("AI 调用失败: "+e.message,"error");
  });
});

// AI Polish button
document.getElementById("aiPolishBtn").addEventListener("click",function(){
  if(!scriptData){App.showToast("请先转换剧本","error");return;}
  if(!AIService.isConfigured()){
    App.showToast("请先配置 AI API Key","error");
    document.getElementById("aiSettingsModal").classList.add("active");
    return;
  }
  App.showLoading(true);
  var yaml=YAMLWriter.stringify(scriptData);
  AIService.polishScript(yaml.substring(0,6000),"提升对话自然度，增强场景描写，优化节奏").then(function(r){
    App.showLoading(false);
    var out=document.querySelector(".yaml-output");
    if(out)out.textContent=out.textContent+"\n\n// === AI 润色建议 ===\n"+r;
    App.showToast("AI 润色建议已生成","success");
  }).catch(function(e){
    App.showLoading(false);
    App.showToast("AI 润色失败: "+e.message,"error");
  });
});

// AI Analyze Characters button
document.getElementById("aiAnalyzeCharsBtn").addEventListener("click",function(){
  if(!novelData){App.showToast("请先转换小说","error");return;}
  if(!AIService.isConfigured()){
    App.showToast("请先配置 AI API Key","error");
    document.getElementById("aiSettingsModal").classList.add("active");
    return;
  }
  App.showLoading(true);
  AIService.analyzeCharacters(novelData.rawText||novelData.chapters[0]?.content||"").then(function(r){
    App.showLoading(false);
    var c=document.getElementById("charactersContent");
    if(c)c.innerHTML=c.innerHTML+"<div style=\'margin-top:16px;padding:16px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-md)\'>"+r.replace(/\n/g,"<br>")+"</div>";
    App.showToast("AI 角色分析完成","success");
  }).catch(function(e){
    App.showLoading(false);
    App.showToast("AI 分析失败: "+e.message,"error");
  });
});

// AI Rewrite Scene button
document.getElementById("aiRewriteBtn").addEventListener("click",function(){
  if(!scriptData){App.showToast("请先转换剧本","error");return;}
  if(!AIService.isConfigured()){
    App.showToast("请先配置 AI API Key","error");
    document.getElementById("aiSettingsModal").classList.add("active");
    return;
  }
  App.showLoading(true);
  var firstScene=scriptData.screenplay.acts[0]?.scenes[0];
  if(!firstScene){App.showLoading(false);App.showToast("没有找到场景","error");return;}
  var sceneText=firstScene.content.map(function(b){return b.type==="dialogue"?b.speaker+": "+b.line:b.description}).join("\n");
  var format=document.querySelector(".format-btn.active")?.dataset.format||"film";
  AIService.rewriteScene(sceneText,format).then(function(r){
    App.showLoading(false);
    App.showToast("AI 场景重写建议已生成","success");
    var out=document.querySelector(".yaml-output");
    if(out)out.textContent=out.textContent+"\n\n// === AI 场景重写 ===\n"+r;
    App.switchTab("script");
  }).catch(function(e){
    App.showLoading(false);
    App.showToast("AI 重写失败: "+e.message,"error");
  });
});
})();

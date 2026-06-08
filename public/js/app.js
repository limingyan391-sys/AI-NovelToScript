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

    getWuxiaSample() {
      return `第一章 月下惊鸿

时间：戌时
地点：洛阳城外·听雨亭
天气：月明星稀

夜色如墨，月华如水。

洛阳城外三里处的听雨亭中，一个白衣身影正独自饮茶。那人背对着月光，看不清面容，只能隐约看见他腰间悬挂的一柄长剑——剑鞘通体漆黑，唯有剑格处一抹暗红，在月光下泛着幽光。

远处传来急促的马蹄声。

"踏踏踏——"

马蹄声由远及近，在听雨亭外戛然而止。

"阁下便是'夜雨剑'沈孤鸿？"马上之人沉声问道。那是个三十出头的黑衣汉子，满面风霜，眼神锐利如鹰。

白衣人缓缓放下茶杯，转过身来。月光洒在他的脸上，那是一张约莫二十五六岁的面容，眉目清冷，却带着三分倦意。

"正是在下。"沈孤鸿淡淡说道，"阁下深夜相邀，所为何事？"

黑衣汉子翻身下马，抱拳道："在下江北铁掌帮帮主雷震天，有一事相求。"

沈孤鸿微微挑眉："雷帮主请讲。"

"三日前，朝廷户部押送的一批饷银在江北道上被劫，共计白银三十万两。"雷震天沉声道，"劫匪留下了这个。"

他从怀中取出一枚令牌，抛向沈孤鸿。

沈孤鸿伸手接住，就着月光细看。令牌通体青铜铸造，正面刻着一个狰狞的狼头，背面则是一个"夜"字。

"夜狼令？"沈孤鸿的瞳孔微微收缩。

"正是。"雷震天点头，"江湖传闻，夜狼令出现在哪里，哪里就会有'夜影'组织的人出没。而能够对付夜影的，据我所知，唯有五年前曾与夜影打过交道的沈公子。"

沈孤鸿沉默了片刻，将令牌收入怀中。

"雷帮主，这件事我接了。"

雷震天大喜过望："多谢沈公子！"

"不过——"沈孤鸿话锋一转，"我需要雷帮主帮我查一件事。"

"沈公子请说。"

"三个月前，苏州知府林家满门被灭一案，雷帮主可曾听闻？"

雷震天的面色顿时变了。";
    },

    getXianxiaSample() {
      return `第一章 青云镇

青云镇位于苍澜山脉脚下，是方圆百里内最大的集镇。镇上住了三百余户人家，因靠近仙门青云宗，常有修士往来，比寻常集镇繁华不少。

此刻正值晌午，集市上人来人往，叫卖声不绝于耳。

"新鲜出炉的灵麦包子！一个铜板两个！"
"上好的玄铁菜刀，削铁如泥！"
"走过路过不要错过，老张头刚从万妖林采来的十年份灵芝！"

陈小凡蹲在自家馄饨摊前，百无聊赖地用勺子搅着锅里的汤。

摊位冷冷清清，一个客人都没有。

"小凡哥！"一个清脆的声音响起。

陈小凡抬头，看见一个十五六岁的少女蹦蹦跳跳地跑了过来。少女穿着鹅黄色的衣裙，头上扎着双丫髻，一双大眼睛忽闪忽闪的，透着机灵劲儿。

"灵儿？你怎么来了？"陈小凡懒洋洋地问。

"我来给你送好消息啊！"林灵儿兴奋地凑过来，压低声音说，"青云宗今年提前招生了，就在三天后！"

陈小凡手中的勺子"咣当"一声掉进锅里。

"真的？"

"当然是真的！我看过告示了！"林灵儿掏出一张皱巴巴的纸，展开来，"你看——'兹定于七月十五，青云宗大开山门，招收弟子。凡年满十六、资质上佳者，均可前来应试。'"

陈小凡接过告示，来来回回看了三遍，嘴角抑制不住地上扬。

"太好了！"他一拍桌子，"我等这一天等了三年了！"

"可是小凡哥，"林灵儿突然犹豫了一下，"听说这次招生要求很高，至少要灵根纯度在四成以上才行。你——你有灵根吗？"

陈小凡的笑容僵住了。";
    },

    getUrbanSample() {
      return `第一章 深夜来电

凌晨两点十七分。

陆沉从睡梦中被手机铃声吵醒时，正梦见自己从一百层的高楼上坠落。他猛地睁开眼睛，心脏砰砰直跳，后背全是冷汗。

手机在床头柜上疯狂震动，屏幕上显示着一个陌生号码。

他犹豫了两秒，还是接了起来。

"喂？"

"请问是陆沉先生吗？"电话那头传来一个女人的声音，冷静，公式化，带着某种说不清道不明的压迫感。

"是我。你是？"

"我叫苏晚晴，是海城市刑警支队的。"女人的声音顿了顿，"很抱歉这么晚打扰你。你认识林晓月吗？"

陆沉的心猛地一沉。

"认识。她是我前女友。怎么了？"

"她死了。"苏晚晴说，"今天下午，在她的公寓里被人发现。法医初步判断死亡时间在四十八小时以上。"

陆沉握着手机的手微微发抖。

"陆先生？你还在吗？"

"我在。"陆沉深吸一口气，"你们怀疑我？"

"我们在她的房间里找到了你的照片，还有一些——"苏晚晴又停顿了一下，"一些关于你的文字。方便的话，希望你能来警局一趟，协助调查。"

陆沉沉默了。

窗外传来一声闷雷，要下雨了。

"好。"他最终说，"我明天上午过去。"

"谢谢你配合。不过——"苏晚晴的语气变得微妙起来，"我想提醒你一件事。"

"什么事？"

"林晓月死的那天晚上，有人看到你出现在她公寓楼下。"

陆沉的瞳孔骤缩。

他挂断电话，看了一眼时间：6月8日，星期二。

而他的记忆告诉他，这三天里他一直在家里赶稿，从未踏出过房门半步。";
    },
  };

  // Expose App globally
  window.App = App;

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
  } else {
    App.init();
  }
})();


// --- STATS VIEW ---




// --- STATS VIEW ---
// Append this to app.js to add stats functionality

    renderStats() {
      const container = document.getElementById('statsContent');
      if (!scriptData || !novelData) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div><div>转换小说后自动生成作品分析</div></div>';
        return;
      }
      
      const s = scriptData.screenplay;
      const allDialogues = [];
      for (const act of s.acts) {
        for (const scene of act.scenes) {
          for (const block of scene.content) {
            if (block.type === 'dialogue' && block.speaker) {
              allDialogues.push(block);
            }
          }
        }
      }

      // Word count stats
      let totalChars = 0;
      let dialogueChars = 0;
      let actionChars = 0;
      for (const act of s.acts) {
        for (const scene of act.scenes) {
          for (const block of scene.content) {
            if (block.type === 'dialogue') {
              dialogueChars += (block.line || '').length;
            } else if (block.type === 'action') {
              actionChars += (block.description || '').length;
            }
            if (block.line) totalChars += block.line.length;
            if (block.description) totalChars += block.description.length;
          }
        }
      }

      const dialogueRatio = totalChars > 0 ? (dialogueChars / totalChars * 100).toFixed(1) : 0;
      const actionRatio = totalChars > 0 ? (actionChars / totalChars * 100).toFixed(1) : 0;

      // Character speaking stats
      const speakerStats = {};
      for (const d of allDialogues) {
        if (!speakerStats[d.speaker]) speakerStats[d.speaker] = { lines: 0, chars: 0 };
        speakerStats[d.speaker].lines++;
        speakerStats[d.speaker].chars += (d.line || '').length;
      }
      const topSpeakers = Object.entries(speakerStats)
        .sort((a, b) => b[1].lines - a[1].lines)
        .slice(0, 5);

      // Scene distribution
      const scenesPerAct = s.acts.map(a => ({
        title: a.title,
        count: a.scenes.length,
        locations: [...new Set(a.scenes.map(sc => sc.setting?.location).filter(Boolean))],
      }));

      // Location frequency
      const locationFreq = {};
      for (const act of s.acts) {
        for (const scene of act.scenes) {
          if (scene.setting?.location) {
            locationFreq[scene.setting.location] = (locationFreq[scene.setting.location] || 0) + 1;
          }
        }
      }
      const topLocations = Object.entries(locationFreq).sort((a, b) => b[1] - a[1]).slice(0, 5);

      let html = '<div style="display:grid;gap:20px">';

      // Overview card
      html += `<div class="act-section">
        <div class="act-header"><span class="act-badge">📊 作品概览</span></div>
        <div style="padding:16px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-md)">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px">
            <div><span style="color:var(--text-muted);font-size:0.8rem">总字符数</span><div style="font-size:1.2rem;font-weight:600">${totalChars}</div></div>
            <div><span style="color:var(--text-muted);font-size:0.8rem">对话占比</span><div style="font-size:1.2rem;font-weight:600;color:var(--accent-warm)">${dialogueRatio}%</div></div>
            <div><span style="color:var(--text-muted);font-size:0.8rem">描写占比</span><div style="font-size:1.2rem;font-weight:600;color:var(--accent-secondary)">${actionRatio}%</div></div>
            <div><span style="color:var(--text-muted);font-size:0.8rem">总台词数</span><div style="font-size:1.2rem;font-weight:600">${allDialogues.length} 句</div></div>
          </div>
        </div>
      </div>`;

      // Top speakers
      if (topSpeakers.length > 0) {
        html += `<div class="act-section">
          <div class="act-header"><span class="act-badge">🎭 台词量 Top 5</span></div>
          <div style="padding:16px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-md)">`;
        const maxLines = topSpeakers[0][1].lines;
        for (const [name, stats] of topSpeakers) {
          const pct = (stats.lines / maxLines * 100).toFixed(0);
          html += `<div style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:4px">
              <span>${this.escapeHtml(name)}</span>
              <span style="color:var(--text-muted)">${stats.lines} 句 / ${stats.chars} 字</span>
            </div>
            <div style="height:6px;background:var(--bg-tertiary);border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:var(--accent-gradient);border-radius:3px;transition:width 0.5s ease"></div>
            </div>
          </div>`;
        }
        html += `</div></div>`;
      }

      // Scene distribution by act
      html += `<div class="act-section">
        <div class="act-header"><span class="act-badge">📋 各幕场景分布</span></div>
        <div style="display:grid;gap:8px">`;
      for (const act of scenesPerAct) {
        html += `<div style="padding:12px 16px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-md)">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-weight:600;font-size:0.9rem">${this.escapeHtml(act.title)}</span>
            <span style="color:var(--text-muted);font-size:0.85rem">${act.count} 场</span>
          </div>`;
        if (act.locations.length > 0) {
          html += `<div style="margin-top:6px;color:var(--text-muted);font-size:0.8rem">📍 ${act.locations.join(' · ')}</div>`;
        }
        html += `</div>`;
      }
      html += `</div></div>`;

      // Top locations
      if (topLocations.length > 0) {
        html += `<div class="act-section">
          <div class="act-header"><span class="act-badge">📍 高频场景地点</span></div>
          <div style="padding:16px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-md)">`;
        for (const [loc, count] of topLocations) {
          html += `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:0.85rem;border-bottom:1px solid var(--border-color)">
            <span>📍 ${this.escapeHtml(loc)}</span>
            <span style="color:var(--text-muted)">${count} 场</span>
          </div>`;
        }
        html += `</div></div>`;
      }

      // Narrative vs Dialogue suggestion
      html += `<div class="act-section">
        <div class="act-header"><span class="act-badge">💡 改编建议</span></div>
        <div style="padding:16px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-md)">
          <ul style="padding-left:20px;color:var(--text-secondary);font-size:0.85rem;line-height:2">
            ${dialogueRatio < 30 ? '<li>当前对话占比较低，建议增加对话以增强戏剧性</li>' : '<li>对话比例适中，适合影视化改编</li>'}
            ${actionRatio > 60 ? '<li>描写篇幅较多，建议将部分描写转化为视觉动作</li>' : '<li>动作描写比例适当</li>'}
            ${s.characters.filter(c => c.role === '主角').length === 0 ? '<li>建议明确主角定位，集中剧情冲突</li>' : '<li>主角定位清晰</li>'}
            ${s.acts.length >= 3 ? '<li>三幕剧结构完整，建议检查每幕高潮点</li>' : '<li>尝试将章节划分为三幕剧结构</li>'}
            ${totalChars > 5000 ? '<li>篇幅较长，建议适当精简场景数量</li>' : ''}
          </ul>
        </div>
      </div>`;

      html += '</div>';
      container.innerHTML = html;
    }


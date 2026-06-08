
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

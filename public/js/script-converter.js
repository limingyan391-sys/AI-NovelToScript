/**
 * ScriptConverter - 将解析后的小说数据转换为结构化剧本格式
 */
const ScriptConverter = {
  convert(parsedData, format = 'film') {
    const { metadata, characters, chapters } = parsedData;
    
    // Build acts from chapters (group ~3 chapters per act)
    const acts = this._buildActs(chapters, format);
    
    return {
      screenplay: {
        metadata: {
          title: metadata.title,
          author: metadata.author,
          adaptedBy: metadata.adaptedBy || '',
          date: metadata.date,
          format: format,
          genre: metadata.genre || [],
          logline: metadata.logline || '',
          source: metadata.source,
          pageEstimate: this._estimatePages(chapters),
        },
        characters: characters.map(c => ({
          id: c.id,
          name: c.name,
          alias: c.alias || [],
          description: c.description || '',
          personality: c.personality || [],
          role: c.role || '未知',
          totalLines: c.totalLines || 0,
        })),
        acts: acts,
        timeline: this._buildTimeline(acts),
      }
    };
  },

  _buildActs(chapters, format) {
    if (chapters.length <= 3) {
      // Single act
      return [{
        id: 'act_1',
        title: '全剧',
        chapterSources: chapters.map(c => c.title),
        synopsis: '',
        scenes: this._chaptersToScenes(chapters, 'act_1'),
      }];
    }

    // Group into 3-act structure
    const totalCh = chapters.length;
    const split1 = Math.ceil(totalCh * 0.3);
    const split2 = Math.ceil(totalCh * 0.65);
    
    const act1Chs = chapters.slice(0, split1);
    const act2Chs = chapters.slice(split1, split2);
    const act3Chs = chapters.slice(split2);

    const actNames = format === 'tv_episode' 
      ? ['开场', '发展', '高潮']
      : ['第一幕（建置）', '第二幕（对抗）', '第三幕（解决）'];

    return [
      {
        id: 'act_1',
        title: actNames[0],
        chapterSources: act1Chs.map(c => c.title),
        synopsis: '',
        scenes: this._chaptersToScenes(act1Chs, 'act_1'),
      },
      {
        id: 'act_2',
        title: actNames[1],
        chapterSources: act2Chs.map(c => c.title),
        synopsis: '',
        scenes: this._chaptersToScenes(act2Chs, 'act_2'),
      },
      {
        id: 'act_3',
        title: actNames[2],
        chapterSources: act3Chs.map(c => c.title),
        synopsis: '',
        scenes: this._chaptersToScenes(act3Chs, 'act_3'),
      },
    ].filter(a => a.scenes.length > 0);
  },

  _chaptersToScenes(chapters, actId) {
    const allScenes = [];
    let globalSceneId = 0;

    for (const chapter of chapters) {
      if (!chapter.content) continue;
      
      for (const scene of chapter.content) {
        globalSceneId++;
        const convertedContent = this._convertSceneContent(scene);
        
        allScenes.push({
          id: `scene_${String(globalSceneId).padStart(3, '0')}`,
          actId: actId,
          chapterSource: chapter.title,
          setting: {
            location: scene.setting?.location || '',
            time: scene.setting?.time || '',
            weather: scene.setting?.weather || '',
          },
          synopsis: scene.synopsis || '',
          content: convertedContent,
        });
      }
    }

    return allScenes;
  },

  _convertSceneContent(scene) {
    const blocks = [];
    if (!scene.content) return blocks;

    for (const block of scene.content) {
      switch (block.type) {
        case 'narrative':
          blocks.push({
            type: 'action',
            description: block.description || block.text || '',
            camera: '',
          });
          break;
        case 'dialogue':
          blocks.push({
            type: 'dialogue',
            speaker: block.speaker,
            line: block.line,
            parenthetical: block.delivery || block.parenthetical || '',
          });
          break;
        case 'action':
          blocks.push(block);
          break;
        case 'transition':
          blocks.push(block);
          break;
        case 'note':
          blocks.push(block);
          break;
      }
    }

    // Add transitions between major scene shifts
    return blocks;
  },

  // Estimate script pages (rough: ~250 words per page for Chinese)
  _estimatePages(chapters) {
    let wordCount = 0;
    for (const ch of chapters) {
      if (!ch.content) continue;
      for (const scene of ch.content) {
        if (!scene.content) continue;
        for (const block of scene.content) {
          if (block.text) wordCount += block.text.length;
          if (block.line) wordCount += block.line.length;
          if (block.description) wordCount += block.description.length;
        }
      }
    }
    return Math.max(1, Math.ceil(wordCount / 250));
  },

  // Build timeline
  _buildTimeline(acts) {
    const timeline = [];
    for (const act of acts) {
      for (const scene of act.scenes) {
        if (scene.setting?.location || scene.setting?.time) {
          timeline.push({
            sceneId: scene.id,
            actId: act.id,
            location: scene.setting.location || '未知',
            time: scene.setting.time || '未知',
          });
        }
      }
    }
    return timeline;
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScriptConverter;
}

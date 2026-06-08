/**
 * NovelToScript - 中文小说解析引擎
 * Parses Chinese novel text into structured chapter/paragraph data
 */

const NovelParser = {
  // Parse full novel text
  parse(text, title = '未命名作品', author = '未知作者') {
    const lines = text.split('\n');
    const chapters = this._extractChapters(lines);
    
    return {
      metadata: {
        title: title,
        author: author,
        source: '原创小说',
        adaptedBy: '',
        date: new Date().toISOString().split('T')[0],
        format: 'film',
        logline: '',
        genre: [],
      },
      characters: this._extractCharacters(chapters),
      chapters: chapters,
      rawText: text,
    };
  },

  // Extract chapters from lines
  _extractChapters(lines) {
    // Chinese chapter patterns
    const chapterPatterns = [
      /^第[一二三四五六七八九十百千零\d]+章/i,
      /^第[一二三四五六七八九十百千零\d]+节/i,
      /^Chapter\s+\d+/i,
      /^Part\s+[IVXLCDM]+/i,
      /^Act\s+\d+/i,
      /^Scene\s+\d+/i,
      /^(?:序幕|序章|终章|尾声|后记)/i,
    ];

    const chapters = [];
    let currentChapter = null;
    let currentLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if line is a chapter marker
      const isChapterStart = chapterPatterns.some(p => p.test(line));
      
      if (isChapterStart && currentChapter !== null) {
        // Save previous chapter
        currentChapter.content = this._parseChapterContent(currentLines);
        chapters.push(currentChapter);
        currentLines = [];
      }

      if (isChapterStart) {
        currentChapter = {
          title: line,
          index: chapters.length + 1,
          content: [],
        };
      } else {
        currentLines.push(line);
      }
    }

    // Save last chapter
    if (currentChapter) {
      currentChapter.content = this._parseChapterContent(currentLines);
      chapters.push(currentChapter);
    }

    // If no chapters found, treat entire text as one chapter
    if (chapters.length === 0) {
      chapters.push({
        title: '全文',
        index: 1,
        content: this._parseChapterContent(lines),
      });
    }

    return chapters;
  },

  // Parse chapter content into structured blocks
  _parseChapterContent(lines) {
    const blocks = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();
      
      // Skip empty lines but track scene breaks
      if (!line) {
        i++;
        continue;
      }

      // Check for scene markers
      const sceneMarker = this._detectSceneMarker(line);
      if (sceneMarker) {
        blocks.push({ type: 'scene_marker', ...sceneMarker });
        i++;
        continue;
      }

      // Check for dialogue
      const dialogue = this._parseDialogue(line, i < lines.length - 1 ? lines[i + 1].trim() : '');
      if (dialogue) {
        blocks.push(dialogue);
        i += dialogue.consumedLines || 1;
        continue;
      }

      // Check for narrative with potential embedded dialogue
      const dialogueInNarrative = this._extractDialogueFromNarrative(line);
      if (dialogueInNarrative) {
        blocks.push(...dialogueInNarrative);
        i++;
        continue;
      }

      // Regular narrative paragraph
      blocks.push({
        type: 'narrative',
        text: line,
        description: line,
      });
      i++;
    }

    return this._groupIntoScenes(blocks);
  },

  // Detect scene markers (location, time, weather)
  _detectSceneMarker(line) {
    const marker = {};
    let isMarker = false;

    if (/^(?:场景|地点|场景：|地点：|场景:|地点:)/.test(line)) {
      marker.location = line.replace(/^(?:场景|地点|场景：|地点：|场景:|地点:)\s*/, '').trim();
      isMarker = true;
    }
    if (/^(?:时间|时间：|时间:)/.test(line)) {
      marker.time = line.replace(/^(?:时间|时间：|时间:)\s*/, '').trim();
      isMarker = true;
    }
    if (/^(?:天气|天气：|天气:)/.test(line)) {
      marker.weather = line.replace(/^(?:天气|天气：|天气:)\s*/, '').trim();
      isMarker = true;
    }
    if (/^---/.test(line)) {
      marker.separator = true;
      isMarker = true;
    }

    return isMarker ? marker : null;
  },

  // Parse dialogue line
  _parseDialogue(line, nextLine) {
    // Patterns: "XX说：" or "XX道：" followed by quotes, or quotes with attribution
    const chineseQuote = /[「『""]/;
    const speakerPattern = /^(.{1,8}?)(?:说|道|问|答|喊|叫|骂|劝|叹|解释|补充|强调|重复|告诉|吩咐|命令|承诺|保证|威胁|警告|提醒|建议|鼓励|安慰|承认|否认|批评|称赞|抱怨|吐槽|调侃|打趣|回应|辩解|坦白|邀功|炫耀|卖弄|吹嘘|吹牛|撒谎|扯谎|扯|胡扯|胡诌|瞎说|胡说|乱说|乱讲|胡说八道)[着|了|道]?[：:，,]?\s*/;

    // Check if line starts with a speaker attribution
    const speakerMatch = line.match(speakerPattern);
    if (speakerMatch) {
      const remaining = line.slice(speakerMatch[0].length).trim();
      if (chineseQuote.test(remaining)) {
        return {
          type: 'dialogue',
          speaker: speakerMatch[1].trim(),
          line: remaining.replace(/[「」『』""]/g, '').trim(),
          delivery: '',
          consumedLines: 1,
        };
      }
    }

    // Check if line is pure dialogue (starts with quote)
    if (chineseQuote.test(line[0])) {
      return {
        type: 'dialogue',
        speaker: '',
        line: line.replace(/[「」『』""]/g, '').trim(),
        delivery: '',
        consumedLines: 1,
      };
    }

    return null;
  },

  // Extract dialogue embedded in narrative
  _extractDialogueFromNarrative(line) {
    const quotePairs = [
      ['「', '」'],
      ['『', '』'],
      ['"', '"'],
      ['"', '"'],
      ['「', '」'],
    ];

    const blocks = [];
    let remaining = line;

    for (const [open, close] of quotePairs) {
      const regex = new RegExp(`${open}([^${close}]+)${close}`, 'g');
      let match;
      while ((match = regex.exec(remaining)) !== null) {
        // Check if there's a speaker before the quote
        const before = remaining.slice(Math.max(0, match.index - 15), match.index).trim();
        const speakerMatch = before.match(/(.{1,8}?)(?:说|道|问|答|喊|叫)[着了]?[：:，,]?\s*$/);
        
        blocks.push({
          type: 'dialogue',
          speaker: speakerMatch ? speakerMatch[1].trim() : '',
          line: match[1].trim(),
          delivery: '',
        });
      }
    }

    return blocks.length > 0 ? blocks : null;
  },

  // Group blocks into scenes
  _groupIntoScenes(blocks) {
    const scenes = [];
    let currentScene = {
      id: `scene_001`,
      setting: { location: '', time: '', weather: '' },
      synopsis: '',
      content: [],
    };

    let sceneCounter = 0;
    for (const block of blocks) {
      if (block.type === 'scene_marker') {
        // Save current scene if it has content
        if (currentScene.content.length > 0 || sceneCounter === 0) {
          if (sceneCounter > 0) {
            scenes.push(currentScene);
          }
          sceneCounter++;
          currentScene = {
            id: `scene_${String(sceneCounter + 1).padStart(3, '0')}`,
            setting: { location: '', time: '', weather: '' },
            synopsis: '',
            content: [],
          };
        }
        // Update setting
        if (block.location) currentScene.setting.location = block.location;
        if (block.time) currentScene.setting.time = block.time;
        if (block.weather) currentScene.setting.weather = block.weather;
      } else {
        currentScene.content.push(block);
      }
    }

    // Add last scene
    if (currentScene.content.length > 0 || sceneCounter === 0) {
      scenes.push(currentScene);
    }

    return scenes;
  },

  // Extract character information from text
  _extractCharacters(chapters) {
    const charMap = new Map();
    const speakerPattern = /^(.{1,8}?)(?:说|道|问|答|喊|叫|骂|劝|叹|解释|补充)[着了]?[：:，,]?\s*/;

    for (const chapter of chapters) {
      if (!chapter.content) continue;
      for (const scene of chapter.content) {
        if (!scene.content) continue;
        for (const block of scene.content) {
          if (block.type === 'dialogue' && block.speaker) {
            if (!charMap.has(block.speaker)) {
              charMap.set(block.speaker, {
                name: block.speaker,
                id: `char_${String(charMap.size + 1).padStart(3, '0')}`,
                alias: [],
                description: '',
                personality: [],
                role: '未知',
              });
            }
          }
        }
      }
    }

    return Array.from(charMap.values());
  },
};

// Export for browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NovelParser;
}

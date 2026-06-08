/**
 * NovelToScript - 中文小说解析引擎 v2
 * Fixes: Chinese quotes ("\u201c\u201d"), spaced chapters ("第 1 章"),
 *        post-attribution dialogue, preamble skipping, smart name extraction
 */

const NovelParser = {
  parse(text, title, author) {
    const lines = text.split("\n");
    const cleaned = this._skipPreamble(lines);
    const chapters = this._extractChapters(cleaned);
    return {
      metadata: {
        title: title || "未命名作品",
        author: author || "未知作者",
        source: "原创小说", adaptedBy: "",
        date: new Date().toISOString().split("T")[0],
        format: "film", logline: "", genre: [],
      },
      characters: this._extractCharacters(chapters),
      chapters: chapters,
      rawText: text,
    };
  },

  _skipPreamble(lines) {
    const pats = this._chPatterns();
    const idx = lines.findIndex(function(l) {
      var t = l.trim();
      return pats.some(function(p) { return p.test(t); }) && t.length < 50;
    });
    return idx > 0 ? lines.slice(idx) : lines;
  },

  _chPatterns() {
    return [
      /^\s*第\s*[一二三四五六七八九十百千零\d]+\s*章\s*$/,
      /^\s*第\s*[一二三四五六七八九十百千零\d]+\s*节\s*$/,
      /^\s*Chapter\s+\d+\s*$/i,
      /^\s*Part\s+[IVXLCDM]+\s*$/i,
      /^\s*(?:序幕|序章|终章|尾声|后记)\s*$/,
      /^\s*第\s*\d+\s*章\s*$/,
    ];
  },

  _isOpenQ(c) {
    if (!c) return false;
    var code = c.charCodeAt(0);
    return code === 0x300C || code === 0x300E || code === 0x201C || code === 0x0022 || code === 0x2018;
  },

  _closeFor(open) {
    var map = {
      "\u300c": "\u300d", "\u300e": "\u300f",
      "\u201c": "\u201d", "\u0022": "\u0022", "\u2018": "\u2019"
    };
    return map[open] || null;
  },

  _stripQ(s) {
    return s.replace(/[\u300c\u300d\u300e\u300f\u201c\u201d\u2018\u2019"]/g, "").trim();
  },

  _findQEnd(line, start) {
    var close = this._closeFor(line[start]);
    if (!close) return -1;
    for (var i = start + 1; i < line.length; i++) {
      if (line[i] === close) return i;
    }
    return -1;
  },

  // --- All speech verbs (longest first for greedy matching) ---
  _speechVerbs: [
    "解释道","补充道","强调道","重复道","告诉道","吩咐道","命令道",
    "提醒道","建议道","安慰道","承认道","否认道","批评道","称赞道",
    "抱怨道","回应道","辩解道","坦白道","炫耀道","回答道",
    "开心道","幸福道","流泪道","哭着道","笑着道","低声道","小声道",
    "大声道","尖叫道","咋舌道","无奈道","叹息道","摇头道","点头道",
    "抬头道","低头道","回头道","插嘴道","接口道","接话道",
    "忍不住道","不禁道","不由道",
    "咆哮道","怒吼道","惊呼道","惊叫道","失声道","大吼道",
    "冷笑道","苦笑道","微笑道","感叹道","感慨道",
    "心想道","暗想道","寻思道","沉思道",
    "回答说","解释说","补充说","强调说","重复说",
    "告诉说","吩咐说","命令说","提醒说","建议说",
    "鼓励说","安慰说","承认说","否认说","批评说",
    "称赞说","抱怨说","回应说","辩解说","坦白说",
    "炫耀说","吹嘘说","胡说道",
    "问道","说道","喊道","叫道","哭道","吼道","喝道",
    "骂道","笑道","叹道",
    "回答","解释","补充","强调","重复","告诉","吩咐","命令",
    "提醒","建议","鼓励","安慰","承认","否认","批评",
    "称赞","抱怨","回应","辩解","坦白","炫耀","吹嘘",
    "咆哮","怒吼","惊呼","惊叫","失声","大吼","冷笑","苦笑","微笑",
    "感叹","感慨","心想","暗想","寻思","沉思",
    "问","答","说","道","喊","叫","骂","劝","叹"
  ],

  _isStopW(s) {
    var stops = {
      "的":1,"了":1,"在":1,"有":1,"是":1,"不":1,"我":1,"你":1,"他":1,
      "她":1,"它":1,"们":1,"这":1,"那":1,"什么":1,"怎么":1,"为什么":1,
      "因为":1,"所以":1,"但是":1,"虽然":1,"如果":1,"而且":1,"然后":1,
      "已经":1,"正在":1,"可以":1,"没有":1,"还是":1,"或者":1,"一个":1,
      "这个":1,"那个":1,"这些":1,"那些":1,"一边":1,"心里":1,"心中":1,
      "脑海":1,"嘴里":1,"口中":1,"背后":1,"面前":1,"眼前":1,"头上":1,
      "脚下":1,"身上":1,"手里":1,"怀中":1,"对着":1,"看着|听着|想着|感觉|觉得|也|依旧|仍然|仍然|还是|已是|就是|便是|更是|越发|愈来愈|越来越|一个|那位|这位|那些|这些|某个|那个|这个":1,"看着|听着|想着|感觉|觉得|也|依旧|仍然|仍然|还是|已是|就是|便是|更是|越发|愈来愈|越来越|一个|那位|这位|那些|这些|某个|那个|这个":1,
      "那里":1,"这里":1,"于是":1,"于是乎":1,"不过":1,"只是":1,"可是":1,
      "但是":1,"然而":1,"虽然":1,"虽说":1,"忽然":1,"突然":1,"顿时":1,
      "瞬间":1,"终于":1,"毕竟":1,"简直":1,"实在":1,"真的":1,"真是":1,
      "只见":1,"一个":1,"那个":1,"这位":1,"那位":1,"我们":1,"你们":1,
      "他们":1,"大家":1,"自己":1,"其中":1,"之间":1,"之后":1,"之前":1,
      "的话":1,"时候":1,"地方":1,"结果":1,"原来":1,"其实":1,"当然":1,
      "因为":1,"所以":1,"不过":1,"如果":1,"虽然":1,"虽然":1,"而且":1,
      "反而":1,"甚至":1,"然后":1,"随后":1,"接着":1,"跟着":1,"按照":1,
      "根据":1,"除了":1,"关于":1,"对于":1,"至于":1,"等到":1,"等到":1,
      "尽管":1,"无论":1,"不论":1,"哪怕":1,"就算":1,"便是":1,"就是":1,
      "却在这":1,"能站出":1,"也":1,"依旧":1,"仍然":1,"一个":1,"那位":1,"这位":1,"某个":1,"心中":1,"心里":1,"一边":1,"躺在地上":1,"的话":1,"的话还":1,"还没":1,"在下面":1,"在一边":1,"在那边":1,"在一旁":1,"对着林劫":1,"对着肖战":1,"不由的":1,"好奇的":1,"惊讶的":1,"得意的":1,"愤怒的":1,"轻蔑的":1,"嚣张的":1,"弱弱的":1,"不耐烦":1,"惊慌的":1,"不由的":1,"笑着":1,"的话刚":1,"的话还":1,"打字说":1,"打字":1,"回":1,"问":1,"说":1,"道":1,"亮的女":1,"在心中":1,"在心里":1,"在一边":1,
      "在那边":1,"对着":1,"开口":1,"接着说":1,"继续说":1,"接过话":1
    };
    return !!stops[s];
  },

  // Strip trailing adverbs from a potential speaker name
    _cleanName(s) {
    // Remove trailing adverb/particle patterns
    s = s.replace(/(?:的[\u4e00-\u9fff\u3000]*|地[\u4e00-\u9fff\u3000]*|睃|了|过|在[\u4e00-\u9fff\u3000]*|一边|不由得|不禁|突然)*$/g, "");
    s = s.replace(/[\s\u3000：:,，。！？、、]+$/g, "");
    return s;
  },

  // --- CHAPTER EXTRACTION ---
  _extractChapters(lines) {
    var pats = this._chPatterns();
    var chapters = [];
    var cur = null;
    var curLines = [];

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      var isCh = pats.some(function(p) { return p.test(line); });

      if (isCh) {
        if (cur) {
          cur.content = this._parseChapterContent(curLines);
          chapters.push(cur);
          curLines = [];
        }
        cur = { title: line, index: chapters.length + 1, content: [] };
      } else if (cur) {
        curLines.push(line);
      }
    }

    if (cur) {
      cur.content = this._parseChapterContent(curLines);
      chapters.push(cur);
    }

    if (chapters.length === 0) {
      chapters.push({ title: "全文", index: 1, content: this._parseChapterContent(lines) });
    }

    return chapters;
  },

  // --- CHAPTER CONTENT PARSING ---
  _parseChapterContent(lines) {
    var blocks = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;

      var marker = this._detectSceneMarker(line);
      if (marker) { blocks.push({ type: "scene_marker" }, marker); continue; }

      var dialogs = this._extractAllDialogs(line);
      if (dialogs) { blocks = blocks.concat(dialogs); continue; }

      blocks.push({ type: "narrative", text: line, description: line });
    }
    return this._groupIntoScenes(blocks);
  },

  // --- DIALOGUE EXTRACTION (core fix) ---
  _extractAllDialogs(line) {
    var results = [];
    var remaining = line.trim();
    var foundAny = false;

    while (remaining.length > 0) {
      remaining = remaining.trim();
      if (!remaining) break;

      // Find opening quote
      var qs = -1;
      for (var j = 0; j < remaining.length; j++) {
        if (this._isOpenQ(remaining[j])) { qs = j; break; }
      }
      if (qs === -1) break;

      var qe = this._findQEnd(remaining, qs);
      if (qe === -1) break;

      var raw = remaining.substring(qs, qe + 1);
      var text = this._stripQ(raw);
      var before = remaining.substring(0, qs).trim();
      var after = remaining.substring(qe + 1).trim();

      var speaker = null;

      // CASE 1: Speaker before quote: "name VERB: dialogue"
      if (before) {
        speaker = this._speakerBefore(before);
      }

      // CASE 2: Speaker after quote: "dialogue" name VERB
      if (!speaker && after) {
        speaker = this._speakerAfter(after);
      }

      results.push({ type: "dialogue", speaker: speaker || "", line: text, delivery: "" });
      foundAny = true;
      remaining = after;
    }

    return foundAny ? results : null;
  },

  // Extract speaker from text BEFORE a quote
  _speakerBefore(text) {
    var verbs = this._speechVerbs;
    var bestIdx = -1;
    var bestVerb = null;

    for (var v = 0; v < verbs.length; v++) {
      var idx = text.lastIndexOf(verbs[v]);
      if (idx > bestIdx) { bestIdx = idx; bestVerb = verbs[v]; }
    }

    if (bestVerb === null || bestIdx < 0) return null;

    var beforeVerb = text.substring(0, bestIdx).trim();
    if (!beforeVerb) return null;

    // Clean: strip trailing adverbs/particles
    beforeVerb = this._cleanName(beforeVerb);
    if (!beforeVerb) return null;

    // Take last 1-6 Chinese/Latin chars
    var m = beforeVerb.match(/([\u4e00-\u9fff\u3400-\u4dbfa-zA-Z]{1,6})$/);
    if (m && !this._isStopW(m[1])) return m[1];

    // Fallback: last 2-4 Chinese chars
    var fb = beforeVerb.match(/([\u4e00-\u9fff]{2,4})$/);
    return fb ? fb[1] : null;
  },

  // Extract speaker from text AFTER a quote
  _speakerAfter(text) {
    var verbs = this._speechVerbs;
    var bestIdx = 999999;
    var bestVerb = null;

    for (var v = 0; v < verbs.length; v++) {
      var idx = text.indexOf(verbs[v]);
      if (idx >= 0 && idx < bestIdx) { bestIdx = idx; bestVerb = verbs[v]; }
    }

    if (bestVerb === null || bestIdx < 0) return null;

    var beforeVerb = text.substring(0, bestIdx).trim();
    if (!beforeVerb) return null;

    // The name should be immediately before the verb (1-6 chars)
    var m = beforeVerb.match(/^[\s\u3000]*([\u4e00-\u9fff\u3400-\u4dbfa-zA-Z]{1,6})$/);
    if (m && !this._isStopW(m[1])) return m[1];

    return null;
  },

  _detectSceneMarker(line) {
    var m = {};
    var ok = false;
    if (/^(?:场景|地点|场景[：:]|地点[：:])/.test(line)) {
      m.location = line.replace(/^(?:场景|地点|场景[：:]|地点[：:])\s*/, "").trim();
      ok = true;
    }
    if (/^(?:时间|时间[：:])/.test(line)) {
      m.time = line.replace(/^(?:时间|时间[：:])\s*/, "").trim();
      ok = true;
    }
    if (/^(?:天气|天气[：:])/.test(line)) {
      m.weather = line.replace(/^(?:天气|天气[：:])\s*/, "").trim();
      ok = true;
    }
    return ok ? m : null;
  },

  _groupIntoScenes(blocks) {
    var scenes = [];
    var ctr = 0;
    var cur = { id: "scene_001", setting: { location: "", time: "", weather: "" }, synopsis: "", content: [] };

    for (var b = 0; b < blocks.length; b++) {
      var block = blocks[b];
      if (block.type === "scene_marker") {
        if (cur.content.length > 0 || ctr === 0) {
          if (ctr > 0) scenes.push(cur);
          ctr++;
          cur = { id: "scene_" + String(ctr + 1).padStart(3, "0"), setting: {}, synopsis: "", content: [] };
          cur.setting = { location: "", time: "", weather: "" };
        }
        if (block.location !== undefined) cur.setting.location = block.location;
        if (block.time !== undefined) cur.setting.time = block.time;
        if (block.weather !== undefined) cur.setting.weather = block.weather;
      } else {
        cur.content.push(block);
      }
    }
    if (cur.content.length > 0 || ctr === 0) scenes.push(cur);
    return scenes;
  },

  _extractCharacters(chapters) {
    var map = {};
    var names = [];
    for (var c = 0; c < chapters.length; c++) {
      var ch = chapters[c];
      if (!ch.content) continue;
      for (var s = 0; s < ch.content.length; s++) {
        var scene = ch.content[s];
        if (!scene.content) continue;
        for (var b = 0; b < scene.content.length; b++) {
          var block = scene.content[b];
          if (block.type === "dialogue" && block.speaker && !map[block.speaker]) {
            map[block.speaker] = true;
            names.push(block.speaker);
          }
        }
      }
    }
    return names.map(function(n, i) {
      return {
        id: "char_" + String(i + 1).padStart(3, "0"),
        name: n, alias: [], description: "", personality: [], role: "未知",
      };
    });
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = NovelParser;
}





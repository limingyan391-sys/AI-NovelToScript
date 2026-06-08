/**
 * NovelToScript - ???????? v3
 * Enhanced: handles script-style dialogue, (??) markers, year-based chapters,
 *            standalone character names, Chinese ellipsis, smart name extraction
 */

const NovelParser = {
  parse(text, title, author) {
    var detectedTitle = title;
    var detectedAuthor = author;
    if (!title && text) {
      var firstLines = text.split("\n").slice(0, 10);
      var ttl = null, aut = null;
      for (var i = 0; i < firstLines.length; i++) {
        var tl = firstLines[i].trim();
        if (!tl) continue;
        // Author: ??/??
        if (!aut) {
          var am = tl.match(/[\u4f5c\u8457]\u8005[\uff1a: ](.+)/);
          if (am) { aut = am[1].trim(); continue; }
        }
        // Title from ??
        if (!ttl && tl.indexOf("\u300a") >= 0) {
          var s = tl.indexOf("\u300a"), e = tl.indexOf("\u300b");
          if (e > s) { ttl = tl.substring(s + 1, e); continue; }
        }
        // Title: first short line that is not author/desc
        if (!ttl && tl.length < 30 && !/^(?:\u7b80\u4ecb|\u5185\u5bb9\u7b80\u4ecb|\u6458\u8981|\u4f5c\u8005|\u8457\u8005)/.test(tl)) {
          ttl = tl;
        }
      }
      if (ttl) detectedTitle = ttl;
      if (aut) detectedAuthor = aut;
    }
        // Filter novel disclaimers, HTML artifacts, website junk
    text = text.replace(/\u672c\u4e66\u7531[^\n]*/ig, '');
    text = text.replace(/\u9644\uff1a[^\n]*/ig, '');
    text = text.replace(/\u5982\u4e0d\u614e[^\n]*/ig, '');
    text = text.replace(/http[s]?:\/\/[^\s\n]+/g, '');
    text = text.replace(/-{5,}[^-]*?-{5,}/g, '');
    text = text.replace(/id=\s*["\u201c][^"]*["\u201d][^\n]*/gi, '');
    text = text.replace(/<[a-zA-Z\/][^>]*>/g, '');
    const lines = text.split("\n");
    const cleaned = this._skipPreamble(lines);
    const chapters = this._extractChapters(cleaned);
    return {
      metadata: {
        title: detectedTitle || "\u672a\u547d\u540d\u4f5c\u54c1",
        author: detectedAuthor || "\u672a\u77e5\u4f5c\u8005",
        source: "\u539f\u521b\u5c0f\u8bf4", adaptedBy: "",
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
      /^\s*\u7b2c\s*[\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341\u767e\u5343\u96f6\d]+\s*\u7ae0/,
      /^\s*\u7b2c\s*[\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341\u767e\u5343\u96f6\d]+\s*\u8282/,
      /^\s*Chapter\s+\d+/i,
      /^\s*Part\s+[IVXLCDM]+/i,
      /^\s*(?:\u5e8f\u5e55|\u5e8f\u7ae0|\u7ec8\u7ae0|\u5c3e\u58f0|\u540e\u8bb0)\s*$/,
      /^\s*\u7b2c\s*\d+\s*\u7ae0/,
      /^\d{4}\s*\u5e74/,
      /^\u6b63\u6587\s+\d+[\.\u3001]\s*/,
      /^\s*\u7b2c\s*[\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341\u767e\u5343\u96f6\u6570]\s*\u5377/,
      /^\s*\u7b2c\s*\d+\s*\u5377/
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

  _speechVerbs: [
    "\u89e3\u91ca\u9053","\u8865\u5145\u9053","\u5f3a\u8c03\u9053","\u91cd\u590d\u9053","\u544a\u8bc9\u9053","\u5429\u5490\u9053","\u547d\u4ee4\u9053",
    "\u63d0\u9192\u9053","\u5efa\u8bae\u9053","\u5b89\u6170\u9053","\u627f\u8ba4\u9053","\u5426\u8ba4\u9053","\u6279\u8bc4\u9053","\u79f0\u8d5e\u9053",
    "\u62b1\u6028\u9053","\u56de\u5e94\u9053","\u8fa9\u89e3\u9053","\u5766\u767d\u9053","\u77ab\u8000\u9053","\u56de\u7b54\u9053",
    "\u5f00\u5fc3\u9053","\u5e78\u798f\u9053","\u6d41\u6cea\u9053","\u54ed\u7740\u9053","\u7b11\u7740\u9053","\u4f4e\u58f0\u9053","\u5c0f\u58f0\u9053",
    "\u5927\u58f0\u9053","\u5c16\u53eb\u9053","\u548b\u820c\u9053","\u65e0\u5948\u9053","\u53f9\u606f\u9053","\u6447\u5934\u9053","\u70b9\u5934\u9053",
    "\u62ac\u5934\u9053","\u4f4e\u5934\u9053","\u56de\u5934\u9053","\u63d2\u5634\u9053","\u63a5\u53e3\u9053","\u63a5\u8bdd\u9053",
    "\u5fcd\u4e0d\u4f4f\u9053","\u4e0d\u7981\u9053","\u4e0d\u7531\u9053",
    "\u54c6\u54ee\u9053","\u6012\u543c\u9053","\u60ca\u547c\u9053","\u60ca\u53eb\u9053","\u5931\u58f0\u9053","\u5927\u543c\u9053",
    "\u51b7\u7b11\u9053","\u82e6\u7b11\u9053","\u5fae\u7b11\u9053","\u611f\u53f9\u9053","\u611f\u6168\u9053",
    "\u5fc3\u60f3\u9053","\u6697\u60f3\u9053","\u5bfb\u601d\u9053","\u6c89\u601d\u9053",
    "\u56de\u7b54\u8bf4","\u89e3\u91ca\u8bf4","\u8865\u5145\u8bf4","\u5f3a\u8c03\u8bf4","\u91cd\u590d\u8bf4",
    "\u544a\u8bc9\u8bf4","\u5429\u5490\u8bf4","\u547d\u4ee4\u8bf4","\u63d0\u9192\u8bf4","\u5efa\u8bae\u8bf4",
    "\u9f13\u52b1\u8bf4","\u5b89\u6170\u8bf4","\u627f\u8ba4\u8bf4","\u5426\u8ba4\u8bf4","\u6279\u8bc4\u8bf4",
    "\u79f0\u8d5e\u8bf4","\u62b1\u6028\u8bf4","\u56de\u5e94\u8bf4","\u8fa9\u89e3\u8bf4","\u5766\u767d\u8bf4",
    "\u77ab\u8000\u8bf4","\u5439\u5618\u8bf4","\u80e1\u8bf4\u9053",
    "\u95ee\u9053","\u8bf4\u9053","\u559d\u9053","\u53eb\u9053","\u54ed\u9053","\u543c\u9053","\u559d\u9053",
    "\u9a82\u9053","\u7b11\u9053","\u53f9\u9053",
    "\u56de\u7b54","\u89e3\u91ca","\u8865\u5145","\u5f3a\u8c03","\u91cd\u590d","\u544a\u8bc9","\u5429\u5490","\u547d\u4ee4",
    "\u63d0\u9192","\u5efa\u8bae","\u9f13\u52b1","\u5b89\u6170","\u627f\u8ba4","\u5426\u8ba4","\u6279\u8bc4",
    "\u79f0\u8d5e","\u62b1\u6028","\u56de\u5e94","\u8fa9\u89e3","\u5766\u767d","\u77ab\u8000","\u5439\u5618",
    "\u54c6\u54ee","\u6012\u543c","\u60ca\u547c","\u60ca\u53eb","\u5931\u58f0","\u5927\u543c","\u51b7\u7b11","\u82e6\u7b11","\u5fae\u7b11",
    "\u611f\u53f9","\u611f\u6168","\u5fc3\u60f3","\u6697\u60f3","\u5bfb\u601d","\u6c89\u601d",
    "\u95ee","\u7b54","\u8bf4","\u9053","\u559d","\u53eb","\u9a82","\u529d","\u53f9"
  ],

  _isStopW(s) {
    var stops = {
      "\u7684":1,"\u4e86":1,"\u5728":1,"\u6709":1,"\u662f":1,"\u4e0d":1,"\u6211":1,"\u4f60":1,"\u4ed6":1,
      "\u5979":1,"\u5b83":1,"\u4eec":1,"\u8fd9":1,"\u90a3":1,"\u4ec0\u4e48":1,"\u600e\u4e48":1,"\u4e3a\u4ec0\u4e48":1,
      "\u56e0\u4e3a":1,"\u6240\u4ee5":1,"\u4f46\u662f":1,"\u867d\u7136":1,"\u5982\u679c":1,"\u800c\u4e14":1,"\u7136\u540e":1,
      "\u5df2\u7ecf":1,"\u6b63\u5728":1,"\u53ef\u4ee5":1,"\u6ca1\u6709":1,"\u8fd8\u662f":1,"\u6216\u8005":1,"\u4e00\u4e2a":1,
      "\u8fd9\u4e2a":1,"\u90a3\u4e2a":1,"\u8fd9\u4e9b":1,"\u90a3\u4e9b":1,"\u4e00\u8fb9":1,"\u5fc3\u91cc":1,"\u5fc3\u4e2d":1,
      "\u8111\u6d77":1,"\u5634\u91cc":1,"\u53e3\u4e2d":1,"\u80cc\u540e":1,"\u9762\u524d":1,"\u773c\u524d":1,"\u5934\u4e0a":1,
      "\u811a\u4e0b":1,"\u8eab\u4e0a":1,"\u624b\u91cc":1,"\u6000\u4e2d":1,"\u5bf9\u7740":1,
      "\u770b\u7740":1,"\u542c\u7740":1,"\u60f3\u7740":1,"\u611f\u89c9":1,"\u89c9\u5f97":1,"\u4e5f":1,"\u4f9d\u65e7":1,
      "\u4ecd\u7136":1,"\u8fd8\u662f":1,"\u5df2\u662f":1,"\u5c31\u662f":1,"\u4fbf\u662f":1,"\u66f4\u662f":1,
      "\u90a3\u91cc":1,"\u8fd9\u91cc":1,"\u4e8e\u662f":1,"\u4e0d\u8fc7":1,"\u53ea\u662f":1,"\u53ef\u662f":1,
      "\u4f46\u662f":1,"\u7136\u800c":1,"\u867d\u7136":1,"\u8bf4\u6655":1,
      "\u5ffd\u7136":1,"\u7a81\u7136":1,"\u987f\u65f6":1,"\u77ac\u95f4":1,
      "\u7ec8\u4e8e":1,"\u6bd5\u7adf":1,"\u7b80\u76f4":1,"\u5b9e\u5728":1,"\u771f\u7684":1,"\u771f\u662f":1,
      "\u53ea\u89c1":1,"\u4e00\u4e2a":1,"\u90a3\u4f4d":1,"\u8fd9\u4f4d":1,"\u67d0\u4e2a":1,
      "\u5374":1,"\u5c31":1,"\u53c8":1,"\u4e5f":1,"\u8fd8":1,"\u90fd":1,
    };
    return stops[s] === 1;
  },

  _isValidCharacterName(s) {
    if (!s) return false;
    if (s.length < 2 || s.length > 6) return false;
    if (this._isStopW(s)) return false;
    // Pure Chinese names only
    if (!/^[\u4e00-\u9fff\u3400-\u4dbf]+$/.test(s)) return false;
    return true;
  },

  _cleanName(s) {
    if (!s) return "";
    // Remove trailing adverbs
    var adverbs = [
      "\u5728\u5fc3\u4e2d","\u5fc3\u91cc","\u8111\u6d77\u4e2d","\u5634\u91cc","\u53e3\u4e2d","\u5728\u5fc3\u4e2d",
      "\u4e00\u8fb9","\u5fcd\u4e0d\u4f4f","\u4e0d\u7981","\u4e0d\u7531",
      "\u5fae\u5fae","\u7f13\u7f13","\u60f3\u4e86\u60f3","\u770b\u4e86\u770b",
      "\u6c89\u9ed8\u4e86","\u8f6c\u8fc7\u8eab","\u56de\u8fc7\u5934",
    ];
    for (var a = 0; a < adverbs.length; a++) {
      var ai = s.lastIndexOf(adverbs[a]);
      if (ai >= 0 && ai >= s.length - 10) {
        s = s.substring(0, ai).trim();
        break;
      }
    }
    // Remove trailing punctuation
    s = s.replace(/[\u3000\uff0c\u3002\uff01\uff1f\u3001\u2014\u2026\s,.;!?]+$/, "").trim();
    return s;
  },

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

    // If no chapters matched, treat all text as one chapter
    if (chapters.length === 0) {
      // Only split on year markers if they appear as standalone lines (not followed by much text)
      var yearLines = [];
      var yearCur = null;
      var yearSplitCount = 0;
      for (var yi = 0; yi < lines.length; yi++) {
        var yl = lines[yi].trim();
        if (/^\d{4}\s*\u5e74/.test(yl) && yl.length < 20) {
          if (yearCur) {
            yearCur.content = this._parseChapterContent(yearLines);
            chapters.push(yearCur);
            yearLines = [];
            yearSplitCount++;
          }
          yearCur = { title: yl, index: chapters.length + 1, content: [] };
        } else if (yearCur) {
          yearLines.push(yl);
        }
      }
      if (yearCur && yearLines.length > 0) {
        yearCur.content = this._parseChapterContent(yearLines);
        chapters.push(yearCur);
        yearSplitCount++;
      }
      // If year-based split resulted in 3+ chapters, keep it. Otherwise treat as single chapter.
      if (yearSplitCount < 3) {
        chapters = [];
      }
      if (chapters.length === 0) {
        chapters.push({ title: "\u5168\u6587", index: 1, content: this._parseChapterContent(lines) });
      }
    }

    return chapters;
  },

  _parseChapterContent(lines) {
    var blocks = [];
    var i = 0;
    var pendingNarr = null;

    function flushNarr() {
      if (pendingNarr) {
        blocks.push({ type: "narrative", text: pendingNarr, description: pendingNarr });
        pendingNarr = null;
      }
    }

    while (i < lines.length) {
      var line = lines[i].trim();
      if (!line) { i++; continue; }

      var marker = this._detectSceneMarker(line);
      if (marker) { flushNarr(); blocks.push({ type: "scene_marker" }, marker); i++; continue; }

      // Check for (??) markers
      if (/^\u0028\u65c1\u767d\u0029/.test(line)) {
        flushNarr();
        var narText = line.replace(/^\u0028\u65c1\u767d\u0029\s*/, "").trim();
        if (!narText && i + 1 < lines.length) {
          i++;
          narText = lines[i].trim();
        }
        pendingNarr = narText || "(??)";
        i++;
        continue;
      }

      // Check for Chinese ellipsis standalone
      if (/^(?:\u2026{2,})/.test(line)) {
        flushNarr();
        blocks.push({ type: "action", description: "??", camera: "" });
        i++;
        continue;
      }

      // Check for quoted dialogue
      var dialogs = this._extractAllDialogs(line);
      if (dialogs) {
        flushNarr();
        if (i > 0 && dialogs.length > 0 && !dialogs[0].speaker) {
          var prevLine = lines[i - 1].trim();
          var prevIsName = this._isValidCharacterName(prevLine);
          if (prevIsName) {
            dialogs[0].speaker = prevLine;
            // Remove if prev line was added as narration
            for (var bi = blocks.length - 1; bi >= 0; bi--) {
              if (blocks[bi].type === "narrative" && blocks[bi].text === prevLine) {
                blocks.splice(bi, 1);
                break;
              }
            }
          }
        }
        blocks = blocks.concat(dialogs);
        i++;
        continue;
      }

      // Check for unquoted dialogue (screenplay format)
      var isNameLine = this._isValidCharacterName(line);
      if (isNameLine && i + 1 < lines.length) {
        var nextLine = lines[i + 1].trim();
        var nextQuoted = this._extractAllDialogs(nextLine);
        if (nextQuoted && nextQuoted.length > 0) {
          flushNarr();
          if (!nextQuoted[0].speaker) nextQuoted[0].speaker = line;
          blocks = blocks.concat(nextQuoted);
          i += 2;
          continue;
        }
        // Unquoted dialogue
        if (nextLine.length > 4 && /[\u3002\uff01\uff1f]/.test(nextLine)) {
          flushNarr();
          blocks.push({ type: "dialogue", speaker: line, line: nextLine, delivery: "" });
          i += 2;
          continue;
        }
      }

      // Default: accumulate as narrative text (combine consecutive lines)
      if (pendingNarr) {
        pendingNarr += "\n" + line;
      } else {
        pendingNarr = line;
      }
      i++;
    }
    flushNarr();
    return this._groupIntoScenes(blocks);
  },
  _extractAllDialogs(line) {
    var results = [];
    var remaining = line.trim();
    var foundAny = false;

    // Skip if no quotes at all
    var hasAnyQuote = false;
    for (var qi = 0; qi < remaining.length; qi++) {
      if (this._isOpenQ(remaining[qi])) { hasAnyQuote = true; break; }
    }
    if (!hasAnyQuote) return null;

    while (remaining.length > 0) {
      remaining = remaining.trim();
      if (!remaining) break;

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
      if (before) { speaker = this._speakerBefore(before); }
      if (!speaker && after) { speaker = this._speakerAfter(after); }

      results.push({ type: "dialogue", speaker: speaker || "", line: text, delivery: "" });
      foundAny = true;
      remaining = after;
    }

    // Normalize Chinese ellipsis in dialogue text
    for (var ri = 0; ri < results.length; ri++) {
      if (results[ri].line) {
        results[ri].line = results[ri].line.replace(/\u2026{2,}/g, "??");
      }
    }

    return foundAny ? results : null;
  },

  _speakerBefore(text) {
    var verbs = this._speechVerbs;
    var bestIdx = -1;
    var bestVerb = null;
    for (var v = 0; v < verbs.length; v++) {
      var idx = text.lastIndexOf(verbs[v]);
      if (idx > bestIdx) { bestIdx = idx; bestVerb = verbs[v]; }
    }

    if (bestVerb === null || bestIdx < 0) {
      var clean = this._cleanName(text);
      var m = clean.match(/([\u4e00-\u9fff\u3400-\u4dbfa-zA-Z]{1,6})$/);
      if (m && m[1].length > 1 && !this._isStopW(m[1]) && m[1] !== "\u5374" && m[1] !== "\u5c31" && m[1] !== "\u53c8" && m[1] !== "\u4e5f") return m[1];
      return null;
    }

    var beforeVerb = text.substring(0, bestIdx).trim();
    if (!beforeVerb) return null;
    beforeVerb = this._cleanName(beforeVerb);
    if (!beforeVerb) return null;

    var m = beforeVerb.match(/([\u4e00-\u9fff\u3400-\u4dbfa-zA-Z]{1,6})$/);
      if (m && m[1].length > 1 && !this._isStopW(m[1])) return m[1];

    var fb = beforeVerb.match(/([\u4e00-\u9fff]{2,4})$/);
    return fb ? fb[1] : null;
  },

  _speakerAfter(text) {
    var verbs = this._speechVerbs;
    var bestIdx = 999999;
    var bestVerb = null;
    for (var v = 0; v < verbs.length; v++) {
      var idx = text.indexOf(verbs[v]);
      if (idx >= 0 && idx < bestIdx) { bestIdx = idx; bestVerb = verbs[v]; }
    }

    if (bestVerb === null || bestIdx < 0) {
      var m = text.match(/^([\u4e00-\u9fff\u3400-\u4dbfa-zA-Z]{1,6})[\s\u3000]/);
      if (m && m[1].length > 1 && !this._isStopW(m[1])) return m[1];
      return null;
    }

    var beforeVerb = text.substring(0, bestIdx).trim();
    if (!beforeVerb) return null;
    var m = beforeVerb.match(/^[\s\u3000]*([\u4e00-\u9fff\u3400-\u4dbfa-zA-Z]{1,6})$/);
      if (m && m[1].length > 1 && !this._isStopW(m[1])) return m[1];
    return null;
  },

  _detectSceneMarker(line) {
    var m = {};
    var ok = false;
    if (/^(?:\u573a\u666f|\u5730\u70b9|\u573a\u666f[\uff1a:]|\u5730\u70b9[\uff1a:])/.test(line)) {
      m.location = line.replace(/^(?:\u573a\u666f|\u5730\u70b9|\u573a\u666f[\uff1a:]|\u5730\u70b9[\uff1a:])\s*/, "").trim();
      ok = true;
    }
    if (/^(?:\u65f6\u95f4|\u65f6\u95f4[\uff1a:])/.test(line)) {
      m.time = line.replace(/^(?:\u65f6\u95f4|\u65f6\u95f4[\uff1a:])\s*/, "").trim();
      ok = true;
    }
    if (/^(?:\u5929\u6c14|\u5929\u6c14[\uff1a:])/.test(line)) {
      m.weather = line.replace(/^(?:\u5929\u6c14|\u5929\u6c14[\uff1a:])\s*/, "").trim();
      ok = true;
    }
    return ok ? m : null;
  },

  _groupIntoScenes(blocks) {
    var scenes = [];
    var ctr = 0;
    var cur = null;

    for (var b = 0; b < blocks.length; b++) {
      var block = blocks[b];
      if (block.type === "scene_marker") {
        if (!cur) {
          ctr++;
          cur = { id: "scene_" + String(ctr).padStart(3, "0"), setting: { location: "", time: "", weather: "" }, synopsis: "", content: [] };
        }
        if (block.location !== undefined) cur.setting.location = block.location;
        if (block.time !== undefined) cur.setting.time = block.time;
        if (block.weather !== undefined) cur.setting.weather = block.weather;
      } else {
        if (!cur) {
          ctr++;
          cur = { id: "scene_" + String(ctr).padStart(3, "0"), setting: { location: "", time: "", weather: "" }, synopsis: "", content: [] };
        }
        cur.content.push(block);
      }
    }
    // Split into multiple scenes if content exceeds threshold
    if (cur && cur.content.length > 50) {
      var chunks = [];
      for (var ci = 0; ci < cur.content.length; ci += 20) {
        chunks.push(cur.content.slice(ci, ci + 20));
      }
      for (var ci = 0; ci < chunks.length; ci++) {
        ctr++;
        scenes.push({ id: "scene_" + String(ctr).padStart(3, "0"), setting: Object.assign({}, cur.setting), synopsis: "", content: chunks[ci] });
      }
    } else if (cur) {
      scenes.push(cur);
    }
    if (scenes.length === 0) { scenes.push({ id: "scene_001", setting: { location: "", time: "", weather: "" }, synopsis: "", content: [] }); }
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
          if (block.type === "dialogue" && block.speaker) {
            var n = block.speaker.trim();
            if (n && n.length > 1 && !map[n] && this._isValidCharacterName(n)) {
              map[n] = true;
              names.push(n);
            }
          }
        }
      }
    }
    return names.map(function(n, i) {
      return {
        id: "char_" + String(i + 1).padStart(3, "0"),
        name: n, alias: [], description: "", personality: [], role: "\u672a\u77e5",
      };
    });
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = NovelParser;
}






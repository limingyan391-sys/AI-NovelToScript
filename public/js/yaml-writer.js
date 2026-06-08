/**
 * YAML Writer - 轻量级 YAML 序列化器（零依赖）
 */
const YAMLWriter = {
  stringify(obj, indent = 0) {
    const pad = '  '.repeat(indent);
    const pad1 = '  '.repeat(indent + 1);
    let result = '';

    if (obj === null || obj === undefined) {
      return 'null\n';
    }

    if (typeof obj === 'string') {
      if (obj.includes('\n') || obj.includes(':') || obj.includes('#') || obj.length > 80) {
        return '|\n' + obj.split('\n').map(l => pad1 + l).join('\n') + '\n';
      }
      if (obj === '') return '""\n';
      return `"${obj.replace(/"/g, '\\"')}"\n`;
    }

    if (typeof obj === 'number') return obj + '\n';
    if (typeof obj === 'boolean') return (obj ? 'true' : 'false') + '\n';

    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]\n';
      for (const item of obj) {
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          result += pad + '- ';
          const keys = Object.keys(item);
          result += '\n';
          for (const key of keys) {
            result += pad + '  ' + key + ': ';
            result += this.stringify(item[key], indent + 2).trimStart();
          }
        } else {
          result += pad + '- ' + this.stringify(item, indent + 1).trimStart();
        }
      }
      return result;
    }

    if (typeof obj === 'object') {
      const keys = Object.keys(obj);
      if (keys.length === 0) return '{}\n';
      for (const key of keys) {
        const val = obj[key];
        if (val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) continue;
        result += pad + key + ': ';
        result += this.stringify(val, indent + 1);
      }
      return result;
    }

    return String(obj) + '\n';
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = YAMLWriter;
}

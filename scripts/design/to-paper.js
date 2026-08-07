// Convert flattened prototype HTML into Paper-safe HTML.
//
// Paper's write_html rejects `display: grid`, `margin`, and HTML tables, and
// carries prototype cruft (data-dc-tpl, href, role) that would pollute the
// layer tree. This rewrites those constructs into the flex equivalents Paper's
// canvas models natively.
//
// Usage: node to-paper.js <file.html> [cssSelectorlessChunkIndex]

const fs = require("fs");

function parseStyle(s) {
  const out = [];
  let depth = 0, cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === ";" && depth === 0) { if (cur.trim()) out.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.map((d) => {
    const i = d.indexOf(":");
    return [d.slice(0, i).trim(), d.slice(i + 1).trim()];
  });
}

function serializeStyle(pairs) {
  return pairs.map(([k, v]) => `${k}: ${v}`).join("; ");
}

// Split a grid-template-columns value into track strings.
function tracks(v) {
  const rep = v.match(/^repeat\(\s*(\d+)\s*,\s*(.+)\)$/);
  if (rep) return Array(Number(rep[1])).fill(rep[2].trim());
  return v.trim().split(/\s+(?![^(]*\))/);
}

// Style for a child occupying a given grid track.
function trackStyle(t) {
  // Fractional tracks are common (0.9fr, 1.2fr). `flex: N 1 0` reproduces an
  // `Nfr` track exactly: proportional share of the line from a zero basis.
  if (/^\d*\.?\d+fr$/.test(t)) {
    const n = parseFloat(t);
    return `flex: ${n} 1 0`;
  }
  const mm = t.match(/^minmax\(\s*[^,]+,\s*(\d*\.?\d+)fr\s*\)$/);
  if (mm) return `flex: ${parseFloat(mm[1])} 1 0; min-width: 0`;
  if (t === "auto" || t === "min-content" || t === "max-content") return "flex: 0 0 auto";
  if (/^\d/.test(t)) return `width: ${t}; flex-shrink: 0`;
  if (/^minmax\(/.test(t)) return "flex: 1 1 0";
  return "flex: 1 1 0";
}

// `centerParents` is a set of element indices (open-tag order) that must become
// flex columns so a centered child's `align-self` actually resolves. It is
// collected on a first pass and applied on a second.
function convert(html, centerParents) {
  const collect = !centerParents;
  const wantCenter = new Set();
  const notes = { grids: 0, gridCols: 0, margins: 0, stripped: 0, centered: 0, wrapped: 0, unwrapped: 0, collapsed: 0 };
  let elemIndex = -1;

  // Strip prototype-only attributes.
  html = html.replace(/\s(?:data-dc-tpl|data-sc-name|data-props|tabindex)="[^"]*"/g, () => {
    notes.stripped++; return "";
  });
  html = html.replace(/\s(?:href|type|role|aria-[a-z-]+)="[^"]*"/g, "");
  html = html.replace(/\sclass="[^"]*"/g, "");

  // Walk elements, rewriting styles. Children of a grid parent need track
  // styles, so record pending assignments keyed by nesting depth.
  const pendingByDepth = new Map();
  const stack = [];
  let depth = 0;
  // Depth at which a collapsed-expander subtree started, or null.
  let skipFromDepth = null;
  let out = "";
  let last = 0;
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*)(\/?)>/g;
  let m;

  while ((m = re.exec(html))) {
    const between = html.slice(last, m.index);
    last = re.lastIndex;
    // Text nodes inside a skipped subtree must be dropped too, or the band's
    // copy survives as bare text with no markup around it.
    if (skipFromDepth === null) out += between;

    const closing = !!m[1];
    const tag = m[2].toLowerCase();
    let attrs = m[3];
    const selfClose = !!m[4];
    const isVoid = ["br", "img", "input", "hr", "path", "circle", "rect", "line", "polyline", "polygon", "stop", "use"].includes(tag);

    if (closing) {
      depth--;
      pendingByDepth.delete(depth + 1);
      stack.pop();
      if (skipFromDepth !== null) {
        if (depth === skipFromDepth) skipFromDepth = null; // subtree ends here
        continue;
      }
      out += m[0];
      continue;
    }

    // Inside a collapsed expander: drop the whole subtree.
    if (skipFromDepth !== null) {
      if (!isVoid && !selfClose) { depth++; stack.push({}); }
      continue;
    }

    elemIndex++;
    const myIndex = elemIndex;

    const sm = attrs.match(/\sstyle="([^"]*)"/);
    let pairs = sm ? parseStyle(sm[1]) : [];

    // Second pass: this element hosts a horizontally-centered child.
    if (!collect && centerParents.has(myIndex)) {
      notes.centered++;
      const d = pairs.find(([k]) => k === "display");
      if (d) d[1] = "flex"; else pairs.push(["display", "flex"]);
      if (!pairs.some(([k]) => k === "flex-direction")) pairs.push(["flex-direction", "column"]);
      // Deliberately no align-items here: the centered child carries its own
      // align-self, and forcing center would shrink full-bleed siblings
      // (headers, rules) to their content width.
    }

    // Apply a track style inherited from a grid parent.
    const pending = pendingByDepth.get(depth);
    if (pending) {
      const idx = pending.used++;
      if (pending.uniform) {
        const n = pending.n;
        const basis = `calc((100% - ${n - 1} * ${pending.colGap}) / ${n})`;
        pairs = pairs.concat([["flex", `0 0 ${basis}`], ["max-width", basis]]);
      } else {
        const t = pending.cols[idx % pending.cols.length];
        if (t) pairs = pairs.concat(parseStyle(trackStyle(t)));
      }
    }

    // The prototype animates its expander with the `grid-template-rows: 0fr -> 1fr`
    // idiom, so a closed band is still fully present in the DOM. Stripping grid
    // props would drop the mechanism and render the band open, making a
    // "collapsed" capture identical to the expanded one. Paper has no animated
    // expander, so omit the closed subtree rather than importing hidden nodes.
    const gtr = pairs.find(([k]) => k === "grid-template-rows");
    if (gtr && /^0fr$/.test(gtr[1].trim()) && !isVoid && !selfClose) {
      notes.collapsed++;
      skipFromDepth = depth;
      depth++;
      stack.push({});
      continue;
    }

    // Rewrite grid -> flex.
    const dIdx = pairs.findIndex(([k]) => k === "display");
    if (dIdx !== -1 && /grid/.test(pairs[dIdx][1])) {
      notes.grids++;
      pairs[dIdx] = ["display", "flex"];
      const gtcIdx = pairs.findIndex(([k]) => k === "grid-template-columns");
      if (gtcIdx !== -1) {
        notes.gridCols++;
        const cols = tracks(pairs[gtcIdx][1]);
        pairs.splice(gtcIdx, 1);

        // A grid with uniform tracks auto-wraps its children into rows; flex
        // does not. Reproduce it with flex-wrap plus an exact per-child basis,
        // otherwise every cell lands on one overflowing line.
        // `1fr` and `minmax(0, 1fr)` are both fr-like; the latter ends in ')'.
        const uniform = cols.length > 1 && cols.every((c) => c === cols[0]) && /fr\s*\)?$/.test(cols[0]);
        if (uniform) {
          const gapDecl = (pairs.find(([k]) => k === "gap") || pairs.find(([k]) => k === "column-gap") || [])[1] || "0px";
          const colGap = gapDecl.trim().split(/\s+/).length > 1 ? gapDecl.trim().split(/\s+/)[1] : gapDecl.trim();
          if (!pairs.some(([k]) => k === "flex-wrap")) pairs.push(["flex-wrap", "wrap"]);
          notes.wrapped++;
          if (!isVoid && !selfClose) {
            pendingByDepth.set(depth + 1, { cols, used: 0, uniform: true, n: cols.length, colGap });
          }
        } else if (!isVoid && !selfClose) {
          pendingByDepth.set(depth + 1, { cols, used: 0 });
        }
      } else {
        // A grid with no explicit columns is a vertical stack.
        if (!pairs.some(([k]) => k === "flex-direction")) pairs.push(["flex-direction", "column"]);
      }
      // Grid-only alignment keywords have flex spellings.
      for (const p of pairs) {
        if (p[0] === "justify-items") { p[0] = "align-items"; p[1] = p[1] === "start" ? "flex-start" : p[1] === "end" ? "flex-end" : p[1]; }
        if (p[0] === "align-items" && p[1] === "start") p[1] = "flex-start";
        if (p[0] === "align-items" && p[1] === "end") p[1] = "flex-end";
      }
      pairs = pairs.filter(([k]) => !/^grid-/.test(k) && k !== "place-items" && k !== "place-content");
    }

    // Grid props on a non-grid element are dead weight.
    pairs = pairs.filter(([k]) => !/^grid-/.test(k));

    // `display: contents` wrappers come from the prototype's component runtime.
    // Paper has no equivalent. Removing the box entirely loses the flex sizing
    // it inherits from its parent (which collapsed the ticker rail), so keep it
    // and make it a transparent flex passthrough instead.
    {
      const dp = pairs.find(([k]) => k === "display");
      if (dp && dp[1] === "contents") { dp[1] = "flex"; notes.unwrapped++; }
    }

    // Auto margins carry layout meaning that padding can't express:
    //   `margin: 0 auto`   -> centering a max-width block  -> align-self: center
    //   `margin-left: auto` -> push to the end of a flex row -> a flex spacer
    // Everything else falls through to the padding rule below.
    let needsSpacer = false;
    {
      const marginDecls = pairs.filter(([k]) => k === "margin" || /^margin-/.test(k));
      for (const [k, v] of marginDecls) {
        const parts = v.trim().split(/\s+/);
        const bothAuto = k === "margin" && parts.length >= 2 && parts[1] === "auto";
        const leftAuto = k === "margin-left" && v.trim() === "auto";
        if (bothAuto) {
          if (!pairs.some(([k2]) => k2 === "align-self")) pairs.push(["align-self", "center"]);
          if (!pairs.some(([k2]) => k2 === "width")) pairs.push(["width", "100%"]);
          if (collect && stack.length) wantCenter.add(stack[stack.length - 1].index);
        } else if (leftAuto) {
          const parent = stack[stack.length - 1];
          const row = parent && parent.display === "flex" && parent.direction !== "column";
          if (row) needsSpacer = true;
          else if (!pairs.some(([k2]) => k2 === "align-self")) pairs.push(["align-self", "flex-end"]);
        }
      }
    }

    // margin -> padding when visually equivalent (no background, no border).
    const hasPaint = pairs.some(([k, v]) =>
      (k === "background" && v !== "none" && v !== "transparent") ||
      k === "background-color" ||
      (/^border(-(top|right|bottom|left))?$/.test(k) && !/none/.test(v)) ||
      k === "box-shadow");
    const marginIdx = pairs.findIndex(([k]) => k === "margin" || /^margin-/.test(k));
    if (marginIdx !== -1) {
      notes.margins++;
      const margins = pairs.filter(([k]) => k === "margin" || /^margin-/.test(k));
      pairs = pairs.filter(([k]) => k !== "margin" && !/^margin-/.test(k));
      if (!hasPaint) {
        for (const [k, v] of margins) {
          if (v === "auto" || /\bauto\b/.test(v)) continue; // handled by flex, not padding
          if (/-\d/.test(v)) continue; // negative margins have no padding equivalent
          const pk = k.replace(/^margin/, "padding");
          const existing = pairs.find(([k2]) => k2 === pk);
          if (!existing) pairs.push([pk, v]);
        }
      }
    }

    // Paper wants explicit flex; `display: inline-flex` is fine, `inline` is not.
    for (const p of pairs) {
      if (p[0] === "display" && p[1] === "inline") p[1] = "flex";
      if (p[0] === "display" && p[1] === "inline-block") p[1] = "flex";
    }

    let newAttrs = attrs;
    const styleStr = serializeStyle(pairs);
    if (sm) {
      newAttrs = attrs.replace(/\sstyle="[^"]*"/, styleStr ? ` style="${styleStr}"` : "");
    } else if (styleStr) {
      newAttrs = attrs + ` style="${styleStr}"`;
    }

    if (needsSpacer) out += `<div layer-name="Spacer" style="flex: 1 1 auto"></div>`;
    out += `<${tag}${newAttrs}${selfClose ? "/" : ""}>`;
    if (!isVoid && !selfClose) {
      depth++;
      const disp = (pairs.find(([k]) => k === "display") || [])[1];
      const dir = (pairs.find(([k]) => k === "flex-direction") || [])[1];
      stack.push({ display: disp, direction: dir, index: myIndex });
    }
  }
  out += html.slice(last);

  return { html: out, notes, wantCenter };
}

function convertTwice(html) {
  const first = convert(html);
  return convert(html, first.wantCenter);
}

const file = process.argv[2];
const src = fs.readFileSync(file, "utf8");
const body = src.split(/<body[^>]*>/)[1].split("</body>")[0];
const inner = body.match(/<div id="dc-root">([\s\S]*)<\/div>\s*$/)[1];
const { html, notes } = convertTwice(inner);
fs.writeFileSync(process.argv[3], html);
console.error(JSON.stringify(notes));
console.error("out bytes: " + html.length);

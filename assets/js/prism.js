/* ============================================================
   prism.js — iridescent "neural prism"
   Nested super-elliptic toroidal ribbons rendered in WebGL,
   with an animated inline-SVG fallback when WebGL is absent.
   ============================================================ */
(function () {
  'use strict';

  var stage = document.querySelector('[data-prism]');
  if (!stage) return;

  var canvas = stage.querySelector('canvas');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- tiny mat4 ---------- */
  function ident() { return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); }
  function mul(a, b) {
    var o = new Float32Array(16);
    for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) {
      o[i*4+j] = a[j]*b[i*4] + a[4+j]*b[i*4+1] + a[8+j]*b[i*4+2] + a[12+j]*b[i*4+3];
    }
    return o;
  }
  function perspective(fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far), o = new Float32Array(16);
    o[0]=f/aspect; o[5]=f; o[10]=(far+near)*nf; o[11]=-1; o[14]=2*far*near*nf;
    return o;
  }
  function translate(x, y, z) { var o = ident(); o[12]=x; o[13]=y; o[14]=z; return o; }
  function scale(s) { var o = ident(); o[0]=o[5]=o[10]=s; return o; }
  function rotX(a) { var c=Math.cos(a), s=Math.sin(a), o=ident(); o[5]=c; o[6]=s; o[9]=-s; o[10]=c; return o; }
  function rotY(a) { var c=Math.cos(a), s=Math.sin(a), o=ident(); o[0]=c; o[2]=-s; o[8]=s; o[10]=c; return o; }
  function rotZ(a) { var c=Math.cos(a), s=Math.sin(a), o=ident(); o[0]=c; o[1]=s; o[4]=-s; o[5]=c; return o; }
  function mat3of(m) { return new Float32Array([m[0],m[1],m[2], m[4],m[5],m[6], m[8],m[9],m[10]]); }

  /* ---------- super-elliptic ribbon geometry ---------- */
  function superPoint(t, R, n) {
    var ct = Math.cos(t), st = Math.sin(t), e = 2 / n;
    return [
      R * (ct < 0 ? -1 : 1) * Math.pow(Math.abs(ct), e),
      R * (st < 0 ? -1 : 1) * Math.pow(Math.abs(st), e),
      0
    ];
  }

  function buildRibbon(R, n, a, b, twist, NU, NV) {
    var pos = [], nor = [], idx = [], i, j;
    for (i = 0; i <= NU; i++) {
      var u = i / NU, t = u * Math.PI * 2;
      var P = superPoint(t, R, n);
      var Q = superPoint(t + 0.004, R, n);
      var tx = Q[0]-P[0], ty = Q[1]-P[1];
      var tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      // in-plane normal (tangent rotated 90 deg) and out-of-plane binormal
      var e1 = [-ty, tx, 0], e2 = [0, 0, 1];
      var w = twist * u * Math.PI * 2, cw = Math.cos(w), sw = Math.sin(w);
      var d1 = [cw*e1[0], cw*e1[1], sw];
      var d2 = [-sw*e1[0], -sw*e1[1], cw];
      for (j = 0; j <= NV; j++) {
        var ph = (j / NV) * Math.PI * 2, cp = Math.cos(ph), sp = Math.sin(ph);
        pos.push(
          P[0] + a*cp*d1[0] + b*sp*d2[0],
          P[1] + a*cp*d1[1] + b*sp*d2[1],
          P[2] + a*cp*d1[2] + b*sp*d2[2]
        );
        // ellipse normal in the local cross-section frame
        var nx = cp / a, ny = sp / b, nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
        var Nx = nx*d1[0] + ny*d2[0], Ny = nx*d1[1] + ny*d2[1], Nz = nx*d1[2] + ny*d2[2];
        var NL = Math.hypot(Nx, Ny, Nz) || 1;
        nor.push(Nx/NL, Ny/NL, Nz/NL);
      }
    }
    var stride = NV + 1;
    for (i = 0; i < NU; i++) for (j = 0; j < NV; j++) {
      var A = i*stride + j, B = A + stride;
      idx.push(A, B, A+1, A+1, B, B+1);
    }
    return { pos: new Float32Array(pos), nor: new Float32Array(nor), idx: new Uint16Array(idx) };
  }

  /* ---------- SVG fallback ---------- */
  function startFallback() {
    stage.setAttribute('data-mode', 'svg');
    if (canvas) canvas.style.display = 'none';
    var groups = stage.querySelectorAll('.fallback [data-spin]');
    if (!groups.length || reduced) return;
    var t0 = performance.now(), running = true;
    function tick(now) {
      if (!running) return;
      var t = (now - t0) / 1000;
      for (var i = 0; i < groups.length; i++) {
        var g = groups[i], sp = parseFloat(g.getAttribute('data-spin')) || 1;
        g.setAttribute('transform',
          'translate(300 300) rotate(' + (t * 9 * sp).toFixed(2) + ') ' +
          'scale(1 ' + (0.44 + 0.07 * Math.sin(t * 0.6 + i)).toFixed(3) + ') translate(-300 -300)');
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { running = false; }
      else if (!running) { running = true; t0 = performance.now() - 1; requestAnimationFrame(tick); }
    });
  }

  /* ---------- WebGL ---------- */
  var gl = null;
  try {
    gl = canvas && (canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false })
                 || canvas.getContext('experimental-webgl'));
  } catch (e) { gl = null; }

  if (!gl) { startFallback(); return; }

  var VS = [
    'attribute vec3 aPos;',
    'attribute vec3 aNor;',
    'uniform mat4 uProj, uView, uModel;',
    'uniform mat3 uNorm;',
    'varying vec3 vN; varying vec3 vWP;',
    'void main(){',
    '  vec4 wp = uModel * vec4(aPos,1.0);',
    '  vWP = wp.xyz;',
    '  vN = normalize(uNorm * aNor);',
    '  gl_Position = uProj * uView * wp;',
    '}'
  ].join('\n');

  var FS = [
    'precision highp float;',
    'varying vec3 vN; varying vec3 vWP;',
    'uniform vec3 uCam;',
    'uniform float uT; uniform float uHue; uniform float uGain;',
    'vec3 pal(float t){',
    '  return 0.5 + 0.5*cos(6.28318*(t + vec3(0.0,0.33,0.67)));',
    '}',
    'void main(){',
    '  vec3 N = normalize(vN);',
    '  vec3 V = normalize(uCam - vWP);',
    '  float nv = dot(N,V);',
    '  float fres = pow(1.0 - abs(nv), 3.0);',
    '  vec3 L1 = normalize(vec3(0.55, 0.85, 0.75));',
    '  vec3 L2 = normalize(vec3(-0.80, -0.25, 0.45));',
    '  float s1 = pow(max(dot(N, normalize(L1+V)), 0.0), 96.0);',
    '  float s2 = pow(max(dot(N, normalize(L2+V)), 0.0), 30.0);',
    '  float phase = uHue + fres*1.15 + nv*0.46 + uT*0.02;',
    '  vec3 irisA = pal(phase);',
    '  vec3 irisB = pal(phase + 0.14);',
    '  vec3 col = vec3(0.010);',
    '  col += irisA * (fres*1.70 + 0.055);',
    '  col += mix(vec3(1.0), irisB, 0.60) * s1 * 0.95;',
    '  col += irisB * s2 * 0.80;',
    '  col += irisA * pow(max(0.0, 1.0 - abs(nv)), 7.0) * 0.60;',
    '  col *= uGain;',
    '  col = col / (col + vec3(0.90));',
    '  col = pow(col, vec3(0.4545));',
    '  float alpha = clamp(0.20 + fres*0.95 + s1*0.9, 0.0, 1.0) * uGain;',
    '  gl_FragColor = vec4(col, alpha);',
    '}'
  ].join('\n');

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); return null; }
    return s;
  }
  var vs = compile(gl.VERTEX_SHADER, VS), fs = compile(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) { startFallback(); return; }
  var prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { startFallback(); return; }
  gl.useProgram(prog);

  var loc = {
    aPos: gl.getAttribLocation(prog, 'aPos'),
    aNor: gl.getAttribLocation(prog, 'aNor'),
    uProj: gl.getUniformLocation(prog, 'uProj'),
    uView: gl.getUniformLocation(prog, 'uView'),
    uModel: gl.getUniformLocation(prog, 'uModel'),
    uNorm: gl.getUniformLocation(prog, 'uNorm'),
    uCam: gl.getUniformLocation(prog, 'uCam'),
    uT: gl.getUniformLocation(prog, 'uT'),
    uHue: gl.getUniformLocation(prog, 'uHue'),
    uGain: gl.getUniformLocation(prog, 'uGain')
  };

  /* layer definitions — radius, super-ellipse exponent, ribbon size, twist, spin */
  var LAYERS = [
    { R: 1.00, n: 4.6, a: 0.150, b: 0.020, tw: 1, spin: 0.130, tilt: 0.00, hue: 0.00 },
    { R: 0.885, n: 4.0, a: 0.132, b: 0.019, tw: 1, spin: -0.165, tilt: 0.16, hue: 0.07 },
    { R: 0.770, n: 3.4, a: 0.116, b: 0.018, tw: 2, spin: 0.205, tilt: -0.20, hue: 0.14 },
    { R: 0.655, n: 2.9, a: 0.100, b: 0.017, tw: 2, spin: -0.255, tilt: 0.27, hue: 0.21 },
    { R: 0.540, n: 2.5, a: 0.085, b: 0.016, tw: 3, spin: 0.320, tilt: -0.33, hue: 0.28 },
    { R: 0.425, n: 2.2, a: 0.070, b: 0.015, tw: 3, spin: -0.400, tilt: 0.41, hue: 0.35 },
    { R: 0.310, n: 2.0, a: 0.056, b: 0.014, tw: 4, spin: 0.500, tilt: -0.50, hue: 0.42 }
  ];

  var meshes = LAYERS.map(function (L) {
    var g = buildRibbon(L.R, L.n, L.a, L.b, L.tw, 190, 16);
    var vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, g.pos, gl.STATIC_DRAW);
    var nb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, nb); gl.bufferData(gl.ARRAY_BUFFER, g.nor, gl.STATIC_DRAW);
    var ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, g.idx, gl.STATIC_DRAW);
    return { vb: vb, nb: nb, ib: ib, count: g.idx.length, def: L };
  });

  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);   // additive glass glow
  gl.clearColor(0, 0, 0, 0);

  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var W = 1, H = 1, proj = ident();
  function resize() {
    var r = stage.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width * DPR));
    H = Math.max(1, Math.round(r.height * DPR));
    var changed = canvas.width !== W || canvas.height !== H;
    if (changed) { canvas.width = W; canvas.height = H; }
    gl.viewport(0, 0, W, H);
    proj = perspective(0.72, W / H, 0.1, 60);
    return changed;
  }
  function resizeAndRepaint() { if (resize() && typeof render === 'function') render(lastNow); }
  resize();
  var ro = window.ResizeObserver ? new ResizeObserver(function () { resizeAndRepaint(); }) : null;
  if (ro) ro.observe(stage); else window.addEventListener('resize', resizeAndRepaint);

  var CAM = [0, 0, 3.35];
  var view = translate(-CAM[0], -CAM[1], -CAM[2]);

  /* pointer + scroll drivers */
  var px = 0, py = 0, tx = 0, ty = 0, scrollN = 0;
  window.addEventListener('pointermove', function (e) {
    tx = (e.clientX / window.innerWidth - 0.5) * 2;
    ty = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });
  window.addEventListener('scroll', function () {
    scrollN = window.scrollY / Math.max(1, window.innerHeight);
  }, { passive: true });

  var visible = true;
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: 0 }).observe(stage);
  }

  stage.setAttribute('data-mode', 'gl');
  var start = performance.now(), gain = 0, lastNow = start + 6500;

  function render(now) {
    lastNow = now;
    var t = (now - start) / 1000;
    if (reduced) t = 6.5;                       // a fixed, still-beautiful pose
    gain = gain + (1 - gain) * 0.02;            // fade the whole form in

    px += (tx - px) * 0.045;
    py += (ty - py) * 0.045;

    resize();
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniformMatrix4fv(loc.uProj, false, proj);
    gl.uniformMatrix4fv(loc.uView, false, view);
    gl.uniform3fv(loc.uCam, CAM);
    gl.uniform1f(loc.uT, t);
    gl.uniform1f(loc.uGain, gain);

    // shared world orientation: pointer parallax + scroll drift
    var world = mul(rotY(px * 0.42 + t * 0.05), rotX(-0.42 + py * 0.30 + scrollN * 0.30));

    for (var i = 0; i < meshes.length; i++) {
      var m = meshes[i], d = m.def;
      var breathe = 1 + 0.035 * Math.sin(t * 0.55 + i * 0.7);
      var model = mul(world,
                    mul(rotZ(t * d.spin + i * 0.42),
                      mul(rotX(d.tilt + 0.10 * Math.sin(t * 0.33 + i)),
                        mul(rotY(0.16 * Math.sin(t * 0.27 + i * 1.3)), scale(breathe)))));
      gl.uniformMatrix4fv(loc.uModel, false, model);
      gl.uniformMatrix3fv(loc.uNorm, false, mat3of(model));
      gl.uniform1f(loc.uHue, d.hue + t * 0.012);

      gl.bindBuffer(gl.ARRAY_BUFFER, m.vb);
      gl.enableVertexAttribArray(loc.aPos);
      gl.vertexAttribPointer(loc.aPos, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, m.nb);
      gl.enableVertexAttribArray(loc.aNor);
      gl.vertexAttribPointer(loc.aNor, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.ib);
      gl.drawElements(gl.TRIANGLES, m.count, gl.UNSIGNED_SHORT, 0);
    }
  }

  // Paint once, synchronously: a tab that is never visible (or a device that
  // throttles rAF before first paint) still shows the form rather than a hole.
  gain = 1;
  render(start + 6500);

  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    render(now);
  }
  requestAnimationFrame(frame);

  canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); startFallback(); });
})();

/* ==========================================================================
   Nogrette Elec — scripts du site (V2 « Électrique Néon »)

   Aucune bibliothèque externe : tout est écrit à la main pour que le site
   reste rapide et ne dépende d'aucun service tiers.

   Sommaire :
     1. Décor de fond animé
     2. Réseau électrique du hero (canvas)
     3. Menu mobile
     4. Barre de progression + état de l'en-tête
     5. Apparition des éléments au défilement (avec cascade)
     6. Lueur qui suit la souris sur les cartes
     7. Compteurs animés
     8. Visionneuse photo plein écran
     9. Comparateur avant / après
    10. Année automatique
    11. Formulaire de contact
   ========================================================================== */

(function () {
  'use strict';

  // L'utilisateur a-t-il demandé à son système de limiter les animations ?
  var sobre = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- 1. Décor de fond animé ------------------------------------------- */
  /* Trois halos de couleur qui dérivent lentement derrière tout le site,
     plus une grille technique. Injecté ici pour ne pas alourdir le HTML. */
  var decor = document.createElement('div');
  decor.className = 'decor';
  decor.setAttribute('aria-hidden', 'true');
  decor.innerHTML =
    '<i class="decor__blob decor__blob--1"></i>' +
    '<i class="decor__blob decor__blob--2"></i>' +
    '<i class="decor__blob decor__blob--3"></i>' +
    '<i class="decor__grille"></i>';
  document.body.prepend(decor);

  /* Grain cinéma par-dessus tout le site */
  var grain = document.createElement('i');
  grain.className = 'grain';
  grain.setAttribute('aria-hidden', 'true');
  document.body.appendChild(grain);

  /* --- 1 bis. Aurore WebGL ------------------------------------------------ */
  /* Le fond du site est un shader : des nappes d'énergie cyan/bleu/violet
     calculées par la carte graphique, qui ondulent très lentement et
     répondent discrètement à la souris. Si WebGL n'est pas disponible,
     les halos CSS restent en place — rien ne casse. */
  if (!sobre) {
    (function () {
      var toile = document.createElement('canvas');
      toile.className = 'decor__webgl';
      var gl = toile.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false });
      if (!gl) { return; }

      var VERT =
        'attribute vec2 p;' +
        'void main(){ gl_Position = vec4(p, 0., 1.); }';

      var FRAG =
        'precision mediump float;' +
        'uniform vec2 r;' +      // résolution
        'uniform float t;' +     // temps
        'uniform vec2 m;' +      // souris (0..1)

        // Bruit de valeur + rotation : la base des nappes organiques
        'float hash(vec2 q){ return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }' +
        'float noise(vec2 q){' +
        '  vec2 i = floor(q), f = fract(q);' +
        '  vec2 u = f * f * (3. - 2. * f);' +
        '  return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x),' +
        '             mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y);' +
        '}' +
        'float fbm(vec2 q){' +
        '  float v = 0.; float a = .55;' +
        '  mat2 rot = mat2(.8, .6, -.6, .8);' +
        '  for(int k = 0; k < 5; k++){ v += a * noise(q); q = rot * q * 2.02; a *= .5; }' +
        '  return v;' +
        '}' +

        'void main(){' +
        '  vec2 uv = gl_FragCoord.xy / r;' +
        '  vec2 p = (gl_FragCoord.xy - .5 * r) / min(r.x, r.y);' +

        // La souris incline très légèrement tout le champ
        '  p += (m - .5) * .12;' +

        // Domaine déformé : un fbm qui déforme un autre fbm = soie qui ondule
        '  float t1 = t * .045;' +
        '  vec2 q = vec2(fbm(p * 1.35 + t1), fbm(p * 1.35 - t1 * .7 + 4.7));' +
        '  float n = fbm(p * 1.6 + q * 1.25 + vec2(t1 * .6, -t1 * .4));' +

        // Trois nappes de couleur découpées dans le bruit
        '  float v1 = smoothstep(.42, .78, n);' +                       // nappe principale
        '  float v2 = smoothstep(.55, .95, fbm(p * 2.1 - q + t1));' +   // reflets
        '  float v3 = smoothstep(.48, .9, q.y);' +                      // voile violet

        '  vec3 fond  = vec3(.012, .024, .078);' +                      // nuit profonde
        '  vec3 cyan  = vec3(0., .898, 1.);' +
        '  vec3 bleu  = vec3(.165, .498, 1.);' +
        '  vec3 violet= vec3(.486, .361, 1.);' +

        '  vec3 c = fond;' +
        '  c += bleu   * v1 * .30;' +
        '  c += cyan   * v2 * .22;' +
        '  c += violet * v3 * .16;' +

        // Étincelles : de rares points qui scintillent comme des poussières
        '  float e = noise(p * 90. + t * .5);' +
        '  c += cyan * smoothstep(.985, 1., e) * .5;' +

        // Vignette : les bords s'assombrissent, le regard reste au centre
        '  float vig = 1. - dot(p * .78, p * .78);' +
        '  c *= clamp(vig, .25, 1.);' +

        '  gl_FragColor = vec4(c, 1.);' +
        '}';

      function compiler(type, src) {
        var s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
          return null;
        }
        return s;
      }

      var vs = compiler(gl.VERTEX_SHADER, VERT);
      var fs = compiler(gl.FRAGMENT_SHADER, FRAG);
      if (!vs || !fs) { return; }

      var prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { return; }
      gl.useProgram(prog);

      // Un grand triangle qui couvre tout l'écran
      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var locP = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(locP);
      gl.vertexAttribPointer(locP, 2, gl.FLOAT, false, 0, 0);

      var locR = gl.getUniformLocation(prog, 'r');
      var locT = gl.getUniformLocation(prog, 't');
      var locM = gl.getUniformLocation(prog, 'm');

      // Rendu en demi-définition : invisible à l'œil, deux fois plus léger
      var ECHELLE = .5;
      function tailler() {
        toile.width  = Math.max(1, Math.round(innerWidth  * ECHELLE));
        toile.height = Math.max(1, Math.round(innerHeight * ECHELLE));
        gl.viewport(0, 0, toile.width, toile.height);
        gl.uniform2f(locR, toile.width, toile.height);
      }
      tailler();
      window.addEventListener('resize', tailler);

      // Souris amortie : le fond suit avec une inertie paisible
      var mx = .5, my = .5, cx = .5, cy = .5;
      window.addEventListener('mousemove', function (e) {
        cx = e.clientX / innerWidth;
        cy = 1 - e.clientY / innerHeight;
      }, { passive: true });

      var visible = true;
      document.addEventListener('visibilitychange', function () {
        visible = !document.hidden;
        if (visible) { requestAnimationFrame(peindre); }
      });

      var depart = performance.now();
      function peindre(maintenant) {
        if (!visible) { return; }
        mx += (cx - mx) * .03;
        my += (cy - my) * .03;
        gl.uniform1f(locT, (maintenant - depart) / 1000);
        gl.uniform2f(locM, mx, my);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        requestAnimationFrame(peindre);
      }

      decor.appendChild(toile);
      decor.classList.add('decor--webgl');
      requestAnimationFrame(peindre);
    })();
  }

  /* --- 1 bis-2. Foudre d'ambiance ------------------------------------------ */
  /* Des éclairs frappent régulièrement sur tout le site, derrière le
     contenu : tracé principal en zigzag, cœur blanc, branches secondaires,
     scintillement, gerbe au point d'impact et parfois rafale d'orage.
     Le canevas ne tourne que pendant qu'un éclair est vivant. */
  if (!sobre) {
    (function () {
      var toileF = document.createElement('canvas');
      toileF.className = 'decor__foudre';
      toileF.setAttribute('aria-hidden', 'true');
      decor.appendChild(toileF);
      var cf = toileF.getContext('2d');
      var actifs = [];
      var tourne = false;

      function taillerF() {
        toileF.width = innerWidth;
        toileF.height = innerHeight;
      }
      taillerF();
      window.addEventListener('resize', taillerF);

      function zigzag(x, y, limite, amplitude, pas) {
        var segs = [[x, y]];
        while (y < limite) {
          x += (Math.random() - .5) * amplitude;
          y += pas * (.6 + Math.random());
          segs.push([x, y]);
        }
        return segs;
      }

      function creerEclair(decale) {
        if (actifs.length > 6) { return; }         // garde-fou si l'onglet dormait
        if (innerWidth < 60 || innerHeight < 60) { return; }   // fenêtre invisible ou minuscule
        var x = innerWidth * (.05 + Math.random() * .9);
        var limite = innerHeight * (.45 + Math.random() * .42);
        var segs = zigzag(x, 0, limite, 92, 26);
        if (segs.length < 3) { return; }           // tracé trop court pour être crédible

        var branches = [];
        var nb = 2 + (Math.random() * 3 | 0);
        for (var b = 0; b < nb; b++) {
          var dep = segs[1 + (Math.random() * (segs.length - 2) | 0)];
          var sens = Math.random() < .5 ? -1 : 1;
          var bSegs = [[dep[0], dep[1]]];
          var bx = dep[0], by = dep[1];
          for (var s = 0, fin = 3 + Math.random() * 4; s < fin; s++) {
            bx += sens * (12 + Math.random() * 30);
            by += 12 + Math.random() * 26;
            bSegs.push([bx, by]);
          }
          branches.push(bSegs);
        }

        actifs.push({
          segs: segs,
          branches: branches,
          pointe: segs[segs.length - 1],
          t0: performance.now() + (decale || 0),
          duree: 480 + Math.random() * 220
        });
        if (!tourne) { tourne = true; requestAnimationFrame(peindreF); }
      }

      function tracerF(segs) {
        cf.beginPath();
        cf.moveTo(segs[0][0], segs[0][1]);
        for (var s = 1; s < segs.length; s++) { cf.lineTo(segs[s][0], segs[s][1]); }
        cf.stroke();
      }

      function peindreF(ts) {
        cf.clearRect(0, 0, toileF.width, toileF.height);
        if (!actifs.length) { tourne = false; return; }
        cf.save();
        cf.globalCompositeOperation = 'lighter';
        cf.lineCap = 'round';
        cf.lineJoin = 'round';

        for (var i = actifs.length - 1; i >= 0; i--) {
          var ec = actifs[i];
          var t = ts - ec.t0;
          if (t < 0) { continue; }                  // départ différé (rafale)
          var vie = t / ec.duree;
          if (vie >= 1) { actifs.splice(i, 1); continue; }

          // Scintillement : l'intensité vacille comme un vrai arc
          var alpha = Math.pow(1 - vie, 1.5) * (.62 + .38 * Math.random());

          // Lueur d'ambiance au moment de l'impact
          if (vie < .22) {
            cf.fillStyle = 'rgba(0, 229, 255, ' + (.045 * (1 - vie / .22)).toFixed(3) + ')';
            cf.fillRect(0, 0, toileF.width, toileF.height);
          }

          cf.shadowColor = 'rgba(0, 229, 255, .95)';
          cf.shadowBlur = 22;

          // Tracé principal, puis cœur blanc plus fin par-dessus
          cf.strokeStyle = 'rgba(0, 229, 255, ' + (alpha * .8).toFixed(3) + ')';
          cf.lineWidth = 3;
          tracerF(ec.segs);
          cf.strokeStyle = 'rgba(235, 250, 255, ' + (alpha * .9).toFixed(3) + ')';
          cf.lineWidth = 1.2;
          tracerF(ec.segs);

          // Branches secondaires
          cf.strokeStyle = 'rgba(0, 229, 255, ' + (alpha * .45).toFixed(3) + ')';
          cf.lineWidth = 1;
          for (var j = 0; j < ec.branches.length; j++) { tracerF(ec.branches[j]); }

          // Gerbe lumineuse au point d'impact
          if (vie < .6) {
            var r = 4 + vie * 26;
            var g = cf.createRadialGradient(ec.pointe[0], ec.pointe[1], 0, ec.pointe[0], ec.pointe[1], r);
            g.addColorStop(0, 'rgba(235, 250, 255, ' + (alpha * .9).toFixed(3) + ')');
            g.addColorStop(1, 'rgba(0, 229, 255, 0)');
            cf.fillStyle = g;
            cf.beginPath();
            cf.arc(ec.pointe[0], ec.pointe[1], r, 0, Math.PI * 2);
            cf.fill();
          }
        }
        cf.restore();
        requestAnimationFrame(peindreF);
      }

      // L'orage : un éclair toutes les 4 à 8 s, parfois en rafale de 2 ou 3
      (function programmer(premier) {
        setTimeout(function () {
          creerEclair(0);
          if (Math.random() < .45) { creerEclair(90 + Math.random() * 180); }
          if (Math.random() < .18) { creerEclair(300 + Math.random() * 220); }
          programmer(false);
        }, premier ? 2200 : 4000 + Math.random() * 4000);
      })(true);
    })();
  }

  /* --- 1 ter. Curseur lumineux -------------------------------------------- */
  /* Un point d'énergie et un large halo suivent la souris avec inertie.
     Le halo grossit sur les liens et boutons. Souris uniquement. */
  if (!sobre && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var point = document.createElement('i');
    var halo  = document.createElement('i');
    point.className = 'curseur';
    halo.className  = 'curseur-halo';
    point.setAttribute('aria-hidden', 'true');
    halo.setAttribute('aria-hidden', 'true');
    document.body.appendChild(halo);
    document.body.appendChild(point);

    var pcx = -100, pcy = -100, hx = -100, hy = -100;
    var actifCurseur = false;

    document.addEventListener('mousemove', function (e) {
      pcx = e.clientX; pcy = e.clientY;
      if (!actifCurseur) {
        actifCurseur = true;
        hx = pcx; hy = pcy;
        document.body.classList.add('curseur-actif');
      }
      var surLien = e.target.closest && e.target.closest('a, button, [data-photo], summary, input, select, textarea');
      document.body.classList.toggle('curseur-lien', !!surLien);
    }, { passive: true });

    document.addEventListener('mouseleave', function () {
      actifCurseur = false;
      document.body.classList.remove('curseur-actif');
    });

    var hs = 1;   // taille du halo, amortie elle aussi
    (function suivre() {
      point.style.transform = 'translate(' + pcx + 'px,' + pcy + 'px)';
      hx += (pcx - hx) * .12;
      hy += (pcy - hy) * .12;
      hs += ((document.body.classList.contains('curseur-lien') ? 1.35 : 1) - hs) * .1;
      halo.style.transform = 'translate(' + hx.toFixed(1) + 'px,' + hy.toFixed(1) + 'px) scale(' + hs.toFixed(3) + ')';
      requestAnimationFrame(suivre);
    })();
  }

  /* --- 1 quater. Boutons magnétiques --------------------------------------- */
  /* Les boutons principaux sont attirés par le curseur qui s'approche,
     puis reviennent en place avec un ressort. */
  if (!sobre && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.btn, .entete__tel').forEach(function (b) {
      b.addEventListener('mousemove', function (e) {
        var rct = b.getBoundingClientRect();
        var dx = e.clientX - (rct.left + rct.width / 2);
        var dy = e.clientY - (rct.top + rct.height / 2);
        b.style.transition = 'transform .15s ease-out';
        b.style.transform = 'translate(' + (dx * .18).toFixed(1) + 'px,' + (dy * .3).toFixed(1) + 'px)';
      });
      b.addEventListener('mouseleave', function () {
        b.style.transition = 'transform .5s cubic-bezier(.2, 1.6, .4, 1)';
        b.style.transform = '';
      });
    });
  }

  /* --- 1 quinquies. Inclinaison 3D des cartes ------------------------------- */
  /* Les cartes prestations pivotent doucement vers le curseur, comme une
     plaque de verre que l'on oriente vers la lumière. */
  if (!sobre && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.carte').forEach(function (c) {
      c.addEventListener('mousemove', function (e) {
        var rct = c.getBoundingClientRect();
        var px = (e.clientX - rct.left) / rct.width - .5;
        var py = (e.clientY - rct.top) / rct.height - .5;
        c.style.transition = 'transform .12s ease-out';
        c.style.transform = 'perspective(900px) translateY(-7px)' +
          ' rotateX(' + (-py * 6).toFixed(2) + 'deg)' +
          ' rotateY(' + (px * 6).toFixed(2) + 'deg)';
      });
      c.addEventListener('mouseleave', function () {
        c.style.transition = 'transform .6s cubic-bezier(.22, 1, .36, 1)';
        c.style.transform = '';
      });
    });
  }

  /* --- 2. Réseau électrique du hero (canvas) ----------------------------- */
  /* Des particules qui dérivent et se relient entre elles quand elles sont
     proches : l'image d'un réseau électrique vivant. La souris attire
     légèrement les particules. Le canevas se met en pause quand le hero
     sort de l'écran, et n'existe pas du tout en « animations réduites ». */
  var hero = document.querySelector('.hero');

  if (hero && !sobre && 'IntersectionObserver' in window) {
    var canevas = document.createElement('canvas');
    canevas.className = 'hero__canevas';
    canevas.setAttribute('aria-hidden', 'true');
    hero.appendChild(canevas);

    var ctx = canevas.getContext('2d');
    var largeur = 0, hauteur = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var points = [];
    var souris = { x: -9999, y: -9999 };
    var visible = true;
    var anime = null;

    var PLEIN = !hero.classList.contains('hero--page');
    var DISTANCE_LIEN = 130;

    function dimensionner() {
      largeur = hero.clientWidth;
      hauteur = hero.clientHeight;
      canevas.width = largeur * dpr;
      canevas.height = hauteur * dpr;
      canevas.style.width = largeur + 'px';
      canevas.style.height = hauteur + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Densité : environ une particule pour 16 000 px², plafonnée.
      var nombre = Math.min(Math.round((largeur * hauteur) / 16000), PLEIN ? 90 : 40);
      points = [];
      for (var i = 0; i < nombre; i++) {
        points.push({
          x: Math.random() * largeur,
          y: Math.random() * hauteur,
          vx: (Math.random() - .5) * .35,
          vy: (Math.random() - .5) * .35,
          r: Math.random() * 1.6 + .6
        });
      }
    }

    /* Éclairs : de temps en temps, un arc lumineux frappe depuis le haut.
       Tracé en zigzag avec branches secondaires, flash bref, puis dissipation. */
    var eclairs = [];
    var prochainEclair = performance.now() + (PLEIN ? 1600 : 4200);

    function genererEclair(decale) {
      if (largeur < 60 || hauteur < 60) { return; }   // canevas invisible ou minuscule
      var x = largeur * (.08 + Math.random() * .84);
      var y = 0;
      var segs = [[x, y]];
      var limite = hauteur * (.5 + Math.random() * .3);
      while (y < limite) {
        x += (Math.random() - .5) * 68;
        y += 16 + Math.random() * 30;
        segs.push([x, y]);
      }
      if (segs.length < 3) { return; }               // tracé trop court
      // Branches : plusieurs départs pris au hasard le long du tracé principal
      var branches = [];
      var nb = 2 + (Math.random() * 2 | 0);
      for (var b = 0; b < nb; b++) {
        var dep = segs[1 + Math.floor(Math.random() * (segs.length - 2))];
        var bx = dep[0], by = dep[1];
        var bSegs = [[bx, by]];
        var sens = Math.random() < .5 ? -1 : 1;
        for (var s = 0; s < 3 + Math.random() * 3; s++) {
          bx += sens * (10 + Math.random() * 26);
          by += 10 + Math.random() * 22;
          bSegs.push([bx, by]);
        }
        branches.push(bSegs);
      }
      eclairs.push({
        segs: segs,
        branches: branches,
        pointe: segs[segs.length - 1],
        t0: performance.now() + (decale || 0),
        duree: 400 + Math.random() * 180
      });
    }

    function tracer(segs) {
      ctx.beginPath();
      ctx.moveTo(segs[0][0], segs[0][1]);
      for (var s = 1; s < segs.length; s++) { ctx.lineTo(segs[s][0], segs[s][1]); }
      ctx.stroke();
    }

    function dessiner(ts) {
      if (!visible) { anime = null; return; }
      ctx.clearRect(0, 0, largeur, hauteur);

      var i, j, p, q, dx, dy, d;

      // Naissance des éclairs : parfois un double, voire un triple impact
      if (ts > prochainEclair) {
        genererEclair(0);
        if (Math.random() < .4)  { genererEclair(80 + Math.random() * 160); }
        if (Math.random() < .15) { genererEclair(260 + Math.random() * 180); }
        prochainEclair = ts + (PLEIN ? 2400 + Math.random() * 3200 : 5000 + Math.random() * 4500);
      }
      if (eclairs.length) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (i = eclairs.length - 1; i >= 0; i--) {
          var ec = eclairs[i];
          var tEc = ts - ec.t0;
          if (tEc < 0) { continue; }               // départ différé (double impact)
          var vie = tEc / ec.duree;
          if (vie >= 1) { eclairs.splice(i, 1); continue; }
          // Scintillement : l'arc vacille au lieu de s'éteindre platement
          var alpha = Math.pow(1 - vie, 1.6) * (.65 + .35 * Math.random());

          // Bref flash d'ambiance au moment de l'impact
          if (vie < .25) {
            ctx.fillStyle = 'rgba(0, 229, 255, ' + (.05 * (1 - vie / .25)).toFixed(3) + ')';
            ctx.fillRect(0, 0, largeur, hauteur);
          }

          ctx.shadowColor = 'rgba(0, 229, 255, .9)';
          ctx.shadowBlur = 16;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          ctx.strokeStyle = 'rgba(0, 229, 255, ' + (alpha * .7).toFixed(3) + ')';
          ctx.lineWidth = 2.8;
          tracer(ec.segs);

          ctx.strokeStyle = 'rgba(235, 250, 255, ' + (alpha * .9).toFixed(3) + ')';
          ctx.lineWidth = 1.1;
          tracer(ec.segs);

          ctx.strokeStyle = 'rgba(0, 229, 255, ' + (alpha * .5).toFixed(3) + ')';
          ctx.lineWidth = 1;
          for (j = 0; j < ec.branches.length; j++) { tracer(ec.branches[j]); }

          // Gerbe lumineuse au point d'impact
          if (vie < .6) {
            var ray = 3 + vie * 22;
            var grad = ctx.createRadialGradient(ec.pointe[0], ec.pointe[1], 0, ec.pointe[0], ec.pointe[1], ray);
            grad.addColorStop(0, 'rgba(235, 250, 255, ' + (alpha * .85).toFixed(3) + ')');
            grad.addColorStop(1, 'rgba(0, 229, 255, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(ec.pointe[0], ec.pointe[1], ray, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      }

      for (i = 0; i < points.length; i++) {
        p = points[i];

        // Attraction très douce vers la souris
        dx = souris.x - p.x; dy = souris.y - p.y;
        d = Math.hypot(dx, dy);
        if (d < 180 && d > 0.001) {
          p.vx += (dx / d) * .012;
          p.vy += (dy / d) * .012;
        }

        // Vitesse plafonnée pour rester paisible
        p.vx = Math.max(-.5, Math.min(.5, p.vx));
        p.vy = Math.max(-.5, Math.min(.5, p.vy));

        p.x += p.vx; p.y += p.vy;

        if (p.x < 0 || p.x > largeur)  { p.vx *= -1; }
        if (p.y < 0 || p.y > hauteur)  { p.vy *= -1; }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 229, 255, .55)';
        ctx.fill();
      }

      // Liens entre particules proches
      for (i = 0; i < points.length; i++) {
        for (j = i + 1; j < points.length; j++) {
          p = points[i]; q = points[j];
          dx = p.x - q.x; dy = p.y - q.y;
          d = Math.hypot(dx, dy);
          if (d < DISTANCE_LIEN) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = 'rgba(0, 229, 255, ' + (0.16 * (1 - d / DISTANCE_LIEN)).toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      anime = requestAnimationFrame(dessiner);
    }

    dimensionner();
    window.addEventListener('resize', dimensionner);

    hero.addEventListener('mousemove', function (e) {
      var r = hero.getBoundingClientRect();
      souris.x = e.clientX - r.left;
      souris.y = e.clientY - r.top;
    });
    hero.addEventListener('mouseleave', function () {
      souris.x = -9999; souris.y = -9999;
    });

    // Pause quand le hero n'est plus à l'écran : zéro coût au défilement.
    new IntersectionObserver(function (entrees) {
      visible = entrees[0].isIntersecting;
      if (visible && anime === null) { anime = requestAnimationFrame(dessiner); }
    }).observe(hero);

    anime = requestAnimationFrame(dessiner);
  }

  /* --- 1 sexies. Écran d'intro ---------------------------------------------- */
  /* À la première visite de la session : le logo se dessine, le nom
     apparaît, la barre charge, puis le rideau s'ouvre sur le site. */
  if (!sobre && !sessionStorage.getItem('nogrette-intro')) {
    var intro = document.createElement('div');
    intro.className = 'intro';
    intro.setAttribute('aria-hidden', 'true');
    intro.innerHTML =
      '<div class="intro__volet intro__volet--haut"></div>' +
      '<div class="intro__volet intro__volet--bas"></div>' +
      '<div class="intro__coeur">' +
        '<svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">' +
          '<defs><linearGradient id="lgi" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0%" stop-color="#00E5FF"/><stop offset="100%" stop-color="#2A7FFF"/>' +
          '</linearGradient></defs>' +
          '<path class="trace" d="M23.6 4.5 12.8 21.6h8l-2.8 17.4 11.2-19.4h-7.9l2.3-15.1Z" stroke="url(#lgi)" stroke-width="2" stroke-linejoin="round"/>' +
        '</svg>' +
        '<div class="intro__nom">NOGRETTE ELEC</div>' +
        '<div class="intro__barre"><i></i></div>' +
      '</div>';
    document.body.appendChild(intro);
    document.body.classList.add('intro-active');

    setTimeout(function () {
      intro.classList.add('intro--fin');
      document.body.classList.remove('intro-active');
      sessionStorage.setItem('nogrette-intro', '1');
    }, 1700);
    setTimeout(function () { intro.remove(); }, 2700);
  }

  /* --- 1 septies. Voile de transition entre les pages ------------------------ */
  /* Au clic sur un lien interne, un voile balaie l'écran avant de naviguer ;
     il se retire à l'arrivée. Le site respire comme une application. */
  var voile = document.createElement('div');
  voile.className = 'voile';
  voile.setAttribute('aria-hidden', 'true');
  document.body.appendChild(voile);

  if (sessionStorage.getItem('nogrette-voile')) {
    sessionStorage.removeItem('nogrette-voile');
    if (!sobre) {
      voile.classList.add('voile--pose');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          voile.classList.remove('voile--pose');
          voile.classList.add('voile--sort');
          setTimeout(function () { voile.classList.remove('voile--sort'); }, 900);
        });
      });
    }
  }

  // Retour via l'historique (bfcache) : on s'assure que le voile est rangé
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) { voile.className = 'voile'; }
  });

  if (!sobre) {
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 ||
          e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) { return; }
      var lien = e.target.closest && e.target.closest('a[href]');
      if (!lien) { return; }
      var href = lien.getAttribute('href');
      if (!href || href.charAt(0) === '#' ||
          /^(tel:|mailto:|https?:)/i.test(href) ||
          lien.target === '_blank' || lien.hasAttribute('download')) { return; }
      e.preventDefault();
      sessionStorage.setItem('nogrette-voile', '1');
      voile.classList.add('voile--entre');
      setTimeout(function () { window.location.href = href; }, 460);
    });
  }

  /* --- 2 bis. Diaporama Ken Burns du hero --------------------------------- */
  /* Les photos empilées dans .hero__fond--diapo tournent toutes les 6 s.
     En « animations réduites », seule la première reste affichée. */
  var diapo = document.querySelector('.hero__fond--diapo');
  if (diapo) {
    var vues = diapo.querySelectorAll('img');
    if (vues.length) {
      vues[0].classList.add('diapo-active');
      if (!sobre && vues.length > 1) {
        var iDiapo = 0;
        setInterval(function () {
          vues[iDiapo].classList.remove('diapo-active');
          iDiapo = (iDiapo + 1) % vues.length;
          vues[iDiapo].classList.add('diapo-active');
        }, 6000);
      }
    }
  }

  /* --- 2 ter. Rivières défilantes (photos + typographie) -------------------- */
  /* Pour une boucle sans couture, chaque piste doit contenir deux groupes
     identiques : on clone le premier plutôt que de doubler le HTML. */
  document.querySelectorAll('.defile__piste, .bandeau-texte__piste').forEach(function (piste) {
    var groupe = piste.firstElementChild;
    if (!groupe) { return; }
    var clone = groupe.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    // Les clones ne doivent pas être des doublons pour clavier et lecteurs d'écran
    clone.querySelectorAll('button').forEach(function (b) { b.tabIndex = -1; });
    piste.appendChild(clone);

    // Les photos clonées ouvrent la visionneuse comme les originales :
    // on relaie le clic vers le bouton d'origine correspondant.
    var origines = groupe.querySelectorAll('button');
    clone.querySelectorAll('button').forEach(function (b, i) {
      b.addEventListener('click', function () {
        if (origines[i]) { origines[i].click(); }
      });
    });
  });

  /* Moteur de défilement : au lieu d'une animation CSS à vitesse fixe,
     les pistes sont animées en JavaScript et ACCÉLÈRENT quand on fait
     défiler la page — le site répond au geste du visiteur. */
  if (!sobre) {
    var pistes = [];
    document.querySelectorAll('.defile__piste, .bandeau-texte__piste').forEach(function (piste) {
      piste.style.animation = 'none';
      pistes.push({
        el: piste,
        x: 0,
        base: piste.classList.contains('bandeau-texte__piste') ? .8 : .45
      });
    });

    if (pistes.length) {
      var yPrecedent = window.scrollY;
      var elan = 0;
      var enPause = null;

      // Le survol d'une rivière de photos la fige (pour viser une photo)
      document.querySelectorAll('.defile').forEach(function (d) {
        d.addEventListener('mouseenter', function () { enPause = d; });
        d.addEventListener('mouseleave', function () { enPause = null; });
      });

      (function fairedefiler() {
        var dy = window.scrollY - yPrecedent;
        yPrecedent = window.scrollY;
        // L'élan monte avec la vitesse de défilement puis retombe doucement
        elan = elan * .93 + Math.min(Math.abs(dy) * .05, 2.6);

        pistes.forEach(function (p) {
          if (enPause && enPause.contains(p.el)) { return; }
          var moitie = p.el.firstElementChild ? p.el.firstElementChild.offsetWidth : 0;
          if (!moitie) { return; }
          p.x -= p.base + elan;
          if (p.x <= -moitie) { p.x += moitie; }
          p.el.style.transform = 'translate3d(' + p.x.toFixed(1) + 'px, 0, 0)';
        });
        requestAnimationFrame(fairedefiler);
      })();
    }
  }

  /* --- 2 quater. Parallax léger sur les photos de fond ---------------------- */
  if (!sobre) {
    var fonds = document.querySelectorAll('.hero__fond');
    if (fonds.length) {
      var attente = false;
      window.addEventListener('scroll', function () {
        if (attente) { return; }
        attente = true;
        requestAnimationFrame(function () {
          var y = window.scrollY;
          fonds.forEach(function (f) {
            if (y < window.innerHeight) {
              f.style.transform = 'translateY(' + (y * .22).toFixed(1) + 'px)';
            }
          });
          attente = false;
        });
      }, { passive: true });
    }
  }

  /* --- 2 quinquies. Titre composé lettre par lettre -------------------------- */
  /* Le grand titre s'assemble sous les yeux du visiteur : chaque lettre
     arrive avec son propre délai. Le texte original reste disponible pour
     les moteurs de recherche et lecteurs d'écran via aria-label.
     Pas sur mobile : les mots insécables risquent de déborder des petits
     écrans, et l'entrée de bloc classique y suffit largement. */
  if (!sobre && window.innerWidth >= 700) {
    var h1 = document.querySelector('.hero h1');
    if (h1) {
      var compteLettres = 0;

      function eclater(noeud, dansAccent) {
        var enfants = Array.prototype.slice.call(noeud.childNodes);
        enfants.forEach(function (n) {
          if (n.nodeType === 3) {                       // texte : on découpe
            var frag = document.createDocumentFragment();
            var mots = n.textContent.split(/(\s+)/);
            mots.forEach(function (mot) {
              if (!mot) { return; }
              if (/^\s+$/.test(mot)) {
                frag.appendChild(document.createTextNode(' '));
                return;
              }
              var enveloppeMot = document.createElement('span');
              enveloppeMot.className = 'mot';
              for (var c = 0; c < mot.length; c++) {
                var l = document.createElement('span');
                l.className = dansAccent ? 'lettre accent-lettre' : 'lettre';
                l.style.setProperty('--i', compteLettres++);
                l.textContent = mot[c];
                enveloppeMot.appendChild(l);
              }
              frag.appendChild(enveloppeMot);
            });
            noeud.replaceChild(frag, n);
          } else if (n.nodeType === 1 && n.tagName !== 'BR') {
            eclater(n, dansAccent || (n.classList && n.classList.contains('accent')));
          }
        });
      }

      h1.setAttribute('aria-label', (h1.innerText || h1.textContent).replace(/\s+/g, ' ').trim());
      eclater(h1, false);
      h1.classList.add('h1-split');
      // Le contenu éclaté est purement décoratif pour les lecteurs d'écran
      Array.prototype.forEach.call(h1.children, function (enf) {
        enf.setAttribute('aria-hidden', 'true');
      });
    }
  }

  /* --- 2 sexies. Étincelles ------------------------------------------------- */
  /* Chaque clic fait jaillir une gerbe d'étincelles, et le curseur en
     sème quelques-unes quand il va vite. Un seul canevas, qui ne tourne
     que lorsqu'il y a des particules à animer. */
  if (!sobre && window.matchMedia('(pointer: fine)').matches) {
    var toileE = document.createElement('canvas');
    toileE.className = 'etincelles';
    toileE.setAttribute('aria-hidden', 'true');
    document.body.appendChild(toileE);
    var ctxE = toileE.getContext('2d');
    var parts = [];
    var boucleEtin = false;

    function taillerEtin() {
      toileE.width = innerWidth;
      toileE.height = innerHeight;
    }
    taillerEtin();
    window.addEventListener('resize', taillerEtin);

    var TEINTES = ['0, 229, 255', '155, 237, 255', '42, 127, 255'];

    function emettre(x, y, nombre, force) {
      for (var i = 0; i < nombre; i++) {
        var angle = Math.random() * Math.PI * 2;
        var v = (Math.random() * .6 + .4) * force;
        parts.push({
          x: x, y: y,
          vx: Math.cos(angle) * v,
          vy: Math.sin(angle) * v - force * .35,
          vie: 1,
          usure: .02 + Math.random() * .025,
          r: .8 + Math.random() * 1.6,
          teinte: TEINTES[(Math.random() * TEINTES.length) | 0]
        });
      }
      if (!boucleEtin) { boucleEtin = true; requestAnimationFrame(animerEtin); }
    }

    function animerEtin() {
      ctxE.clearRect(0, 0, toileE.width, toileE.height);
      if (!parts.length) { boucleEtin = false; return; }
      ctxE.globalCompositeOperation = 'lighter';
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i];
        p.vx *= .965;
        p.vy = p.vy * .965 + .06;      // frottement + légère gravité
        p.x += p.vx;
        p.y += p.vy;
        p.vie -= p.usure;
        if (p.vie <= 0) { parts.splice(i, 1); continue; }
        ctxE.beginPath();
        ctxE.arc(p.x, p.y, p.r * p.vie, 0, Math.PI * 2);
        ctxE.fillStyle = 'rgba(' + p.teinte + ', ' + (p.vie * .9).toFixed(3) + ')';
        ctxE.shadowColor = 'rgba(' + p.teinte + ', 1)';
        ctxE.shadowBlur = 8;
        ctxE.fill();
      }
      ctxE.shadowBlur = 0;
      requestAnimationFrame(animerEtin);
    }

    document.addEventListener('click', function (e) {
      emettre(e.clientX, e.clientY, 16, 4.2);
    });

    var dxTrace = 0, dyTrace = 0, xTrace = -1, yTrace = -1;
    document.addEventListener('mousemove', function (e) {
      if (xTrace >= 0) {
        dxTrace = e.clientX - xTrace;
        dyTrace = e.clientY - yTrace;
        // Seuls les gestes rapides laissent une traînée
        if (dxTrace * dxTrace + dyTrace * dyTrace > 900 && Math.random() < .5) {
          emettre(e.clientX, e.clientY, 1, 1.1);
        }
      }
      xTrace = e.clientX; yTrace = e.clientY;
    }, { passive: true });
  }

  /* --- 2 septies. Étoiles habillées ------------------------------------------ */
  /* Chaque ★ devient un élément indépendant pour pouvoir s'allumer
     en cascade quand le bloc d'avis apparaît à l'écran. */
  document.querySelectorAll('.avis__etoiles, .note-globale__etoiles').forEach(function (bloc) {
    var texte = bloc.textContent;
    bloc.textContent = '';
    for (var i = 0; i < texte.length; i++) {
      var s = document.createElement('span');
      s.style.setProperty('--i', i);
      s.textContent = texte[i];
      bloc.appendChild(s);
    }
  });

  /* --- 3. Menu mobile ----------------------------------------------------- */
  var burger = document.querySelector('.burger');
  var nav    = document.querySelector('.nav');

  if (burger && nav) {
    burger.addEventListener('click', function () {
      var ouvert = nav.classList.toggle('ouvert');
      burger.classList.toggle('ouvert', ouvert);
      burger.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
      document.body.style.overflow = ouvert ? 'hidden' : '';
    });

    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('ouvert');
        burger.classList.remove('ouvert');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 980 && nav.classList.contains('ouvert')) {
        nav.classList.remove('ouvert');
        burger.classList.remove('ouvert');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }

  /* --- 4. Barre de progression + état de l'en-tête ------------------------ */
  var entete = document.querySelector('.entete');
  if (entete) {
    var majEntete = function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? (window.scrollY / h) * 100 : 0;
      entete.style.setProperty('--progression', p.toFixed(1) + '%');
      entete.classList.toggle('entete--defile', window.scrollY > 12);
    };
    window.addEventListener('scroll', majEntete, { passive: true });
    majEntete();
  }

  /* --- 5. Apparition au défilement (avec cascade) -------------------------- */
  /* On marque automatiquement les blocs à animer, pour ne pas avoir à
     ajouter une classe dans chaque page HTML. Les éléments d'une même
     grille reçoivent un index (--cascade) qui décale leur apparition. */
  var aAnimer = document.querySelectorAll(
    '.carte, .chantier, .avis, .etape, .reassurance__item, ' +
    '.compteur, .section__titre, .section__intro, .galerie__item, ' +
    '.faq details, .coord__item, .encart-lateral, .encadre, ' +
    '.liste-coches li, .carte-bloc, .note-globale'
  );

  if (!sobre && 'IntersectionObserver' in window) {
    aAnimer.forEach(function (el) {
      el.classList.add('anim');
      // Position dans la fratrie animée → décalage de la cascade (plafonné)
      var freres = el.parentElement ? el.parentElement.children : [];
      var rang = 0, k;
      for (k = 0; k < freres.length; k++) {
        if (freres[k] === el) { break; }
        if (freres[k].classList && freres[k].classList.contains('anim')) { rang++; }
      }
      el.style.setProperty('--cascade', Math.min(rang, 7));
    });

    var observateur = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('vu');
          observateur.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    aAnimer.forEach(function (el) { observateur.observe(el); });
  }

  /* --- 6. Lueur qui suit la souris sur les cartes -------------------------- */
  if (!sobre && window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.carte').forEach(function (carte) {
      carte.addEventListener('mousemove', function (e) {
        var r = carte.getBoundingClientRect();
        carte.style.setProperty('--sx', (e.clientX - r.left) + 'px');
        carte.style.setProperty('--sy', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* --- 7. Compteurs animés -------------------------------------------------- */
  var compteurs = document.querySelectorAll('[data-compteur]');
  if (compteurs.length && 'IntersectionObserver' in window) {
    var obsCompteur = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (!e.isIntersecting) { return; }
        var el = e.target;
        var cible = parseInt(el.dataset.compteur, 10);
        obsCompteur.unobserve(el);

        if (sobre) { el.textContent = cible; return; }

        var debut = performance.now();
        var duree = 1400;
        (function pas(maintenant) {
          var t = Math.min((maintenant - debut) / duree, 1);
          // easing : démarre vite, ralentit à l'arrivée
          var val = Math.round(cible * (1 - Math.pow(1 - t, 3)));
          el.textContent = val;
          if (t < 1) { requestAnimationFrame(pas); }
          else {
            // Rebond lumineux à l'arrivée du chiffre
            var boite = el.closest('.compteur');
            if (boite) { boite.classList.add('compteur--fini'); }
          }
        })(debut);
      });
    }, { threshold: 0.5 });

    compteurs.forEach(function (c) { obsCompteur.observe(c); });
  }

  /* --- 8. Visionneuse photo plein écran -------------------------------------- */
  /* On écarte les photos clonées de la rivière (groupe aria-hidden) pour ne
     pas créer de doublons dans la navigation précédent / suivant. */
  var declencheurs = Array.prototype.filter.call(
    document.querySelectorAll('[data-photo]'),
    function (d) { return !d.closest('[aria-hidden="true"]'); }
  );

  if (declencheurs.length) {
    var photos = Array.prototype.map.call(declencheurs, function (d) {
      return { src: d.dataset.photo, legende: d.dataset.legende || '' };
    });
    var index = 0;

    var vue = document.createElement('div');
    vue.className = 'visionneuse';
    vue.setAttribute('role', 'dialog');
    vue.setAttribute('aria-modal', 'true');
    vue.setAttribute('aria-label', 'Photo en plein écran');
    vue.innerHTML =
      '<button class="visionneuse__btn visionneuse__fermer" aria-label="Fermer">✕</button>' +
      '<button class="visionneuse__btn visionneuse__prec" aria-label="Photo précédente">‹</button>' +
      '<img alt="">' +
      '<button class="visionneuse__btn visionneuse__suiv" aria-label="Photo suivante">›</button>' +
      '<p class="visionneuse__legende"></p>';
    document.body.appendChild(vue);

    var img     = vue.querySelector('img');
    var legende = vue.querySelector('.visionneuse__legende');
    var declencheurActif = null;

    function afficher(i) {
      index = (i + photos.length) % photos.length;
      img.src = photos[index].src;
      img.alt = photos[index].legende;
      legende.textContent = photos[index].legende;
      legende.style.display = photos[index].legende ? '' : 'none';
    }

    function ouvrir(i, source) {
      declencheurActif = source;
      afficher(i);
      vue.classList.add('ouverte');
      document.body.style.overflow = 'hidden';
      vue.querySelector('.visionneuse__fermer').focus();
    }

    function fermer() {
      vue.classList.remove('ouverte');
      document.body.style.overflow = '';
      if (declencheurActif) { declencheurActif.focus(); }   // retour au point de départ
    }

    declencheurs.forEach(function (d, i) {
      d.addEventListener('click', function () { ouvrir(i, d); });
    });

    vue.querySelector('.visionneuse__fermer').addEventListener('click', fermer);
    vue.querySelector('.visionneuse__prec').addEventListener('click', function () { afficher(index - 1); });
    vue.querySelector('.visionneuse__suiv').addEventListener('click', function () { afficher(index + 1); });
    vue.addEventListener('click', function (e) { if (e.target === vue) { fermer(); } });

    document.addEventListener('keydown', function (e) {
      if (!vue.classList.contains('ouverte')) { return; }
      if (e.key === 'Escape')     { fermer(); }
      if (e.key === 'ArrowLeft')  { afficher(index - 1); }
      if (e.key === 'ArrowRight') { afficher(index + 1); }
    });

    // Balayage tactile
    var xDepart = null;
    vue.addEventListener('touchstart', function (e) { xDepart = e.touches[0].clientX; }, { passive: true });
    vue.addEventListener('touchend', function (e) {
      if (xDepart === null) { return; }
      var dx = e.changedTouches[0].clientX - xDepart;
      if (Math.abs(dx) > 50) { afficher(dx > 0 ? index - 1 : index + 1); }
      xDepart = null;
    }, { passive: true });
  }

  /* --- 9. Comparateur avant / après -------------------------------------------- */
  document.querySelectorAll('.comparateur').forEach(function (comp) {
    var actif = false;

    function place(x) {
      var r = comp.getBoundingClientRect();
      var pct = ((x - r.left) / r.width) * 100;
      comp.style.setProperty('--curseur', Math.max(0, Math.min(100, pct)) + '%');
    }

    comp.addEventListener('pointerdown', function (e) {
      actif = true; comp.setPointerCapture(e.pointerId); place(e.clientX);
    });
    comp.addEventListener('pointermove', function (e) { if (actif) { place(e.clientX); } });
    comp.addEventListener('pointerup',     function () { actif = false; });
    comp.addEventListener('pointercancel', function () { actif = false; });

    // Accessibilité : pilotable au clavier
    comp.setAttribute('tabindex', '0');
    comp.addEventListener('keydown', function (e) {
      var actuel = parseFloat(comp.style.getPropertyValue('--curseur')) || 50;
      if (e.key === 'ArrowLeft')  { comp.style.setProperty('--curseur', Math.max(0, actuel - 4) + '%'); }
      if (e.key === 'ArrowRight') { comp.style.setProperty('--curseur', Math.min(100, actuel + 4) + '%'); }
    });
  });

  /* --- 10. Année automatique dans le pied de page ------------------------------- */
  var annee = document.getElementById('annee');
  if (annee) { annee.textContent = new Date().getFullYear(); }

  /* --- 11. Formulaire de contact -------------------------------------------------- */
  /* Envoi via Web3Forms : service gratuit, aucun serveur requis.
     La clé se règle dans le champ caché "access_key" de contact.html. */
  var form = document.getElementById('formulaire-contact');

  if (form) {
    var message = document.getElementById('form-message');
    var bouton  = form.querySelector('button[type="submit"]');
    var champCle = form.querySelector('[name="access_key"]');
    var cleAbsente = !champCle || champCle.value.indexOf('VOTRE-CLE') === 0;

    /* Garde-fou : tant que la clé Web3Forms n'est pas renseignée, le formulaire
       ne peut rien envoyer. Plutôt que de laisser le visiteur remplir cinq
       champs pour rien, on le prévient tout de suite et on met le téléphone
       en avant. Tombe de lui-même dès que la clé est en place. */
    if (cleAbsente) {
      message.className = 'encadre encadre--urgence';
      message.innerHTML = '<p><strong>Le formulaire n\'est pas encore actif.</strong></p>' +
        '<p>En attendant, appelez-moi au <a href="tel:+33781067379">07 81 06 73 79</a> ' +
        'ou écrivez à <a href="mailto:nogrette.elec@gmail.com">nogrette.elec@gmail.com</a>.</p>';
      message.style.display = 'block';
      bouton.disabled = true;
      bouton.textContent = 'Formulaire indisponible';
      form.querySelectorAll('input, select, textarea').forEach(function (c) {
        c.disabled = true;
      });
      console.warn('[Nogrette Elec] Clé Web3Forms manquante dans contact.html — ' +
                   'le formulaire est désactivé.');
      return;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // Anti-spam : si le champ invisible est rempli, c'est un robot.
      if (form.querySelector('[name="botcheck"]').checked) { return; }

      var texteInitial = bouton.textContent;
      bouton.disabled = true;
      bouton.textContent = 'Envoi en cours…';

      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(form)
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.success) {
            form.style.display = 'none';
            message.className = 'encadre';
            message.innerHTML = '<p><strong>Merci, votre demande est bien envoyée.</strong></p>' +
              '<p>Je vous rappelle dans la journée. Si votre besoin est urgent, ' +
              'appelez directement le <a href="tel:+33781067379">07 81 06 73 79</a>.</p>';
            message.style.display = 'block';
            message.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            afficherErreur();
          }
        })
        .catch(afficherErreur)
        .finally(function () {
          bouton.disabled = false;
          bouton.textContent = texteInitial;
        });

      function afficherErreur() {
        message.className = 'encadre encadre--urgence';
        message.innerHTML = '<p><strong>L\'envoi n\'a pas fonctionné.</strong></p>' +
          '<p>Appelez-moi au <a href="tel:+33781067379">07 81 06 73 79</a> ' +
          'ou écrivez à <a href="mailto:nogrette.elec@gmail.com">nogrette.elec@gmail.com</a>.</p>';
        message.style.display = 'block';
      }
    });
  }

})();

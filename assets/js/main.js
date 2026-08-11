/* ==========================================================================
   Nogrette Elec — scripts du site

   Aucune bibliothèque externe : tout est écrit à la main pour que le site
   reste rapide et ne dépende d'aucun service tiers.

   Sommaire :
     1. Menu mobile
     2. Barre de progression de lecture
     3. Apparition des éléments au défilement
     4. Lueur qui suit la souris sur les cartes
     5. Compteurs animés
     6. Visionneuse photo plein écran
     7. Comparateur avant / après
     8. Année automatique
     9. Formulaire de contact
   ========================================================================== */

(function () {
  'use strict';

  // L'utilisateur a-t-il demandé à son système de limiter les animations ?
  var sobre = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- 1. Menu mobile --------------------------------------------------- */
  var burger = document.querySelector('.burger');
  var nav    = document.querySelector('.nav');

  if (burger && nav) {
    burger.addEventListener('click', function () {
      var ouvert = nav.classList.toggle('ouvert');
      burger.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
      document.body.style.overflow = ouvert ? 'hidden' : '';
    });

    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('ouvert');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 980 && nav.classList.contains('ouvert')) {
        nav.classList.remove('ouvert');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }

  /* --- 2. Barre de progression de lecture ------------------------------- */
  var entete = document.querySelector('.entete');
  if (entete) {
    var majProgression = function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? (window.scrollY / h) * 100 : 0;
      entete.style.setProperty('--progression', p.toFixed(1) + '%');
    };
    window.addEventListener('scroll', majProgression, { passive: true });
    majProgression();
  }

  /* --- 3. Apparition au défilement -------------------------------------- */
  /* On marque automatiquement les blocs à animer, pour ne pas avoir à
     ajouter une classe dans chaque page HTML. */
  var aAnimer = document.querySelectorAll(
    '.carte, .chantier, .avis, .etape, .reassurance__item, ' +
    '.compteur, .section__titre, .section__intro, .galerie__item'
  );

  if (!sobre && 'IntersectionObserver' in window) {
    aAnimer.forEach(function (el) { el.classList.add('anim'); });

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

  /* --- 4. Lueur qui suit la souris sur les cartes ------------------------ */
  if (!sobre && window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('a.carte').forEach(function (carte) {
      carte.addEventListener('mousemove', function (e) {
        var r = carte.getBoundingClientRect();
        carte.style.setProperty('--sx', (e.clientX - r.left) + 'px');
        carte.style.setProperty('--sy', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* --- 5. Compteurs animés ---------------------------------------------- */
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
        })(debut);
      });
    }, { threshold: 0.5 });

    compteurs.forEach(function (c) { obsCompteur.observe(c); });
  }

  /* --- 6. Visionneuse photo plein écran ---------------------------------- */
  var declencheurs = document.querySelectorAll('[data-photo]');

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

  /* --- 7. Comparateur avant / après -------------------------------------- */
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

  /* --- 8. Année automatique dans le pied de page ------------------------- */
  var annee = document.getElementById('annee');
  if (annee) { annee.textContent = new Date().getFullYear(); }

  /* --- 9. Formulaire de contact ------------------------------------------ */
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
       en avant. À retirer de fait dès que la clé est en place. */
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
                   'le formulaire est désactivé. Voir 07-TODO.md, étape 2.1.');
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
          'ou écrivez à <a href="mailto:contact@nogrette-elec.fr">contact@nogrette-elec.fr</a>.</p>';
        message.style.display = 'block';
      }
    });
  }

})();

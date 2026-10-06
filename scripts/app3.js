/* ========================================
   APP3 - Application Principale Dual-Mode
   Compatible Consultation Statique (GitHub Pages)
   et Édition Complète en Local (XAMPP / PHP)
   ======================================== */

const CLASS_PALETTE = [
  { bg: 'linear-gradient(135deg, #6c5ce7, #a29bfe)', color: '#6c5ce7' },
  { bg: 'linear-gradient(135deg, #00b894, #55efc4)', color: '#00b894' },
  { bg: 'linear-gradient(135deg, #0984e3, #74b9ff)', color: '#0984e3' },
  { bg: 'linear-gradient(135deg, #e17055, #fab1a0)', color: '#e17055' },
  { bg: 'linear-gradient(135deg, #fdcb6e, #ffeaa7)', color: '#fdcb6e' },
  { bg: 'linear-gradient(135deg, #e84393, #fd79a8)', color: '#e84393' },
  { bg: 'linear-gradient(135deg, #00cec9, #81ecec)', color: '#00cec9' },
  { bg: 'linear-gradient(135deg, #636e72, #b2bec3)', color: '#636e72' }
];

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const yearParam = urlParams.get('year');

  loadConfig(yearParam).then(() => {
    startApp();
  }).catch(() => {
    startApp();
  });
});

// Système Toast partagé
function showToast(type, message, duration) {
  if (typeof duration === 'undefined') duration = 3000;
  var container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;';
    document.body.appendChild(container);
  }
  var icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  var colors = { success: '#27ae60', error: '#c0392b', warning: '#f39c12', info: '#3498db' };
  var toast = document.createElement('div');
  toast.style.cssText = 'background:' + (colors[type] || '#3498db') + ';color:#fff;padding:12px 18px;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.2);font-size:0.95rem;display:flex;align-items:center;gap:8px;min-width:280px;max-width:420px;animation:slideInRight 0.3s ease-out;';
  toast.innerHTML = '<span style="font-size:1.2rem;">' + (icons[type] || '') + '</span><span>' + message + '</span>';
  container.appendChild(toast);
  setTimeout(function () {
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(function () { toast.remove(); }, 300);
  }, duration);
}

if (!document.getElementById('toast-keyframes')) {
  var style = document.createElement('style');
  style.id = 'toast-keyframes';
  style.textContent = '@keyframes slideInRight{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}';
  document.head.appendChild(style);
}

function startApp() {
  new Vue({
    el: '#app',
    data: {
      activeTab: 'seances', // 'seances' | 'emploi' | 'calendrier'
      seance: new Seance(),
      classes: classesObjects,
      classesList: classes,
      groupes: groupes,
      jours: ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
      emploi: emploi,
      alerts: [],
      annee_scolaire: annee_scolaire,
      enseignant: enseignant,
      seances: [],
      filteredSeances: [],
      dates: [],
      debut: '',
      fin: '',
      selectedClasse: "",
      selectedSeance: -1,
      mode: "list",
      originalSeance: null,
      localSeance: null,
      loading: false,
      classCounts: {},

      // Dual-mode & Authentification
      isStaticMode: isStaticEnvironment,
      backendAvailable: false,
      connected: false,
      showLoginForm: false,
      loginPseudo: '',
      loginPassword: '',
      authToken: '',

      selectedYear: annee_scolaire,
      years: yearsList,
      editor: null,

      // Filtres consultation
      searchQuery: '',
      filterGroupe: '',
      sortOrder: 'desc',

      // Calendrier & Événements (Fériés, Vacances, Semaine bloquée)
      months: [],
      activeDay: null,
      newEvent: {
        type: 'ferie',
        titre: '',
        tag: 'JF',
        date: '',
        date_fin: '',
        remarque: '',
        isRange: false
      },
      savingEvent: false,
      yearEventsList: [],
      quickHolidays: [
        { label: "15 oct. : Évacuation", titre: "Fête de l'Évacuation", tag: "JF", month: "10", day: "15" },
        { label: "17 déc. : Révolution", titre: "Fête de la Révolution", tag: "JF", month: "12", day: "17" },
        { label: "1er janv. : Jour de l'An", titre: "Jour de l'An", tag: "JF", month: "01", day: "01" },
        { label: "20 mars : Indépendance", titre: "Fête de l'Indépendance", tag: "JF", month: "03", day: "20" },
        { label: "9 avr. : Martyrs", titre: "Fête des Martyrs", tag: "JF", month: "04", day: "09" },
        { label: "1er mai : Travail", titre: "Fête du Travail", tag: "JF", month: "05", day: "01" },
        { label: "Mouled", titre: "Mouled (Naissance du Prophète)", tag: "JF" },
        { label: "Aïd El-Fitr", titre: "Aïd El-Fitr", tag: "JF" },
        { label: "Aïd El-Idha", titre: "Aïd El-Idha", tag: "JF" }
      ],
      quickVacations: [
        { label: "Mi-Trimestre 1", titre: "Vacances de la mi-trimestre 1", tag: "Vacances" },
        { label: "Hiver", titre: "Vacances d'hiver", tag: "Vacances" },
        { label: "Mi-Trimestre 2", titre: "Vacances de la mi-trimestre 2", tag: "Vacances" },
        { label: "Printemps", titre: "Vacances de printemps", tag: "Vacances" },
        { label: "Sem. Bloquée T1", titre: "Semaine bloquée - Trimestre 1", tag: "Bloquée", type: "bloquee" },
        { label: "Sem. Bloquée T2", titre: "Semaine bloquée - Trimestre 2", tag: "Bloquée", type: "bloquee" }
      ]
    },
    computed: {
      // === EMPLOI DU TEMPS COMPUTED ===
      days() {
        return [
          { col: 2, index: 1, label: 'Lun', fullLabel: 'Lundi' },
          { col: 3, index: 2, label: 'Mar', fullLabel: 'Mardi' },
          { col: 4, index: 3, label: 'Mer', fullLabel: 'Mercredi' },
          { col: 5, index: 4, label: 'Jeu', fullLabel: 'Jeudi' },
          { col: 6, index: 5, label: 'Ven', fullLabel: 'Vendredi' },
          { col: 7, index: 6, label: 'Sam', fullLabel: 'Samedi' }
        ];
      },
      hours() { return [8, 9, 10, 11, 12, 13, 14, 15, 16, 17]; },
      uniqueClasses() {
        const cls = [...new Set(this.emploi.map(s => s.classe))];
        return cls.sort((a, b) => {
          if (a === 'others') return 1;
          if (b === 'others') return -1;
          return a.localeCompare(b);
        });
      },
      classStyleMap() {
        const map = {};
        let idx = 0;
        this.uniqueClasses.forEach(cls => {
          map[cls] = CLASS_PALETTE[idx % CLASS_PALETTE.length];
          idx++;
        });
        return map;
      },
      totalSessions() { return this.emploi.length; },
      totalHours() {
        let t = 0;
        this.emploi.forEach(s => t += (this._min(s.endTime) - this._min(s.startTime)) / 60);
        return t;
      },
      allCells() {
        const occupied = {};
        const cells = [];
        const isOccupied = (r, c) => occupied[r + '-' + c] === true;
        const activePerCol = {};

        cells.push({ id: 'h0', type: 'corner', row: 1, col: 1, rowspan: 1, colspan: 1 });
        this.days.forEach(day => {
          cells.push({ id: 'h' + day.col, type: 'header', row: 1, col: day.col, rowspan: 1, colspan: 1, label: day.label, fullLabel: day.fullLabel });
        });

        this.hours.forEach((hour, idx) => {
          const gridRow = idx + 2;
          cells.push({ id: 't' + hour, type: 'time', row: gridRow, col: 1, rowspan: 1, colspan: 1, label: hour + 'h - ' + (hour + 1) + 'h' });
          occupied[gridRow + '-1'] = true;

          this.days.forEach(day => {
            const col = day.col;
            if (isOccupied(gridRow, col) || (activePerCol[col] && activePerCol[col].untilRow >= gridRow)) return;

            const slotS = hour * 60;
            const slotE = (hour + 1) * 60;
            const matching = this.emploi.filter(s => {
              if (s.day !== day.index) return false;
              const ss = this._min(s.startTime);
              const se = this._min(s.endTime);
              return ss < slotE && se > slotS;
            });

            if (matching.length === 0) {
              cells.push({ id: 'e' + gridRow + '-' + col, type: 'empty', row: gridRow, col: col, rowspan: 1, colspan: 1 });
              return;
            }

            const session = matching[0];
            const sStart = this._min(session.startTime);
            const sEnd = this._min(session.endTime);
            const startHour = Math.floor(sStart / 60);
            if (hour !== startHour) return;

            const minutes = sEnd - sStart;
            const rowspan = Math.max(1, Math.ceil(minutes / 60));
            activePerCol[col] = { untilRow: gridRow + rowspan - 1 };

            cells.push({
              id: 's' + gridRow + '-' + col,
              type: 'session',
              row: gridRow,
              col: col,
              rowspan: rowspan,
              colspan: 1,
              classe: session.classe,
              startTime: session.startTime,
              endTime: session.endTime,
              groupe: session.groupe === 'Toute la classe' ? '' : session.groupe
            });
          });
        });
        return cells;
      },

      // === CALENDRIER COMPUTED ===
      monthPairs() {
        const pairs = [];
        for (let i = 0; i < this.months.length; i += 2) {
          const p = [this.months[i]];
          if (this.months[i + 1]) p.push(this.months[i + 1]);
          pairs.push(p);
        }
        return pairs;
      },
      eventTitlePlaceholder() {
        if (this.newEvent.type === 'ferie') return "ex: Fête de l'Évacuation";
        if (this.newEvent.type === 'vacances') return "ex: Vacances d'hiver";
        if (this.newEvent.type === 'bloquee') return "ex: Semaine bloquée - Trimestre 1";
        return "ex: Réunion pédagogique, Conseil de classe...";
      },
      eventDaysCount() {
        if (!this.newEvent.date || !this.newEvent.date_fin) return 1;
        const d1 = new Date(this.newEvent.date + 'T00:00:00');
        const d2 = new Date(this.newEvent.date_fin + 'T00:00:00');
        const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
        return diff > 0 ? diff : 1;
      },
      groupedEventsList() {
        if (!this.yearEventsList || this.yearEventsList.length === 0) return [];
        const sorted = [...this.yearEventsList].sort((a, b) => a.date.localeCompare(b.date));
        const groups = [];

        sorted.forEach(ev => {
          const last = groups[groups.length - 1];
          let canMerge = false;

          if (last) {
            // Même période identifiée explicitement par periodId
            if (last.periodId && ev.periodId && last.periodId === ev.periodId) {
              canMerge = true;
            } else if ((last.titre || '').trim().toLowerCase() === (ev.titre || '').trim().toLowerCase()
                    && (last.classe || '').trim().toLowerCase() === (ev.classe || '').trim().toLowerCase()) {
              // Même titre et étiquette : vérifier si la date est consécutive (lendemain)
              const dLast = new Date(last.endDate + 'T00:00:00');
              const dCurr = new Date(ev.date + 'T00:00:00');
              const diffDays = Math.round((dCurr - dLast) / (1000 * 60 * 60 * 24));
              if (diffDays === 1) {
                canMerge = true;
              }
            }
          }

          if (canMerge) {
            last.endDate = ev.date;
            last.items.push(ev);
            last.daysCount = last.items.length;
            if (!last.remarque && ev.remarque) last.remarque = ev.remarque;
          } else {
            groups.push({
              id: ev.periodId || ('grp_' + ev.date + '_' + Math.random().toString(36).substr(2, 5)),
              periodId: ev.periodId || '',
              titre: ev.titre || '',
              classe: ev.classe || '',
              type: ev.type || '',
              remarque: ev.remarque || '',
              startDate: ev.date,
              endDate: ev.date,
              daysCount: 1,
              items: [ev],
              expanded: false
            });
          }
        });

        return groups;
      }
    },
    mounted: function () {
      // Synchronisation de l'onglet et de la classe via URL Hash
      const syncFromUrlHash = () => {
        const hash = window.location.hash || '';
        if (hash === '#emploi') {
          this.activeTab = 'emploi';
        } else if (hash === '#calendrier') {
          this.activeTab = 'calendrier';
        } else if (hash.startsWith('#seances/')) {
          this.activeTab = 'seances';
          const cls = decodeURIComponent(hash.substring('#seances/'.length));
          if (cls && cls !== this.selectedClasse) {
            this.onClasseChanged(cls, false);
          }
        } else if (hash.startsWith('#classe/')) {
          this.activeTab = 'seances';
          const cls = decodeURIComponent(hash.substring('#classe/'.length));
          if (cls && cls !== this.selectedClasse) {
            this.onClasseChanged(cls, false);
          }
        } else {
          this.activeTab = 'seances';
          if (this.selectedClasse) {
            this.onClasseChanged('', false);
          }
        }
      };

      syncFromUrlHash();
      window.addEventListener('hashchange', syncFromUrlHash);

      // Vérification du backend PHP
      checkBackendAvailable().then(avail => {
        this.backendAvailable = avail;
        if (avail) {
          this.checkSession();
        }
      });

      // Pré-chargement des compteurs de séances par classe
      this.loadClassCounts();

      // Construction du calendrier pour l'année scolaire
      const annee = +this.annee_scolaire.substring(0, 4);
      this.buildCalendar(annee);
    },
    methods: {
      // === DÉCODAGE SYMBOLES SPÉCIAUX / ENTITÉS HTML ===
      decodeHtml: function (str) {
        return typeof decodeHtmlEntities === 'function' ? decodeHtmlEntities(str) : (str || '');
      },

      // === NAVIGATION ONGLETS ===
      switchTab: function (tab) {
        this.activeTab = tab;
        if (tab === 'seances' && this.selectedClasse) {
          window.location.hash = '#seances/' + encodeURIComponent(this.selectedClasse);
        } else {
          window.location.hash = '#' + tab;
        }
      },

      // === COMPTEURS DE SÉANCES ===
      loadClassCounts: function () {
        this.classes.forEach(cls => {
          loadSeancesData(this.annee_scolaire, cls.shortName).then(seances => {
            this.$set(this.classCounts, cls.shortName, seances.length);
          });
        });
      },

      // === SESSIONS & AUTH (Mode Local) ===
      checkSession: function () {
        if (!this.backendAvailable) {
          this.connected = false;
          return;
        }
        fetch('operations.php?act=authcheck')
          .then(response => response.json())
          .then(data => {
            this.connected = !!(data.data && data.data.authenticated);
          })
          .catch(() => { this.connected = false; });
      },
      addAlertMessage: function (type, msg) {
        const idx = this.alerts.length;
        this.alerts.push({ alType: type, alMsg: msg });
        setTimeout(() => this.clearAlertMessage(idx), 3500);
      },
      clearAlertMessage: function (idx) {
        this.alerts.splice(idx, 1);
      },
      handleFetch: function (data) {
        if (data.status != 'ok') {
          throw data.errors;
        }
        return data;
      },
      handleErrors: function (errors) {
        if (Array.isArray(errors)) {
          for (let error of errors) {
            this.addAlertMessage('danger', error);
          }
        } else if (typeof errors === 'string') {
          this.addAlertMessage('danger', errors);
        }
      },
      onLoginClicked: function () {
        let formData = new URLSearchParams();
        formData.append('pseudo', this.loginPseudo);
        formData.append('password', this.loginPassword);
        fetch('operations.php?act=login', { method: "POST", body: formData })
          .then(response => response.json())
          .then(this.handleFetch)
          .then(data => {
            if (data) {
              this.authToken = data.data.token;
              this.connected = true;
              this.showLoginForm = false;
              showToast('success', 'Connexion réussie en mode édition');
              if (this.selectedClasse) {
                this.loadData(this.selectedClasse);
              }
            }
          })
          .catch(errors => { this.handleErrors(errors); });
      },
      onLogoutClicked: function () {
        fetch('operations.php?act=logout', { method: "POST" })
          .then(response => response.json())
          .then(() => {
            this.authToken = '';
            this.connected = false;
            this.showLoginForm = false;
            showToast('info', 'Déconnexion effectuée');
          });
      },

      // === CHARGEMENT DES SÉANCES ===
      loadClasse: function (classe) {
        return loadSeancesData(this.annee_scolaire, classe);
      },
      loadData: function (classe) {
        this.seances = [];
        this.dates = [];
        this.filteredSeances = [];
        this.debut = '';
        this.fin = '';
        if (!classe) return Promise.resolve();
        this.loading = true;

        return this.loadClasse(classe)
          .then(data => {
            this.loading = false;
            if (data == null) return null;
            this.seances = data;
            const uniqueDates = [...new Set(this.seances.map(s => s.date))].sort();
            this.dates = uniqueDates;
            if (this.dates.length > 0) {
              this.debut = this.dates[0];
              this.fin = this.dates[this.dates.length - 1];
            }
            this.applyAdvancedFilters();
          })
          .catch(() => {
            this.loading = false;
          });
      },

      onClasseChanged: function (classe, updateHash = true) {
        this.selectedClasse = classe;
        this.selectedSeance = -1;
        this.mode = "list";
        this.alerts = [];
        this.searchQuery = '';
        this.filterGroupe = '';
        this.destroyEditor();
        if (classe) {
          document.title = "Cahier de textes - Classe " + classe;
          this.loadData(classe);
          if (updateHash) {
            window.location.hash = '#seances/' + encodeURIComponent(classe);
          }
        } else {
          document.title = "Cahier de textes";
          if (updateHash && this.activeTab === 'seances') {
            window.location.hash = '#seances';
          }
        }
      },
      onIntervalChanged: function (flag) {
        if (flag == 'debut' && this.fin < this.debut) this.fin = this.debut;
        if (flag == 'fin' && this.fin < this.debut) this.debut = this.fin;
        this.applyAdvancedFilters();
      },

      // === FILTRES & RECHERCHE AVANCÉE ===
      applyAdvancedFilters: function () {
        var list = this.seances.slice();

        // Filtre par intervalle de dates
        if (this.debut) {
          list = list.filter(s => s.date >= this.debut);
        }
        if (this.fin) {
          list = list.filter(s => s.date <= this.fin);
        }

        // Recherche texte
        if (this.searchQuery && this.searchQuery.trim()) {
          var q = this.searchQuery.trim().toLowerCase();
          list = list.filter(function (s) {
            return (s.titre || '').toLowerCase().indexOf(q) !== -1 ||
                   (s.travail || '').toLowerCase().indexOf(q) !== -1 ||
                   (s.remarque || '').toLowerCase().indexOf(q) !== -1;
          });
        }

        // Filtre par groupe
        if (this.filterGroupe) {
          list = list.filter(s => s.groupe === this.filterGroupe);
        }

        // Tri
        list.sort((a, b) => {
          if (a.date > b.date) return 1;
          if (a.date < b.date) return -1;
          return (a.debut || '').localeCompare(b.debut || '');
        });
        if (this.sortOrder === 'desc') {
          list.reverse();
        }

        this.filteredSeances = list;
      },

      // === EXPORTS ===
      onExportCsvClicked: function () {
        if (!this.filteredSeances || this.filteredSeances.length === 0) return;
        const header = ['Numéro', 'Date', 'Début', 'Fin', 'Classe', 'Groupe', 'Titre', 'Travail réalisé', 'Remarque'];
        const rows = this.filteredSeances.map(s => [
          s.index,
          s.date,
          s.debut,
          s.fin,
          s.classe,
          s.groupe,
          `"${(s.titre || '').replace(/"/g, '""')}"`,
          `"${(s.travail ? s.travail.replace(/<[^>]*>/g, '') : '').replace(/"/g, '""')}"`,
          `"${(s.remarque || '').replace(/"/g, '""')}"`
        ]);
        const csvContent = '\uFEFF' + [header.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Cahier_Textes_${this.selectedClasse}_${this.annee_scolaire.replace('/', '-')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('success', 'Export CSV téléchargé');
      },
      onExportPdfClicked: function () {
        if (!this.backendAvailable) {
          window.print();
        } else {
          const year = encodeURIComponent(this.annee_scolaire);
          const classe = encodeURIComponent(this.selectedClasse);
          const url = `operations.php?cnt=index&act=exportpdf&year=${year}&classe=${classe}`;
          window.open(url, '_blank');
        }
      },

      // === FORMATTAGE ===
      formatDate: function (d) {
        return formatDate(d);
      },
      formatDateFull: function (d) {
        if (!d) return '';
        const dt = new Date(d);
        return dt.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      },

      // === EMPLOI DU TEMPS METHODS ===
      getDayName(i) { return this.jours[i] || ''; },
      _min(t) { if (!t) return 0; const p = t.split(':').map(Number); return p[0] * 60 + (p[1] || 0); },
      getSessionsByClass(classe) {
        return this.emploi.filter(s => s.classe === classe)
          .sort((a, b) => a.day - b.day || a.startTime.localeCompare(b.startTime));
      },
      getClassStyle(classe) {
        const s = this.classStyleMap[classe];
        return s ? s.bg : 'linear-gradient(135deg, #dfe6e9, #b2bec3)';
      },
      getClassColor(classe) {
        const s = this.classStyleMap[classe];
        return s ? s.color : '#636e72';
      },

      // === CALENDRIER METHODS ===
      buildCalendar(annee) {
        this.months = [];
        let year = annee, month = 9;
        // 10 mois : Septembre à Juin
        for (let i = 0; i < 10; i++) {
          this.months.push(this.createMonth(year, month));
          month++;
          if (month > 12) { month = 1; year++; }
        }

        const allClasses = [...new Set([...this.classesList, 'others'])];
        Promise.all(allClasses.map(c =>
          this.loadClasse(c).then(seances => {
            if (!seances) return;
            seances.forEach(s => {
              const dt = new Date(s.date + 'T00:00:00');
              const mi = (dt.getMonth() - 8) + (dt.getFullYear() - annee) * 12;
              if (this.months[mi]) {
                const di = dt.getDate() - 1;
                if (this.months[mi].days[di]) {
                  const dayObj = this.months[mi].days[di];
                  if (!dayObj.seances) dayObj.seances = [];
                  dayObj.seances.push(s);
                  const tagCls = this.getEventTagClass(s);
                  const tagText = (s.classe === 'others' ? (s.titre || 'Autre') : s.classe) || 'Événement';
                  dayObj.obs += `<span class="${tagCls}" title="${decodeHtmlEntities(s.titre || s.classe)}">${tagText}</span> `;
                }
              }
            });
          }).catch(() => null)
        )).then(() => {
          this.months.forEach(m => m.weeks = this.chunkWeeks(m));
          this.$forceUpdate();
        });
      },
      createMonth(y, m) {
        const d = new Date(y, m - 1, 1);
        const e = new Date(y + (m === 12 ? 1 : 0), m === 12 ? 0 : m, 1);
        const mo = { name: d.toLocaleString('fr-FR', { month: 'long' }) + ' ' + y, days: [] };
        for (let t = d.getTime(); t < e.getTime(); t += 864e5) {
          const dt = new Date(t);
          mo.days.push({ date: dt, dow: dt.toLocaleString('fr-FR', { weekday: 'long' }).substring(0, 3), obs: '', seances: [] });
        }
        return mo;
      },
      chunkWeeks(mo) {
        const weeks = [];
        let cur = [];
        const sd = mo.days[0].date.getDay();
        for (let i = 0; i < (sd === 0 ? 6 : sd - 1); i++) cur.push(null);
        mo.days.forEach(d => { cur.push(d); if (cur.length === 7) { weeks.push(cur); cur = []; } });
        if (cur.length) { while (cur.length < 7) cur.push(null); weeks.push(cur); }
        return weeks;
      },
      cellCls(d) {
        if (!d) return 'cal-empty';
        const dd = d.date.getDay();
        const parts = [];
        if (dd === 0 || dd === 6) parts.push('cal-we');
        if (d.obs) parts.push('cal-jt');
        if (d.seances && d.seances.length > 0) {
          const hasVac = d.seances.some(s => this.isEventSession(s) && this.getEventTagClass(s).includes('cal-tag-vacances'));
          const hasBlo = d.seances.some(s => this.isEventSession(s) && this.getEventTagClass(s).includes('cal-tag-bloquee'));
          const hasFer = d.seances.some(s => this.isEventSession(s) && this.getEventTagClass(s).includes('cal-tag-ferie'));
          if (hasVac) parts.push('cal-cell-vacances');
          else if (hasBlo) parts.push('cal-cell-bloquee');
          else if (hasFer) parts.push('cal-cell-ferie');
        }
        return parts.length ? parts.join(' ') : '';
      },
      onDayClicked(day) {
        if (!day) return;
        if ((day.seances && day.seances.length > 0) || this.connected) {
          this.activeDay = day;
          if (typeof $ !== 'undefined') {
            $('#modalDayDetailsIndex').modal('show');
          }
        }
      },

      // === ÉVÉNEMENTS & CONGÉS (Jours fériés, Vacances, Semaine bloquée) ===
      isEventSession(s) {
        if (!s) return false;
        if (s.type) return true;
        const clsList = this.classesList || [];
        if (s.classe === 'others') return true;
        return !clsList.includes(s.classe);
      },
      getEventTagClass(s) {
        if (!this.isEventSession(s)) {
          return 'cal-tag';
        }
        const type = (s.type || '').toLowerCase();
        const cl = (s.classe || '').toLowerCase();
        const tit = (s.titre || '').toLowerCase();

        // 1. Vacances scolaires (priorité absolue pour éviter toute collision sur des mots comme "vacances")
        if (type === 'vacances' || cl.includes('vac') || tit.includes('vacances')) {
          return 'cal-tag cal-tag-vacances';
        }
        // 2. Semaine bloquée / Examens
        if (type === 'bloquee' || cl.includes('bloqu') || cl.includes('exam') || tit.includes('bloqu') || tit.includes('examen')) {
          return 'cal-tag cal-tag-bloquee';
        }
        // 3. Jours fériés
        if (type === 'ferie' || cl.includes('jf') || cl.includes('férié') || cl.includes('ferie') ||
            tit.includes('férié') || tit.includes('ferie') || tit.includes('fête') || tit.includes('fete') ||
            tit.includes("jour de l'an") || tit.includes('nouvel an') || tit.includes('évacuation') ||
            tit.includes('révolution') || tit.includes('revolution') || tit.includes('indépendance') ||
            tit.includes('independance') || tit.includes('martyrs') || tit.includes('travail') ||
            tit.includes('mouled') || tit.includes('aïd') || tit.includes('aid')) {
          return 'cal-tag cal-tag-ferie';
        }
        return 'cal-tag cal-tag-autre';
      },
      getEventBadgeClass(s) {
        const tagCls = this.getEventTagClass(s);
        if (tagCls.includes('cal-tag-vacances')) return 'badge-vacances';
        if (tagCls.includes('cal-tag-bloquee')) return 'badge-bloquee';
        if (tagCls.includes('cal-tag-ferie')) return 'badge-ferie';
        return 'badge-autre';
      },
      getEventLabel(s) {
        const type = (s.type || '').toLowerCase();
        const cl = (s.classe || '').toLowerCase();
        const tit = (s.titre || '').toLowerCase();
        if (type === 'vacances' || cl.includes('vac') || tit.includes('vacances')) {
          return '🟢 Vacances : ' + (s.classe !== 'others' ? s.classe : 'Vacances');
        }
        if (type === 'bloquee' || cl.includes('bloqu') || tit.includes('bloqu')) {
          return '🟣 Semaine bloquée : ' + (s.classe !== 'others' ? s.classe : 'Bloquée');
        }
        if (type === 'ferie' || cl.includes('jf') || cl.includes('férié') || cl.includes('ferie') || tit.includes('férié') || tit.includes('fête')) {
          return '🟠 Jour férié : ' + (s.classe !== 'others' ? s.classe : 'JF');
        }
        return '🔵 Événement : ' + (s.classe !== 'others' ? s.classe : 'Autre');
      },
      setEventType(type) {
        this.newEvent.type = type;
        if (type === 'ferie') {
          this.newEvent.tag = 'JF';
          this.newEvent.isRange = false;
        } else if (type === 'vacances') {
          this.newEvent.tag = 'Vacances';
          this.newEvent.isRange = true;
          if (this.newEvent.date && !this.newEvent.date_fin) {
            const dt = new Date(this.newEvent.date + 'T00:00:00');
            dt.setDate(dt.getDate() + 6);
            this.newEvent.date_fin = dt.toISOString().substring(0, 10);
          }
        } else if (type === 'bloquee') {
          this.newEvent.tag = 'Bloquée';
          this.newEvent.isRange = true;
          if (this.newEvent.date && !this.newEvent.date_fin) {
            const dt = new Date(this.newEvent.date + 'T00:00:00');
            dt.setDate(dt.getDate() + 5);
            this.newEvent.date_fin = dt.toISOString().substring(0, 10);
          }
        } else {
          this.newEvent.tag = 'Autre';
          this.newEvent.isRange = false;
        }
      },
      applyQuickHoliday(q) {
        this.newEvent.titre = q.titre;
        this.newEvent.tag = q.tag || 'JF';
        if (q.month && q.day) {
          const yrStart = +this.annee_scolaire.substring(0, 4);
          const yrEnd = +this.annee_scolaire.substring(5, 9) || (yrStart + 1);
          const yr = (+q.month >= 8) ? yrStart : yrEnd;
          this.newEvent.date = `${yr}-${q.month}-${q.day}`;
        }
      },
      applyQuickVacation(qv) {
        if (qv.type) this.setEventType(qv.type);
        this.newEvent.titre = qv.titre;
        this.newEvent.tag = qv.tag || 'Vacances';
      },
      onEventDateStartChange() {
        if (this.newEvent.isRange) {
          if (!this.newEvent.date_fin || this.newEvent.date_fin < this.newEvent.date) {
            const dt = new Date(this.newEvent.date + 'T00:00:00');
            dt.setDate(dt.getDate() + (this.newEvent.type === 'vacances' ? 6 : 5));
            this.newEvent.date_fin = dt.toISOString().substring(0, 10);
          }
        }
      },
      openAddEventModal() {
        if (!this.connected) {
          this.showLoginForm = true;
          return;
        }
        const today = new Date().toISOString().substring(0, 10);
        this.newEvent = {
          type: 'ferie',
          titre: '',
          tag: 'JF',
          date: this.newEvent && this.newEvent.date ? this.newEvent.date : today,
          date_fin: '',
          remarque: '',
          isRange: false
        };
        if (typeof $ !== 'undefined') {
          $('#modalManageEvents').modal('hide');
          $('#modalDayDetailsIndex').modal('hide');
          $('#modalAddEvent').modal('show');
        }
      },
      openAddEventModalForDate(dateStr) {
        if (!this.connected) {
          this.showLoginForm = true;
          return;
        }
        let d = dateStr;
        if (dateStr instanceof Date) {
          d = dateStr.toISOString().substring(0, 10);
        }
        this.newEvent = {
          type: 'ferie',
          titre: '',
          tag: 'JF',
          date: d,
          date_fin: '',
          remarque: '',
          isRange: false
        };
        if (typeof $ !== 'undefined') {
          $('#modalDayDetailsIndex').modal('hide');
          $('#modalAddEvent').modal('show');
        }
      },
      openManageEventsModal() {
        if (!this.connected) {
          this.showLoginForm = true;
          return;
        }
        this.loadYearEventsList().then(() => {
          if (typeof $ !== 'undefined') {
            $('#modalAddEvent').modal('hide');
            $('#modalManageEvents').modal('show');
          }
        });
      },
      loadYearEventsList() {
        return loadSeancesData(this.annee_scolaire, 'others').then(evts => {
          this.yearEventsList = evts || [];
          return this.yearEventsList;
        });
      },
      submitAddEvent() {
        if (!this.newEvent.date) {
          showToast('error', 'Veuillez sélectionner une date');
          return;
        }
        if (!this.newEvent.titre) {
          showToast('error', 'Veuillez saisir un intitulé');
          return;
        }
        this.savingEvent = true;

        const formData = new URLSearchParams();
        formData.append('year', this.annee_scolaire);
        formData.append('type', this.newEvent.type);
        formData.append('titre', this.newEvent.titre);
        formData.append('tag', this.newEvent.tag);
        formData.append('date', this.newEvent.date);
        if (this.newEvent.isRange && this.newEvent.date_fin) {
          formData.append('date_fin', this.newEvent.date_fin);
        } else {
          formData.append('date_fin', this.newEvent.date);
        }
        formData.append('remarque', this.newEvent.remarque || '');

        const headers = {};
        if (this.authToken) headers['Authorization'] = 'Bearer ' + this.authToken;

        fetch('operations.php?act=addevent', {
          method: 'POST',
          body: formData,
          headers: headers
        })
          .then(res => res.json())
          .then(data => {
            this.savingEvent = false;
            if (data && data.status === 'ok') {
              showToast('success', 'Événement enregistré avec succès');
              if (typeof $ !== 'undefined') {
                $('#modalAddEvent').modal('hide');
              }
              const annee = +this.annee_scolaire.substring(0, 4);
              this.buildCalendar(annee);
            } else {
              const err = (data && data.errors && data.errors.join(', ')) || 'Erreur lors de l\'enregistrement';
              showToast('error', err);
            }
          })
          .catch(() => {
            this.savingEvent = false;
            showToast('error', 'Erreur de connexion');
          });
      },
      formatDateRange(startDate, endDate) {
        if (!startDate) return '';
        if (!endDate || startDate === endDate) {
          return this.formatDate(startDate);
        }
        const d1 = new Date(startDate + 'T00:00:00');
        const d2 = new Date(endDate + 'T00:00:00');
        const optDayMonth = { weekday: 'short', day: 'numeric', month: 'short' };
        const optFull = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };

        if (d1.getFullYear() === d2.getFullYear()) {
          const s1 = d1.toLocaleDateString('fr-FR', optDayMonth);
          const s2 = d2.toLocaleDateString('fr-FR', optFull);
          return `Du ${s1} au ${s2}`;
        }
        const s1 = d1.toLocaleDateString('fr-FR', optFull);
        const s2 = d2.toLocaleDateString('fr-FR', optFull);
        return `Du ${s1} au ${s2}`;
      },
      getEventGroup(s) {
        if (!s || !this.isEventSession(s)) return null;
        return this.groupedEventsList.find(g =>
          (g.periodId && s.periodId && g.periodId === s.periodId) ||
          (g.startDate <= s.date && g.endDate >= s.date && (g.titre === s.titre || g.classe === s.classe))
        ) || null;
      },
      onDeleteEventClicked(evt) {
        if (!this.connected) return;
        const grp = this.getEventGroup(evt);
        if (grp && grp.daysCount > 1) {
          const dateDesc = this.formatDateRange(grp.startDate, grp.endDate);
          const choice = confirm(`Cet événement fait partie du bloc "${grp.titre || grp.classe}" (${dateDesc} - ${grp.daysCount} jours).\n\nCliquez sur OK pour supprimer TOUT le bloc (${grp.daysCount} jours),\nou sur Annuler pour supprimer uniquement ce jour.`);
          if (choice) {
            this.deleteGroupedEvent(grp);
            return;
          }
        } else {
          if (!confirm(`Supprimer l'événement "${evt.titre || evt.classe}" du ${this.formatDate(evt.date)} ?`)) return;
        }

        this.deleteEventApi(evt, false);
      },
      deleteEventFromList(evt) {
        if (!confirm(`Supprimer l'événement "${evt.titre || evt.classe}" du ${this.formatDate(evt.date)} ?`)) return;
        this.deleteEventApi(evt, false);
      },
      deleteGroupedEvent(group) {
        if (!this.connected) return;
        const count = group.daysCount || 1;
        const dateDesc = this.formatDateRange(group.startDate, group.endDate);
        const promptMsg = count > 1
          ? `Supprimer toute la période "${group.titre || group.classe}" ?\n\n${dateDesc} (${count} jours)\nCette action supprimera l'ensemble des jours de ce bloc.`
          : `Supprimer l'événement "${group.titre || group.classe}" du ${this.formatDate(group.startDate)} ?`;

        if (!confirm(promptMsg)) return;

        const formData = new URLSearchParams();
        formData.append('year', this.annee_scolaire);
        formData.append('date', group.startDate);
        formData.append('date_fin', group.endDate);
        if (group.titre) formData.append('titre', group.titre);
        if (group.classe) formData.append('tag', group.classe);
        if (group.periodId) formData.append('periodId', group.periodId);
        formData.append('deletePeriod', 'true');

        const headers = {};
        if (this.authToken) headers['Authorization'] = 'Bearer ' + this.authToken;

        fetch('operations.php?act=deleteevent', {
          method: 'POST',
          body: formData,
          headers: headers
        })
          .then(res => res.json())
          .then(data => {
            if (data && data.status === 'ok') {
              showToast('success', count > 1 ? `Bloc supprimé (${count} jours)` : 'Événement supprimé');
              if (typeof $ !== 'undefined') {
                $('#modalDayDetailsIndex').modal('hide');
              }
              const annee = +this.annee_scolaire.substring(0, 4);
              this.buildCalendar(annee);
              this.loadYearEventsList();
            } else {
              showToast('error', 'Erreur lors de la suppression');
            }
          })
          .catch(() => {
            showToast('error', 'Erreur de connexion');
          });
      },
      deleteEventApi(evt, deletePeriod) {
        const formData = new URLSearchParams();
        formData.append('year', this.annee_scolaire);
        formData.append('date', evt.date);
        if (evt.titre) formData.append('titre', evt.titre);
        if (evt.classe) formData.append('tag', evt.classe);
        if (evt.periodId) formData.append('periodId', evt.periodId);
        if (deletePeriod) formData.append('deletePeriod', 'true');

        const headers = {};
        if (this.authToken) headers['Authorization'] = 'Bearer ' + this.authToken;

        fetch('operations.php?act=deleteevent', {
          method: 'POST',
          body: formData,
          headers: headers
        })
          .then(res => res.json())
          .then(data => {
            if (data && data.status === 'ok') {
              showToast('success', 'Événement supprimé');
              if (typeof $ !== 'undefined') {
                $('#modalDayDetailsIndex').modal('hide');
              }
              const annee = +this.annee_scolaire.substring(0, 4);
              this.buildCalendar(annee);
              this.loadYearEventsList();
            } else {
              showToast('error', 'Erreur lors de la suppression');
            }
          })
          .catch(() => {
            showToast('error', 'Erreur de connexion');
          });
      },

      // === ÉDITION DE SÉANCES (En local avec PHP) ===
      destroyEditor: function () {
        if (this.editor && this.editor.destruct) {
          try { this.editor.destruct(); } catch (e) { }
          this.editor = null;
        }
      },
      initEditFormControls: function () {
        this.destroyEditor();
        this.$nextTick(() => {
          if (typeof Jodit === 'undefined') return;
          try {
            this.editor = Jodit.make('#edit-travail-seance', {
              height: 400, language: 'fr', sourceEditor: 'area'
            });
          } catch (e) {
            try {
              this.editor = Jodit.make('#new-travail-seance', {
                height: 400, language: 'fr', sourceEditor: 'area'
              });
            } catch (e2) { }
          }
        });
      },
      fillByDate: function (date) {
        const day = date.getDay();
        const seance = this.emploi.find(s => s.day == day && s.classe == this.selectedClasse);
        if (seance) {
          this.localSeance = new Seance({
            classe: seance.classe, debut: seance.startTime, fin: seance.endTime,
            groupe: seance.groupe, date: date.toISOString().substring(0, 10)
          });
        } else {
          this.localSeance = new Seance({ classe: this.selectedClasse, date: date.toISOString().substring(0, 10) });
        }
      },
      onNewSeanceclicked: function () {
        if (!this.connected) {
          this.showLoginForm = true;
          return;
        }
        this.mode = 'new';
        this.fillByDate(new Date());
        this.initEditFormControls();
      },
      onEditSeanceClicked: function (idx) {
        this.selectedSeance = idx;
        this.mode = "edit";
        this.originalSeance = new Seance(this.filteredSeances[idx]);
        this.initEditFormControls();
      },
      onConfirmDeleteSeanceClicked: function (idx) {
        this.selectedSeance = idx;
        this.mode = "delete";
      },
      onCancelClicked: function () {
        this.destroyEditor();
        if (this.mode == 'edit' && this.selectedSeance >= 0 && this.originalSeance) {
          this.filteredSeances[this.selectedSeance] = this.originalSeance;
        }
        this.mode = "list";
        this.selectedSeance = -1;
      },
      deleteSeance: function (seance) {
        let formData = new URLSearchParams();
        formData.append('year', this.annee_scolaire);
        Object.entries(seance).forEach(arr => formData.append(arr[0], arr[1]));
        const headers = {};
        if (this.authToken) headers['Authorization'] = 'Bearer ' + this.authToken;
        return fetch(`operations.php?act=delete`, { method: "POST", body: formData, headers: headers })
          .then(response => response.json())
          .then(this.handleFetch)
          .catch(this.handleErrors)
          .then(data => (data == null) ? null : data);
      },
      updateSeance: function (seance, nseance) {
        let formData = new URLSearchParams();
        formData.append('year', this.annee_scolaire);
        if (this.editor) nseance.travail = this.editor.value;
        Object.entries(seance).forEach(arr => formData.append(arr[0], arr[1]));
        Object.entries(nseance).forEach(arr => formData.append("n" + arr[0], arr[1]));
        const headers = {};
        if (this.authToken) headers['Authorization'] = 'Bearer ' + this.authToken;
        return fetch(`operations.php?act=update`, { method: "POST", body: formData, headers: headers })
          .then(response => response.json())
          .then(this.handleFetch)
          .catch(this.handleErrors)
          .then(data => (data == null) ? null : data);
      },
      insertData: function (seance) {
        let formData = new URLSearchParams();
        formData.append('year', this.annee_scolaire);
        if (this.editor) seance.travail = this.editor.value;
        Object.entries(seance).forEach(arr => formData.append(arr[0], arr[1]));
        const headers = {};
        if (this.authToken) headers['Authorization'] = 'Bearer ' + this.authToken;
        return fetch(`operations.php?act=insert`, { method: "POST", body: formData, headers: headers })
          .then(response => response.json())
          .then(this.handleFetch)
          .catch(this.handleErrors)
          .then(data => (data == null) ? null : data);
      },
      onModifySeanceClicked: function () {
        this.updateSeance(this.originalSeance, this.filteredSeances[this.selectedSeance])
          .then(data => {
            if (data != null) {
              showToast('success', 'Séance modifiée avec succès');
              this.loadData(this.selectedClasse);
              this.onCancelClicked();
            }
          });
      },
      onDeleteSeanceClicked: function () {
        this.deleteSeance(this.filteredSeances[this.selectedSeance])
          .then(data => {
            if (data != null) {
              showToast('success', 'Séance supprimée');
              this.loadData(this.selectedClasse).then(() => { this.onCancelClicked(); });
            }
          });
      },
      onInsertClicked: function () {
        this.insertData(this.localSeance)
          .then(data => {
            if (data != null) {
              showToast('success', 'Nouvelle séance ajoutée');
              this.loadData(this.selectedClasse).then(() => { this.onCancelClicked(); });
            }
          });
      },
      onDateChanged: function () {
        if (this.localSeance && this.localSeance.date) {
          this.fillByDate(new Date(this.localSeance.date));
        }
      },

      // === CHANGEMENT D'ANNÉE ===
      changeYear: function () {
        window.location.href = 'index.html?year=' + encodeURIComponent(this.selectedYear);
      }
    }
  });
}
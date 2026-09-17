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

      // Calendrier
      months: [],
      activeDay: null
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
      }
    },
    mounted: function () {
      // Synchronisation de l'onglet via URL Hash
      if (window.location.hash === '#emploi') {
        this.activeTab = 'emploi';
      } else if (window.location.hash === '#calendrier') {
        this.activeTab = 'calendrier';
      } else {
        this.activeTab = 'seances';
      }

      window.addEventListener('hashchange', () => {
        if (window.location.hash === '#emploi') this.activeTab = 'emploi';
        else if (window.location.hash === '#calendrier') this.activeTab = 'calendrier';
        else this.activeTab = 'seances';
      });

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
      // === NAVIGATION ONGLETS ===
      switchTab: function (tab) {
        this.activeTab = tab;
        window.location.hash = '#' + tab;
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

      onClasseChanged: function (classe) {
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
        } else {
          document.title = "Cahier de textes";
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

        const allClasses = [...new Set([...classes, 'others'])];
        Promise.all(allClasses.map(c =>
          loadSeancesData(this.annee_scolaire, c).then(seances => {
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
                  const isSpecial = s.classe === 'others' || s.classe.includes('JF') || s.classe.includes('Réu');
                  const tagCls = isSpecial ? 'cal-tag bg-warning text-dark' : 'cal-tag';
                  dayObj.obs += `<span class="${tagCls}" title="${s.titre || s.classe}">${s.classe}</span> `;
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
        return parts.length ? parts.join(' ') : '';
      },
      onDayClicked(day) {
        if (day && day.seances && day.seances.length > 0) {
          this.activeDay = day;
          if (typeof $ !== 'undefined') {
            $('#modalDayDetailsIndex').modal('show');
          }
        }
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
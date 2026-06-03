/* ========================================
   INDEX - Vue.js Application
   Attend loadConfig() avant de démarrer
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const yearParam = urlParams.get('year');

  loadConfig(yearParam).then(() => {
    startApp();
  }).catch(() => {
    startApp();
  });
});

function compareTime(t1, t2) {
  if (t1 > t2) return 1;
  if (t1 < t2) return -1;
  return 0;
}

// ===== TOAST SYSTEM (shared) =====
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

// Inject toast keyframes
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
      seance: new Seance(),
      classes: classesObjects,
      classesList: classes,
      groupes: groupes,
      jours: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
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
      emploi_tab: [],
      monthes: [],
      monthStartingDay: 7,
      loading: false,
      connected: false,
      showLoginForm: false,
      loginPseudo: '',
      loginPassword: '',
      authToken: '',
      selectedYear: annee_scolaire,
      years: yearsList,
      editor: null,
      searchQuery: '',
      filterGroupe: '',
      sortOrder: 'desc'
    },
    mounted: function () {
      this.checkSession();
    },
    methods: {
      // === SESSION ===
      checkSession: function () {
        fetch('operations.php?act=authcheck')
          .then(response => response.json())
          .then(data => {
            if (data.data && data.data.authenticated) {
              this.connected = true;
            } else {
              this.connected = false;
            }
          })
          .catch(() => { this.connected = false; });
      },
      // === ALERTS ===
      addAlertMessage: function (type, msg) {
        const idx = this.alerts.length;
        this.alerts.push({ alType: type, alMsg: msg });
        setTimeout(() => this.clearAlertMessage(idx), 3000);
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
        for (let error of errors) {
          this.addAlertMessage('danger', error);
        }
      },
      // === AUTH ===
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
              this.loadData(this.selectedClasse);
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
            this.seances = [];
            this.dates = [];
            this.filteredSeances = [];
            this.debut = '';
            this.fin = '';
            this.selectedSeance = -1;
            this.mode = "list";
            this.alerts = [];
          });
      },
      // === CLASSES ===
      loadClasse: function (classe) {
        const params = new URLSearchParams();
        params.append('year', this.annee_scolaire);
        params.append('classe', classe);
        return fetch(`operations.php?act=list&${params.toString()}`, { method: "GET" })
          .then(response => response.json())
          .then(data => {
            if (data.status !== 'ok' || !data.data || !data.data.seances) {
              throw new Error('Erreur de chargement');
            }
            return data.data.seances;
          })
          .then(data => {
            if (data == null) return null;
            const seances = data.map(s => new Seance(s));
            seances.sort((a, b) => {
              if (a.date > b.date) return 1;
              if (a.date < b.date) return -1;
              return 0;
            });
            seances.forEach((seance, idxSeance) => seance.index = (idxSeance + 1));
            seances.reverse();
            return seances;
          })
          .catch(() => null);
      },
      loadData: function (classe) {
        this.seances = [];
        this.dates = [];
        this.filteredSeances = [];
        this.debut = '';
        this.fin = '';
        if (!classe) return;
        this.loading = true;

        return this.loadClasse(classe)
          .then(data => {
            this.loading = false;
            if (data == null) return null;
            this.seances = data;
            this.dates = this.seances.map(s => s.date);
            this.dates = this.dates.filter((dt, idx) => this.dates.indexOf(dt) == idx).reverse();
            if (this.dates.length > 0) {
              this.debut = this.dates[0];
              this.fin = this.dates[this.dates.length - 1];
              this.filterSeances(this.debut, this.fin);
            }
          });
      },
      filterSeances: function (debut, fin) {
        this.filteredSeances = this.seances.filter(s => s.date >= debut && s.date <= fin);
      },
      onClasseChanged: function (classe) {
        document.title = "Cahier de textes - Classe " + classe;
        this.selectedClasse = classe;
        this.selectedSeance = -1;
        this.mode = "list";
        this.alerts = [];
        this.destroyEditor();
        if (classe) {
          this.loadData(classe);
        }
      },
      onIntervalChanged: function (flag) {
        if (flag == 'debut' && this.fin < this.debut) this.fin = this.debut;
        if (flag == 'fin' && this.fin < this.debut) this.debut = this.fin;
        this.filterSeances(this.debut, this.fin);
      },
      // === SEANCE EDITING ===
      destroyEditor: function () {
        if (this.editor && this.editor.destruct) {
          try { this.editor.destruct(); } catch (e) { }
          this.editor = null;
        }
      },
      initEditFormControls: function () {
        this.destroyEditor();
        this.$nextTick(() => {
          try { this.editor = Jodit.make('#edit-travail-seance', { height: 400, language: 'fr', 
              language: 'fr', 
              sourceEditor: 'area', 
              sourceEditorCDNUrlsJS: [], 
              beautifyHTMLCDNUrlsJS: []  }); }
          catch (e) {
            try { this.editor = Jodit.make('#new-travail-seance', { height: 400, language: 'fr', 
              language: 'fr', 
              sourceEditor: 'area', 
              sourceEditorCDNUrlsJS: [], 
              beautifyHTMLCDNUrlsJS: []  }); }
            catch (e2) { }
          }
        });
      },
      fillByDate: function (date) {
        const day = date.getDay();
        const seance = this.emploi.find(s => s.day == day);
        if (seance) {
          this.localSeance = new Seance({
            classe: seance.classe, debut: seance.startTime, fin: seance.endTime,
            groupe: seance.groupe, date: date.toISOString().substring(0, 10)
          });
        } else {
          this.localSeance = new Seance({ date: date.toISOString().substring(0, 10) });
        }
      },
      onNewSeanceclicked: function () {
        this.showLoginForm = !this.connected;
        if (!this.connected) return;
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
        if (this.mode == 'edit') this.filteredSeances[this.selectedSeance] = this.originalSeance;
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
          .then(data => { if (data != null) { this.loadData(this.selectedClasse); this.onCancelClicked(); } });
      },
      onDeleteSeanceClicked: function () {
        this.deleteSeance(this.filteredSeances[this.selectedSeance])
          .then(data => { if (data != null) { this.loadData(this.selectedClasse).then(() => { this.onCancelClicked(); }); } });
      },
      onInsertClicked: function () {
        this.insertData(this.localSeance)
          .then(data => { if (data != null) { this.loadData(this.selectedClasse).then(() => { this.onCancelClicked(); }); } });
      },
      // === EXPORT PDF ===
      onExportPdfClicked: function () {
        const year = encodeURIComponent(this.annee_scolaire);
        const classe = encodeURIComponent(this.selectedClasse);
        const url = `operations.php?cnt=index&act=exportpdf&year=${year}&classe=${classe}`;
        window.open(url, '_blank');
      },
      onDateChanged: function () { this.fillByDate(new Date(this.localSeance.date)); },
      // === ADVANCED FILTERS ===
      applyAdvancedFilters: function () {
        var list = this.seances.slice();
        // Search
        if (this.searchQuery.trim()) {
          var q = this.searchQuery.trim().toLowerCase();
          list = list.filter(function (s) {
            return (s.titre || '').toLowerCase().indexOf(q) !== -1 ||
                   (s.travail || '').toLowerCase().indexOf(q) !== -1 ||
                   (s.remarque || '').toLowerCase().indexOf(q) !== -1;
          });
        }
        // Filter by groupe
        if (this.filterGroupe) {
          list = list.filter(function (s) { return s.groupe === this.filterGroupe; }, this);
        }
        // Sort
        list.sort(function (a, b) {
          if (a.date > b.date) return 1;
          if (a.date < b.date) return -1;
          return 0;
        });
        if (this.sortOrder === 'desc') {
          list.reverse();
        }
        list.forEach(function (s, idx) { s.index = idx + 1; });
        this.filteredSeances = list;
      },

      // === EXPORT CSV ===
      onExportCsvClicked: function () {
        var year = encodeURIComponent(this.annee_scolaire);
        var classe = encodeURIComponent(this.selectedClasse);
        var url = 'operations.php?cnt=index&act=exportcsv&year=' + year + '&classe=' + classe;
        window.open(url, '_blank');
      },

      // === YEAR ===
      changeYear: function () {
        window.location.href = 'index.html?year=' + encodeURIComponent(this.selectedYear);
      }
    }
  });
}
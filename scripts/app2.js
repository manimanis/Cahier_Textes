/* ========================================
   CAHIER DE TEXTES - Vue.js Application (Admin)
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

function startApp() {
  new Vue({
    el: '#app',
    data: {
      seance: new Seance(),
      classes: classes,
      groupes: groupes,
      emploi: emploi,
      alerts: [],
      annee_scolaire: annee_scolaire,
      enseignant: enseignant,
      classe: "",
      debut: '',
      fin: '',
      connected: false,
      seances: [],
      dates: [],
      filteredSeances: [],
      selectedSeance: -1,
      mode: "list",
      originalSeance: null,
      localSeance: null,
      emploi_tab: [],
      loading: false,
      loginPseudo: '',
      loginPassword: '',
      authToken: '',
      selectedYear: annee_scolaire,
      years: yearsList
    },
    mounted: function () {
      this.checkSession();
    },
    methods: {
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
      addAlertMessage: function (type, msg) {
        const idx = this.alerts.length;
        this.alerts.push({ alType: type, alMsg: msg });
        setTimeout(() => this.clearAlertMessage(0), 3000);
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
              this.loadData(this.classe);
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
            this.classe = "";
            this.seances = [];
            this.dates = [];
            this.filteredSeances = [];
            this.selectedSeance = -1;
            this.mode = "list";
            this.alerts = [];
          });
      },
      destroyEditor: function () {
        if (this.editor && this.editor.destruct) {
          try { this.editor.destruct(); } catch (e) { }
          this.editor = null;
        }
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
      loadData: function (classe) {
        this.seances = [];
        this.dates = [];
        this.filteredSeances = [];
        this.debut = '';
        this.fin = '';
        if (!this.classes.includes(classe)) return;
        this.loading = true;

        const filename = yearsList.length > 0 ? `${this.annee_scolaire}_${classe}.json` : `${classe}.json`;
        return fetch(`json/${filename}`, { method: "GET" })
          .then(response => response.json())
          .catch(error => {
            this.addAlertMessage('danger', `Erreur lors du chargement des données pour ${classe}!`);
          })
          .then(data => {
            this.loading = false;
            if (data == null) return null;
            this.seances = data.map(s => new Seance(s));
            this.seances.sort((a, b) => {
              if (a.date > b.date) return 1;
              if (a.date < b.date) return -1;
              return 0;
            });
            this.seances.forEach((seance, idxSeance) => seance.index = (idxSeance + 1));
            this.seances.reverse();

            this.dates = this.seances.map(s => s.date);
            this.dates = this.dates.filter((dt, idx) => this.dates.indexOf(dt) == idx).reverse();
            this.debut = this.dates[0];
            this.fin = this.dates[this.dates.length - 1];
            this.filterSeances(this.debut, this.fin);
          });
      },
      filterSeances: function (debut, fin) {
        this.filteredSeances = this.seances.filter(s => s.date >= debut && s.date <= fin);
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
      onClasseChanged: function () { this.loadData(this.classe); },
      onIntervalChanged: function (flag) {
        if (flag == 'debut' && this.fin < this.debut) this.fin = this.debut;
        if (flag == 'fin' && this.fin < this.debut) this.debut = this.fin;
        this.filterSeances(this.debut, this.fin);
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
      onNewSeanceclicked: function () {
        this.mode = 'new';
        this.fillByDate(new Date());
        this.initEditFormControls();
      },
      initEditFormControls: function () {
        this.destroyEditor();
        this.$nextTick(() => {
          try { this.editor = Jodit.make('#edit-travail-seance', { height: 400, language: 'fr' }); }
          catch (e) {
            try { this.editor = Jodit.make('#new-travail-seance', { height: 400, language: 'fr' }); }
            catch (e2) { }
          }
        });
      },
      onModifySeanceClicked: function () {
        this.updateSeance(this.originalSeance, this.filteredSeances[this.selectedSeance])
          .then(data => { if (data != null) { this.loadData(this.classe); this.onCancelClicked(); } });
      },
      onDeleteSeanceClicked: function () {
        this.deleteSeance(this.filteredSeances[this.selectedSeance])
          .then(data => { if (data != null) { this.loadData(this.classe).then(() => { this.onCancelClicked(); }); } });
      },
      onInsertClicked: function () {
        this.insertData(this.localSeance)
          .then(data => { if (data != null) { this.loadData(this.classe).then(() => { this.onCancelClicked(); }); } });
      },
      onCancelClicked: function () {
        this.destroyEditor();
        if (this.mode == 'edit') this.filteredSeances[this.selectedSeance] = this.originalSeance;
        this.mode = "list";
        this.selectedSeance = -1;
      },
      onDateChanged: function () { this.fillByDate(new Date(this.seance.date)); },
      changeYear: function () {
        window.location.href = 'cahier.html?year=' + encodeURIComponent(this.selectedYear);
      }
    }
  });
}